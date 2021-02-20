import './PageCaseList.scss';

import { Button, Table, notification, Modal, Input, Icon, Dropdown, Menu, DatePicker } from 'antd';
import dateFormat from 'dateformat';
import React from 'react';
import { gql, graphql, compose } from 'react-apollo';
import { NavLink } from 'react-router-dom';
import { showApolloError } from '../utils/errors';
import breadcrumbEmitter from './breadcrumbEmitter';
import Dashboard from './Dashboard';
import PageCaseListCreate from './PageCaseListCreate';
import { formatDateTime } from '../utils/timezone';
import { debounce, upperFistLetter } from '../utils/common';

const MenuItem = Menu.Item;

const caseListGql = gql`
  query {
    userMe {
      id
      role
    }
    caseList {
      id
      no
      description
      doctor
      doctorId
      claimantId
      claimant
      createdAt
      createdBy
      room {
        startTime
        timezone
      }
    }
    userList {
      users {
        role
        id
        displayName
      }
    }
  }
`;
const caseCreateGql = gql`
  mutation caseCreate($data: CaseCreateInput!) {
    caseCreate(data: $data)
  }
`;
const caseUpdateGql = gql`
  mutation caseUpdate($id: ID!, $data: CaseCreateInput!) {
    caseUpdate(id: $id, data: $data)
  }
`;
const caseDeleteGql = gql`
  mutation caseDelete($id: ID!) {
    caseDelete(id: $id)
  }
`;

class PageCaseList extends React.Component {
  state = {
    modalVisible: false,
    editingCase: null,
    deleteConfirmLoading: false,
    search: '',
    searchBy: 'Case No',
    caseList: [],
    isMutate: false,
  };

  componentDidMount() {
    this.componentDidUpdate();
    breadcrumbEmitter.emit('change', [
      {
        url: '/-/cases',
        icon: 'solution',
        text: 'Manage cases',
      },
    ]);

    const { loading, caseList } = this.props.data;
    if (!loading && caseList) {
      this.setState({ caseList });
    }
  }

  componentDidUpdate(prevProps) {
    // use setTimeout to ensure the ant notification is injected into the DOM
    setTimeout(this.handleComponentUpdate, 17);
    const { loading, caseList, networkStatus } = this.props.data;

    if (!!prevProps && prevProps.data.loading && !loading && caseList) {
      this.setState({ caseList });
    }

    if (!!prevProps && prevProps.data.networkStatus === 7 && prevProps.data.caseList) {
      if (networkStatus === 7 && !loading) {
        if (caseList.length !== prevProps.data.caseList.length) {
          this.setState({ caseList });
        }
        if (networkStatus === 7 && this.state.isMutate) {
          this.setState({ caseList, isMutate: false });
        }
      }
    }
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
      editingCase: null,
    });
  };

  closureHandleEditClick = editingCase => e => {
    e.preventDefault();
    this.setState({
      modalVisible: true,
      editingCase,
    });
  };

  closureHandleDeleteClick = deletingCase => () => {
    Modal.confirm({
      title: 'Do you want to delete this case?',
      okType: 'danger',
      okText: 'Delete',
      maskClosable: true,
      onOk: () => {
        const caseId = deletingCase.id;
        const variables = { id: caseId };
        this.props
          .caseDelete({ variables })
          .then(() => {
            this.props.data.refetch();
          })
          .catch(apolloErr => {
            showApolloError(apolloErr, 'caseMutate-error');
          });
      },
    });
  };

  columns = () => {
    return [
      {
        title: 'Case No',
        dataIndex: 'no',
        render: (text, row) => (
          <NavLink className="link" to={`/-/cases/${row.id}`}>
            {text}
          </NavLink>
        ),
      },
      {
        title: 'Doctor',
        dataIndex: 'doctor',
        render: text => text,
      },
      {
        title: 'Claimant',
        dataIndex: 'claimant',
        render: d => d,
      },
      {
        title: 'Appointment Date',
        dataIndex: 'room',
        render: r => {
          if (!r) {
            return null;
          }
          const { startTime, timezone: tz } = r;
          return formatDateTime(startTime, tz) + ` (UTC ${tz || '+11'})`;
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
        width: '155px',
        render: text => <span>{dateFormat(text, 'mmm d yyyy, h:MM TT')}</span>,
      },
      {
        title: 'Quick View',
        dataIndex: 'view',
        width: '175px',
        render: (text, row) => (
          <span>
            <NavLink className="link" to={`/-/cases/${row.id}?tab=dictations`}>
              Dictations
            </NavLink>
            <span className="divider">|</span>
            <NavLink className="link" to={`/-/cases/${row.id}?tab=videos`}>
              Video sessions
            </NavLink>
          </span>
        ),
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
  };

  handleFilter = () => {
    const { search, searchBy } = this.state;
    const { caseList } = this.props.data;

    if (!search.length) {
      return this.setState({ caseList });
    }

    if (search.length >= 2) {
      const key = searchBy === 'Case No' ? 'no' : searchBy;
      const filtered = caseList.filter(item => {
        return item[key].toLowerCase().indexOf(search.toLocaleLowerCase()) >= 0;
      });

      this.setState({ caseList: filtered });
    }
  };

  handleFilterByDate = (_, dateStr) => {
    const { caseList } = this.props.data;
    if (!dateStr) return this.setState({ caseList });

    const filtered = caseList
      .filter(item => {
        if (item.room && item.room.startTime) {
          const { startTime, timezone } = item.room;
          return formatDateTime(startTime, timezone).indexOf(dateStr) >= 0;
        }
        return false;
      })
      .sort((a, b) => +new Date(a.room.startTime) - +new Date(b.room.startTime));
    this.setState({ caseList: filtered });
  };

  filterDebounce = debounce(this.handleFilter, 500);

  handleSearchChange = ({ target }) => {
    this.setState({ search: target.value }, this.filterDebounce);
  };

  handleOptionChange = ({ key }) => {
    this.setState({ searchBy: key }, () => {
      if (key === 'appointment date' && !!this.state.search) {
        this.setState({ caseList: this.props.data.caseList });
      } else {
        this.handleFilter();
      }
    });
  };

  renderDropdownOptions = () => (
    <Menu selectedKeys={[this.state.searchBy]} onClick={this.handleOptionChange}>
      <MenuItem key="ID">Case No</MenuItem>
      <MenuItem key="doctor">Doctor</MenuItem>
      <MenuItem key="claimant">Claimant</MenuItem>
      <MenuItem key="appointment date">Appointment Date</MenuItem>
    </Menu>
  );

  setCaseMutate = () => {
    this.setState({ isMutate: true });
  };

  render() {
    const { loading, userList = {}, userMe = {} } = this.props.data;
    const { search, searchBy, caseList } = this.state;
    const { role } = userMe;
    const { users = [] } = userList;

    let columns = this.columns();
    if (role === 'DOCTOR') {
      columns = columns.filter(c => c.dataIndex !== 'doctor');
    }

    return (
      <div className="PageCaseList">
        <h1 className="Page-title">Manage Cases</h1>
        <div className="table-toolbar">
          <div className="toolbar-search">
            {searchBy === 'appointment date' ? (
              <DatePicker
                className="date-picker-filter-cases"
                format="MMM D YYYY"
                onChange={this.handleFilterByDate}
              />
            ) : (
              <Input
                size="large"
                placeholder="Search any keyword"
                prefix={<Icon type="search" />}
                value={search}
                onChange={this.handleSearchChange}
                disabled={loading}
              />
            )}
            <Dropdown disabled={loading} overlay={this.renderDropdownOptions()} trigger={['click']}>
              <Button size="large">
                Search by: <b>{upperFistLetter(searchBy)}</b> <Icon type="down" />
              </Button>
            </Dropdown>
          </div>
          {role !== 'DOCTOR' && (
            <Button
              icon="solution"
              onClick={this.openModal}
              type="primary"
              size="large"
              className="btn-create-case"
              disabled={loading}
            >
              New Case
            </Button>
          )}
        </div>
        <Table columns={columns} dataSource={caseList} loading={loading} rowKey="id" size="small" />
        <PageCaseListCreate
          visible={this.state.modalVisible}
          editingCase={this.state.editingCase}
          caseCreate={this.props.caseCreate}
          caseUpdate={this.props.caseUpdate}
          refetch={this.props.data.refetch}
          close={this.closeModal}
          doctorList={users.filter(u => u.role === 'DOCTOR')}
          claimantList={users.filter(u => u.role === 'CLAIMANT')}
          setCaseMutate={this.setCaseMutate}
        />
      </div>
    );
  }
}

const WithDashboard = Dashboard.with(PageCaseList);
const ThenWithGraphQL = compose(
  graphql(caseListGql, {
    name: 'data',
  }),
  graphql(caseCreateGql, {
    name: 'caseCreate',
  }),
  graphql(caseUpdateGql, {
    name: 'caseUpdate',
  }),
  graphql(caseDeleteGql, {
    name: 'caseDelete',
  }),
)(WithDashboard);

export default ThenWithGraphQL;
