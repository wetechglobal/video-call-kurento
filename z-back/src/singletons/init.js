import mailer from './mailer';
import models from '../models';
import utils from '../utils';

const init = async () => {
  // Sync the models with the db tables
  const promises = Object.keys(models)
    .map(k => models[k])
    .map(m => m.sync());
  // .map(m => m.sync({ force: true }))
  // Verify the mailer connection
  promises.push(mailer.verify());
  // Return the merged promise
  await Promise.all(promises);

  if (!await models.User.findByEmail('nam@namnm.com')) {
    await models.User.create({
      id: utils.newId(),
      firstName: 'System',
      middleName: '',
      lastName: 'Admin',
      email: 'nam@namnm.com',
      emailVerified: true,
      hashedPwd: utils.hashPwd('123456'),
      role: 'ADMIN',
    });
  }
};

export default init;
