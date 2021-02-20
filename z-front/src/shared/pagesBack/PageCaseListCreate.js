import React, { Component } from 'react';
import { Button, Modal, Form, Input, Select, notification } from 'antd';

import { handleFilter, handleSort } from '../utils/array';
import { showApolloError, showInvalidFormError } from '../utils/errors';

const FormItem = Form.Item;
const SelectOption = Select.Option;

class PageCaseListCreate extends Component {
  state = {
    formLoading: false,
  };

  componentWillUnmount() {
    notification.destroy('caseMutate-error');
  }

  handleFormSubmit = e => {
    e.preventDefault();
    notification.destroy('caseMutate-error');
    if (this.state.formLoading) {
      return;
    }

    const { form, editingCase, caseCreate, caseUpdate, refetch } = this.props;

    form.validateFields((validateErr, fields) => {
      if (validateErr) {
        showInvalidFormError('caseMutate-error');
        return;
      }
      this.setState({ formLoading: true });

      let fn = caseCreate;
      const variables = { data: fields };
      if (editingCase) {
        variables.id = editingCase.id;
        fn = caseUpdate;
      }

      fn({ variables })
        .then(() => {
          this.setState({ formLoading: false });
          this.handleModalCancel();
          refetch().then(() => {
            if (editingCase) {
              this.props.setCaseMutate();
            }
          });
        })
        .catch(apolloErr => {
          this.setState({ formLoading: false });
          showApolloError(apolloErr, 'caseMutate-error');
        });
    });
  };

  handleModalCancel = () => {
    notification.destroy('caseMutate-error');
    this.props.form.resetFields();
    this.props.close();
  };

  render() {
    const { form, visible, editingCase } = this.props;
    const { formLoading } = this.state;

    const { getFieldDecorator } = form;
    const { no, doctorId, description, claimantId } = editingCase || {};

    const sortedDoctors = handleSort(this.props.doctorList);
    const sortedClaimants = handleSort(this.props.claimantList);

    const noInput = getFieldDecorator('no', {
      rules: [{ required: true, message: 'This field is required' }],
      initialValue: no,
    })(<Input />);
    const doctorInput = getFieldDecorator('doctorId', {
      rules: [{ required: true, message: 'This field is required' }],
      initialValue: doctorId,
    })(
      <Select showSearch filterOption={handleFilter}>
        {sortedDoctors.map(d => (
          <SelectOption key={d.id} value={d.id}>
            {d.displayName}
          </SelectOption>
        ))}
      </Select>,
    );
    const claimantIdInput = getFieldDecorator('claimantId', {
      rules: [{ required: true, message: 'This field is required' }],
      initialValue: claimantId,
    })(
      <Select showSearch filterOption={handleFilter}>
        {sortedClaimants.map(d => (
          <SelectOption key={d.id} value={d.id}>
            {d.displayName}
          </SelectOption>
        ))}
      </Select>,
    );
    const descriptionInput = getFieldDecorator('description', {
      initialValue: description || '',
    })(<Input type="textarea" />);

    const formTitle = editingCase ? 'Update Case' : 'Create New Case';
    const formSubmitText = editingCase ? 'Update' : 'Create';

    return (
      <Modal visible={visible} onCancel={this.handleModalCancel} footer={null}>
        <div className="ant-custom-modal">
          <Form onSubmit={this.handleFormSubmit}>
            <h1>{formTitle}</h1>
            <FormItem label="ID">{noInput}</FormItem>
            <FormItem label="Doctor">{doctorInput}</FormItem>
            <FormItem label="Claimant">{claimantIdInput}</FormItem>
            <FormItem label="Description">{descriptionInput}</FormItem>
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

PageCaseListCreate.defaultProps = {
  editingCase: null,
};

const WithAntForm = Form.create()(PageCaseListCreate);

export default WithAntForm;
