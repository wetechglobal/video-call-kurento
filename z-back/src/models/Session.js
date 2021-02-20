import { DATE, STRING, TEXT, NOW, Op } from 'sequelize';
import cookie from 'cookie';
import log from 'nn-node-log';

import utils from '../utils';
import User from './User';
import db from '../singletons/db';

const Session = db.define('Session', {
  id: {
    type: STRING,
    primaryKey: true,
  },
  userId: {
    type: STRING,
    model: User,
  },
  tokenValue: TEXT,
  lastAccessTime: {
    type: DATE,
    defaultValue: NOW,
  },
  lastAccessInfo: TEXT,
});

const authType = 'Bearer ';
const cacheKey = '__currSession';

const currentWithoutCache = async (req, shouldUpdateLastAccess) => {
  // Get authToken from cookie first
  const c = req.headers.cookie || '';
  const cookies = cookie.parse(c);
  let { authToken } = cookies;
  // If it's not present then get it from header
  if (!authToken) {
    const h = req.headers.authorization;
    if (h && h.startsWith(authType)) {
      authToken = h.replace(authType, '');
    }
  }
  // Get the token information from db and compare the token value
  const dbToken = await Session.findByAuthToken(authToken);
  // Update last access information
  if (dbToken && shouldUpdateLastAccess) {
    Session.updateLastAccess(req, dbToken.id).catch(err => log.stack(err));
  }
  // Return
  return dbToken;
};

Session.findByAuthToken = async authToken => {
  // Decode the authToken and check if it's valid
  const decoded = utils.decodeToken(authToken);
  if (!decoded) {
    return null;
  }
  // Get the token information from db and compare the token value
  const dbToken = await Session.findById(decoded.id);
  if (!dbToken || dbToken.tokenValue !== decoded.tokenValue) {
    return null;
  }
  // Return
  return dbToken;
};

Session.current = async (req, shouldUpdateLastAccess = true) => {
  if (!(cacheKey in req)) {
    req[cacheKey] = await currentWithoutCache(req, shouldUpdateLastAccess);
  }
  return req[cacheKey];
};

Session.findByUserId = userId =>
  Session.findAll({
    where: {
      userId: {
        [Op.eq]: userId,
      },
    },
  });

Session.updateLastAccess = (req, id) =>
  Session.update(
    {
      lastAccessTime: new Date(),
      lastAccessInfo: utils.getAccessInfo(req),
    },
    {
      where: {
        id: {
          [Op.eq]: id,
        },
      },
    },
  );

Session.logout = (userId, currSessionId) => {
  const where = {
    userId: {
      [Op.eq]: userId,
    },
  };
  if (currSessionId) {
    where.id = {
      [Op.ne]: currSessionId,
    };
  }
  return Session.destroy({
    where,
  });
};

export default Session;
