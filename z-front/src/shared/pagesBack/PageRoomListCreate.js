import React, { Component } from 'react';
import { Button, Modal, Form, Input, notification, DatePicker, Select } from 'antd';
import { showApolloError, showInvalidFormError } from '../utils/errors';
import { momentDisplay, momentParse } from '../utils/timezone';

const FormItem = Form.Item;
const { RangePicker } = DatePicker;
const { Option } = Select;

class PageRoomListCreate extends Component {
  state = {
    formLoading: false,
    times: null,
    status: 'OPENING',
  };

  componentWillUnmount() {
    notification.destroy('roomMutate-error');
  }

  handleFormSubmit = e => {
    e.preventDefault();
    notification.destroy('roomMutate-error');
    if (this.state.formLoading) {
      return;
    }

    const { form, editingRoom: r, roomCreate, roomUpdate, refetch } = this.props;

    form.validateFields((validateErr, room) => {
      const ntz = Number(room.timezone.replace(/^[-+]/, ''));
      if (!/^[-+]/.test(room.timezone) || Number.isNaN(ntz) || ntz > 12) {
        notification.error({
          message: 'Invalid timezone',
          duration: 0,
          key: 'roomMutate-error',
        });
        return;
      }

      let { times } = this.state;
      if (r && !times) {
        times = [momentDisplay(r.startTime, r.timezone), momentDisplay(r.endTime, r.timezone)];
      }
      if (validateErr || !times) {
        showInvalidFormError('roomMutate-error');
        return;
      }
      this.setState({ formLoading: true });
      let fn = roomCreate;
      if (r) {
        room.roomId = r.id;
        fn = roomUpdate;
      } else {
        // Attach caseId here, instead of an input
        room.caseId = this.props.caseId;
      }

      room.startTime = momentParse(times[0], room.timezone);
      room.endTime = momentParse(times[1], room.timezone);

      const variables = { room };
      fn({ variables })
        .then(({ data: { roomCreate: id } }) => {
          if (id) {
            const { roomParticipantAdd, doctor, claimant } = this.props;
            const options = { sendEmail: false, sendSms: false, roomId: id };

            const promises = [doctor, claimant].reduce((acc, user) => {
              if (!!user) {
                const { __typename, ...u } = user;
                const promise = roomParticipantAdd({
                  variables: {
                    participant: { ...u, ...options },
                  },
                });
                acc = [...acc, promise];
              }
              return acc;
            }, []);

            return Promise.all(promises);
          }
        })
        .then(() => {
          this.setState({ formLoading: false });
          this.handleModalCancel();
          refetch();
        })
        .catch(apolloErr => {
          this.setState({ formLoading: false });
          showApolloError(apolloErr, 'roomMutate-error');
        });
    });
  };

  onStartEndTimeChange = times => {
    this.setState({ times });
  };

  handleModalCancel = () => {
    notification.destroy('roomMutate-error');
    this.props.form.resetFields();
    this.props.close();
  };

  handleStatusChange = status => {
    this.setState({ status });
  };

  render() {
    const { form, visible, editingRoom } = this.props;
    const { formLoading } = this.state;

    const { getFieldDecorator } = form;
    const { title, note, startTime, endTime, timezone, status } = editingRoom || {};
    let { times } = this.state;
    if (editingRoom && !times) {
      times = [momentDisplay(startTime, timezone), momentDisplay(endTime, timezone)];
    }
    const initialStatus = status || 'ACTIVE';
    const titleInput = getFieldDecorator('title', {
      rules: [{ required: true, message: 'This field is required' }],
      initialValue: title,
    })(<Input />);
    const startEndTimeInput = (
      <RangePicker
        value={times}
        showTime={{ format: 'hh:mm', use12Hours: false }}
        format="MMM D YYYY, hh:mm A"
        onChange={this.onStartEndTimeChange}
        placeholder={['Start time', 'End time']}
        style={{ width: '100%' }}
      />
    );

    const timezoneInput = getFieldDecorator('timezone', {
      initialValue: timezone || '+11',
    })(<Input />);
    const noteInput = getFieldDecorator('note', {
      initialValue: note || '',
    })(<Input type="textarea" />);

    const statusInput = getFieldDecorator('status', {
      rules: [{ required: true, message: 'This field is required' }],
      initialValue: initialStatus,
    })(
      <Select onChange={this.handleStatusChange}>
        <Option value="OPENING">ACTIVE</Option>
        <Option value="ATTENDED">ATTENDED</Option>
        <Option value="CLOSED">CANCELLED</Option>
      </Select>,
    );

    const formTitle = editingRoom ? 'Update Session' : 'Create New Session';
    const formSubmitText = editingRoom ? 'Update' : 'Create';

    return (
      <Modal visible={visible} onCancel={this.handleModalCancel} footer={null}>
        <div className="ant-custom-modal">
          <Form onSubmit={this.handleFormSubmit}>
            <h1>{formTitle}</h1>
            <FormItem label="Title">{titleInput}</FormItem>
            <FormItem label="Start ~ End Time">{startEndTimeInput}</FormItem>
            <FormItem label="Time Zone (UTC +)">{timezoneInput}</FormItem>
            {
              editingRoom &&
              <FormItem label="Status">{statusInput}</FormItem>
            }
            <FormItem label="Note">{noteInput}</FormItem>
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

PageRoomListCreate.defaultProps = {
  editingRoom: null,
};

const WithAntForm = Form.create()(PageRoomListCreate);

export default WithAntForm;
