import log from 'nn-node-log';
import { formatError } from 'graphql';

import Err4xx from '../errors/Err4xx';
import schema, { resolvers as rootValue } from '../schema';

const graphqlConfig = {
  schema,
  rootValue,
  formatError: err => {
    const res = formatError(err);
    const { originalError } = err;
    if (!originalError) {
      return res;
    }
    if (originalError instanceof Err4xx) {
      res.status = originalError.status || 400;
      res.message = originalError.message;
      res.data = originalError.data;
    } else {
      log.stack(originalError);
      res.message = 'Internal server error';
      res.data = { type: 'ErrInternalServer' };
    }
    return res;
  },
};

export default graphqlConfig;
