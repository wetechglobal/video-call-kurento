import copy from 'copy-to-clipboard';
import React, { Component } from 'react';
import { Button, Modal, Table, notification } from 'antd';
import { gql, graphql, compose } from 'react-apollo';
import PageRoomDetailParticipantsAdd from './PageRoomDetailParticipantsAdd';
import { frontend, socket } from '../config';
import { showApolloError } from '../utils/errors';
import { formatDateTime } from '../utils/timezone';

import './PageRoomDetailParticipants.scss';

const roomParticipantsGql = gql`
  query getRoomParticipants($roomId: String!) {
    roomParticipants(roomId: $roomId) {
      id
      title
      firstName
      lastName
      displayName
      email
      phone
      joinedDate
      timezone
      inviteToken
      isInRoom
    }
    userList {
      users {
        id
        title
        firstName
        lastName
        email
        phone
        displayName
        role
      }
    }
  }
`;
const roomParticipantAddGql = gql`
  mutation roomParticipantAdd($participant: RoomParticipantAddInput!) {
    roomParticipantAdd(participant: $participant)
  }
`;
const roomParticipantResendGql = gql`
  mutation roomParticipantResend($invitationId: String!, $type: String!) {
    roomParticipantResend(invitationId: $invitationId, type: $type)
  }
`;
const roomParticipantUpdateGql = gql`
  mutation roomParticipantUpdate($participant: RoomParticipantUpdateInput!) {
    roomParticipantUpdate(participant: $participant)
  }
`;
const roomParticipantDeleteGql = gql`
  mutation roomParticipantDelete($invitationId: String!, $delete: Boolean!) {
    roomParticipantDelete(invitationId: $invitationId, delete: $delete)
  }
`;

class PageRoomDetailParticipants extends Component {
  state = {
    modalVisible: false,
    editing: null,
    participantStatuses: {},
  };

  componentDidMount() {
    this.componentDidUpdate();
    socket.on('participantStatus', this.handleParticipantStatus);
  }

  componentDidUpdate() {
    // use setTimeout to ensure the ant notification is injected into the DOM
    setTimeout(this.handleComponentUpdate, 17);
  }

  componentWillUnmount() {
    socket.removeListener('participantStatus', this.handleParticipantStatus);
    notification.destroy('participant-action-error');
  }

  UNSAFE_componentWillReceiveProps(nextProps) {
    if (!nextProps.data || !nextProps.data.roomParticipants) {
      return;
    }
    this.setState({
      participantStatuses: nextProps.data.roomParticipants.reduce(
        (o, p) => ({
          ...o,
          [p.id]: p.isInRoom,
        }),
        {},
      ),
    });
  }

  handleParticipantStatus = data => {
    if (data.roomId !== this.props.roomId) {
      return;
    }
    if (!(data.id in this.state.participantStatuses)) {
      this.props.data.refetch();
      return;
    }
    this.setState({
      participantStatuses: {
        ...this.state.participantStatuses,
        [data.id]: data.status,
      },
    });
  };

  handleComponentUpdate = () => {
    const { error } = this.props.data;
    if (error) {
      showApolloError(error, 'participant-action-error');
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
      editing: null,
    });
  };

  closureHandleCopyClick = row => () => {
    const { inviteToken } = row;
    copy(`${frontend}/?t=${inviteToken}`);
    notification.success({
      message: 'Invitation link copied',
    });
  };

  closureHandleResendClick = (row, type) => () => {
    notification.destroy();

    if (type === 'sms' && !row.phone) {
      notification.error({
        message: 'Phone number is required to send SMS',
        duration: 0,
      });
      return;
    }

    this.props
      .roomParticipantResend({
        variables: {
          invitationId: row.id,
          type,
        },
      })
      .then(() => {
        notification.success({
          message: 'Invitation link resend successfully',
        });
      })
      .catch(apolloError => {
        showApolloError(apolloError, 'participant-action-error');
      });
  };

  closureHandleEditClick = row => () => {
    this.setState({
      modalVisible: true,
      editing: row,
    });
  };

  closureHandleRemoveClick = (row, willDelete) => () => {
    const actionTitle = willDelete ? 'Remove' : 'Disconnect';
    const actionText = willDelete ? 'Remove' : 'Disconnect user';
    Modal.confirm({
      title: `${actionTitle} participant`,
      content: `Do you want to ${actionTitle.toLowerCase()} this participant?`,
      okType: 'danger',
      okText: actionText,
      maskClosable: true,
      onOk: () => {
        notification.destroy('participant-action-error');
        this.props
          .roomParticipantDelete({
            variables: {
              invitationId: row.id,
              delete: willDelete,
            },
          })
          .then(() => {
            if (willDelete) {
              this.props.data.refetch();
            }
          })
          .catch(apolloError => {
            showApolloError(apolloError, 'participant-action-error');
          });
      },
    });
  };

  columns = [
    {
      title: '',
      width: '30px',
      dataIndex: 'avatar',
      render: () => (
        <div className="avatar">
          <div className="avatar-img" />
        </div>
      ),
    },
    {
      title: 'Name',
      dataIndex: 'displayName',
      render: text => text,
    },
    {
      title: 'Phone Number',
      dataIndex: 'phone',
      render: text => text,
    },
    {
      title: 'Status',
      dataIndex: 'isInRoom',
      width: '170px',
      render: (_, row) => {
        const isInRoom = this.state.participantStatuses[row.id];
        const text = isInRoom ? 'Joined' : 'Not in session';
        const cn = isInRoom ? 'joined' : 'disconnected';
        const label = <span className={cn}>{text}</span>;
        if (!isInRoom) {
          return label;
        }
        return (
          <span>
            {label}
            <span className="divider">|</span>
            <a className="link" onClick={this.closureHandleRemoveClick(row, false)}>
              Disconnect user
            </a>
          </span>
        );
      },
    },
    {
      title: 'Joined Time',
      dataIndex: 'joinedDate',
      render: (_, row) => {
        if (row.joinedDate) {
          return (
            <span>{formatDateTime(row.joinedDate, row.timezone)}</span>
          );
        }
        return (
          <span></span>
        );
      }, 
      width: '230px',
    },
    {
      title: 'Invitation link',
      dataIndex: 'link',
      width: '230px',
      render: (_, row) => (
        <span>
          <a className="link" onClick={this.closureHandleCopyClick(row)}>
            Copy
          </a>
          <span className="divider">|</span>
          <a className="link" onClick={this.closureHandleResendClick(row, 'email')}>
            Resend email
          </a>
          <span className="divider">|</span>
          <a className="link" onClick={this.closureHandleResendClick(row, 'sms')}>
            Resend SMS
          </a>
        </span>
      ),
    },
    {
      title: 'Action',
      dataIndex: 'action',
      width: '100px',
      render: (_, row) => (
        <span>
          <a className="link" onClick={this.closureHandleEditClick(row)}>
            Edit
          </a>
          <span className="divider">|</span>
          <a className="link" onClick={this.closureHandleRemoveClick(row, true)}>
            Remove
          </a>
        </span>
      ),
    },
  ];

  render() {
    const { roomId, roomParticipantAdd, roomParticipantUpdate } = this.props;
    const { refetch, loading, roomParticipants = [], userList = {} } = this.props.data;
    const { users = [] } = userList;
    const { modalVisible, editing } = this.state;

    return (
      <div className="PageRoomDetailParticipants">
        <div className="TableButtons clearfix">
          <a href={`/?roomId=${roomId}`} className="pull-left mr-1" target="_blank">
            <Button icon="arrow-right">Join Room</Button>
          </a>
          <Button type="primary" icon="user-add" className="pull-left" onClick={this.openModal}>
            Add Participant
          </Button>
          <span className="participantsLimitWarning">
            Note: Only 2 participants can join a session at the same time
          </span>
          <PageRoomDetailParticipantsAdd
            visible={modalVisible}
            roomId={roomId}
            editing={editing}
            users={users}
            roomParticipantAdd={roomParticipantAdd}
            roomParticipantUpdate={roomParticipantUpdate}
            refetch={refetch}
            close={this.closeModal}
          />
        </div>
        <div className="PageUserList">
          <Table
            columns={this.columns}
            dataSource={roomParticipants}
            loading={loading}
            rowKey="inviteToken"
            size="small"
            pagination={false}
            locale={{
              emptyText: "There's currently no participant in this session",
            }}
          />
        </div>
      </div>
    );
  }
}

const WithGraphQL = compose(
  graphql(roomParticipantsGql, {
    options: props => ({
      variables: {
        roomId: props.roomId,
      },
    }),
    name: 'data',
  }),
  graphql(roomParticipantAddGql, {
    name: 'roomParticipantAdd',
  }),
  graphql(roomParticipantResendGql, {
    name: 'roomParticipantResend',
  }),
  graphql(roomParticipantUpdateGql, {
    name: 'roomParticipantUpdate',
  }),
  graphql(roomParticipantDeleteGql, {
    name: 'roomParticipantDelete',
  }),
)(PageRoomDetailParticipants);

export default WithGraphQL;
