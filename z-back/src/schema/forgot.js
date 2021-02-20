import emails from '../emails';
import Err4xx from '../errors/Err4xx';
import models from '../models';
import pubsub from '../singletons/pubsub';
import { createLoginResult } from './login';

const typeDef = `
  type Query {
    forgotCheck(forgotToken: String!): Boolean
  }
  type Mutation {
    forgotRequest(email: String!): EmptyResult
    forgotSubmit(token: String!, password: String!, login: Boolean!): LoginResult
  }
`;

const resolver = {
  Query: {
    forgotCheck: async (rootValue, args, req) => {
      // Check if this request is anonymous
      if (await models.Session.current(req)) {
        throw new Err4xx('RequireAnonymous');
      }
      // Get the token from db and check if it's correct
      const dbToken = await models.Token.findThenCompare(
        args.forgotToken,
        models.Token.TYPE_FORGOT,
      );
      return !!dbToken;
    },
  },

  Mutation: {
    forgotRequest: async (rootValue, args, req) => {
      // Check if this request is anonymous
      if (await models.Session.current(req)) {
        throw new Err4xx('RequireAnonymous');
      }
      // Get the user from db with email from args
      //    and check if it's exists
      // We should not expose that the user is exists or not
      //    just simply return an empty result for both cases
      const dbUser = await models.User.findByEmail(args.email);
      if (!dbUser) {
        return;
      }

      // Delete the old token and insert a new one
      const dbToken = await models.Token.destroyThenCreate(dbUser.id, models.Token.TYPE_FORGOT);

      // Asynchronously send an email to the user
      //    to notify the password recovery request
      emails.forgotRequest(req, dbUser, dbToken);
    },

    forgotSubmit: async (rootValue, args, req) => {
      // Check if this request is anonymous
      if (await models.Session.current(req)) {
        throw new Err4xx('RequireAnonymous');
      }
      // Get the token from db and check if it's correct
      const dbToken = await models.Token.findThenCompare(args.token, models.Token.TYPE_FORGOT);
      if (!dbToken) {
        throw new Err4xx('ForgotTokenIncorrect');
      }

      const { password, login } = args;
      // TODO validate args

      // Get the sessions to notify the logout event
      //    after update the new password
      const dbSessions = await models.Session.findByUserId(dbToken.userId);

      // Update password and logout other sessions
      await Promise.all([
        models.User.updatePwd(dbToken.userId, password),
        models.Token.destroyById(dbToken.id),
        models.Session.logout(dbToken.userId),
      ]);

      // Publish the event to notify the clients
      dbSessions.forEach(dbSession => {
        pubsub.publish('logout', {
          sessionId: dbSession.id,
        });
      });

      return login ? createLoginResult(req, dbToken.userId) : null;
    },
  },
};

export { typeDef, resolver };
