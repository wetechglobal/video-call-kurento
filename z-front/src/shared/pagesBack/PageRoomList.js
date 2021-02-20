import { Button, Table, notification, Modal } from 'antd';
import React from 'react';
import { gql, graphql, compose } from 'react-apollo';
import { showApolloError } from '../utils/errors';
import PageRoomDetailParticipants from './PageRoomDetailParticipants';
import PageRoomListCreate from './PageRoomListCreate';
import { formatDateTime } from '../utils/timezone';

import './PageRoomList.scss';

const { confirm } = Modal;

const roomListGql = gql`
  query getRoomList($caseId: String!) {
    caseSessions(caseId: $caseId) {
      id
      title
      caseId
      caseNo
      note
      status
      createdBy
      createdAt
      startTime
      endTime
      timezone
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
const roomCreateGql = gql`
  mutation roomCreate($room: RoomCreateInput!) {
    roomCreate(room: $room)
  }
`;
const roomUpdateGql = gql`
  mutation roomUpdate($room: RoomUpdateInput!) {
    roomUpdate(room: $room)
  }
`;
const roomDeleteGql = gql`
  mutation roomDelete($roomId: String!) {
    roomDelete(roomId: $roomId)
  }
`;
const roomParticipantAddGql = gql`
  mutation roomParticipantAdd($participant: RoomParticipantAddInput!) {
    roomParticipantAdd(participant: $participant)
  }
`;

class PageRoomList extends React.Component {
  state = {
    newSessionLoading: false,
    modalVisible: false,
    editingRoom: null,
    expandedRows: [],
  };
  hasSetDefaultExpandedRows = false;

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
    //
    if (this.props.caseId === 'instant-sessions') {
      this.setState({
        newSessionLoading: true,
      });

      const room = {
        title: 'Instant Session',
        startTime: new Date(),
        endTime: new Date(Date.now() + 48 * 60 * 60 * 1000), // 48hrs
        caseId: 'instant-sessions',
        note: '',
        timezone: (() => {
          const tz = (new Date().getTimezoneOffset() / -60).toFixed(1).replace('.0', '');
          return (tz.indexOf('-') < 0 ? '+' : '') + tz;
        })(),
        status : 'OPENING',
      };

      this.props
        .roomCreate({
          variables: { room },
        })
        .then(() => {
          this.refetch();
        })
        .catch(err => {
          showApolloError(err, 'roomMutate-error');
        })
        .finally(() => {
          this.setState({
            newSessionLoading: false,
          });
        });
      //
      return;
    }

    this.setState({
      modalVisible: true,
    });
  };

  closeModal = () => {
    this.setState({
      modalVisible: false,
      editingRoom: null,
    });
  };

  closureHandleEditClick = editingRoom => e => {
    e.preventDefault();
    e.stopPropagation();
    this.setState({
      modalVisible: true,
      editingRoom,
    });
  };

  closureHandleDeleteClick = deletingRoom => e => {
    e.preventDefault();
    e.stopPropagation();
    confirm({
      title: 'Do you want to delete this session?',
      okType: 'danger',
      okText: 'Delete',
      maskClosable: true,
      onOk: () => {
        const roomId = deletingRoom.id;
        const variables = { roomId };
        this.props
          .roomDelete({ variables })
          .then(() => {
            this.props.data.refetch();
          })
          .catch(apolloErr => {
            showApolloError(apolloErr, 'roomMutate-error');
          });
      },
    });
  };

  onRowClick = d => {
    this.setState({
      expandedRows: [d.id],
    });
  };

  onExpand = (expanded, d) => {
    this.setState({
      expandedRows: expanded ? [d.id] : [],
    });
  };

  refetch = () => {
    this.props.data.refetch();
  };

  columns = [
    {
      title: 'Session name',
      dataIndex: 'title',
      render: t => <a className="link">{t}</a>,
    },
    {
      title: 'Start Time',
      dataIndex: 'startTime',
      width: '150px',
      render: (t, d) => <span>{formatDateTime(t, d.timezone)}</span>,
    },
    {
      title: 'End Time',
      dataIndex: 'endTime',
      width: '150px',
      render: (t, d) => {
        const s = formatDateTime(d.startTime, d.timezone);
        let e = formatDateTime(t, d.timezone);
        const sa = s.split(', ');
        const ea = e.split(', ');
        if (sa[0] === ea[0]) {
          e = ea[1];
        }
        return <span>{e}</span>;
      },
    },
    {
      title: 'Time Zone',
      dataIndex: 'timezone',
      width: '120px',
      render: t => {
        return <span>(UTC {t || '+11'})</span>;
      },
    },
    {
      title: 'Created By',
      dataIndex: 'createdBy',
      render: text => text,
    },
    {
      title: 'Created At',
      dataIndex: 'createdAt',
      width: '150px',
      render: (t, d) => <span>{formatDateTime(t, d.timezone)}</span>,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      width: '90px',
      render: (text, d) => {
        const end = new Date(d.endTime);
        const label = d.status === 'OPENING' ? Date.now() > end.getTime() + 48 * 60 * 60 * 1000 ? 'EXPIRED' : 'ACTIVE' : d.status === 'CLOSED' ? 'CANCELLED' : d.status;
        return <span className={label.toLowerCase()}>{label}</span>;
      },
    },
    {
      title: 'Action',
      dataIndex: 'action',
      width: '100px',
      render: (text, row) => (
        <span>
          <a className="link" onClick={this.closureHandleEditClick(row)}>
            Edit
          </a>
          <span className="divider">|</span>
          <a className="link" onClick={this.closureHandleDeleteClick(row)}>
            Delete
          </a>
        </span>
      ),
    },
  ];

  render() {
    const { caseId } = this.props;
    const { loading, caseSessions = [] } = this.props.data;
    const { role } = this.props.userMeData.userMe || {};

    if (caseSessions && caseSessions.length && !this.hasSetDefaultExpandedRows) {
      this.hasSetDefaultExpandedRows = true;
      requestAnimationFrame(() => {
        this.setState({
          expandedRows: [caseSessions[0].id],
        });
      });
    }

    return (
      <div className="PageRoomList">
        <div className="clearfix">
          <div className="mTB10 pull-left">
            <Button icon="reload" onClick={this.refetch}>
              Reload
            </Button>
          </div>
          {role !== 'DOCTOR' && (
            <div className="mTB10 pull-right">
              <Button
                icon="video-camera"
                onClick={this.openModal}
                type="primary"
                loading={this.state.newSessionLoading}
                disabled={this.state.newSessionLoading}
              >
                New Session
              </Button>
              <PageRoomListCreate
                visible={this.state.modalVisible}
                editingRoom={this.state.editingRoom}
                caseId={caseId}
                roomCreate={this.props.roomCreate}
                roomUpdate={this.props.roomUpdate}
                roomParticipantAdd={this.props.roomParticipantAdd}
                doctor={this.props.doctor}
                claimant={this.props.claimant}
                refetch={this.props.data.refetch}
                close={this.closeModal}
              />
            </div>
          )}
        </div>
        <Table
          columns={this.columns}
          dataSource={caseSessions}
          loading={loading}
          rowKey="id"
          size="small"
          expandedRowRender={r => <PageRoomDetailParticipants roomId={r.id} />}
          expandedRowKeys={this.state.expandedRows}
          onRowClick={this.onRowClick}
          onExpand={this.onExpand}
        />
      </div>
    );
  }
}

// const WithDashboard = Dashboard.with(PageRoomList)
const ThenWithGraphQL = compose(
  graphql(roomListGql, {
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
  graphql(roomCreateGql, {
    name: 'roomCreate',
  }),
  graphql(roomUpdateGql, {
    name: 'roomUpdate',
  }),
  graphql(roomDeleteGql, {
    name: 'roomDelete',
  }),
  graphql(roomParticipantAddGql, {
    name: 'roomParticipantAdd',
  }),
)(PageRoomList);

export default ThenWithGraphQL;
