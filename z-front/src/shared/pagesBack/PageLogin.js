import React, { Component } from 'react';
import { Button, Form, Icon, Input, notification } from 'antd';
import { gql, graphql, withApollo } from 'react-apollo';
import { NavLink, withRouter } from 'react-router-dom';

import Anonymous from './Anonymous';
import browserStorage from '../utils/browserStorage';
import { showApolloError, showInvalidFormError } from '../utils/errors';

const FormItem = Form.Item;

const loginGql = gql`
  mutation login($email: String!, $pwd: String!) {
    login(email: $email, pwd: $pwd) {
      authToken
    }
  }
`;

class PageLogin extends Component {
  handleFormSubmit = e => {
    e.preventDefault();
    notification.destroy('login-error');
    this.props.form.validateFields((validateErr, variables) => {
      if (validateErr) {
        showInvalidFormError('login-error');
        return;
      }
      this.props
        .login({ variables })
        .then(({ data }) => {
          browserStorage.set('authToken', data.login.authToken);
          this.props.client.resetStore();
          if (this.props.location.pathname === '/-/login') {
            this.props.history.push('/-');
          }
        })
        .catch(apolloErr => {
          showApolloError(apolloErr, 'login-error');
        });
    });
  };

  render() {
    const { getFieldDecorator } = this.props.form;
    const emailInput = getFieldDecorator('email', {
      rules: [
        { required: true, message: 'This field is required' },
        { type: 'email', message: 'Invalid email address' },
      ],
    })(<Input prefix={<Icon type="user" />} placeholder="Email" />);
    const pwdInput = getFieldDecorator('pwd', {
      rules: [
        { required: true, message: 'This field is required' },
        { min: 6, message: 'Password should have at least 6 characters' },
      ],
    })(<Input prefix={<Icon type="lock" />} type="password" placeholder="Password" />);

    return (
      <Anonymous title="Login">
        <Form onSubmit={this.handleFormSubmit}>
          <FormItem>{emailInput}</FormItem>
          <FormItem>{pwdInput}</FormItem>
          <FormItem className="clearfix">
            <Button type="primary" htmlType="submit" className="pull-right">
              Log in
            </Button>
          </FormItem>
          <hr />
          <NavLink to="/-/forgot">Forgot password</NavLink>
        </Form>
      </Anonymous>
    );
  }
}

const WithAntForm = Form.create()(PageLogin);
const ThenWithGraphQL = graphql(loginGql, { name: 'login' })(WithAntForm);
const ThenWithApollo = withApollo(ThenWithGraphQL);
const ThenWithRouter = withRouter(ThenWithApollo);

export default ThenWithRouter;
