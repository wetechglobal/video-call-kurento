import React from 'react';
import { gql, graphql } from 'react-apollo';
import { Layout } from 'antd';
import { withRouter, Redirect } from 'react-router-dom';

import DashboardBreadcrumb from './DashboardBreadcrumb';
import DashboardMenu from './DashboardMenu';
import DashboardUser from './DashboardUser';
import PageLogin from './PageLogin';

import './Dashboard.scss';

const LayoutSider = Layout.Sider;

const userMeGql = gql`
  query {
    userMe {
      id
      displayName
      role
    }
  }
`;

const Dashboard = props => {
  const { pathname } = props.location;
  if (pathname === '/-') {
    return <Redirect to="/-/cases" />;
  }

  const { userMe } = props.data;
  if (!userMe) {
    return <PageLogin />;
  }

  return (
    <Layout className="Dashboard fullscreen-fixed">
      <LayoutSider>
        <div className="Dashboard-Logo" />
        <DashboardMenu pathname={pathname} isAdmin={userMe.role === 'ADMIN'} />
      </LayoutSider>
      <Layout>
        <div className="Dashboard-Header clearfix">
          <DashboardBreadcrumb />
          <DashboardUser me={userMe} />
        </div>
        <div className="Dashboard-Content">{props.children}</div>
      </Layout>
    </Layout>
  );
};

const WithGraphQL = graphql(userMeGql, {
  name: 'data',
})(Dashboard);
const ThenWithRouter = withRouter(WithGraphQL);

ThenWithRouter.with = Component => props => (
  <ThenWithRouter>
    <Component {...props} />
  </ThenWithRouter>
);

export default ThenWithRouter;
