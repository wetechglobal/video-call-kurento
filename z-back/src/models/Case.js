import { DATE, ENUM, NOW, STRING, TEXT } from 'sequelize';
import db from '../singletons/db';
import User from './User';
import utils from '../utils';

const STATUS_OPENING = 'OPENING';
const STATUS_CLOSED = 'CLOSED';

const Case = db.define('Case', {
  id: {
    type: STRING,
    primaryKey: true,
    defaultValue: utils.newId,
  },
  no: STRING,
  description: {
    type: TEXT,
    defaultValue: '',
  },
  status: {
    type: ENUM(STATUS_OPENING, STATUS_CLOSED),
    defaultValue: STATUS_OPENING,
  },
  statusAt: {
    type: DATE,
    defaultValue: NOW,
  },
  doctorId: {
    type: STRING,
    model: User,
  },
  claimantId: STRING,
  createdById: {
    type: STRING,
    model: User,
  },
});

Case.STATUS_OPENING = STATUS_OPENING;
Case.STATUS_CLOSED = STATUS_CLOSED;

export default Case;
