import { Op } from 'sequelize';
import { filesDir } from '../config';
import Err4xx from '../errors/Err4xx';
import models from '../models';
import utils from '../utils';

const typeDef = `
  type Instruction {
    id: String!
    title: String!
    description: String!
    caseId: String!
    caseNo: String!
    caseStatus: String!
    createdBy: String!
    createdAt: Date!
    documents: String!
    caseNoteList: [CaseNote!]!
  }

  input InstructionCreateInput {
    title: String!
    description: String!
    caseId: String!
  }
  input InstructionUpdateInput {
    instructionId: String!
    title: String!
    description: String!
  }

  type Query {
    instructionList: [Instruction!]!
    instructionDetail(instructionId: String!): Instruction!
    instructionDictations(instructionId: String!): String!
  }

  type Mutation {
    instructionCreate(instruction: InstructionCreateInput!): EmptyResult
    instructionUpdate(instruction: InstructionUpdateInput!): EmptyResult
    instructionDelete(instructionId: String!): EmptyResult
  }
`;

const resolver = {
  Query: {
    instructionList: async (rootValue, args, req) => {
      const currentUser = await models.User.current(req);
      if (!currentUser) {
        throw new Err4xx('Unauthenticated');
      }

      const instructions = await models.Instruction.findAll({
        where:
          currentUser.role === models.User.ROLE_ADMIN
            ? undefined
            : {
                createdBy: {
                  [Op.eq]: currentUser.id,
                },
              },
        order: [['createdAt', 'DESC']],
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
    instructionDetail: async (rootValue, args, req) => {
      const { instructionId } = args;
      // TODO validate args

      // Check instruction and privilege
      const instruction = await models.Instruction.findById(instructionId);
      if (!instruction) {
        throw new Err4xx('InstructionNotfound');
      }

      const userDL = utils.getDataloader(req, models.User);
      const caseDL = utils.getDataloader(req, models.Case);
      const { createdBy, caseId } = instruction;
      instruction.createdBy = () =>
        userDL.load(createdBy).then(u => (u ? `${u.displayName()}` : ''));
      instruction.caseNo = () => caseDL.load(caseId).then(c => c.no);
      instruction.caseStatus = () => caseDL.load(caseId).then(c => c.status);

      instruction.documents = () => rootValue.Query.caseDocuments(rootValue, { caseId }, req);
      instruction.caseNoteList = () => rootValue.Query.caseNoteList(rootValue, { caseId }, req);

      return instruction;
    },
    instructionDictations: async (rootValue, args, req) => {
      const { instructionId } = args;
      // TODO validate args

      // Check instruction and privilege
      const instruction = await models.Instruction.findById(instructionId);
      if (!instruction) {
        throw new Err4xx('InstructionNotfound');
      }

      return utils.readStats(`${filesDir}kurento-instruction-${instructionId}/`);
    },
  },
  Mutation: {
    instructionCreate: async (rootValue, args, req) => {
      // Check privilege
      const currentUser = await models.User.current(req);
      if (!currentUser) {
        throw new Err4xx('Unauthenticated');
      }

      const { title, description, caseId } = args.instruction;
      // TODO validate args

      // Add to database
      const createdBy = currentUser.id;
      await models.Instruction.create({
        id: utils.newId(),
        title,
        description,
        caseId,
        createdBy,
      });
    },

    instructionUpdate: async (rootValue, args, req) => {
      const { instructionId, title, description } = args.instruction;
      // TODO validate args

      // Check instruction and privilege
      const instruction = await models.Instruction.findById(instructionId);
      if (!instruction) {
        throw new Err4xx('InstructionNotfound');
      }

      // Update database
      await models.Instruction.update(
        {
          title,
          description,
        },
        {
          where: {
            id: {
              [Op.eq]: instructionId,
            },
          },
        },
      );
    },

    instructionDelete: async (rootValue, args, req) => {
      const { instructionId } = args;
      // TODO validate args

      // Check instruction and privilege
      const instruction = await models.Instruction.findById(instructionId);
      if (!instruction) {
        throw new Err4xx('InstructionNotfound');
      }

      // Update database
      await models.Instruction.destroy({
        where: {
          id: {
            [Op.eq]: instructionId,
          },
        },
      });
    },
  },
};

export { typeDef, resolver };
