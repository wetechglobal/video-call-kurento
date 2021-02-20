import React, { Component } from 'react';
import { Button, Modal, Form, Input, notification } from 'antd';

import { showApolloError, showInvalidFormError } from '../utils/errors';

const FormItem = Form.Item;
// const SelectOption = Select.Option;

class PageInstructionListCreate extends Component {
  state = {
    formLoading: false,
  };

  componentWillUnmount() {
    notification.destroy('instructionMutate-error');
  }

  handleFormSubmit = e => {
    e.preventDefault();
    notification.destroy('instructionMutate-error');
    if (this.state.formLoading) {
      return;
    }

    const { form, editingInstruction, instructionCreate, instructionUpdate, refetch } = this.props;

    form.validateFields((validateErr, instruction) => {
      if (validateErr) {
        showInvalidFormError('instructionMutate-error');
        return;
      }
      this.setState({ formLoading: true });

      let fn = instructionCreate;
      if (editingInstruction) {
        instruction.instructionId = editingInstruction.id;
        fn = instructionUpdate;
      } else {
        // Attach caseId here, instead of an input
        instruction.caseId = this.props.caseId;
      }

      const variables = { instruction };
      fn({ variables })
        .then(() => {
          this.setState({ formLoading: false });
          this.handleModalCancel();
          refetch();
        })
        .catch(apolloErr => {
          this.setState({ formLoading: false });
          showApolloError(apolloErr, 'instructionMutate-error');
        });
    });
  };

  handleModalCancel = () => {
    notification.destroy('instructionMutate-error');
    this.props.form.resetFields();
    this.props.close();
  };

  render() {
    const { form, visible, editingInstruction } = this.props;
    const { formLoading } = this.state;

    const { getFieldDecorator } = form;
    const { title, description } = editingInstruction || {};

    const titleInput = getFieldDecorator('title', {
      rules: [{ required: true, message: 'This field is required' }],
      initialValue: title,
    })(<Input />);
    const descriptionInput = getFieldDecorator('description', {
      initialValue: description || '',
    })(<Input type="textarea" />);

    const formTitle = editingInstruction ? 'Update Instruction' : 'Create New Instruction';
    const formSubmitText = editingInstruction ? 'Update' : 'Create';

    return (
      <Modal visible={visible} onCancel={this.handleModalCancel} footer={null}>
        <div className="ant-custom-modal">
          <Form onSubmit={this.handleFormSubmit}>
            <h1>{formTitle}</h1>
            <FormItem label="Title">{titleInput}</FormItem>
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

PageInstructionListCreate.defaultProps = {
  editingInstruction: null,
};

const WithAntForm = Form.create()(PageInstructionListCreate);

export default WithAntForm;
