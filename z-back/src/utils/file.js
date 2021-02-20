import fs from 'fs';

export const readStats = filepath => {
  if (!fs.existsSync(filepath)) {
    return [];
  }
  return fs.readdirSync(filepath).map(name => {
    const stats = fs.statSync(filepath + name);
    return {
      name,
      createdAt: stats.birthtime,
      size: stats.size,
    };
  });
};
