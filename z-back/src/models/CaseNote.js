import { STRING, TEXT } from 'sequelize';
import db from '../singletons/db';
import Case from './Case';
import User from './User';
import utils from '../utils';

const CaseNote = db.define('CaseNote', {
  id: {
    type: STRING,
    primaryKey: true,
    defaultValue: utils.newId,
  },
  body: TEXT,
  caseId: {
    type: STRING,
    model: Case,
  },
  createdById: {
    type: STRING,
    model: User,
  },
  updatedById: {
    type: STRING,
    model: User,
  },
});

export default CaseNote;
