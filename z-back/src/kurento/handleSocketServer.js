import childProcess from 'child_process';
import fs from 'fs';
import KurentoClient from 'kurento-client';
import log from 'nn-node-log';
import socketio from 'socket.io';
import { filesDir, tmpFilesDir, kurentoUri } from '../config';
import models from '../models';
import User from './User';
import convertMp4ToFlac from './utils/convertMp4ToFlac';
import handleSocketServer2 from './handleSocketServer2';
import {
  registerParticipantStatus,
  emitParticipantJoin,
  getSocketFromRoomTokenId,
} from './socket-handlers/participantStatus';

const users = {};
const rooms = {};

const kurentoClient = KurentoClient.getSingleton(kurentoUri);

const removeLimit = endpoint => {
  endpoint.setMaxVideoSendBandwidth(0);
  endpoint.setMinVideoSendBandwidth(0);
  endpoint.setMinVideoRecvBandwidth(0);
};

const getRoom = roomId => {
  let room = rooms[roomId];
  if (!room) {
    const pipeline = kurentoClient.create('MediaPipeline');
    room = {
      id: roomId,
      pipeline,
      participants: {},
    };
    rooms[roomId] = room;
  }
  return room;
};

const register = async (socket, q) => {
  const {
    //
    // For owner from dashboard link with query string roomId=...
    dictation, // Flag to indicate that it's a video room or a dictation
    roomId, // The id of room in case of video room, or id of case - in case of dictation
    authToken, // The auth token from local storage or cookie
    //
    // For guest from invitation link token with query string t=...
    t,
  } = q;
  // TODO validate data

  let room = null;
  let name = '';
  let roomTokenId = '';
  let isOwner = false;

  if (t && !dictation) {
    const rt = await models.RoomToken.findRaw(t);
    if (rt) {
      room = await models.Room.findById(rt.roomId);
      name = rt.displayName();
      roomTokenId = rt.id;
    }
  } else if (authToken && roomId) {
    const user = await models.User.findByAuthToken(authToken);
    if (user) {
      name = user.displayName();
      isOwner = true;
    }
    if (!dictation) {
      room = await models.Room.findById(roomId);
    } else {
      room = await models.Case.findById(roomId);
    }
  }

  if (!name) {
    socket.emit('message', {
      id: 'registered',
      err: 'Unauthorized',
    });
    return;
  }
  if (!room) {
    socket.emit('message', {
      id: 'registered',
      err: 'Invalid',
    });
    return;
  }
  // TODO validate room status, case status

  const isDictation = !!dictation;

  socket.roomId = room.id;
  socket.isOwner = isOwner;
  socket.isDictation = isDictation;
  socket.roomTokenId = roomTokenId;
  socket.name = name;

  const user = new User(socket);
  user.roomId = room.id;
  user.isOwner = isOwner;
  user.isDictation = isDictation;
  user.roomTokenId = roomTokenId;
  user.name = name;
  users[socket.id] = user;

  socket.user = user;

  user.sendMessage({
    id: 'registered',
    roomId: room.id,
    name,
    isOwner,
  });
  if (socket.roomTokenId) {
    emitParticipantJoin(socket);
  }
};

const joinRoom = (socket, roomId) => {
  const user = users[socket.id];
  // Dictation case roomId-dictation-time
  // Then we should use startsWith
  if (!user || !roomId.startsWith(socket.roomId)) {
    log.error('Invalid joining user');
    return;
  }

  const room = getRoom(roomId);
  if (socket.isDictation) {
    user.dictationRoomId = roomId;
    socket.dictationRoomId = roomId;
  }

  const outgoingMedia = room.pipeline.create('WebRtcEndpoint');
  removeLimit(outgoingMedia);

  user.outgoingMedia = outgoingMedia;

  const iceCandidateQueue = user.iceCandidateQueueMap[socket.id];
  if (iceCandidateQueue) {
    while (iceCandidateQueue.length) {
      const candidate = iceCandidateQueue.shift();
      user.outgoingMedia.addIceCandidate(candidate);
    }
  }

  user.outgoingMedia.on('OnIceCandidate', event => {
    const candidate = KurentoClient.register.complexTypes.IceCandidate(event.candidate);
    user.sendMessage({
      id: 'iceCandidate',
      sessionId: user.id,
      candidate,
    });
  });

  const usersInRoom = room.participants;
  const data = {
    id: 'newParticipantArrived',
    new_user_id: user.id,
    name: socket.name,
  };
  Object.values(usersInRoom).forEach(u => u.sendMessage(data));

  const existingUserIds = [];
  const names = {};
  Object.values(usersInRoom).forEach(u => {
    existingUserIds.push(u.id);
    names[u.id] = u.name;
  });
  // send list of current user in the room to current participant
  user.sendMessage({
    id: 'existingParticipants',
    data: existingUserIds,
    names,
    roomId: room.id,
  });

  room.participants[user.id] = user;
};

const convertToFlacWait = recordingFilename => {
  return new Promise((resolve, reject) => {
    // Try to convert mp4 file to flac after 3 seconds
    setTimeout(async () => {
      try {
        await convertMp4ToFlac(recordingFilename);
        fs.unlinkSync(recordingFilename);
        resolve();
      } catch (err) {
        log.stack(err);
        reject(err);
      }
    }, 3000);
  });
};

const leaveRoom = (id, replay) => {
  const user = users[id];
  if (!user) {
    return;
  }

  const { recordingState, recorderEndpoint, isDictation, recordingFilename } = user;
  if (recordingState !== 'stopped' && recorderEndpoint) {
    recorderEndpoint.stop();
    if (isDictation && replay) {
      user.recordingState = 'paused';
      log.info('%s generating replay', user.name);
    } else {
      user.recordingState = 'stopped';
      // To continue recording after endcall
      delete user.recordingState;
      delete user.recorderEndpoint;
      log.info('%s stop recording', user.name);
    }
    if (isDictation && recordingFilename) {
      const newFlac = recordingFilename.replace(/\.mp4$/, '.flac');
      const tempFlac0 = recordingFilename.replace(/\.mp4$/, '-*.flac');
      const tempFlac1 = recordingFilename.replace(/\.mp4$/, '-1.flac');
      const tempFlac2 = recordingFilename.replace(/\.mp4$/, '-2.flac');
      const needConcat = fs.existsSync(newFlac);
      if (needConcat) {
        // When stop after generated replay
        if (!replay && !fs.existsSync(recordingFilename)) {
          setTimeout(() => {
            user.sendMessage({
              id: 'convertFlacFinished',
              isError: false,
            });
          }, 1000);
          return;
        }
        fs.renameSync(newFlac, tempFlac1);
      }
      convertToFlacWait(recordingFilename)
        .then(() => {
          const fn = async () => {
            user.sendMessage({
              id: 'convertFlacFinished',
              isError: false,
              replay,
            });
            if (needConcat) {
              fs.renameSync(newFlac, tempFlac2);
              // TODO handle async for a better performance?
              childProcess.execSync(`sox ${tempFlac0} ${newFlac}`);
              fs.unlinkSync(tempFlac1);
              fs.unlinkSync(tempFlac2);
            }
            if (replay) {
              const room = getRoom(user.getRoomId());
              user.recorderEndpoint = room.pipeline.create('RecorderEndpoint', {
                uri: `file://${recordingFilename}`,
                mediaProfile: 'WEBM_AUDIO_ONLY',
              });
              await kurentoClient.connect(
                user.outgoingMedia,
                user.outgoingMedia,
                user.recorderEndpoint,
              );
            }
          };
          return fn();
        })
        .catch(err => {
          log.stack(err);
          user.sendMessage({
            id: 'convertFlacFinished',
            isError: true,
            replay,
          });
        });
      // To continue recording after endcall
      return;
    }
  }

  const room = rooms[user.getRoomId()];

  if (!room) {
    return;
  }

  const usersInRoom = room.participants;
  delete usersInRoom[user.id];
  if (user.outgoingMedia) {
    user.outgoingMedia.release();
  }
  // release incoming media for the leaving user
  Object.entries(user.incomingMediaMap).forEach(([key, incoming]) => {
    incoming.release();
    delete user.incomingMediaMap[key];
  });

  const data = {
    id: 'participantLeft',
    sessionId: user.id,
  };
  Object.values(usersInRoom).forEach(u => {
    const media = u.incomingMediaMap[user.id];
    if (media) {
      media.release();
      delete u.incomingMediaMap[user.id];
    }
    u.sendMessage(data);
  });
};

const getEndpointForUser = async (socket, user, sender) => {
  let endpoint = null;
  if (user.id === sender.id) {
    endpoint = user.outgoingMedia;
  } else if (sender.id in user.incomingMediaMap) {
    endpoint = user.incomingMediaMap[sender.id];
  } else {
    const room = getRoom(user.getRoomId());
    const incoming = room.pipeline.create('WebRtcEndpoint');
    removeLimit(incoming);
    user.incomingMediaMap[sender.id] = incoming;

    const iceCandidateQueue = user.iceCandidateQueueMap[sender.id];
    if (iceCandidateQueue) {
      while (iceCandidateQueue.length) {
        const candidate = iceCandidateQueue.shift();
        incoming.addIceCandidate(candidate);
      }
    }

    incoming.on('OnIceCandidate', e => {
      const candidate = KurentoClient.register.complexTypes.IceCandidate(e.candidate);
      user.sendMessage({
        id: 'iceCandidate',
        sessionId: sender.id,
        candidate,
      });
    });

    await kurentoClient.connect(sender.outgoingMedia, incoming);

    endpoint = incoming;
  }

  return {
    endpoint,
  };
};

const receiveVideoFrom = async (socket, senderId, sdpOffer) => {
  const user = users[socket.id];
  const sender = users[senderId];
  if (!user || !sender) {
    return;
  }

  const { endpoint } = await getEndpointForUser(socket, user, sender);
  const sdpAnswer = await endpoint.processOffer(sdpOffer);

  const data = {
    id: 'receiveVideoAnswer',
    sessionId: sender.id,
    sdpAnswer,
  };
  user.sendMessage(data);
  await endpoint.gatherCandidates();
};

const addIceCandidate = (socket, message) => {
  const user = users[socket.id];
  if (!user) {
    return;
  }

  const candidate = KurentoClient.register.complexTypes.IceCandidate(message.candidate);
  user.addIceCandidate(message, candidate);
};

const generateTimestamp = () => {
  const d = new Date();
  return [
    d.getFullYear(),
    d.getMonth() + 1,
    d.getDate(),
    d.getHours(),
    d.getMinutes(),
    d.getSeconds(),
    d.getMilliseconds(),
  ]
    .map((n, i) => {
      let s = '';
      if (n < 10) {
        s += '0';
      }
      if (i === 6 && n < 100) {
        s += '0';
      }
      s += n;
      if (i === 2 || i === 5) {
        s += '-';
      }
      return s;
    })
    .join('');
};

const addRecorder = (participant, pipeline) => {
  const { isDictation } = participant;

  const dirType = 'kurento-' + (isDictation ? 'dictation' : 'session');
  const outDir = `${filesDir}${dirType}-${participant.roomId}/`;
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir);
    // TODO handle async for a better performance?
    childProcess.execSync(`chmod -R a+rwX ${outDir}`);
  }
  const dir = isDictation ? tmpFilesDir : outDir;

  const name = participant.name.toLowerCase().replace(/\s+/g, '-');
  const time = generateTimestamp();
  const uri = `${dir}${time}-${name}.mp4`;

  if (isDictation) {
    participant.recordingFilename = uri;
  }

  return pipeline.create('RecorderEndpoint', {
    uri: `file://${uri}`,
    mediaProfile: isDictation ? 'WEBM_AUDIO_ONLY' : 'MP4',
  });
};

const handleDictationSubmit = (socket, message) => {
  const currentUser = users[socket.id];
  if (!currentUser || !currentUser.isOwner) {
    return;
  }
  const recordingFilename = currentUser.recordingFilename.replace(/mp4$/, 'flac');
  try {
    if (message.ok) {
      const newName = recordingFilename.replace(
        tmpFilesDir,
        `${filesDir}kurento-dictation-${currentUser.roomId}/`,
      );
      fs.renameSync(recordingFilename, newName);
    } else {
      fs.unlinkSync(recordingFilename);
    }
    currentUser.sendMessage({
      id: 'dictationFinished',
    });
  } catch (err) {
    log.stack(err);
    currentUser.sendMessage({
      id: 'error',
    });
  }
};

const startRecording = socket => {
  const currentUser = users[socket.id];
  if (!currentUser || !currentUser.isOwner) {
    return;
  }
  const room = rooms[currentUser.getRoomId()];
  if (!room) {
    return;
  }

  Object.values(room.participants).map(async p => {
    if (p.recorderEndpoint) {
      if (p.recordingState === 'paused') {
        p.recorderEndpoint.record();
        p.recordingState = 'recording';
        log.info('%s resume recording', p.name);
      }
      p.sendMessage({
        id: 'startRecording',
      });
      return;
    }

    const recorderEndpoint = addRecorder(p, room.pipeline);
    p.recorderEndpoint = recorderEndpoint;
    await kurentoClient.connect(p.outgoingMedia, p.outgoingMedia, recorderEndpoint);
    recorderEndpoint.record();
    p.recordingState = 'recording';

    p.sendMessage({
      id: 'recordingFilename',
      recordingFilename: p.recordingFilename,
    });
    log.info('%s start recording', p.name);

    p.sendMessage({
      id: 'startRecording',
    });
  });
};

const forceRemoveMember = id => {
  const user = users[id];
  if (!user) {
    return;
  }
  leaveRoom(id);
  user.sendMessage({
    id: 'hasBeenRemoved',
  });
};
const removeMember = (socket, id) => {
  const currentUser = users[socket.id];
  if (!currentUser || !currentUser.isOwner) {
    return;
  }
  forceRemoveMember(id);
};

const forceEndCall = roomId => {
  const room = rooms[roomId];
  if (!room) {
    return;
  }
  Object.values(room.participants).forEach(p => {
    leaveRoom(p.id);
    p.sendMessage({
      id: 'endcall',
    });
  });
};
const endcall = socket => {
  const currentUser = users[socket.id];
  if (!currentUser || !currentUser.isOwner) {
    return;
  }
  forceEndCall(currentUser.getRoomId());
};

const stopRecording = socket => {
  const currentUser = users[socket.id];
  if (!currentUser || !currentUser.isOwner) {
    return;
  }

  const room = rooms[currentUser.getRoomId()];
  if (!room) {
    return;
  }

  Object.values(room.participants).forEach(p => {
    if (p.recorderEndpoint) {
      p.recorderEndpoint.pause();
      p.recordingState = 'paused';
      log.info('%s pause recording', p.name);
    }
    p.sendMessage({
      id: 'stopRecording',
    });
  });
};

const handleSocketDisconnect = socket => {
  leaveRoom(socket.id);
  delete users[socket.id];
};

const handleSocketServer = server => {
  const io = socketio(server);
  handleSocketServer2(io);
  registerParticipantStatus(io);

  io.on('connection', socket => {
    socket.emit('id', socket.id);

    socket.on('error', () => {
      handleSocketDisconnect(socket);
    });
    socket.on('disconnect', () => {
      handleSocketDisconnect(socket);
    });

    socket.on('message', async msg => {
      switch (msg.id) {
        case 'register':
          await register(socket, msg.qs);
          break;
        case 'joinRoom':
          joinRoom(socket, msg.roomId);
          break;
        case 'receiveVideoFrom':
          await receiveVideoFrom(socket, msg.sender, msg.sdpOffer);
          break;
        case 'leaveRoom':
          leaveRoom(socket.id);
          break;
        case 'generateReplay':
          leaveRoom(socket.id, true);
          break;
        case 'onIceCandidate':
          addIceCandidate(socket, msg);
          break;
        case 'startRecording':
          startRecording(socket);
          break;
        case 'stopRecording':
          stopRecording(socket);
          break;
        case 'removeMember':
          removeMember(socket, msg.data);
          break;
        case 'endcall':
          endcall(socket);
          break;
        case 'submitDictation':
          handleDictationSubmit(socket, msg);
          break;
        default:
          socket.emit({ id: 'error', message: `Invalid message ${msg}` });
      }
    });
  });
};

export const socketRemoveParticipant = roomTokenId => {
  const socket = getSocketFromRoomTokenId(roomTokenId);
  if (!socket || !socket.user) {
    return;
  }
  forceRemoveMember(socket.user.id);
};
export const socketCloseSession = forceEndCall;

export default handleSocketServer;
