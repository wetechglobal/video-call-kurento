import { STRING, TEXT } from 'sequelize';

import db from '../singletons/db';
import utils from '../utils';
import Case from './Case';
import User from './User';

const Instruction = db.define('Instruction', {
  id: {
    type: STRING,
    primaryKey: true,
    defaultValue: utils.newId,
  },
  title: STRING,
  description: TEXT,
  caseId: {
    type: STRING,
    model: Case,
  },
  createdBy: {
    type: STRING,
    model: User,
  },
});

export default Instruction;
