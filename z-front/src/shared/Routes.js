// import React from 'react'
// import { Route, Switch } from 'react-router'

// import Page404 from './pages/Page404'
// import PageHome from './pages/PageHome'

// const Routes = () => (
//   <Switch>
//     <Route
//       path="/"
//       component={PageHome}
//     />
//     <Route
//       component={Page404}
//     />
//   </Switch>
// )

// export default Routes
if (typeof window !== 'undefined') {
  window.location.href = '/-/login';
}

export default () => null;
