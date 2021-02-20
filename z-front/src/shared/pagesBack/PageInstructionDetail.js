import { Button, Tabs, notification } from 'antd';
import dateFormat from 'dateformat';
import React, { Component } from 'react';
import { gql, graphql, compose } from 'react-apollo';
import { NavLink, withRouter } from 'react-router-dom';
import { showApolloError } from '../utils/errors';
import breadcrumbEmitter from './breadcrumbEmitter';
import Dashboard from './Dashboard';
import Dictation from './Dictation';
import Documents from './Documents';
import './PageInstructionDetail.scss';
import PageRoomDetailFiles from './PageRoomDetailFiles';

const { TabPane } = Tabs;

const instructionDetailGql = gql`
  query getInstructionDetail($instructionId: String!) {
    instructionDetail(instructionId: $instructionId) {
      id
      title
      caseId
      caseNo
      caseStatus
      description
      createdAt
      documents
    }
    instructionDictations(instructionId: $instructionId)
  }
`;

class PageInstructionDetail extends Component {
  state = {
    hasDictation: false,
  };

  componentDidMount() {
    this.componentDidUpdate();
  }
  componentDidUpdate() {
    // use setTimeout to ensure the ant notification is injected into the DOM
    setTimeout(this.handleComponentUpdate, 17);
    if (this.props.data.instructionDetail) {
      const { id, title, caseId, caseNo } = this.props.data.instructionDetail;
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
          url: `/-/instructions/${id}`,
          text: `Instruction: ${title}`,
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

  onAddDictationBtnClick = () => {
    if (typeof RTCPeerConnection === 'undefined') {
      notification.error({
        message: 'Your browser doesnt support WebRTC',
        key: 'RTCPeerConnection-undefined',
      });
      return;
    }
    this.setState({ hasDictation: true });
  };

  closeDictation = () => {
    this.setState({ hasDictation: false });
  };

  refetch = () => {
    this.props.data.refetch();
  };

  render() {
    const { data } = this.props;
    const { instructionDetail } = data;

    if (!instructionDetail) {
      return null;
    }
    const caseDocuments = JSON.parse(instructionDetail.documents);
    const instructionDictations = JSON.parse(data.instructionDictations);

    const { id, title, caseId, caseNo, description, createdAt } = instructionDetail;
    let { caseStatus } = instructionDetail;
    caseStatus = caseStatus.charAt(0).toUpperCase() + caseStatus.slice(1).toLowerCase();

    return (
      <div className="PageInstructionDetail PageRoomDetail">
        <div className="clearfix">
          <h1 className="pull-left">
            <span>{title}</span>
          </h1>
          <span className="status pull-left">
            <span>{dateFormat(createdAt, 'mmm d yyyy, h:MM TT')}</span>
          </span>
          {!this.state.hasDictation && (
            <div className="h1MenuGroup pull-right">
              <a onClick={this.onAddDictationBtnClick}>
                <Button icon="plus-square-o">Add Dictation</Button>
              </a>
            </div>
          )}
        </div>
        <div className="indent">
          <strong>Case ID: </strong>
          <NavLink to={`/-/cases/${caseId}`}>{caseNo} </NavLink>
          <span className={caseStatus + ' nomargin'}>({caseStatus})</span>
          {description && (
            <span>
              <span className="divider">|</span>
              <strong>Description: </strong>
              <span>{description}</span>
            </span>
          )}
        </div>
        <Tabs type="card">
          <TabPane tab={`Dictation Documents (${caseDocuments.length})`} key="documents">
            <Documents
              caseId={instructionDetail.caseId}
              documents={caseDocuments}
              refetch={this.refetch}
            />
          </TabPane>
          <TabPane tab={`Dictation Files (${instructionDictations.length})`} key="dictations">
            <PageRoomDetailFiles
              roomFiles={instructionDictations.map(d => ({
                id,
                type: 'kurento-instruction',
                filename: d.name,
                createdAt: d.createdAt,
                size: d.size,
              }))}
              refetch={this.refetch}
            />
          </TabPane>
        </Tabs>
        {this.state.hasDictation && (
          <Dictation instructionId={id} close={this.closeDictation} refetch={this.refetch} />
        )}
      </div>
    );
  }
}

const WithDashboard = Dashboard.with(PageInstructionDetail);
const ThenWithGraphQL = compose(
  graphql(instructionDetailGql, {
    options: props => ({
      variables: {
        instructionId: props.match.params.id,
      },
    }),
    name: 'data',
  }),
)(WithDashboard);
const ThenWithRouter = withRouter(ThenWithGraphQL);

export default ThenWithRouter;
