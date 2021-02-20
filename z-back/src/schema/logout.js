import { Op } from 'sequelize';
import { withFilter } from 'graphql-subscriptions';

import Err4xx from '../errors/Err4xx';
import models from '../models';
import pubsub from '../singletons/pubsub';

const typeDef = `
  type Mutation {
    # Log the user out.
    logout: EmptyResult
  }
  type Subscription {
    # An event to notify that the user has been logged out.
    # This event is intent to notify logout in multiple opening tabs
    # when the user logout themselves,
    # or if an session gets killed by user when they manage their sessions,
    # or if they change their password and want to kill other sessions,
    # etc...
    logout(sessionId: String!): EmptyResult
  }
`;

const resolver = {
  Mutation: {
    logout: async (rootValue, args, req) => {
      // Check if this request is authenticated
      // Pass false to the second parameter to ignore updating the last access info
      const currSession = await models.Session.current(req, false);
      if (!currSession) {
        throw new Err4xx('Unauthenticated');
      }
      // Delete the session
      await models.Session.destroy({
        where: {
          id: {
            [Op.eq]: currSession.id,
          },
        },
      });
      // Publish the event to notify the clients
      pubsub.publish('logout', {
        sessionId: currSession.id,
      });
    },
  },

  Subscription: {
    logout: {
      subscribe: withFilter(
        () => pubsub.asyncIterator('logout'),
        (published, args) => published.sessionId === args.sessionId,
      ),
    },
  },
};

export { typeDef, resolver };
