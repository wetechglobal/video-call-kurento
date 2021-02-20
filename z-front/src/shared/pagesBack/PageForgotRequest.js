import React, { Component } from 'react';
import { Button, Form, Icon, Input, notification } from 'antd';
import { gql, graphql, compose } from 'react-apollo';
import { NavLink } from 'react-router-dom';

import Anonymous from './Anonymous';
import { showApolloError, showInvalidFormError } from '../utils/errors';

const FormItem = Form.Item;

const errorKey = 'forgot-password-error';

const forgotRequestGql = gql`
  mutation forgotRequest($email: String!) {
    forgotRequest(email: $email)
  }
`;

class PageForgotRequest extends Component {
  state = {
    submitLoading: false,
    requestSuccess: false,
  };

  componentWillUnmount() {
    notification.destroy(errorKey);
  }

  handleFormSubmit = e => {
    e.preventDefault();
    notification.destroy(errorKey);

    this.props.form.validateFields((validateErr, variables) => {
      if (validateErr) {
        showInvalidFormError(errorKey);
        return;
      }

      this.setState({
        submitLoading: true,
        requestSuccess: false,
      });
      this.props
        .forgotRequest({ variables })
        .then(() => {
          this.setState({
            submitLoading: false,
            requestSuccess: true,
          });
        })
        .catch(apolloErr => {
          showApolloError(apolloErr, errorKey);
          this.setState({
            submitLoading: false,
            requestSuccess: false,
          });
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

    return (
      <Anonymous title="Forgot password">
        <Form onSubmit={this.handleFormSubmit}>
          {this.state.requestSuccess ? (
            <div>
              <p>Your recovery request has been processed.</p>
              <p>If your email address exists in the system, there will be an email on its way.</p>
            </div>
          ) : (
            <div>
              <FormItem>{emailInput}</FormItem>
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
          )}
          <hr />
          {this.state.requestSuccess && (
            <div>
              <a onClick={() => this.setState({ requestSuccess: false })}>Resend</a>
            </div>
          )}
          <NavLink to="/-/login">Login</NavLink>
        </Form>
      </Anonymous>
    );
  }
}

const WithAntForm = Form.create()(PageForgotRequest);
const ThenWithGraphQL = compose(
  graphql(forgotRequestGql, {
    name: 'forgotRequest',
  }),
)(WithAntForm);

export default ThenWithGraphQL;
