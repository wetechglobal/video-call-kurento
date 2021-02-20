import { Op } from 'sequelize';
import { filesDir, apiCirrus, cirrusAuthToken } from '../config';
import emails from '../emails';
import Err4xx from '../errors/Err4xx';
import { isInRoom } from '../kurento/socket-handlers/participantStatus';
import { socketCloseSession } from '../kurento/handleSocketServer';
import { removeParticipant } from '../kurento/handleSocketServer2';
import models from '../models';
import utils from '../utils';

const typeDef = `
  type Room {
    id: String!
    title: String!
    caseId: String!
    caseNo: String!
    caseStatus: String!
    note: String!
    status: String!
    createdBy: String!
    doctor: String!
    createdAt: Date!
    startTime: Date!
    endTime: Date!
    timezone: String!
  }

  type RoomParticipant {
    id: String!
    title: String
    firstName: String!
    lastName: String!
    displayName: String!
    email: String!
    phone: String
    joinedDate : Date
    timezone: String
    inviteToken: String!
    isInRoom: Boolean!
  }

  input RoomCreateInput {
    title: String!
    caseId: String!
    note: String!
    startTime: Date!
    endTime: Date!
    timezone: String!
    status : String!
  }
  input RoomUpdateInput {
    roomId: String!
    title: String!
    note: String!
    startTime: Date!
    endTime: Date!
    timezone: String!
    status : String!
  }
  input RoomParticipantAddInput {
    roomId: String!
    title: String
    firstName: String!
    lastName: String!
    email: String!
    phone: String
    sendEmail: Boolean!
    sendSms: Boolean!
  }
  input RoomParticipantUpdateInput {
    invitationId: String!
    title: String
    firstName: String!
    lastName: String!
    email: String!
    phone: String
    sendEmail: Boolean!
    sendSms: Boolean!
  }

  type Query {
    roomList: [Room!]!
    roomDetail(roomId: String!): Room!
    roomParticipants(roomId: String!): [RoomParticipant!]!
    roomFiles(roomId: String!): String!
  }

  type Mutation {
    roomCreate(room: RoomCreateInput!): String!
    roomUpdate(room: RoomUpdateInput!): EmptyResult
    roomDelete(roomId: String!): EmptyResult
    roomToggle(roomId: String!): EmptyResult
    roomParticipantAdd(participant: RoomParticipantAddInput!): EmptyResult
    roomParticipantResend(invitationId: String!, type: String!): EmptyResult
    roomParticipantUpdate(participant: RoomParticipantUpdateInput!): EmptyResult
    roomParticipantDelete(invitationId: String!, delete: Boolean!): EmptyResult
  }
`;

const resolver = {
  Query: {
    roomList: async (rootValue, args, req) => {
      const currentUser = await models.User.current(req);
      if (!currentUser) {
        throw new Err4xx('Unauthenticated');
      }

      const rooms = await models.Room.findAll({
        order: [['createdAt', 'DESC']],
      });

      const userDL = utils.getDataloader(req, models.User);
      const caseDL = utils.getDataloader(req, models.Case);

      rooms.forEach(r => {
        const { createdBy, caseId } = r;
        r.createdBy = () => userDL.load(createdBy).then(u => (u ? `${u.displayName()}` : ''));
        r.caseNo = () => caseDL.load(caseId).then(c => (c ? c.no : ''));
        r.caseStatus = () => caseDL.load(caseId).then(c => (c ? c.status : ''));
        r.doctor = () =>
          caseDL
            .load(caseId)
            .then(
              c => (c ? userDL.load(c.doctorId).then(u => (u ? `${u.displayName()}` : '')) : ''),
            );
      });
      return rooms;
    },
    roomDetail: async (rootValue, args, req) => {
      const { roomId } = args;
      // TODO validate args

      // Check room and privilege
      const room = await models.Room.findById(roomId);
      if (!room) {
        throw new Err4xx('RoomNotfound');
      }

      const userDL = utils.getDataloader(req, models.User);
      const caseDL = utils.getDataloader(req, models.Case);
      const { createdBy, caseId } = room;

      room.createdBy = () => userDL.load(createdBy).then(u => (u ? `${u.displayName()}` : ''));
      room.caseNo = () => caseDL.load(caseId).then(c => (c ? c.no : ''));
      room.caseStatus = () => caseDL.load(caseId).then(c => (c ? c.status : ''));

      return room;
    },

    roomParticipants: async (rootValue, args, req) => {
      const { roomId } = args;
      // TODO validate args

      // Check room and privilege
      const room = await models.Room.findById(roomId);
      if (!room) {
        throw new Err4xx('RoomNotfound');
      }

      const participants = await models.RoomToken.findAll({
        where: {
          roomId: {
            [Op.eq]: roomId,
          },
        },
      });

      return participants.map(p => ({
        id: p.id,
        title: p.title,
        firstName: p.firstName,
        lastName: p.lastName,
        displayName: p.displayName,
        email: p.email,
        phone: p.phone,
        joinedDate: p.joinedDate,
        timezone: room.timezone,
        inviteToken: utils.encodeToken(p),
        isInRoom: isInRoom(p.id),
      }));
    },

    roomFiles: async (rootValue, args, req) => {
      const { roomId } = args;
      // TODO validate args

      // Check room and privilege
      const room = await models.Room.findById(roomId);
      if (!room) {
        throw new Err4xx('RoomNotfound');
      }

      return utils.readStats(`${filesDir}kurento-session-${roomId}/`);
    },
  },
  Mutation: {
    roomCreate: async (rootValue, args, req) => {
      // Check privilege
      const currentUser = await models.User.current(req);
      if (!currentUser) {
        throw new Err4xx('Unauthenticated');
      }

      const { title, caseId, note, startTime, endTime, timezone } = args.room;

      // Add to database
      const createdBy = currentUser.id;
      const id = utils.newId();
      await models.Room.create({
        id,
        title,
        caseId,
        note,
        createdBy,
        startTime,
        endTime,
        timezone,
      });
      return id;
    },

    roomUpdate: async (rootValue, args, req) => {
      const { roomId, title, note, startTime, endTime, timezone, status } = args.room;

      // Check room and privilege
      const room = await models.Room.findById(roomId);
      if (!room) {
        throw new Err4xx('RoomNotfound');
      }

      if (status === models.Room.STATUS_ATTENDED && status != room.status) {
        if (room.assessmentId) {
          const axios = require('axios');
          await axios.get(`${apiCirrus}/api/ApiAssessmentStatus?id=${room.assessmentId}`, {
            headers: {
              authorization: cirrusAuthToken,
            },
          }).then((res) => {
          });
        }
      }

      // Update database
      await models.Room.update(
        {
          title,
          note,
          startTime,
          endTime,
          timezone,
          status,
        },
        {
          where: {
            id: {
              [Op.eq]: roomId,
            },
          },
        },
      );
    },

    roomDelete: async (rootValue, args, req) => {
      const { roomId } = args;
      // TODO validate args

      // Check room and privilege
      const room = await models.Room.findById(roomId);
      if (!room) {
        throw new Err4xx('RoomNotfound');
      }

      // Update database
      await models.Room.destroy({
        where: {
          id: {
            [Op.eq]: roomId,
          },
        },
      });
    },

    roomToggle: async (rootValue, args, req) => {
      const { roomId } = args;
      // TODO validate args

      // Check room and privilege
      const room = await models.Room.findById(roomId);
      const status =
        room.status === models.Room.STATUS_OPENING
          ? models.Room.STATUS_CLOSED
          : models.Room.STATUS_OPENING;

      if (!room) {
        throw new Err4xx('RoomNotfound');
      }

      // Update database
      await models.Room.update(
        {
          status,
        },
        {
          where: {
            id: {
              [Op.eq]: roomId,
            },
          },
        },
      );

      if (status === models.Room.STATUS_CLOSED) {
        socketCloseSession(roomId);
      }
    },

    roomParticipantAdd: async (rootValue, args, req) => {
      const {
        roomId,
        title,
        firstName,
        lastName,
        email,
        phone,
        sendEmail,
        sendSms,
      } = args.participant;
      // TODO validate args

      // Check room and privilege
      const room = await models.Room.findById(roomId);
      if (!room) {
        throw new Err4xx('RoomNotfound');
      }

      // Insert new user to db with url token
      const dbRoomToken = await models.RoomToken.create({
        id: utils.newId(),
        roomId,
        title,
        firstName,
        lastName,
        email,
        phone,
        tokenValue: utils.newUrlToken(),
      });
      const caseDb = await models.Case.findById(room.caseId);
      const doctorDb = await models.User.findById(caseDb.doctorId);
      if (sendEmail) {
        emails.inviteParticipant(req, dbRoomToken, room, doctorDb);
      }
      if (sendSms && dbRoomToken.phone) {
        emails.smsInviteParticipant(dbRoomToken, room, doctorDb);
      }
    },
    roomParticipantResend: async (rootValue, args, req) => {
      const { invitationId, type } = args;
      // TODO validate args

      // Get invitation detail
      const dbRoomToken = await models.RoomToken.findById(invitationId);
      if (!dbRoomToken) {
        throw new Err4xx('ParticipantNotfound');
      }

      // Check room and privilege
      const room = await models.Room.findById(dbRoomToken.roomId);
      if (!room) {
        throw new Err4xx('RoomNotfound');
      }

      const caseDb = await models.Case.findById(room.caseId);
      const doctorDb = caseDb && (await models.User.findById(caseDb.doctorId));
      if (type === 'email') {
        emails.inviteParticipant(req, dbRoomToken, room, doctorDb);
      } else if (type === 'sms' && dbRoomToken.phone) {
        emails.smsInviteParticipant(dbRoomToken, room, doctorDb);
      }
    },
    roomParticipantUpdate: async (rootValue, args, req) => {
      const {
        invitationId,
        title,
        firstName,
        lastName,
        phone,
        email,
        sendEmail,
        sendSms,
      } = args.participant;

      // Get invitation detail
      const dbRoomToken = await models.RoomToken.findById(invitationId);
      if (!dbRoomToken) {
        throw new Err4xx('ParticipantNotfound');
      }

      // Check room and privilege
      const room = await models.Room.findById(dbRoomToken.roomId);
      if (!room) {
        throw new Err4xx('RoomNotfound');
      }

      await models.RoomToken.update(
        {
          title,
          firstName,
          lastName,
          phone,
          email,
        },
        {
          where: {
            id: {
              [Op.eq]: invitationId,
            },
          },
        },
      );

      dbRoomToken.title = title;
      dbRoomToken.firstName = firstName;
      dbRoomToken.lastName = lastName;
      dbRoomToken.phone = phone;
      dbRoomToken.email = email;

      const caseDb = await models.Case.findById(room.caseId);
      const doctorDb = await models.User.findById(caseDb.doctorId);

      if (sendEmail) {
        emails.inviteParticipant(req, dbRoomToken, room, doctorDb);
      }
      if (sendSms && dbRoomToken.phone) {
        emails.smsInviteParticipant(dbRoomToken, room, doctorDb);
      }
    },

    roomParticipantDelete: async (rootValue, args, req) => {
      const { invitationId } = args;
      // TODO validate args

      // Get invitation detail
      const dbRoomToken = await models.RoomToken.findById(invitationId);
      if (!dbRoomToken) {
        throw new Err4xx('ParticipantNotfound');
      }

      // Check room and privilege
      const room = await models.Room.findById(dbRoomToken.roomId);
      if (!room) {
        throw new Err4xx('RoomNotfound');
      }

      if (args.delete) {
        await models.RoomToken.destroy({
          where: {
            id: {
              [Op.eq]: invitationId,
            },
          },
        });
      }

      removeParticipant(invitationId);
    },
  },
};

export { typeDef, resolver };
