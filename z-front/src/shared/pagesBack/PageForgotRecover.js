import React, { Component } from 'react';
import { Button, Checkbox, Form, Icon, Input, notification } from 'antd';
import { gql, graphql, withApollo, compose } from 'react-apollo';
import { NavLink, withRouter } from 'react-router-dom';

import Anonymous from './Anonymous';
import browserStorage from '../utils/browserStorage';
import { showApolloError, showInvalidFormError } from '../utils/errors';

const FormItem = Form.Item;

const forgotCheckGql = gql`
  query forgotCheck($forgotToken: String!) {
    forgotCheck(forgotToken: $forgotToken)
  }
`;
const forgotSubmitGql = gql`
  mutation forgotSubmit($token: String!, $password: String!, $login: Boolean!) {
    forgotSubmit(token: $token, password: $password, login: $login) {
      authToken
    }
  }
`;

class PageForgotRecover extends Component {
  state = {
    submitLoading: false,
  };

  handleFormSubmit = e => {
    e.preventDefault();
    notification.destroy('recover-password-error');

    this.props.form.validateFields((validateErr, formData) => {
      if (validateErr) {
        showInvalidFormError('recover-password-error');
        return;
      }

      const variables = {
        token: this.props.location.search.substring(7),
        password: formData.password,
        login: formData.login,
      };

      this.setState({
        submitLoading: true,
      });
      this.props
        .forgotSubmit({ variables })
        .then(({ data }) => {
          this.setState({
            submitLoading: false,
          });

          const authToken = data.forgotSubmit && data.forgotSubmit.authToken;
          if (authToken) {
            browserStorage.set('authToken', authToken);
            this.props.client.resetStore();
            this.props.history.replace('/-');
          } else {
            this.props.history.replace('/-/login');
          }

          setTimeout(
            () =>
              notification.success({
                message: 'Update password successfully',
              }),
            1000,
          );
        })
        .catch(apolloErr => {
          showApolloError(apolloErr, 'recover-password-error');
          this.setState({
            submitLoading: false,
          });
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
    const { loading, forgotCheck } = this.props.data;

    let children = null;
    if (loading) {
      children = 'Loading...';
    } else if (!forgotCheck) {
      children = 'The link is invalid or expired';
    } else {
      const { getFieldDecorator } = this.props.form;
      const pwInput = getFieldDecorator('password', {
        rules: [
          { required: true, message: 'This field is required' },
          { min: 6, message: 'Password should have at least 6 characters' },
        ],
      })(<Input prefix={<Icon type="lock" />} type="password" placeholder="Password" />);
      const pwConfirmInput = getFieldDecorator('confirmPassword', {
        rules: [
          { required: true, message: 'This field is required' },
          { validator: this.validateConfirmPassword },
        ],
      })(<Input prefix={<Icon type="lock" />} type="password" placeholder="Confirm password" />);
      const loginInput = getFieldDecorator('login', {
        initialValue: false,
      })(<Checkbox defaultChecked>Login intermediately</Checkbox>);
      children = (
        <div>
          <FormItem>{pwInput}</FormItem>
          <FormItem>{pwConfirmInput}</FormItem>
          <FormItem>{loginInput}</FormItem>
          <FormItem>
            <Button
              type="primary"
              htmlType="submit"
              className="pull-right"
              loading={this.state.submitLoading}
            >
              Submit
            </Button>
          </FormItem>
        </div>
      );
    }

    return (
      <Anonymous title="Recover password">
        <Form onSubmit={this.handleFormSubmit}>
          {children}
          <hr />
          <NavLink to="/-/login">Login</NavLink>
        </Form>
      </Anonymous>
    );
  }
}

const WithAntForm = Form.create()(PageForgotRecover);
const ThenWithGraphQL = compose(
  graphql(forgotCheckGql, {
    options: props => ({
      variables: {
        forgotToken: props.location.search.substring(7),
      },
    }),
    name: 'data',
  }),
  graphql(forgotSubmitGql, {
    name: 'forgotSubmit',
  }),
)(WithAntForm);
const ThenWithApollo = withApollo(ThenWithGraphQL);
const ThenWithRouter = withRouter(ThenWithApollo);

export default ThenWithRouter;
