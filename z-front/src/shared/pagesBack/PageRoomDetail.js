import { Button, Modal, Tabs, notification } from 'antd';
import dateFormat from 'dateformat';
import React, { Component } from 'react';
import { gql, graphql, compose } from 'react-apollo';
import { NavLink, withRouter } from 'react-router-dom';
import { showApolloError } from '../utils/errors';
import breadcrumbEmitter from './breadcrumbEmitter';
import Dashboard from './Dashboard';
import './PageRoomDetail.scss';
import PageRoomDetailParticipants from './PageRoomDetailParticipants';

const { TabPane } = Tabs;

const roomDetailGql = gql`
  query getRoomDetail($roomId: String!) {
    roomDetail(roomId: $roomId) {
      id
      title
      caseId
      caseNo
      note
      status
      createdAt
      caseStatus
    }
    roomParticipants(roomId: $roomId) {
      id
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

const roomToggleGql = gql`
  mutation roomToggle($roomId: String!) {
    roomToggle(roomId: $roomId)
  }
`;

class PageRoomDetail extends Component {
  componentDidMount() {
    this.componentDidUpdate();
  }
  componentDidUpdate() {
    // use setTimeout to ensure the ant notification is injected into the DOM
    setTimeout(this.handleComponentUpdate, 17);
    if (this.props.data.roomDetail) {
      const { id, title, caseId, caseNo } = this.props.data.roomDetail;
      breadcrumbEmitter.emit('change', [
        {
          url: '/-/cases',
          icon: 'solution',
          text: 'Manage Cases',
        },
        {
          url: `/-/cases/${caseId}`,
          text: caseNo,
        },
        {
          url: `/-/sessions/${id}`,
          text: `Session: ${title}`,
        },
      ]);
    }
  }
  handleComponentUpdate = () => {
    notification.destroy('query-error-checker');
    const { error } = this.props.data;
    if (error) {
      showApolloError(error, 'query-error-checker');
    }
  };

  handleToggleStatus = () => {
    const { roomDetail } = this.props.data;
    const isClosed = roomDetail.status === 'CLOSED';
    const { caseId } = roomDetail;
    const fn = () => {
      const roomId = roomDetail.id;
      const variables = { roomId };
      this.props
        .roomToggle({ variables })
        .then(() => {
          this.props.data.refetch();
          if (!isClosed) {
            this.props.history.push(`/-/cases/${caseId}`);
          }
        })
        .catch(apolloErr => {
          showApolloError(apolloErr, 'roomMutate-error');
        });
    };
    if (isClosed) {
      fn();
      return;
    }
    Modal.confirm({
      title: 'End session',
      content: 'Do you want to end this session?.',
      okType: 'danger',
      okText: 'End',
      maskClosable: true,
      onOk: fn,
      onCancel() {},
    });
  };

  refetch = () => {
    this.props.data.refetch();
  };

  render() {
    const { data } = this.props;
    const { roomDetail, roomParticipants } = data;
    const { role } = this.props.userMeData.userMe || {};

    if (!roomDetail) {
      return null;
    }

    const { id, title, caseId, caseNo, note, createdAt } = roomDetail;
    let { caseStatus } = roomDetail;
    caseStatus = caseStatus.charAt(0).toUpperCase() + caseStatus.slice(1).toLowerCase();

    let { status } = roomDetail;
    status = status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();

    return (
      <div className="PageRoomDetail">
        <div className="clearfix">
          <h1 className="pull-left">
            <span>{title}</span>
          </h1>
          <span className="status pull-left">
            <span className={status}>({status})</span>
            <span>{dateFormat(createdAt, 'mmm d yyyy, h:MM TT')}</span>
          </span>
          {role !== 'DOCTOR' && (
            <div className="h1MenuGroup pull-right">
              <Button
                type={status === 'Opening' ? 'danger' : 'primary'}
                icon={status === 'Opening' ? 'close-square' : 'play-circle'}
                onClick={this.handleToggleStatus}
              >
                {`${status === 'Opening' ? 'End' : 'Reopen'} Session`}
              </Button>
            </div>
          )}
        </div>
        <div className="indent">
          <strong>Case ID: </strong>
          <NavLink to={`/-/cases/${caseId}`}>{caseNo} </NavLink>
          <span className={caseStatus + ' nomargin'}>({caseStatus})</span>
          {note && (
            <span>
              <span className="divider">|</span>
              <strong>Note: </strong>
              <span>{note}</span>
            </span>
          )}
        </div>
        <Tabs type="card">
          <TabPane tab={`Participants (${roomParticipants.length})`} key="participants">
            <PageRoomDetailParticipants roomId={id} roomStatus={status} />
          </TabPane>
        </Tabs>
      </div>
    );
  }
}

const WithDashboard = Dashboard.with(PageRoomDetail);
const ThenWithGraphQL = compose(
  graphql(roomDetailGql, {
    options: props => ({
      variables: {
        roomId: props.match.params.id,
      },
    }),
    name: 'data',
  }),
  graphql(userMeGql, {
    name: 'userMeData',
  }),
  graphql(roomToggleGql, {
    name: 'roomToggle',
  }),
)(WithDashboard);
const ThenWithRouter = withRouter(ThenWithGraphQL);

export default ThenWithRouter;
