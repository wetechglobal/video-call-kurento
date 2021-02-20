import { Modal, Input } from 'antd';
import React from 'react';

class DocumentsRenameModal extends React.Component {
  state = {
    renameInputValue: '',
  };

  onRenameInputChange = e => {
    this.setState({
      renameInputValue: e.target.value,
    });
  };

  onOk = () => {
    this.props.onOk(this.getNewName());
  };

  getNewName = () => {
    return (
      this.state.renameInputValue &&
      (
        this.state.renameInputValue
          .replace(/^\W+/, '')
          .replace(/\W+$/, '')
          .replace(/\W+/g, '-') +
        '.' +
        this.props.fileName.split('.').pop()
      ).toLowerCase()
    );
  };

  render() {
    return (
      <Modal
        visible
        title={`Rename ${this.props.fileName}`}
        onOk={this.onOk}
        onCancel={this.props.onCancel}
      >
        <p>
          <strong>New name: </strong>
          {this.getNewName()}
        </p>
        <Input onChange={this.onRenameInputChange} value={this.state.renameInputValue} />
      </Modal>
    );
  }
}

export default DocumentsRenameModal;
