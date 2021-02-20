import React, { Component } from 'react';
import { Button, Checkbox, Modal, Form, Select, Input, notification } from 'antd';

import { showApolloError, showInvalidFormError } from '../utils/errors';
import { handleSort, handleFilter } from '../utils/array';

const FormItem = Form.Item;
const SelectOption = Select.Option;

class PageRoomDetailParticipantsAdd extends Component {
  state = {
    formLoading: false,
    addFromExistingUsers: false,
    addFromRole: 'CLAIMANT',
    selectedUserId: null,
  };

  componentWillUnmount() {
    notification.destroy('roomParticipantAdd-error');
  }

  handleFormSubmit = e => {
    e.preventDefault();
    notification.destroy();

    if (this.state.formLoading) {
      return;
    }

    const {
      roomId,
      form,
      editing,
      roomParticipantAdd,
      roomParticipantUpdate,
      refetch,
    } = this.props;

    form.validateFields((validateErr, values) => {
      if (!this.state.addFromExistingUsers && validateErr) {
        showInvalidFormError('roomParticipantAdd-error');
        return;
      }

      let { title, firstName, lastName, email, phone, sendEmail, sendSms } = values;
      if (this.state.addFromExistingUsers) {
        const user = this.props.users.find(u => u.id === this.state.selectedUserId);
        if (!user) {
          showInvalidFormError('roomParticipantAdd-error');
          return;
        }
        firstName = user.firstName;
        lastName = user.lastName;
        title = user.title;
        email = user.email;
        phone = user.phone;
      }

      if (sendSms && !phone) {
        notification.error({
          message: 'Phone number is required to send SMS',
          duration: 0,
        });
        return;
      }

      this.setState({ formLoading: true });

      const participant = {
        title,
        firstName,
        lastName,
        phone,
        email,
        sendEmail,
        sendSms,
      };

      let fn = null;
      if (!editing) {
        fn = roomParticipantAdd;
        participant.roomId = roomId;
      } else {
        fn = roomParticipantUpdate;
        participant.invitationId = editing.id;
      }

      const variables = { participant };
      fn({ variables })
        .then(() => {
          this.setState({
            formLoading: false,
          });
          this.handleModalCancel();
          refetch();
        })
        .catch(apolloErr => {
          this.setState({ formLoading: false });
          showApolloError(apolloErr, 'roomParticipantAdd-error');
        });
    });
  };

  handleModalCancel = () => {
    this.setState({
      addFromExistingUsers: false,
      selectedUserId: null,
    });
    notification.destroy('roomParticipantAdd-error');
    this.props.form.resetFields();
    this.props.close();
  };
  onExistingUserCheckboxChange = e => {
    this.setState({
      addFromExistingUsers: e.target.checked,
      selectedUserId: null,
    });
  };
  onExistingUserSelectChange = selectedUserId => {
    this.setState({
      selectedUserId,
    });
  };

  closureOnAddFromRoleChange = addFromRole => () => {
    this.setState({
      addFromRole,
      selectedUserId: null,
    });
  };

  render() {
    const { form, visible, editing } = this.props;
    const { formLoading, selectedUserId } = this.state;

    const claimants = this.props.users.filter(u => u.role === 'CLAIMANT');
    const doctors = this.props.users.filter(u => u.role === 'DOCTOR');
    const admins = this.props.users.filter(u => u.role === 'ADMIN');
    const { addFromRole } = this.state;
    const users =
      addFromRole === 'CLAIMANT' ? claimants : addFromRole === 'DOCTOR' ? doctors : admins;
    const sortedUsers = handleSort(users);

    const { title, firstName, lastName, email, phone } = editing || {};

    const sendEmailText = editing ? 'Resend email' : 'Send email';
    const sendSmsText = editing ? 'Resend SMS' : 'Send SMS';
    const formTitle = editing ? 'Update Participant' : 'Add Participant';
    const formSubmitText = editing ? 'Update' : 'Add';

    const titleInput = form.getFieldDecorator('title', {
      initialValue: title,
    })(<Input />);
    const firstNameInput = form.getFieldDecorator('firstName', {
      rules: [{ required: true, message: 'This field is required' }],
      initialValue: firstName,
    })(<Input />);
    const lastNameInput = form.getFieldDecorator('lastName', {
      rules: [{ required: true, message: 'This field is required' }],
      initialValue: lastName,
    })(<Input />);
    const emailInput = form.getFieldDecorator('email', {
      rules: [
        { required: true, message: 'This field is required' },
        { type: 'email', message: 'Invalid email address' },
      ],
      initialValue: email,
    })(<Input />);
    const phoneInput = form.getFieldDecorator('phone', {
      initialValue: phone,
    })(<Input />);
    const sendEmailInput = form.getFieldDecorator('sendEmail', {
      initialValue: false,
    })(<Checkbox>{sendEmailText}</Checkbox>);
    const sendSmsInput = form.getFieldDecorator('sendSms', {
      initialValue: false,
    })(<Checkbox>{sendSmsText}</Checkbox>);

    return (
      <Modal visible={visible} onCancel={this.handleModalCancel} footer={null}>
        <div className="ant-custom-modal">
          <Form onSubmit={this.handleFormSubmit}>
            <h1>{formTitle}</h1>
            {!editing && (
              <FormItem>
                <Checkbox
                  checked={this.state.addFromExistingUsers}
                  onChange={this.onExistingUserCheckboxChange}
                >
                  Add participant from existing users
                </Checkbox>
              </FormItem>
            )}
            {!editing &&
              this.state.addFromExistingUsers && (
                <FormItem>
                  {addFromRole === 'CLAIMANT' ? (
                    <span className="pointer">Claimants ({claimants.length})</span>
                  ) : (
                    <a onClick={this.closureOnAddFromRoleChange('CLAIMANT')}>
                      Claimants ({claimants.length})
                    </a>
                  )}
                  <span className="divider">|</span>
                  {addFromRole === 'DOCTOR' ? (
                    <span className="pointer">Doctors ({doctors.length})</span>
                  ) : (
                    <a onClick={this.closureOnAddFromRoleChange('DOCTOR')}>
                      Doctors ({doctors.length})
                    </a>
                  )}
                  <span className="divider">|</span>
                  {addFromRole === 'ADMIN' ? (
                    <span className="pointer">Admins ({admins.length})</span>
                  ) : (
                    <a onClick={this.closureOnAddFromRoleChange('ADMIN')}>
                      Admins ({admins.length})
                    </a>
                  )}
                  <Select
                    showSearch
                    value={selectedUserId}
                    onChange={this.onExistingUserSelectChange}
                    filterOption={handleFilter}
                  >
                    {sortedUsers.map(u => (
                      <SelectOption key={u.id} value={u.id}>
                        {u.displayName}
                      </SelectOption>
                    ))}
                  </Select>
                </FormItem>
              )}
            {(editing || !this.state.addFromExistingUsers) && (
              <div>
                <FormItem label="Title">{titleInput}</FormItem>
                <FormItem label="First Name">{firstNameInput}</FormItem>
                <FormItem label="Last Name">{lastNameInput}</FormItem>
                <FormItem label="Email">{emailInput}</FormItem>
                <FormItem label="Phone Number (+CountryCode Number)">{phoneInput}</FormItem>
              </div>
            )}
            <hr />
            <div className="ant-form-item-control">
              <strong className="mr-1">Invitation link: </strong>
              {sendEmailInput}
              {sendSmsInput}
            </div>
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

const WithAntForm = Form.create()(PageRoomDetailParticipantsAdd);

export default WithAntForm;
