import { Op } from 'sequelize';
import models from '../models';
import utils from '../utils';

const typeDef = `
  type CaseNote {
    id: ID!
    body: String!
    createdAt: Date!
    updatedAt: Date
    createdById: ID!
    createdBy: String!
    updatedBy: String
  }
  type Query {
    caseNoteList(caseId: ID!): [CaseNote!]!
  }
  type Mutation {
    caseNoteCreate(caseId: ID!, body: String!): EmptyResult
    caseNoteUpdate(id: ID!, body: String!): EmptyResult
    caseNoteDelete(id: ID!): EmptyResult
  }
`;

const resolver = {
  Query: {
    caseNoteList: async (rootValue, args, req) => {
      const notes = await models.CaseNote.findAll({
        where: {
          caseId: {
            [Op.eq]: args.caseId,
          },
        },
        order: [['createdAt', 'ASC']],
      });
      const userDL = utils.getDataloader(req, models.User);
      notes.forEach(n => {
        n.createdBy = userDL.load(n.createdById).then(u => (u ? u.displayName() : ''));
        n.updatedBy =
          n.updatedById && userDL.load(n.updatedById).then(u => (u ? u.displayName() : ''));
      });
      return notes;
    },
  },

  Mutation: {
    caseNoteCreate: async (rootValue, args, req) => {
      args.createdById = (await models.Session.current(req)).userId;
      await models.CaseNote.create(args);
    },
    caseNoteUpdate: async (rootValue, args, req) => {
      args.updatedById = (await models.Session.current(req)).userId;
      await models.CaseNote.update(args, {
        where: {
          id: {
            [Op.eq]: args.id,
          },
        },
      });
    },
    caseNoteDelete: async (rootValue, args, req) => {
      await models.CaseNote.destroyById(args.id);
    },
  },
};

export { typeDef, resolver };
