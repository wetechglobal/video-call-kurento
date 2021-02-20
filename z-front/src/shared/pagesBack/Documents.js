import { Button, Table, Upload, Icon, Modal, notification } from 'antd';
import dateFormat from 'dateformat';
import filesize from 'filesize';
import React, { PureComponent, Fragment } from 'react';
import { gql, graphql, compose } from 'react-apollo';
import { backend } from '../config';
import { showApolloError } from '../utils/errors';
import DocumentsRenameModal from './DocumentsRenameModal';

const userMeGql = gql`
  query {
    userMe {
      id
      role
    }
  }
`;
const fileUpdateGql = gql`
  mutation fileUpdate($file: FileUpdateInput!) {
    fileUpdate(file: $file)
  }
`;

const pdf = /^pdf$/;
const img = /^jpg|jpeg|png|svg|gif|bmp$/;
const audio = /^mp3|flac|wav|ogg$/;
const video = /^mp4|webm$/;

class Documents extends PureComponent {
  state = {
    previewItem: null,
    renameCurrentFilename: '',
    uploading: false,
  };

  handleUploadChange = info => {
    const { status } = info.file;
    if (status === 'uploading') {
      this.setState({ uploading: true });
      return;
    }
    if (status === 'done') {
      this.props.refetch();
    } else if (status === 'error') {
      notification.error({
        message: 'Can not upload file',
      });
    }
    this.setState({ uploading: false });
  };

  handleBeforeUpload = file => {
    if (file.size / 1000000 >= 30) {
      notification.error({
        message: 'File is too large, maximum 30MB limited',
      });
      return false;
    }
    return true;
  };

  closureHandleDeleteClick = filename => () => {
    Modal.confirm({
      title: 'Delete file',
      content: 'Do you want to delete this file?',
      okType: 'danger',
      okText: 'Delete',
      maskClosable: true,
      onOk: () => {
        this.props
          .fileUpdate({
            variables: {
              file: {
                type: 'case-documents',
                id: this.props.caseId,
                command: 'delete',
                filename,
              },
            },
          })
          .then(() => {
            this.props.refetch();
          })
          .catch(apolloError => {
            showApolloError(apolloError, 'file-update-error');
          });
      },
    });
  };

  closureHandleRenameClick = filename => () => {
    this.setState({
      renameCurrentFilename: filename,
    });
  };

  closureHandlePreviewClick = previewItem => () => {
    this.setState({
      previewItem,
    });
  };
  closePreview = () => {
    this.setState({
      previewItem: null,
    });
  };

  columns = () => {
    const { role } = this.props.userMeData.userMe || {};
    return [
      {
        width: '30px',
        dataIndex: 'fileicon',
        render: (f, d) => <div className={`fileicon ${d.ext}`} />,
      },
      {
        title: 'Name',
        dataIndex: 'name',
        render: f => f,
      },
      {
        title: <span className="pull-right">Size</span>,
        dataIndex: 'size',
        render: text => <span className="pull-right">{filesize(text, { round: 1 })}</span>,
      },
      {
        title: 'Created At',
        dataIndex: 'createdAt',
        width: '155px',
        render: text => <span>{dateFormat(text, 'mmm d yyyy, h:MM TT')}</span>,
      },
      {
        dataIndex: 'preview',
        width: '80px',
        render: (f, d) => {
          const canPreview =
            pdf.test(d.ext) || img.test(d.ext) || audio.test(d.ext) || video.test(d.ext);
          return (
            canPreview && (
              <a className="link" onClick={this.closureHandlePreviewClick(d)}>
                <Icon type="eye-o" /> Preview
              </a>
            )
          );
        },
      },
      {
        title: 'Action',
        dataIndex: 'action',
        width: role !== 'DOCTOR' ? '200px' : '140px',
        render: (f, d) => {
          return (
            <span>
              <a className="link" href={d.downloadUrl} target="_blank">
                Download
              </a>
              <span className="divider">|</span>
              <a className="link" onClick={this.closureHandleRenameClick(d.name)}>
                Rename
              </a>
              {role !== 'DOCTOR' && (
                <span>
                  <span className="divider">|</span>
                  <a className="link" onClick={this.closureHandleDeleteClick(d.name)}>
                    Delete
                  </a>
                </span>
              )}
            </span>
          );
        },
      },
    ];
  };

  renderPreview() {
    const { ext, previewUrl } = this.state.previewItem;
    let child = null;
    if (pdf.test(ext)) {
      child = <iframe title={previewUrl} src={previewUrl} />;
    } else if (img.test(ext)) {
      child = <img alt={previewUrl} src={previewUrl} />;
    } else if (video.test(ext)) {
      child = (
        <video controls>
          <source src={previewUrl} type={`video/${ext}`} />
          <source src={previewUrl} type={`video/${ext}`} />
        </video>
      );
    } else if (audio.test(ext)) {
      child = (
        <audio controls>
          <source src={previewUrl} />
        </audio>
      );
    } else {
      return <p className="error">This file does not support preview</p>;
    }
    return <div className="a4-preview">{child}</div>;
  }

  renderTable() {
    const dataSource = this.props.documents.map(d => ({
      name: d.name,
      ext: d.name.split('.').pop(),
      previewUrl: `${backend}/preview/case-documents-${this.props.caseId}/${d.name}`,
      downloadUrl: `${backend}/download/case-documents-${this.props.caseId}/${d.name}`,
      createdAt: d.createdAt,
      size: d.size,
    }));
    return <Table columns={this.columns()} dataSource={dataSource} rowKey="name" size="small" />;
  }

  renderBody() {
    if (this.state.previewItem) {
      return this.renderPreview();
    }
    return this.renderTable();
  }
  renderHeader() {
    if (this.state.previewItem) {
      return (
        <div className="text-center">
          <Button type="danger" onClick={this.closePreview}>
            Close Preview
          </Button>
          <p>{this.state.previewItem.name}</p>
        </div>
      );
    }
    return (
      <Fragment>
        <div className="mTB10 pull-left">
          <Button icon="reload" onClick={this.props.refetch}>
            Reload
          </Button>
        </div>
        <div className="mTB10 pull-right">
          <Upload
            name="file"
            action={`${backend}/upload`}
            data={{ caseId: this.props.caseId }}
            onChange={this.handleUploadChange}
            beforeUpload={this.handleBeforeUpload}
            showUploadList={false}
            disabled={this.state.uploading}
          >
            <Button
              icon="upload"
              loading={this.state.uploading}
              disabled={this.state.uploading}
              type="primary"
            >
              {this.state.uploading ? 'Uploading' : 'Upload Document'}
            </Button>
          </Upload>
        </div>
      </Fragment>
    );
  }

  onRenameModalCancel = () => {
    this.setState({
      renameCurrentFilename: '',
    });
  };
  onRenameModalOk = newName => {
    if (!newName) {
      this.onRenameModalCancel();
      return;
    }
    this.props
      .fileUpdate({
        variables: {
          file: {
            type: 'case-documents',
            id: this.props.caseId,
            command: 'rename',
            filename: this.state.renameCurrentFilename,
            newName,
          },
        },
      })
      .then(() => {
        this.props.refetch();
        this.onRenameModalCancel();
      })
      .catch(apolloError => {
        showApolloError(apolloError, 'file-update-error');
      });
  };

  render() {
    return (
      <div className="Documents PageRoomDetailFiles">
        <div className="clearfix">{this.renderHeader()}</div>
        {this.renderBody()}
        {this.state.renameCurrentFilename && (
          <DocumentsRenameModal
            fileName={this.state.renameCurrentFilename}
            onOk={this.onRenameModalOk}
            onCancel={this.onRenameModalCancel}
          />
        )}
      </div>
    );
  }
}

export default compose(
  graphql(fileUpdateGql, {
    name: 'fileUpdate',
  }),
  graphql(userMeGql, {
    name: 'userMeData',
  }),
)(Documents);
