import React from 'react';

import cn from './PageError.scss';

const PageError = () => {
  const cnPageError = cn['-PageError'];

  return <pre className={cnPageError}>An error occurred</pre>;
};

export default PageError;
