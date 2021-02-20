import models from '../models';

const typeDef = `
  type Query {
    verifyToken(token: String!): Boolean!
  }
`;

const resolver = {
  Query: {
    verifyToken: async (rootValue, args, req) => {
      const currUser = await models.User.current(req);
      if (currUser) {
        return false;
      }

      const { token } = args;
      // TODO validate args

      const dbToken = await models.Token.findThenCompare(token, models.Token.TYPE_VERIFY);
      if (!dbToken) {
        return false;
      }

      const dbUser = await models.User.findById(dbToken.userId);
      if (!dbUser || dbUser.emailVerified) {
        return false;
      }

      return true;
    },
  },
};

export { typeDef, resolver };
