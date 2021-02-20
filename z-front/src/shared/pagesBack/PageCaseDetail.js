import { Button, Tabs, notification } from 'antd';
import dateFormat from 'dateformat';
import qs from 'qs';
import React, { Component } from 'react';
import { gql, graphql, compose } from 'react-apollo';
import { withRouter, NavLink } from 'react-router-dom';
import { showApolloError } from '../utils/errors';
import breadcrumbEmitter from './breadcrumbEmitter';
import CaseNoteList from './CaseNoteList';
import Dashboard from './Dashboard';
import Documents from './Documents';
import PageRoomDetailFiles from './PageRoomDetailFiles';
import PageRoomList from './PageRoomList';

const { TabPane } = Tabs;

const caseDetailGql = gql`
  query getCaseDetail($id: String!) {
    caseDetail(id: $id) {
      id
      no
      description
      doctor
      dr {
        title
        firstName
        lastName
        email
        phone
      }
      claimant
      clm {
        title
        firstName
        lastName
        email
        phone
      }
      createdAt
      caseNoteList {
        body
        createdAt
        updatedAt
        createdById
        createdBy
        updatedBy
      }
    }
    caseSessions(caseId: $id) {
      id
    }
    caseDictations(caseId: $id)
    caseDocuments(caseId: $id)
  }
`;

const caseToggleGql = gql`
  mutation caseToggle($id: ID!) {
    caseToggle(id: $id)
  }
`;

class PageCaseDetail extends Component {
  componentDidMount() {
    this.componentDidUpdate();
  }

  componentDidUpdate() {
    // use setTimeout to ensure the ant notification is injected into the DOM
    setTimeout(this.handleComponentUpdate, 17);
    if (this.props.data.caseDetail) {
      const { id, no } = this.props.data.caseDetail;
      breadcrumbEmitter.emit('change', [
        {
          url: '/-/cases',
          icon: 'solution',
          text: 'Manage Cases',
        },
        {
          url: `/-/cases/${id}`,
          text: no,
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

  refetch = () => {
    this.props.data.refetch();
  };

  onTabChange = tab => {
    this.props.history.push(this.props.location.pathname + `?${qs.stringify({ tab })}`);
  };

  render() {
    const { data } = this.props;
    const { caseDetail, caseSessions } = data;

    if (!caseDetail) {
      return null;
    }

    const caseDictations = JSON.parse(data.caseDictations);
    const caseDocuments = JSON.parse(data.caseDocuments);

    const { id, no, description, createdAt } = caseDetail;

    const q = qs.parse(this.props.location.search.substr(1));

    return (
      <div className="PageRoomDetail">
        <div className="clearfix">
          <h1 className="pull-left">
            <span>{id === 'instant-sessions' ? 'Instant Sessions' : no}</span>
          </h1>
          {id !== 'instant-sessions' && (
            <span className="status pull-left">
              <span>{dateFormat(createdAt, 'mmm d yyyy, h:MM TT')}</span>
            </span>
          )}
          <div className="h1MenuGroup pull-right">
            <NavLink to="/-/cases">
              <Button icon="left-circle-o">Back</Button>
            </NavLink>
          </div>
        </div>
        <div className="indent">
          <strong>Doctor: </strong>
          <span>{caseDetail.doctor}</span>
          <span className="divider">|</span>
          <strong>Claimant: </strong>
          <span>{caseDetail.claimant}</span>
          {description && (
            <span>
              <span className="divider">|</span>
              <strong>Description: </strong>
              <span>{description}</span>
            </span>
          )}
        </div>
        {id === 'instant-sessions' && <PageRoomList caseId={id} />}
        {id !== 'instant-sessions' && (
          <Tabs type="card" activeKey={q.tab || 'notes'} onChange={this.onTabChange}>
            <TabPane tab={`Case Notes (${caseDetail.caseNoteList.length})`} key="notes">
              <CaseNoteList
                caseId={caseDetail.id}
                data={caseDetail.caseNoteList}
                refetch={this.refetch}
              />
            </TabPane>
            <TabPane tab={`Case Documents (${caseDocuments.length})`} key="documents">
              <Documents documents={caseDocuments} caseId={id} refetch={this.refetch} />
            </TabPane>
            <TabPane tab={`Case Dictations (${caseDictations.length})`} key="dictations">
              <PageRoomDetailFiles
                caseId={id}
                roomFiles={caseDictations}
                refetch={this.refetch}
                hasFolder
              />
            </TabPane>
            <TabPane tab={`Video Sessions (${caseSessions.length})`} key="videos">
              <PageRoomList caseId={id} doctor={caseDetail.dr} claimant={caseDetail.clm} />
            </TabPane>
          </Tabs>
        )}
      </div>
    );
  }
}

const WithDashboard = Dashboard.with(PageCaseDetail);
const ThenWithGraphQL = compose(
  graphql(caseDetailGql, {
    options: props => ({
      variables: {
        id: props.match.params.id,
      },
    }),
    name: 'data',
  }),
  graphql(caseToggleGql, {
    name: 'caseToggle',
  }),
)(WithDashboard);
const ThenWithRouter = withRouter(ThenWithGraphQL);

export default ThenWithRouter;
