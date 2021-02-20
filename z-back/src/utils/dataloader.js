import Dataloader from 'dataloader';
import { Op } from 'sequelize';

const cacheKey = '__dataloaders';

const getDataloader = (req, model) => {
  // Get all loaders from request cache
  let loaders = req[cacheKey];
  if (!(cacheKey in req)) {
    loaders = {};
    req[cacheKey] = loaders;
  }
  // Check if the loader for model is already exists
  if (model.name in loaders) {
    return loaders[model.name];
  }
  // Create a new loader for that model and cache
  loaders[model.name] = new Dataloader(async keys => {
    if (keys.length === 1) {
      return [await model.findById(keys[0])];
    }
    const rows = await model.findAll({
      where: {
        id: {
          [Op.in]: keys,
        },
      },
    });
    return keys.map(k => rows.find(r => r.id === k));
  });
  // Return
  return loaders[model.name];
};

export { getDataloader };
