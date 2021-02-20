import { Op } from 'sequelize';
import { filesDir } from '../config';
import Err4xx from '../errors/Err4xx';
import models from '../models';
import utils from '../utils';

const typeDef = `
  type Case {
    id: ID!
    no: String!
    description: String!
    status: String!
    statusAt: Date!
    doctorId: ID!
    doctor: String!
    dr: User
    claimantId: String
    claimant: String
    clm: User
    createdAt: Date!
    createdBy: String!
    caseNoteList: [CaseNote!]!
    room: CaseSessions
  }

  type CaseSessions {
    id: String!
    title: String!
    caseId: String!
    caseNo: String!
    note: String!
    status: String!
    createdBy: String!
    createdAt: Date!
    startTime: Date!
    endTime: Date!
    timezone: String
  }

  type CaseInstructions {
    id: String!
    title: String!
    description: String!
    caseId: String!
    caseNo: String!
    createdBy: String!
    createdAt: Date!
  }

  input CaseCreateInput {
    no: String!
    description: String!
    doctorId: ID!
    claimantId: String!
  }

  type Query {
    caseList: [Case!]!
    caseDetail(id: String!): Case!
    caseSessions(caseId: String!): [CaseSessions!]!
    caseInstructions(caseId: String!): [CaseInstructions!]!
    caseDocuments(caseId: String!): String!
    caseDictations(caseId: String!): String!
  }

  type Mutation {
    caseCreate(data: CaseCreateInput!): EmptyResult
    caseUpdate(id: ID!, data: CaseCreateInput!): EmptyResult
    caseDelete(id: ID!): EmptyResult
    caseToggle(id: ID!): EmptyResult
  }
`;

const resolver = {
  Query: {
    caseList: async (rootValue, args, req) => {
      const currentUser = await models.User.current(req);
      if (!currentUser) {
        throw new Err4xx('Unauthenticated');
      }

      const whereConds = {};
      if (currentUser.role === models.User.ROLE_DOCTOR) {
        whereConds.where = {
          doctorId: {
            [Op.eq]: currentUser.id,
          },
        };
      } else if (currentUser.role !== models.User.ROLE_ADMIN) {
        throw new Err4xx('Unauthorized');
      }

      let cases = await models.Case.findAll({
        ...whereConds,
        order: [['createdAt', 'DESC']],
      });
      cases = cases.filter(c => c.id !== 'instant-sessions');

      const userDL = utils.getDataloader(req, models.User);
      cases.forEach(c => {
        c.createdBy = () => userDL.load(c.createdById).then(u => (u ? `${u.displayName()}` : ''));
        c.dr = () => userDL.load(c.doctorId);
        c.clm = () => c.claimantId && userDL.load(c.claimantId);
        c.doctor = () => userDL.load(c.doctorId).then(u => (u ? `${u.displayName()}` : ''));
        c.claimant = () =>
          c.claimantId && userDL.load(c.claimantId).then(u => (u ? `${u.displayName()}` : ''));
        c.room = () =>
          models.Room.findAll({
            limit: 1,
            order: [['startTime', 'DESC']],
            where: { caseId: c.id },
          }).then(rooms => {
            if (!rooms || !rooms.length) {
              return null;
            }
            return rooms[0];
          });
      });
      return cases;
    },

    caseDetail: async (rootValue, args, req) => {
      const currentUser = await models.User.current(req);
      if (!currentUser) {
        throw new Err4xx('Unauthenticated');
      }

      const { id } = args;
      // TODO validate args

      // Check c and privilege
      let c = await models.Case.findById(id);
      if (id === 'instant-sessions' && !c) {
        c = await models.Case.create({
          id: 'instant-sessions',
          no: 'instant-sessions',
          description: 'Instant Sessions',
          doctorId: 'instant-sessions-doctor',
          claimantId: 'instant-sessions-claimant',
          createdById: currentUser.id,
        });
      }
      if (!c) {
        throw new Err4xx('CaseNotfound');
      }
      const { role, id: userId } = currentUser;
      if (
        !(
          role === models.User.ROLE_ADMIN ||
          (role === models.User.ROLE_DOCTOR && userId === c.doctorId)
        )
      ) {
        throw new Err4xx('Unauthorized');
      }

      const userDL = utils.getDataloader(req, models.User);
      c.createdBy = () => userDL.load(c.createdById).then(u => (u ? `${u.displayName()}` : ''));
      c.dr = () => userDL.load(c.doctorId);
      c.clm = () => c.claimantId && userDL.load(c.claimantId);
      c.doctor = () => userDL.load(c.doctorId).then(u => (u ? `${u.displayName()}` : ''));
      c.claimant = () =>
        c.claimantId && userDL.load(c.claimantId).then(u => (u ? `${u.displayName()}` : ''));
      c.room = () =>
        models.Room.findAll({
          limit: 1,
          order: [['startTime', 'DESC']],
          where: { caseId: c.id },
        }).then(rooms => {
          if (!rooms || !rooms.length) {
            return null;
          }
          return rooms[0];
        });

      c.caseNoteList = () => rootValue.Query.caseNoteList(rootValue, { caseId: id }, req);

      return c;
    },

    caseSessions: async (rootValue, args, req) => {
      const currentUser = await models.User.current(req);
      if (!currentUser) {
        throw new Err4xx('Unauthenticated');
      }
      const { caseId } = args;
      // TODO validate args

      // Check case and privilege
      const myCase = await models.Case.findById(caseId);
      if (!myCase) {
        throw new Err4xx('CaseNotfound');
      }
      const { role, id: userId } = currentUser;
      if (
        !(
          role === models.User.ROLE_ADMIN ||
          (role === models.User.ROLE_DOCTOR && userId === myCase.doctorId)
        )
      ) {
        throw new Err4xx('Unauthorized');
      }

      const sessions = await models.Room.findAll({
        where: {
          caseId: {
            [Op.eq]: caseId,
          },
        },
        order: [['createdAt', 'DESC']],
      });

      const userDL = utils.getDataloader(req, models.User);
      const caseDL = utils.getDataloader(req, models.Case);

      sessions.forEach(s => {
        const { createdBy, caseId } = s;
        s.createdBy = () => userDL.load(createdBy).then(u => (u ? `${u.displayName()}` : ''));
        s.caseNo = () => caseDL.load(caseId).then(c => (c ? c.no : ''));
      });

      return sessions;
    },

    caseDocuments: async (rootValue, args, req) => {
      const { caseId } = args;
      return JSON.stringify(utils.readStats(`${filesDir}case-documents-${caseId}/`));
    },

    caseDictations: async (rootValue, args, req) => {
      const { caseId } = args;
      return JSON.stringify(utils.readStats(`${filesDir}kurento-dictation-${caseId}/`));
    },

    caseInstructions: async (rootValue, args, req) => {
      const currentUser = await models.User.current(req);
      if (!currentUser) {
        throw new Err4xx('Unauthenticated');
      }
      const { caseId } = args;
      // TODO validate args

      // Check case and privilege
      const myCase = await models.Case.findById(caseId);
      if (!myCase) {
        throw new Err4xx('CaseNotfound');
      }
      const { role, id: userId } = currentUser;
      if (
        !(
          role === models.User.ROLE_ADMIN ||
          (role === models.User.ROLE_DOCTOR && userId === myCase.doctorId)
        )
      ) {
        throw new Err4xx('Unauthorized');
      }

      const instructions = await models.Instruction.findAll({
        where: {
          caseId: {
            [Op.eq]: caseId,
          },
        },
      });

      const userDL = utils.getDataloader(req, models.User);
      const caseDL = utils.getDataloader(req, models.Case);

      instructions.forEach(i => {
        const { createdBy, caseId } = i;
        i.createdBy = () => userDL.load(createdBy).then(u => (u ? `${u.displayName()}` : ''));
        i.caseNo = () => caseDL.load(caseId).then(c => (c ? c.no : ''));
      });

      return instructions;
    },
  },
  Mutation: {
    caseCreate: async (rootValue, args, req) => {
      const currentUser = await models.User.current(req);
      if (!currentUser) {
        throw new Err4xx('Unauthenticated');
      }
      if (currentUser.role !== models.User.ROLE_ADMIN) {
        throw new Err4xx('Unauthorized');
      }

      const { no, description, doctorId, claimantId } = args.data;
      // TODO validate args

      await models.Case.create({
        no,
        description,
        doctorId,
        claimantId,
        createdById: currentUser.id,
      });
    },

    caseUpdate: async (rootValue, args, req) => {
      const currentUser = await models.User.current(req);
      if (!currentUser) {
        throw new Err4xx('Unauthenticated');
      }

      const { id } = args;
      // TODO validate args

      if (id === 'instant-sessions') {
        return;
      }
      // Check c and privilege
      const c = await models.Case.findById(id);
      if (!c) {
        throw new Err4xx('CaseNotfound');
      }
      const { role } = currentUser;
      if (role !== models.User.ROLE_ADMIN) {
        throw new Err4xx('Unauthorized');
      }

      const { no, description, doctorId, claimantId } = args.data;
      // TODO validate args

      await models.Case.update(
        {
          no,
          description,
          doctorId,
          claimantId,
        },
        {
          where: {
            id: {
              [Op.eq]: id,
            },
          },
        },
      );
    },

    caseDelete: async (rootValue, args, req) => {
      const currentUser = await models.User.current(req);
      if (!currentUser) {
        throw new Err4xx('Unauthenticated');
      }

      const { id } = args;
      // TODO validate args

      if (id === 'instant-sessions') {
        return;
      }
      // Check c and privilege
      const c = await models.Case.findById(id);
      if (!c) {
        throw new Err4xx('CaseNotfound');
      }
      const { role } = currentUser;
      if (role !== models.User.ROLE_ADMIN) {
        throw new Err4xx('Unauthorized');
      }

      await models.Case.destroyById(id);
    },

    caseToggle: async (rootValue, args, req) => {
      const currentUser = await models.User.current(req);
      if (!currentUser) {
        throw new Err4xx('Unauthenticated');
      }

      const { id } = args;
      // TODO validate args
      if (id === 'instant-sessions') {
        return;
      }

      // Check c and privilege
      const c = await models.Case.findById(id);
      if (!c) {
        throw new Err4xx('CaseNotfound');
      }
      const { role } = currentUser;
      if (role !== models.User.ROLE_ADMIN) {
        throw new Err4xx('Unauthorized');
      }

      const status =
        c.status === models.Case.STATUS_CLOSED
          ? models.Case.STATUS_OPENING
          : models.Case.STATUS_CLOSED;

      await models.Case.update(
        {
          status,
          statusAt: new Date(),
        },
        {
          where: {
            id: {
              [Op.eq]: id,
            },
          },
        },
      );
    },
  },
};

export { typeDef, resolver };
