import Sequelize, { Op } from 'sequelize';

import { dbConn } from '../config';

const db = new Sequelize(dbConn, {
  logging: false,
  define: {
    freezeTableName: true,
  },
  operatorsAliases: Op,
});

export default db;
