import { DATE, ENUM, STRING, TEXT } from 'sequelize';

import db from '../singletons/db';
import User from './User';
import Case from './Case';

const STATUS_OPENING = 'OPENING';
const STATUS_CLOSED = 'CLOSED';
const STATUS_ATTENDED = 'ATTENDED';

const Room = db.define('Room', {
  id: {
    type: STRING,
    primaryKey: true,
  },
  createdBy: {
    type: STRING,
    model: User,
  },
  status: {
    type: ENUM(STATUS_OPENING, STATUS_CLOSED, STATUS_ATTENDED),
    defaultValue: STATUS_OPENING,
  },
  assessmentId: STRING,
  title: STRING,
  timezone: STRING,
  caseId: {
    type: STRING,
    model: Case,
  },
  note: TEXT,
  startTime: DATE,
  endTime: DATE,
});

Room.STATUS_OPENING = STATUS_OPENING;
Room.STATUS_CLOSED = STATUS_CLOSED;
Room.STATUS_ATTENDED = STATUS_ATTENDED;

export default Room;
