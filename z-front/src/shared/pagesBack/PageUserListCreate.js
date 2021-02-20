import React, { Component } from 'react';
import { Button, Modal, Form, Input, Select, notification } from 'antd';

import { showApolloError, showInvalidFormError } from '../utils/errors';

const FormItem = Form.Item;
const { Option } = Select;

class PageUserListCreate extends Component {
  state = {
    role: '', // the role in form, for conditional rendering text input for title
    formLoading: false,
  };

  componentWillUnmount() {
    notification.destroy('userMutate-error');
  }

  handleFormSubmit = e => {
    e.preventDefault();
    notification.destroy('userMutate-error');
    if (this.state.formLoading) {
      return;
    }

    const { form, editingUser, userCreate, userUpdate, refetch } = this.props;

    form.validateFields((validateErr, user) => {
      if (validateErr) {
        showInvalidFormError('userMutate-error');
        return;
      }
      this.setState({ formLoading: true });

      let fn = userCreate;
      if (editingUser) {
        user.userId = editingUser.id;
        fn = userUpdate;
      }

      const variables = { user };
      fn({ variables })
        .then(() => {
          this.setState({ formLoading: false });
          this.handleModalCancel();
          refetch().then(() => {
            if (editingUser) {
              this.props.setUserMutate();
            }
          });
        })
        .catch(apolloErr => {
          this.setState({ formLoading: false });
          showApolloError(apolloErr, 'userMutate-error');
        });
    });
  };

  handleModalCancel = () => {
    notification.destroy('userMutate-error');
    this.props.form.resetFields();
    this.props.close();
  };
  handleRoleChange = role => {
    const { form, currentUser, editingUser } = this.props;
    if (editingUser && editingUser.id === currentUser.id && role !== editingUser.role) {
      notification.error({
        message: 'You can not change your own role',
      });
      setTimeout(() => {
        form.setFieldsValue({
          role: editingUser.role,
        });
      }, 17);
      return;
    }
    this.setState({ role });
  };

  render() {
    const { form, visible, editingUser } = this.props;
    const { formLoading } = this.state;

    const { getFieldDecorator } = form;
    const { email, role, firstName, middleName, lastName, title, phone } = editingUser || {};
    const initialRole = role || 'CLAIMANT';
    const initialTitle = title;

    const emailInput = getFieldDecorator('email', {
      rules: [
        { required: true, message: 'This field is required' },
        { type: 'email', message: 'Invalid email address' },
      ],
      initialValue: email,
    })(<Input />);
    const phoneInput = getFieldDecorator('phone', {
      initialValue: phone,
    })(<Input />);
    const roleInput = getFieldDecorator('role', {
      rules: [{ required: true, message: 'This field is required' }],
      initialValue: initialRole,
    })(
      <Select onChange={this.handleRoleChange} disabled={!!editingUser}>
        <Option value="CLAIMANT">Claimant</Option>
        <Option value="DOCTOR">Doctor</Option>
        <Option value="ADMIN">Admin</Option>
      </Select>,
    );

    const r = this.state.role || initialRole;
    let titleInput = null;
    if (r === 'CLAIMANT') {
      titleInput = getFieldDecorator('title', {
        initialValue: initialTitle,
      })(
        <Select>
          <Option value="Mr.">Mr.</Option>
          <Option value="Mrs.">Mrs.</Option>
          <Option value="Ms.">Ms.</Option>
        </Select>,
      );
    } else if (r === 'DOCTOR') {
      titleInput = getFieldDecorator('title', {
        initialValue: initialTitle,
      })(
        <Select>
          <Option value="Dr.">Dr.</Option>
          <Option value="A.Prof.">A.Prof.</Option>
          <Option value="Prof.">Prof.</Option>
        </Select>,
      );
    }
    const firstNameInput = getFieldDecorator('firstName', {
      rules: [{ required: true, message: 'This field is required' }],
      initialValue: firstName,
    })(<Input />);
    const middleNameInput = getFieldDecorator('middleName', {
      initialValue: middleName,
    })(<Input />);
    const lastNameInput = getFieldDecorator('lastName', {
      rules: [{ required: true, message: 'This field is required' }],
      initialValue: lastName,
    })(<Input />);

    const formTitle = editingUser ? 'Update User' : 'Create New User';
    const formSubmitText = editingUser ? 'Update' : 'Create';

    return (
      <Modal visible={visible} onCancel={this.handleModalCancel} footer={null}>
        <div className="ant-custom-modal">
          <Form onSubmit={this.handleFormSubmit}>
            <h1>{formTitle}</h1>
            <FormItem label="Email">{emailInput}</FormItem>
            <FormItem label="Phone number">{phoneInput}</FormItem>
            <FormItem label="Role">{roleInput}</FormItem>
            {titleInput && <FormItem label="Title">{titleInput}</FormItem>}
            <FormItem label="First name">{firstNameInput}</FormItem>
            <FormItem label="Middle name">{middleNameInput}</FormItem>
            <FormItem label="Last name">{lastNameInput}</FormItem>
            <FormItem className="clearfix">
              <Button
                className="pull-right"
                disabled={formLoading}
                icon={formLoading ? 'loading' : undefined}
                type="primary"
                htmlType="submit"
              >
                {formSubmitText}
              </Button>
              <Button className="pull-right" type="danger" onClick={this.handleModalCancel}>
                Cancel
              </Button>
            </FormItem>
          </Form>
        </div>
      </Modal>
    );
  }
}

PageUserListCreate.defaultProps = {
  editingUser: null,
};

const WithAntForm = Form.create()(PageUserListCreate);

export default WithAntForm;
