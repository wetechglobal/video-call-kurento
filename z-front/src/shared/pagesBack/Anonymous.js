import React, { Component } from 'react';
import { gql, graphql } from 'react-apollo';
import { Icon, notification } from 'antd';
import { NavLink } from 'react-router-dom';

import { showApolloError } from '../utils/errors';
import './Anonymous.scss';

const userMeGql = gql`
  query {
    userMe {
      id
      displayName
    }
  }
`;

class Anonymous extends Component {
  componentDidMount() {
    this.componentDidUpdate();
  }
  componentDidUpdate() {
    // use setTimeout to ensure the ant notification is injected into the DOM
    setTimeout(this.handleComponentUpdate, 17);
  }
  handleComponentUpdate = () => {
    notification.destroy('query-error-checker');
    const { error } = this.props.data;
    if (error) {
      showApolloError(error, 'query-error-checker');
    }
  };

  render() {
    const { title, data } = this.props;
    const { loading, userMe } = data;

    let { children } = this.props;
    if (userMe) {
      children = (
        <div className="Anonymous-LoggedIn">
          <span>
            You have logged in as {userMe.displayName}. <NavLink to="/-/logout">Logout</NavLink>
          </span>
          <hr />
          <NavLink to="/-">Dashboard</NavLink>
        </div>
      );
    }

    children = loading ? (
      <div className="Anonymous-Form Anonymous-Form--loading">
        <Icon type="loading" />
      </div>
    ) : (
        <div className="Anonymous-Form">
          <h1>{title}</h1>
          {children}
        </div>
      );

    return (
      <div className="Anonymous fullscreen-fixed">
        <div className="Anonymous-Header">
          <div className="Anonymous-Logo" />
          <div className="Anonymous-CirrusSologan" />
        </div>
        <div className="Anonymous-Body">{children}</div>
      </div>
    );
  }
}

const WithGraphQL = graphql(userMeGql, {
  name: 'data',
})(Anonymous);

export default WithGraphQL;
