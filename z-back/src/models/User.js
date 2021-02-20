import { BOOLEAN, ENUM, STRING, Op } from 'sequelize';

import db from '../singletons/db';
import Session from './Session';
import utils from '../utils';

const ROLE_ADMIN = 'ADMIN';
const ROLE_DOCTOR = 'DOCTOR';
const ROLE_CLAIMANT = 'CLAIMANT';

const User = db.define('User', {
  id: {
    type: STRING,
    primaryKey: true,
  },
  email: {
    type: STRING
  },
  phone: {
    type: STRING,
  },
  emailVerified: {
    type: BOOLEAN,
    defaultValue: false,
  },
  hashedPwd: STRING,
  role: {
    type: ENUM(ROLE_ADMIN, ROLE_CLAIMANT, ROLE_DOCTOR),
    defaultValue: ROLE_CLAIMANT,
  },
  firstName: STRING,
  middleName: {
    type: STRING,
    defaultValue: '',
  },
  lastName: STRING,
  // Title for doctor: Dr. / A.Prof. / Prof.
  title: {
    type: STRING,
    defaultValue: '',
  },
});

User.prototype.displayName = function() {
  let { title } = this;
  if (title) {
    title = `${title} `;
  }
  const { firstName, lastName } = this;
  return `${title}${firstName} ${lastName}`;
};

User.prototype.surName = function() {
  let { title } = this;
  if (title) {
    title = `${title} `;
  }
  const {  lastName } = this;
  return `${title}${lastName}`;
};

User.ROLE_ADMIN = ROLE_ADMIN;
User.ROLE_CLAIMANT = ROLE_CLAIMANT;
User.ROLE_DOCTOR = ROLE_DOCTOR;

const cacheKey = '__currUser';

const currentWithoutCache = async req => {
  const dbSession = await Session.current(req);
  if (!dbSession) {
    return null;
  }
  return User.findById(dbSession.userId);
};

User.current = async req => {
  if (!(cacheKey in req)) {
    req[cacheKey] = await currentWithoutCache(req);
  }
  return req[cacheKey];
};

User.findByAuthToken = async authToken => {
  const dbSession = await Session.findByAuthToken(authToken);
  if (!dbSession) {
    return null;
  }
  return User.findById(dbSession.userId);
};

User.findByEmail = email =>
  User.findOne({
    where: {
      email: {
        [Op.eq]: email,
      },
    },
  });

User.findThenCompare = async (email, pwd) => {
  const dbUser = await User.findByEmail(email);
  if (!dbUser || !utils.comparePwd(pwd, dbUser.hashedPwd)) {
    return null;
  }
  return dbUser;
};

User.updatePwd = (id, newPwd) =>
  User.update(
    {
      hashedPwd: utils.hashPwd(newPwd),
    },
    {
      where: {
        id: {
          [Op.eq]: id,
        },
      },
    },
  );

User.verify = id =>
  User.update(
    {
      emailVerified: true,
    },
    {
      where: {
        id: {
          [Op.eq]: id,
        },
      },
    },
  );

export default User;
