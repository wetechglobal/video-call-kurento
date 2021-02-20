import { STRING, TEXT, BOOLEAN, DATE } from 'sequelize';

import db from '../singletons/db';
import utils from '../utils';
import Room from './Room';
import User from './User';

const RoomToken = db.define('RoomToken', {
  id: {
    type: STRING,
    primaryKey: true,
  },
  roomId: {
    type: STRING,
    model: Room,
  },
  title: STRING,
  firstName: STRING,
  lastName: STRING,
  phone: STRING,
  email: STRING,
  tokenValue: TEXT,
  joined: {
    type: BOOLEAN,
    defaultValue: false,
  },
  joinedDate: DATE,
});

RoomToken.prototype.displayName = User.prototype.displayName;
RoomToken.prototype.surName = User.prototype.surName;
RoomToken.findThenCompare = async (encodedToken, roomId) => {
  const decoded = utils.decodeToken(encodedToken);
  if (!decoded) {
    return null;
  }
  const dbToken = await RoomToken.findById(decoded.id);
  if (!dbToken || dbToken.roomId !== roomId || dbToken.tokenValue !== decoded.tokenValue) {
    return null;
  }
  return dbToken;
};

RoomToken.findRaw = async encodedToken => {
  const decoded = utils.decodeToken(encodedToken);
  if (!decoded) {
    return null;
  }
  const dbToken = await RoomToken.findById(decoded.id);
  if (!dbToken || dbToken.tokenValue !== decoded.tokenValue) {
    return null;
  }
  return dbToken;
};

export default RoomToken;
