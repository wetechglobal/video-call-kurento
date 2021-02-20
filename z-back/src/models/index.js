import { Op } from 'sequelize';
import requireDirectory from 'require-directory';

const attachOtherUtils = model => {
  model.destroyById = id =>
    model.destroy({
      where: {
        id: {
          [Op.eq]: id,
        },
      },
    });
};

const models = requireDirectory(module);
Object.entries(models).forEach(([k, v]) => {
  if (k.endsWith('Utils')) {
    delete models[k];
    return;
  }
  const model = v.default;
  attachOtherUtils(model);
  models[k] = model;
});

export default models;
