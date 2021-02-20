import dateFormat from 'dateformat';
import React from 'react';
import { Button, Table, notification, Modal } from 'antd';
import { gql, graphql, compose } from 'react-apollo';
import { NavLink } from 'react-router-dom';

// import Dashboard from './Dashboard'
import PageInstructionListCreate from './PageInstructionListCreate';
import { showApolloError } from '../utils/errors';

// import './PageInstructionList.scss'

const { confirm } = Modal;

const instructionListGql = gql`
  query getInstructionList($caseId: String!) {
    caseInstructions(caseId: $caseId) {
      id
      title
      description
      caseId
      createdBy
      createdAt
    }
  }
`;
const userMeGql = gql`
  query {
    userMe {
      id
      role
    }
  }
`;
const instructionCreateGql = gql`
  mutation instructionCreate($instruction: InstructionCreateInput!) {
    instructionCreate(instruction: $instruction)
  }
`;
const instructionUpdateGql = gql`
  mutation instructionUpdate($instruction: InstructionUpdateInput!) {
    instructionUpdate(instruction: $instruction)
  }
`;
const instructionDeleteGql = gql`
  mutation instructionDelete($instructionId: String!) {
    instructionDelete(instructionId: $instructionId)
  }
`;

class PageInstructionList extends React.Component {
  state = {
    modalVisible: false,
    editingInstruction: null,
    deleteConfirmLoading: false,
  };

  componentDidMount() {
    this.componentDidUpdate();
  }

  componentDidUpdate() {
    // use setTimeout to ensure the ant notification is injected into the DOM
    setTimeout(this.handleComponentUpdate, 17);
  }

  handleComponentUpdate = () => {
    notification.destroy('query-error-checker');
    const { error } = this.props.data;
    if (error) {
      showApolloError(error, 'query-error-checker');
    }
  };

  openModal = () => {
    this.setState({
      modalVisible: true,
    });
  };

  closeModal = () => {
    this.setState({
      modalVisible: false,
      editingInstruction: null,
    });
  };

  closureHandleEditClick = editingInstruction => e => {
    e.preventDefault();
    this.setState({
      modalVisible: true,
      editingInstruction,
    });
  };

  closureHandleDeleteClick = deletingInstruction => () => {
    confirm({
      title: 'Do you want to delete this instruction?',
      confirmLoading: this.state.deleteConfirmLoading,
      okType: 'danger',
      okText: 'Delete',
      onOk: () => {
        this.setState({
          deleteConfirmLoading: true,
        });
        const instructionId = deletingInstruction.id;
        const variables = { instructionId };
        this.props
          .instructionDelete({ variables })
          .then(() => {
            this.setState({ deleteConfirmLoading: false });
            this.props.data.refetch();
          })
          .catch(apolloErr => {
            this.setState({ deleteConfirmLoading: false });
            showApolloError(apolloErr, 'instructionMutate-error');
          });
      },
    });
  };

  columns = () => {
    const { role } = this.props.userMeData.userMe || {};
    return [
      {
        title: 'Title',
        dataIndex: 'title',
        render: text => text,
      },
      {
        title: 'Created By',
        dataIndex: 'createdBy',
        render: text => text,
      },
      {
        title: 'Created At',
        dataIndex: 'createdAt',
        width: '155px',
        render: text => <span>{dateFormat(text, 'mmm d yyyy, h:MM TT')}</span>,
      },
      {
        title: 'Action',
        dataIndex: 'action',
        width: role !== 'DOCTOR' ? '135px' : '55px',
        render: (text, row) => (
          <span>
            <NavLink to={`/-/instructions/${row.id}`}>View</NavLink>
            {role !== 'DOCTOR' && (
              <span>
                <span className="divider">|</span>
                <a onClick={this.closureHandleEditClick(row)}>Edit</a>
                <span className="divider">|</span>
                <a onClick={this.closureHandleDeleteClick(row)}>Delete</a>
              </span>
            )}
          </span>
        ),
      },
    ];
  };

  render() {
    const { caseId } = this.props;
    const { loading, caseInstructions } = this.props.data;
    const { role } = this.props.userMeData.userMe || {};

    return (
      <div className="PageInstructionList">
        <div className="clearfix">
          {/*<h1 className="pull-left">All sessions</h1>*/}
          {role !== 'DOCTOR' && (
            <div className="mTB10 pull-right">
              <Button icon="solution" onClick={this.openModal}>
                New Instruction
              </Button>
              <PageInstructionListCreate
                visible={this.state.modalVisible}
                editingInstruction={this.state.editingInstruction}
                caseId={caseId}
                instructionCreate={this.props.instructionCreate}
                instructionUpdate={this.props.instructionUpdate}
                refetch={this.props.data.refetch}
                close={this.closeModal}
              />
            </div>
          )}
        </div>
        <Table
          columns={this.columns()}
          dataSource={caseInstructions}
          loading={loading}
          rowKey="id"
          size="small"
        />
      </div>
    );
  }
}

// const WithDashboard = Dashboard.with(PageInstructionList)
const ThenWithGraphQL = compose(
  graphql(instructionListGql, {
    options: props => ({
      variables: {
        caseId: props.caseId,
      },
    }),
    name: 'data',
  }),
  graphql(userMeGql, {
    name: 'userMeData',
  }),
  graphql(instructionCreateGql, {
    name: 'instructionCreate',
  }),
  graphql(instructionUpdateGql, {
    name: 'instructionUpdate',
  }),
  graphql(instructionDeleteGql, {
    name: 'instructionDelete',
  }),
)(PageInstructionList);

export default ThenWithGraphQL;
