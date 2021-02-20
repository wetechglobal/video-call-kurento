import React from 'react';
import { NavLink } from 'react-router-dom';

import Anonymous from './Anonymous';

const Page404 = () => (
  <Anonymous title="Page not found">
    <NavLink to="/-/login">Login</NavLink>
  </Anonymous>
);

export default Page404;
