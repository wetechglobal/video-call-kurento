import { withFilter } from 'graphql-subscriptions';

import Err4xx from '../errors/Err4xx';
import models from '../models';
import pubsub, { waitThenPublish } from '../singletons/pubsub';
import utils from '../utils';

const typeDef = `
  type LoginResult {
    authToken: String!
  }

  type Mutation {
    # Log the user in using their email and password.
    login(email: String!, pwd: String!): LoginResult!
  }
  type Subscription {
    # An event to notify that the user has been logged in.
    # This event is intent to notify login in multiple opening tabs
    # when the user login themselves,
    # or if they get verified at the first time they register,
    # or if they update password successfully when they forgot,
    # etc...
    login(anonymousId: String!): EmptyResult
  }
`;

const buildLoginResult = (req, dbSession) => {
  // Publish the event to notify the clients
  waitThenPublish('login', {
    anonymousId: req.headers['x-anonymous-id'],
  });
  // Return
  return {
    authToken: utils.encodeToken(dbSession),
  };
};
const createLoginResult = async (req, userId) => {
  const dbSession = await models.Session.create({
    id: utils.newId(),
    userId,
    tokenValue: utils.newToken(),
    lastAccessInfo: utils.getAccessInfo(req),
  });
  return buildLoginResult(req, dbSession);
};

const resolver = {
  Mutation: {
    login: async (rootValue, args, req) => {
      // Check if this request is anonymous
      if (await models.Session.current(req)) {
        throw new Err4xx('RequireAnonymous');
      }
      // Get the user from db and check if the password is matched
      // We should not expose if the email is exists or not
      //    just simply return incorrect result for both cases
      const dbUser = await models.User.findThenCompare(args.email, args.pwd);
      if (!dbUser) {
        throw new Err4xx('LoginIncorrect');
      }

      // Create the session and build the login result
      //    then publish the login event to notify the clients
      return createLoginResult(req, dbUser.id);
    },
  },

  Subscription: {
    login: {
      subscribe: withFilter(
        () => pubsub.asyncIterator('login'),
        (published, args) => published.anonymousId && published.anonymousId === args.anonymousId,
      ),
    },
  },
};

export { typeDef, resolver, buildLoginResult, createLoginResult };
