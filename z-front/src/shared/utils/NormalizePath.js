import React from 'react';
import { Redirect, withRouter } from 'react-router-dom';

const NormalizePath = props => {
  const { pathname, search, hash } = props.location;
  if (pathname.length !== 1 && pathname.charAt(pathname.length - 1) === '/') {
    const normalized = pathname.replace(/\/+$/, '') || '/';
    return <Redirect to={normalized + search + hash} />;
  }
  return props.children;
};

export default withRouter(NormalizePath);
