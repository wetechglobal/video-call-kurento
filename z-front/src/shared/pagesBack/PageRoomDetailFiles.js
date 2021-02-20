import { Button, Modal, Table, notification, Icon } from 'antd';
import dateFormat from 'dateformat';
import filesize from 'filesize';
import React, { Component } from 'react';
import { gql, graphql, compose } from 'react-apollo';
import 'whatwg-fetch';
import { backend } from '../config';
import { showApolloError } from '../utils/errors';
import './PageRoomDetailFiles.scss';
import DocumentsRenameModal from './DocumentsRenameModal';
import DictationContainer from '../DictationContainer';

const isChrome = /Chrome/.test(navigator.userAgent || '') && /Google/.test(navigator.vendor || '');

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

class PageRoomDetailFiles extends Component {
  state = {
    viewing: null,
    renameCurrentFileRow: null,
  };

  handleClosePreviewClick = () => {
    this.setState({ viewing: null });
  };

  closureHandleViewClick = fileRow => () => {
    const { ext } = fileRow;

    const viewing = {
      ...fileRow,
      text: null,
    };
    this.setState({ viewing });

    if (ext === 'txt') {
      this.setState({
        viewing: {
          ...viewing,
          text: {
            error: false,
            content: 'Loading...',
          },
        },
      });
      const url = this.buildPreviewUrl(fileRow);
      fetch(url)
        .then(res => res.text())
        .then(text => {
          this.setState({
            viewing: {
              ...viewing,
              text: {
                error: false,
                content: text,
              },
            },
          });
        })
        .catch(() => {
          this.setState({
            viewing: {
              ...viewing,
              text: {
                error: true,
                content: '',
              },
            },
          });
        });
    }
  };

  closureHandleRenameClick = row => () => {
    this.setState({
      renameCurrentFileRow: row,
    });
  };

  closureHandleDeleteClick = row => () =>
    Modal.confirm({
      title: 'Delete file',
      content: 'Do you want to delete this file?',
      okType: 'danger',
      okText: 'Delete',
      maskClosable: true,
      onOk: () => this.submitCommand(row, 'delete'),
      onCancel: () => {},
    });

  closureHandleAudioClick = row => () => {
    this.submitCommand(row, 'mp4-flac', true);
  };
  closureHandleTextClick = row => () => {
    this.submitCommand(row, 'flac-txt', true);
  };
  submitCommand = (fileRow, command, showProcessing = false, newName) => {
    const variables = {
      file: {
        id: this.props.caseId,
        type: 'kurento-dictation',
        command,
        filename: fileRow.filename,
        newName,
      },
    };
    notification.destroy('file-update-error');
    if (showProcessing) {
      notification.success({
        message: 'The file is added to the processing queue',
      });
    }
    return this.props
      .fileUpdate({ variables })
      .then(() => {
        this.props.refetch();
      })
      .catch(apolloError => {
        if (command === 'rename') {
          throw apolloError;
        } else {
          showApolloError(apolloError, 'file-update-error');
        }
      });
  };

  buildDownloadUrl = fileRow =>
    `${backend}/download/kurento-dictation-${this.props.caseId}/${fileRow.filename}`;
  buildPreviewUrl = fileRow =>
    `${backend}/preview/kurento-dictation-${this.props.caseId}/${fileRow.filename}`;

  columns = () => {
    const { role } = this.props.userMeData.userMe || {};
    const filesMap = (this.props.roomFiles || []).reduce((map, row) => {
      //
      // Folder in case detail
      if (row.folder) {
        return map;
      }
      map[row.filename] = true;
      return map;
    }, {});
    return [
      {
        title: '',
        width: '30px',
        dataIndex: 'fileicon',
        render: (_, row) => {
          let cn = `fileicon ${row.ext}`;
          if (this.props.hasFolder) {
            cn += ' hasfolder';
          }
          return <div className={cn} />;
        },
      },
      {
        title: 'File',
        dataIndex: 'filename',
        render: (text, row) => {
          if (row.folder) {
            return <strong className="filename hasfolder">{row.folder}</strong>;
          }
          return text;
        },
      },
      {
        title: <span className="pull-right">Size</span>,
        dataIndex: 'size',
        render: (text, row) => {
          if (row.folder) {
            return null;
          }
          return <span className="pull-right">{filesize(text, { round: 1 })}</span>;
        },
      },
      {
        title: 'Created At',
        dataIndex: 'createdAt',
        width: '155px',
        render: (text, row) => {
          if (row.folder) {
            return null;
          }
          return <span>{dateFormat(text, 'mmm d yyyy, h:MM TT')}</span>;
        },
      },
      {
        dataIndex: 'preview',
        width: '120px',
        render: (text, row) => {
          if (row.folder) {
            return null;
          }
          return (
            <a className="link" onClick={this.closureHandleViewClick(row)}>
              <Icon className="mr-1" type="eye-o" />Play Recording
            </a>
          );
        },
      },
      {
        title: 'Transcribe',
        dataIndex: 'convert',
        width: '80px',
        render: (_, row) => {
          if (row.folder) {
            return null;
          }
          if (row.ext === 'mp4') {
            if (!filesMap[row.filename.replace(/\.mp4$/, '.flac')]) {
              return (
                <a className="link" onClick={this.closureHandleAudioClick(row)}>
                  To audio
                </a>
              );
            } else {
              return <Icon type="check" />;
            }
          }
          if (row.ext === 'flac') {
            if (!filesMap[row.filename.replace(/\.flac$/, '.txt')]) {
              return (
                <a className="link" onClick={this.closureHandleTextClick(row)}>
                  To text
                </a>
              );
            } else {
              return <Icon type="check" />;
            }
          }
          return null;
        },
      },
      {
        title: 'Action',
        dataIndex: 'action',
        width: role !== 'DOCTOR' ? '190px' : '140px',
        render: (_, row) => {
          if (row.folder) {
            return null;
          }
          return (
            <span>
              <a className="link" href={this.buildDownloadUrl(row)} target="_blank">
                Download
              </a>
              <span className="divider">|</span>
              <a className="link" onClick={this.closureHandleRenameClick(row)}>
                Rename
              </a>
              {role !== 'DOCTOR' && (
                <span>
                  <span className="divider">|</span>
                  <a className="link" onClick={this.closureHandleDeleteClick(row)}>
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

  onRenameModalCancel = () => {
    this.setState({
      renameCurrentFileRow: null,
    });
  };
  onRenameModalOk = newName => {
    if (!newName) {
      this.onRenameModalCancel();
      return;
    }
    this.submitCommand(this.state.renameCurrentFileRow, 'rename', false, newName)
      .then(this.onRenameModalCancel)
      .catch(apolloError => {
        showApolloError(apolloError, 'file-update-error');
      });
  };

  render() {
    const { roomFiles = [] } = this.props;
    const { viewing } = this.state;

    const ordered = [];
    roomFiles.forEach((file, i) => {
      const { name: filename, createdAt, size } = file;
      //
      // Folder in case detail
      // if (file.folder) {
      //   ordered.push({
      //     ...file,
      //     ext: 'folder', // for icon
      //     filename: Date.now(), // key in table
      //   });
      //   return;
      // }
      const parts = filename.split('.');
      const ext = parts.pop().toLowerCase();
      const curr = {
        filename,
        ext,
        createdAt,
        size,
      };
      const prev = ordered[i - 1];
      const flacName = parts.concat(['flac']).join('.');
      if (prev && prev.filename === flacName && ext === 'mp4') {
        ordered[i] = prev;
        ordered[i - 1] = curr;
      } else {
        ordered[i] = curr;
      }
    });

    let children = null;
    if (viewing) {
      const { filename, ext, text } = viewing;
      const url = this.buildPreviewUrl(viewing);
      let viewContent = null;
      if (ext === 'mp4') {
        viewContent = (
          <video controls>
            <source src={url} type="video/mp4" />
          </video>
        );
      } else if (ext === 'flac') {
        viewContent = (
          <audio controls>
            <source src={url} type="audio/flac" />
          </audio>
        );
      } else if (text) {
        const { error, content } = text;
        viewContent = error ? (
          <p className="error">Can not load the file to preview</p>
        ) : (
          <div className="text">{content}</div>
        );
      } else {
        viewContent = <p className="error">This file does not support preview</p>;
      }
      children = (
        <div>
          <div className="TableButtons clearfix">
            <Button
              type="danger"
              icon="close-square"
              className="center"
              onClick={this.handleClosePreviewClick}
            >
              Close Preview
            </Button>
          </div>
          <div className="sub-view-content">
            <div className="text-center">{filename}</div>
            {ext === 'flac' &&
              !isChrome && (
                <div className="text-center error">
                  (Player for flac is only supported in chromium based browser)
                </div>
              )}
            {viewContent}
          </div>
        </div>
      );
    }

    const { caseId, refetch } = this.props;

    return (
      <div className="PageRoomDetailFiles">
        <div style={{ display: children ? 'none' : undefined }}>
          <div className="clearfix">
            <div className="mTB10 pull-left">
              <Button icon="reload" onClick={refetch}>
                Reload
              </Button>
            </div>
            <div className="mTB10 pull-right">
              <Button
                icon="plus-square-o"
                onClick={() =>
                  DictationContainer.inst.openDictation({
                    caseId,
                    refetch,
                  })
                }
                type="primary"
              >
                Add Dictation
              </Button>
            </div>
          </div>
          <Table columns={this.columns()} dataSource={ordered} rowKey="filename" size="small" />
        </div>
        {children}
        {this.state.renameCurrentFileRow && (
          <DocumentsRenameModal
            fileName={this.state.renameCurrentFileRow.filename}
            onOk={this.onRenameModalOk}
            onCancel={this.onRenameModalCancel}
          />
        )}
      </div>
    );
  }
}

const WithGraphQL = compose(
  graphql(userMeGql, {
    name: 'userMeData',
  }),
  graphql(fileUpdateGql, {
    name: 'fileUpdate',
  }),
)(PageRoomDetailFiles);

export default WithGraphQL;
