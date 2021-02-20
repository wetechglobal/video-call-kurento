import models from '../models';
import { apiCirrus, cirrusAuthToken } from '../config';
import { Op } from 'sequelize';
import dateFormat from 'dateformat';
import { formatDateTime } from '../emails/inviteParticipant';
import {
  emitParticipantJoin,
  emitParticipantLeave,
  getSocketFromRoomTokenId,
  isInRoom,
} from './socket-handlers/participantStatus';
import emails from '../emails';

const handleSocketServer2 = io => {
  io.on('connection', socket => {
    // Quick check room id
    const checkRoomIdOrEmitInvalid = () => {
      if (!socket.roomId) {
        socket.emit('invalid-room');
        return false;
      }
      return true;
    };

    const CheckAttendedCase = async (roomId, roomTokenId) => {
      try {
        //check all participants join roon
        const checkRoomToken = await models.RoomToken.findOne({
          where: {
            [Op.and]: [{ roomId: roomId }, { joined: false }],
          },
        });

        if (!checkRoomToken) {
          // change status to attended for CIRRUS
          const axios = require('axios');
          const room = await models.Room.findById(roomId);
          if (room.assessmentId) {
            await axios.get(`${apiCirrus}/api/ApiAssessmentStatus?id=${room.assessmentId}`, {
              headers: {
                authorization: cirrusAuthToken,
              },
            }).then((res) => {
              if (res.data.status == true) {
                // change status to attended for VIDEO
                models.Room.update(
                  { status: models.Room.STATUS_ATTENDED },
                  { where: { id: roomId } },
                );
              }
            });
          }
        }
      } catch (error) { }
    };

    socket.on('notify-participants', () => {
      if (!checkRoomIdOrEmitInvalid()) {
        return;
      }
      const { roomId, userId, roomTokenId } = socket;
      emails.notifyParticipants({
        roomId,
        userId,
        roomTokenId,
      });
    });

    socket.on('notify-fail', async (model) => {
      try {
        if (!checkRoomIdOrEmitInvalid()) {
          return;
        }
        const { roomId, userId, roomTokenId } = socket;

        const checkRoom = await models.Room.findById(roomId);

        emails.notifyJoinFail({
          roomId,
          userId,
          roomTokenId,
          model,
        });

        // if (checkRoom && checkRoom.status != models.Room.STATUS_ATTENDED) {
        const axios = require('axios');
        if (checkRoom.assessmentId) {
          await axios.get(`${apiCirrus}/api/RevertAssessmentStatus?id=${checkRoom.assessmentId}`, {
            headers: {
              authorization: cirrusAuthToken,
            },
          }).then((res) => {
            if (res.data.status == true) {
            }
          });
        }
        // }


      } catch (error) {
        console.log(error);
      }
    });

    socket.on('authenticate', async qs => {
      const {
        //
        // For admin from dashboard link with query string roomId=...
        roomId, // The id of room in case of video room, or id of instruction, in case of dictation
        authToken, // The auth token from local storage or cookie
        //
        // For guest from invitation link token with query string t=...
        t,
      } = qs;
      // Validate qs
      let room;
      if (authToken && roomId) {
        const user = await models.User.findByAuthToken(authToken);
        socket.userId = user && user.id;
        room = user && (await models.Room.findById(roomId));
      } else if (t) {
        const rt = await models.RoomToken.findRaw(t);
        room = rt && (await models.Room.findById(rt.roomId));
        socket.roomTokenId = rt && rt.id;
      }
      socket.roomId = room && room.id;
      if (!checkRoomIdOrEmitInvalid()) {
        return;
      }
      socket.emit('authenticated', {
        isInstantSession: room.caseId === 'instant-sessions',
      });
    });

    socket.on('join', async () => {
      if (!checkRoomIdOrEmitInvalid()) {
        return;
      }
      const { roomId, roomTokenId } = socket;

      const sockets = io.sockets.adapter.rooms[roomId];
      if (sockets && sockets.length > 1) {
        socket.emit('full');
        return;
      }
      if (!sockets || !sockets.length) {
        socket.join(roomId);
        socket.emit('created');
      } else {
        socket.join(roomId);
        socket.emit('joined');
      }
      if (socket.roomTokenId) {
        emitParticipantJoin(socket);
      }

      var roomToken = await models.RoomToken.findById(roomTokenId);
      if (roomToken) {
        var room = await models.Room.findById(roomToken.roomId);
        var current = dateFormat(new Date(), 'yyyy/mm/dd');
        var appointmentDate = dateFormat(formatDateTime(room.startTime, room.timezone), 'yyyy/mm/dd')

        if (appointmentDate >= current) {
          //update Join in roomtoken
          await models.RoomToken.update(
            { joinedDate: new Date() },
            { where: { id: { [Op.eq]: roomTokenId } } },
          );
        }
        roomToken = await models.RoomToken.findById(roomTokenId);
        var joinedDate = dateFormat(roomToken.joinedDate, 'yyyy/mm/dd');
        var startTime = dateFormat(formatDateTime(room.startTime, room.timezone), 'yyyy/mm/dd')
        if (startTime === joinedDate) {
          //update Join in roomtoken
          await models.RoomToken.update(
            { joined: true },
            { where: { id: { [Op.eq]: roomTokenId } } },
          ).then(async () => {
            await CheckAttendedCase(roomId, roomTokenId);
          });
        }
      }
    });

    socket.on('ready', () => {
      if (!checkRoomIdOrEmitInvalid()) {
        return;
      }
      socket.broadcast.to(socket.roomId).emit('ready');
    });
    socket.on('offer', sdp => {
      if (!checkRoomIdOrEmitInvalid()) {
        return;
      }
      socket.broadcast.to(socket.roomId).emit('offer', sdp);
    });
    socket.on('answer', sdp => {
      if (!checkRoomIdOrEmitInvalid()) {
        return;
      }
      socket.broadcast.to(socket.roomId).emit('answer', sdp);
    });
    socket.on('icecandidate', candidate => {
      if (!checkRoomIdOrEmitInvalid()) {
        return;
      }
      socket.broadcast.to(socket.roomId).emit('icecandidate', candidate);
    });
    socket.on('disconnect', () => {
      if (!socket.roomId) {
        return;
      }
      socket.broadcast.to(socket.roomId).emit('participant-left');
    });
  });
};

const removeParticipant = roomTokenId => {
  const socket = getSocketFromRoomTokenId(roomTokenId);
  if (!socket) {
    return;
  }
  socket.leave(socket.roomId);
  emitParticipantLeave(socket);
  socket.emit('has-been-removed');
};

export { removeParticipant };
export default handleSocketServer2;
