import { Op } from 'sequelize';

import emails from '../emails';
import Err4xx from '../errors/Err4xx';
import models from '../models';
import utils from '../utils';
import { pageArgs } from './Pagination';

const typeDef = `
  type User {
    id: ID!
    firstName: String!
    middleName: String
    lastName: String!
    phone: String
    title: String
    displayName: String
    email: String!
    emailVerified: Boolean!
    isPwdEmtpy: Boolean!
    role: String!
  }

  type SimpleUser {
    id: ID!
    name: String!
  }

  type UserList implements PageResult {
    users: [User!]!
    pageInfo: PageInfo!
  }

  type setPasswordResult {
    authToken: String!
  }

  input UserCreateInput {
    firstName: String!
    middleName: String
    lastName: String!
    phone: String
    title: String
    email: String!
    role: String!
  }

  input UserUpdateInput {
    userId: String!
    email: String!
    firstName: String!
    middleName: String
    lastName: String!
    phone: String
    title: String
    role: String!
  }

  type Query {
    userMe: User
    userList(page: Page): UserList!
    doctorList: [SimpleUser!]!
  }

  type Mutation {
    userCreate(user: UserCreateInput!): EmptyResult
    userUpdate(user: UserUpdateInput!): EmptyResult
    userDelete(userId: String!): EmptyResult
    userResendToken(userId: String!): EmptyResult
    setPassword(token: String!, password: String!): setPasswordResult
  }
`;

const resolver = {
  Query: {
    // Get current user information
    userMe: async (rootValue, args, req) => {
      const dbUser = await models.User.current(req);
      if (!dbUser) {
        return null;
      }

      const {
        id,
        firstName,
        middleName = '',
        lastName,
        title = '',
        displayName,
        email,
        emailVerified,
        phone,
        hashedPwd,
        role,
      } = dbUser;

      const isPwdEmtpy = !hashedPwd;
      return {
        id,
        firstName,
        middleName,
        lastName,
        title,
        displayName,
        email,
        emailVerified,
        phone,
        isPwdEmtpy,
        role,
      };
    },

    // Get list of all users for admin
    userList: async (rootValue, args, req) => {
      const currUser = await models.User.current(req);
      if (!currUser /*|| currUser.role !== models.User.ROLE_ADMIN*/) {
        throw new Err4xx('Unauthorized');
      }

      const page = pageArgs(args);
      const dbRes = await models.User.findAndCountAll({
        order: [['role', 'ASC'], ['createdAt', 'DESC']],
        ...page,
      });

      return {
        users: dbRes.rows,
        pageInfo: {
          total: dbRes.count,
        },
      };
    },

    doctorList: async (rootValue, args, req) => {
      const currUser = await models.User.current(req);
      if (!currUser) {
        throw new Err4xx('Unauthenticated');
      }
      const users = await models.User.findAll({
        where: {
          role: {
            [Op.eq]: models.User.ROLE_DOCTOR,
          },
        },
      });
      return users.map(u => ({
        id: u.id,
        name: `${u.displayName()}`,
      }));
    },
  },

  Mutation: {
    // Create new user for admin
    userCreate: async (rootValue, args, req) => {
      const currUser = await models.User.current(req);
      if (!currUser || currUser.role !== models.User.ROLE_ADMIN) {
        throw new Err4xx('Unauthorized');
      }
      const { firstName, middleName = '', lastName, email, phone, role } = args.user;
      let { title = '' } = args.user;
      // TODO validate args

      const user = await models.User.findByEmail(email);
      if (user) {
        throw new Err4xx('DuplicatedEmail');
      }

      const dbUser = await models.User.create({
        id: utils.newId(),
        email,
        hashedPwd: '',
        firstName,
        middleName,
        lastName,
        title,
        phone,
        role,
      });

      if (role === models.User.ROLE_ADMIN) {
        const dbToken = await models.Token.create({
          id: utils.newId(),
          userId: dbUser.id,
          tokenType: models.Token.TYPE_VERIFY,
          tokenValue: utils.newUrlToken(),
        });
        emails.verifyRegister(req, dbUser, dbToken);
      }
    },

    // Change user role for admin
    userUpdate: async (rootValue, args, req) => {
      const currUser = await models.User.current(req);
      if (!currUser || currUser.role !== models.User.ROLE_ADMIN) {
        throw new Err4xx('Unauthorized');
      }
      const { email, userId, firstName, middleName = '', lastName, phone } = args.user;
      let { role } = args.user;
      let { title = '' } = args.user;
      // TODO validate args

      // Do not allow admin update their own role
      if (currUser.id === userId) {
        role = models.User.ROLE_ADMIN;
      }

      const oldUser = await models.User.findById(userId);
      let { emailVerified } = oldUser;
      if (emailVerified && oldUser.email !== email) {
        emailVerified = false;
      }

      // Update database
      await models.User.update(
        {
          email,
          firstName,
          middleName,
          lastName,
          title,
          phone,
          role,
          emailVerified,
        },
        {
          where: {
            id: {
              [Op.eq]: userId,
            },
          },
        },
      );
    },

    userDelete: async (rootValue, args, req) => {
      const currUser = await models.User.current(req);
      if (!currUser || currUser.role !== models.User.ROLE_ADMIN) {
        throw new Err4xx('Unauthorized');
      }
      const { userId } = args;

      // Update database
      await Promise.all([
        models.User.destroy({
          where: {
            id: {
              [Op.eq]: userId,
            },
          },
        }),
        models.Session.destroy({
          where: {
            userId: {
              [Op.eq]: userId,
            },
          },
        }),
        models.Token.destroy({
          where: {
            userId: {
              [Op.eq]: userId,
            },
          },
        }),
        models.Room.destroy({
          where: {
            createdBy: {
              [Op.eq]: userId,
            },
          },
        }),
      ]);
    },

    userResendToken: async (rootValue, args, req) => {
      const currUser = await models.User.current(req);
      if (!currUser || currUser.role !== models.User.ROLE_ADMIN) {
        throw new Err4xx('Unauthorized');
      }
      const { userId } = args;
      // TODO validate args

      const user = await models.User.findById(userId);
      if (!user) {
        throw new Err4xx('UserNotfound');
      }

      const dbToken = await models.Token.destroyThenCreate(user.id, models.Token.TYPE_VERIFY);

      emails.verifyRegister(req, user, dbToken);
    },

    setPassword: async (rootValue, args, req) => {
      const currUser = await models.User.current(req);
      if (currUser) {
        throw new Err4xx('InvalidVerifyToken');
      }

      const { token } = args;
      // TODO validate args

      const dbToken = await models.Token.findThenCompare(token, models.Token.TYPE_VERIFY);
      if (!dbToken) {
        throw new Err4xx('InvalidVerifyToken');
      }

      const dbUser = await models.User.findById(dbToken.userId);
      if (!dbUser || dbUser.emailVerified) {
        throw new Err4xx('InvalidVerifyToken');
      }

      const { password } = args;
      // TODO validate args

      await models.User.updatePwd(dbUser.id, password);
      await models.User.verify(dbUser.id);
      const dbSession = await models.Session.create({
        id: utils.newId(),
        userId: dbUser.id,
        tokenValue: utils.newToken(),
        lastAccessInfo: utils.getAccessInfo(req),
      });

      return {
        authToken: utils.encodeToken(dbSession),
      };
    },
  },
};

export { typeDef, resolver };
