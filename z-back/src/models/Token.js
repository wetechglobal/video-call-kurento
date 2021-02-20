import { ENUM, STRING, TEXT, Op } from 'sequelize';

import User from './User';
import db from '../singletons/db';
import utils from '../utils';

const TYPE_VERIFY = 'VERIFY';
const TYPE_FORGOT = 'FORGOT';

const Token = db.define('Token', {
  id: {
    type: STRING,
    primaryKey: true,
  },
  userId: {
    type: STRING,
    model: User,
    unique: 'userId-tokenType',
  },
  tokenType: {
    type: ENUM(TYPE_FORGOT, TYPE_VERIFY),
    unique: 'userId-tokenType',
  },
  tokenValue: TEXT,
});

Token.TYPE_VERIFY = TYPE_VERIFY;
Token.TYPE_FORGOT = TYPE_FORGOT;

Token.destroyThenCreate = (userId, tokenType) =>
  Token.destroy({
    where: {
      userId: {
        [Op.eq]: userId,
      },
      tokenType: {
        [Op.eq]: tokenType,
      },
    },
  }).then(() =>
    Token.create({
      id: utils.newId(),
      userId,
      tokenType,
      tokenValue: utils.newUrlToken(),
    }),
  );

Token.findThenCompare = async (encodedToken, tokenType) => {
  const decoded = utils.decodeToken(encodedToken);
  if (!decoded) {
    return null;
  }
  const dbToken = await Token.findById(decoded.id);
  if (!dbToken || dbToken.tokenType !== tokenType || dbToken.tokenValue !== decoded.tokenValue) {
    return null;
  }
  return dbToken;
};

export default Token;
