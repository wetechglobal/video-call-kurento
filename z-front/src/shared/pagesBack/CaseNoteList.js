import classnames from 'classnames';
import dateFormat from 'dateformat';
import { Button, Modal, notification } from 'antd';
import React, { Fragment } from 'react';
import ReactRTE from 'react-rte';
import { showApolloError } from '../utils/errors';
import { gql, graphql, compose } from 'react-apollo';

const toolbarConfig = {
  display: ['INLINE_STYLE_BUTTONS', 'BLOCK_TYPE_BUTTONS'],
  INLINE_STYLE_BUTTONS: [
    { label: 'Bold', style: 'BOLD' },
    { label: 'Italic', style: 'ITALIC' },
    { label: 'Underline', style: 'UNDERLINE' },
    { label: 'Strikethrough', style: 'STRIKETHROUGH' },
  ],
  BLOCK_TYPE_BUTTONS: [
    { label: 'UL', style: 'unordered-list-item' },
    { label: 'OL', style: 'ordered-list-item' },
  ],
};

const userMeGql = gql`
  query {
    userMe {
      id
      role
    }
  }
`;
const caseNoteCreateGql = gql`
  mutation caseNoteCreate($caseId: ID!, $body: String!) {
    caseNoteCreate(caseId: $caseId, body: $body)
  }
`;
const caseNoteUpdateGql = gql`
  mutation caseNoteUpdate($id: ID!, $body: String!) {
    caseNoteUpdate(id: $id, body: $body)
  }
`;
const caseNoteDeleteGql = gql`
  mutation caseNoteDelete($id: ID!) {
    caseNoteDelete(id: $id)
  }
`;

class CaseNoteList extends React.Component {
  state = {
    editorValue: ReactRTE.createEmptyValue(),
    editorHidden: false,
    editingNoteId: '',
    submitLoading: false,
  };

  onEditorChange = editorValue => {
    this.setState({ editorValue });
  };
  onToggleEditor = () => {
    this.setState({
      editorHidden: !this.state.editorHidden,
    });
  };
  onEditorSubmit = () => {
    if (
      !this.state.editorValue
        .getEditorState()
        .getCurrentContent()
        .hasText()
    ) {
      notification.error({
        message: 'Note content is required',
        key: 'CaseNoteList-mutate',
      });
      return;
    }

    let fn = null;
    const variables = {
      body: this.state.editorValue.toString('html'),
    };
    if (this.state.editingNoteId) {
      fn = this.props.caseNoteUpdate;
      variables.id = this.state.editingNoteId;
    } else {
      fn = this.props.caseNoteCreate;
      variables.caseId = this.props.caseId;
    }

    this.setState({ submitLoading: true });
    fn({ variables })
      .then(() => {
        this.props.refetch();
        this.onCancelEditNote();
      })
      .catch(apolloErr => {
        showApolloError(apolloErr, 'CaseNoteList-mutate');
      })
      .then(() => {
        this.setState({ submitLoading: false });
      });
  };

  onCancelEditNote = () => {
    this.setState({
      editingNoteId: '',
      editorValue: ReactRTE.createEmptyValue(),
    });
  };
  closureOnEditClick = note => () => {
    this.setState({
      editorHidden: false,
      editingNoteId: note.id,
      editorValue: ReactRTE.createValueFromString(note.body, 'html'),
    });
  };
  closureOnDeleteClick = note => () => {
    Modal.confirm({
      title: 'Do you want to delete this note?',
      okType: 'danger',
      okText: 'Delete',
      onOk: () => {
        this.props
          .caseNoteDelete({
            variables: {
              id: note.id,
            },
          })
          .then(() => {
            this.props.refetch();
            if (note.id === this.editingNoteId) {
              this.onCancelEditNote();
            }
          })
          .catch(apolloErr => {
            showApolloError(apolloErr, 'CaseNoteList-mutate');
          });
      },
    });
  };

  render() {
    const { editorValue, editorHidden } = this.state;
    const { id, role } = this.props.userMeData.userMe || {};

    return (
      <div className="CaseNoteList">
        <div className="clearfix">
          <div className="mTB10 pull-left">
            <Button onClick={this.onToggleEditor} className="btn-left">
              {editorHidden ? 'Show' : 'Hide'} Editor
            </Button>
            <Button
              icon="reload"
              onClick={this.props.refetch}
              className={classnames({ hidden: !editorHidden })}
            >
              Reload
            </Button>
          </div>
          <div className={classnames('mTB10 pull-right', { hidden: editorHidden })}>
            {this.state.editingNoteId && (
              <Fragment>
                <span>(Editing Note)</span>
                <Button
                  type="danger"
                  className="btn-right"
                  disabled={this.state.submitLoading}
                  onClick={this.onCancelEditNote}
                >
                  Cancel
                </Button>
              </Fragment>
            )}
            <Button
              type="primary"
              className="btn-right"
              icon="check"
              loading={this.state.submitLoading}
              onClick={this.onEditorSubmit}
            >
              {this.state.editingNoteId ? 'Update' : 'Create'} Note
            </Button>
          </div>
        </div>
        <div className={classnames('ReactRTE-editor', { hidden: editorHidden })}>
          <ReactRTE
            autoFocus
            value={editorValue}
            onChange={this.onEditorChange}
            toolbarConfig={toolbarConfig}
            placeholder="Add a note for this case"
          />
        </div>
        <div className={classnames('clearfix', { hidden: editorHidden })}>
          <div className="mTB10 pull-left">
            <Button icon="reload" onClick={this.props.refetch}>
              Reload
            </Button>
          </div>
        </div>
        {this.props.data.map(note => (
          <div className="CaseNoteItem clearfix" key={note.id}>
            <div className="CaseNoteItem-created">
              <div className="avatar" />
              <div className="name">{note.createdBy}</div>
              <div className="time">{dateFormat(note.createdAt, 'mmm d yyyy, h:MM TT')}</div>
            </div>
            <div className="CaseNoteItem-body">
              <div
                dangerouslySetInnerHTML={{
                  __html: note.body,
                }}
              />
              {(role === 'ADMIN' || id === note.createdById || note.updatedBy) && (
                <p>
                  {(role === 'ADMIN' || id === note.createdById) && (
                    <Fragment>
                      <a className="link" onClick={this.closureOnEditClick(note)}>
                        Edit
                      </a>
                      <span className="divider">|</span>
                      <a className="link" onClick={this.closureOnDeleteClick(note)}>
                        Delete
                      </a>
                    </Fragment>
                  )}
                  {false &&
                    note.updatedBy && (
                      <Fragment>
                        {(role === 'ADMIN' || id === note.createdById) && (
                          <span className="divider">|</span>
                        )}
                        <span className="updated">
                          Edited: {note.updatedBy},{' '}
                          {dateFormat(note.updatedAt, 'mmm d yyyy, h:MM TT')}
                        </span>
                      </Fragment>
                    )}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  }
}

export default compose(
  graphql(userMeGql, {
    name: 'userMeData',
  }),
  graphql(caseNoteCreateGql, {
    name: 'caseNoteCreate',
  }),
  graphql(caseNoteUpdateGql, {
    name: 'caseNoteUpdate',
  }),
  graphql(caseNoteDeleteGql, {
    name: 'caseNoteDelete',
  }),
)(CaseNoteList);
