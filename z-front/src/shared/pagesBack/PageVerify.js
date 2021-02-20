import React, { Component } from 'react';
import { Button, Form, Icon, Input, notification } from 'antd';
import { gql, graphql, withApollo, compose } from 'react-apollo';
import { withRouter } from 'react-router-dom';

import Anonymous from './Anonymous';
import browserStorage from '../utils/browserStorage';
import { showApolloError, showInvalidFormError } from '../utils/errors';

const FormItem = Form.Item;

const verifyTokenGql = gql`
  query verifyToken($token: String!) {
    verifyToken(token: $token)
  }
`;

const setPasswordGql = gql`
  mutation setPassword($token: String!, $password: String!) {
    setPassword(token: $token, password: $password) {
      authToken
    }
  }
`;

class PageVerify extends Component {
  handleFormSubmit = e => {
    e.preventDefault();
    notification.destroy('verify-email-error');
    this.props.form.validateFields((validateErr, formData) => {
      if (validateErr) {
        showInvalidFormError('verify-email-error');
        return;
      }

      const variables = {
        token: this.props.location.search.substring(7),
        password: formData.password,
      };

      this.props
        .setPassword({ variables })
        .then(({ data }) => {
          browserStorage.set('authToken', data.setPassword.authToken);
          this.props.client.resetStore();
          if (this.props.location.pathname === '/-/verify') {
            this.props.history.push('/-');
          }
        })
        .catch(apolloErr => {
          showApolloError(apolloErr, 'verify-email-error');
        });
    });
  };

  validateConfirmPassword = (rule, value, cb) => {
    const { getFieldValue } = this.props.form;
    if (value && value !== getFieldValue('password')) {
      cb('Passwords must match');
    }
    cb();
  };

  render() {
    const { loading, verifyToken } = this.props.data;
    const { getFieldDecorator } = this.props.form;
    const pwdInput = getFieldDecorator('password', {
      rules: [
        { required: true, message: 'This field is required' },
        { min: 6, message: 'Password should have at least 6 characters' },
      ],
    })(<Input prefix={<Icon type="lock" />} type="password" placeholder="Password" />);
    const pwdConfirmInput = getFieldDecorator('confirmPassword', {
      rules: [
        { required: true, message: 'This field is required' },
        { validator: this.validateConfirmPassword },
      ],
    })(<Input prefix={<Icon type="lock" />} type="password" placeholder="Confirm Password" />);

    let content;
    if (loading) {
      content = <p>Loading...</p>;
    } else if (!verifyToken) {
      content = <p>The link you visited is expired or invalid</p>;
    } else {
      content = (
        <Form onSubmit={this.handleFormSubmit}>
          <FormItem>{pwdInput}</FormItem>
          <FormItem>{pwdConfirmInput}</FormItem>
          <FormItem className="clearfix">
            <Button type="primary" htmlType="submit" className="pull-right">
              Finish
            </Button>
          </FormItem>
        </Form>
      );
    }

    return <Anonymous title="Set password">{content}</Anonymous>;
  }
}

const WithAntForm = Form.create()(PageVerify);
const ThenWithGraphQL = compose(
  graphql(verifyTokenGql, {
    options: props => ({
      variables: {
        token: props.location.search.substring(7),
      },
    }),
    name: 'data',
  }),
  graphql(setPasswordGql, {
    name: 'setPassword',
  }),
)(WithAntForm);
const ThenWithApollo = withApollo(ThenWithGraphQL);
const ThenWithRouter = withRouter(ThenWithApollo);

export default ThenWithRouter;
