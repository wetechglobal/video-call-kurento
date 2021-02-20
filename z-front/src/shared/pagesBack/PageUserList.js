import { Modal, Button, Table, notification, Input, Icon, Menu, Dropdown } from 'antd';
import React from 'react';
import { gql, graphql, compose } from 'react-apollo';
import { showApolloError } from '../utils/errors';
import breadcrumbEmitter from './breadcrumbEmitter';
import Dashboard from './Dashboard';
import './PageUserList.scss';
import PageUserListCreate from './PageUserListCreate';
import { debounce } from '../utils/common';

const MenuItem = Menu.Item;

const userListGql = gql`
  query {
    userMe {
      id
    }
    userList {
      pageInfo {
        total
      }
      users {
        id
        firstName
        middleName
        lastName
        title
        displayName
        email
        emailVerified
        phone
        role
      }
    }
  }
`;
const userCreateGql = gql`
  mutation userCreate($user: UserCreateInput!) {
    userCreate(user: $user)
  }
`;
const userUpdateGql = gql`
  mutation userUpdate($user: UserUpdateInput!) {
    userUpdate(user: $user)
  }
`;
const userDeleteGql = gql`
  mutation userDelete($userId: String!) {
    userDelete(userId: $userId)
  }
`;

const resendUserTokenGql = gql`
  mutation userResendToken($userId: String!) {
    userResendToken(userId: $userId)
  }
`;

class PageUserList extends React.Component {
  state = {
    modalVisible: false,
    editingUser: null,
    search: '',
    searchRole: 'All',
    userList: [],
    isMutate: false,
  };

  componentDidMount() {
    this.componentDidUpdate();
    breadcrumbEmitter.emit('change', [
      {
        url: '/-/users',
        icon: 'team',
        text: 'Manage Users',
      },
    ]);

    const { loading, userList } = this.props.data;
    if (!loading && userList) {
      this.setState({ userList: userList.users || [] });
    }
  }

  componentDidUpdate(prevProps) {
    // use setTimeout to ensure the ant notification is injected into the DOM
    setTimeout(this.handleComponentUpdate, 17);
    const { loading, userList, networkStatus } = this.props.data;

    if (prevProps && prevProps.data.loading && !loading && userList) {
      this.setState({ userList: userList.users || [] });
    }

    if (!!prevProps && prevProps.data.networkStatus === 7 && prevProps.data.userList) {
      if (networkStatus === 7 && !loading) {
        if (userList.users.length !== prevProps.data.userList.users.length) {
          this.setState({ userList: userList.users });
        }
        if (networkStatus === 7 && this.state.isMutate) {
          this.setState({ userList: userList.users, isMutate: false });
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
      editingUser: null,
    });
  };

  closureHandleEditClick = editingUser => () => {
    this.setState({
      modalVisible: true,
      editingUser,
    });
  };

  closureHandleDeleteClick = user => () => {
    Modal.confirm({
      title: 'Remove user',
      content: 'Do you want to remove this user? All associated data will be deleted as well.',
      okType: 'danger',
      okText: 'Delete',
      maskClosable: true,
      onOk: () => {
        const userId = user.id;
        const variables = { userId };
        notification.destroy('user-update-error');
        this.props
          .userDelete({ variables })
          .then(() => {
            this.props.data.refetch();
            notification.success({
              message: 'Remove user successfully',
            });
          })
          .catch(apolloErr => {
            showApolloError(apolloErr, 'user-update-error');
          });
      },
    });
  };

  closureHandleResendClick = user => () => {
    Modal.confirm({
      title: 'Resend invitation',
      content:
        'Do you want to resend invitation for this user? The old invitation link will be invalid.',
      okType: 'danger',
      okText: 'Resend',
      maskClosable: true,
      onOk: () => {
        const userId = user.id;
        const variables = { userId };
        notification.destroy('user-update-error');
        this.props
          .resendUserToken({ variables })
          .then(() => {
            notification.success({
              message: 'Verification link resend successfully',
            });
          })
          .catch(apolloErr => {
            showApolloError(apolloErr, 'user-update-error');
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
      dataIndex: 'name',
      render: (_, row) => <span>{row.displayName}</span>,
    },
    {
      title: 'Email',
      dataIndex: 'email',
      render: (text, row) =>
        row.emailVerified || row.role !== 'ADMIN' ? (
          text
        ) : (
          <span>
            <span>{text}</span>
            <span className="divider">|</span>
            <a className="link" onClick={this.closureHandleResendClick(row)}>
              Resend Verification
            </a>
          </span>
        ),
    },
    {
      title: 'Phone Number',
      dataIndex: 'phone',
      render: text => text,
    },
    {
      title: 'Role',
      dataIndex: 'role',
      width: '75px',
      render: text => {
        const role = text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
        return <span className={role}>{role}</span>;
      },
    },
    {
      title: 'Action',
      dataIndex: 'action',
      width: '95px',
      render: (_, row) => (
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

  handleFilter = debounce(() => {
    const { search, searchRole } = this.state;
    let { userList: { users = [] } = {} } = this.props.data;

    if (searchRole !== 'All') {
      users = users.filter(u => u.role.toLowerCase() === searchRole.toLowerCase());
    }

    if (search.length >= 2) {
      const term = search.toLowerCase();
      users = users.filter(
        u => u.displayName.toLowerCase().includes(term) || u.email.toLowerCase().includes(term),
      );
    }

    this.setState({ userList: users });
  }, 500);

  handleSearch = ({ target }) => {
    this.setState({ search: target.value }, this.handleFilter);
  };

  setUserMutate = () => {
    this.setState({ isMutate: true });
  };

  onSearchRoleChange = ({ key }) => {
    this.setState({ searchRole: key }, this.handleFilter);
  };
  renderSearchRoleDropdown = () => (
    <Menu selectedKeys={[this.state.searchRole]} onClick={this.onSearchRoleChange}>
      <MenuItem key="All">All</MenuItem>
      <MenuItem key="Admin">Admin</MenuItem>
      <MenuItem key="Doctor">Doctor</MenuItem>
      <MenuItem key="Claimant">Claimant</MenuItem>
    </Menu>
  );

  render() {
    const { data, userCreate, userUpdate } = this.props;
    const { modalVisible, editingUser, search, searchRole, userList } = this.state;
    const { refetch, loading, userMe = {} } = data;

    return (
      <div className="PageUserList">
        <h1 className="Page-title">Manage Users</h1>
        <div className="table-toolbar">
          <div className="pull-left">
            <Input
              size="large"
              placeholder="Search any keyword"
              prefix={<Icon type="search" />}
              value={search}
              onChange={this.handleSearch}
              disabled={loading}
            />
            <Dropdown
              disabled={loading}
              overlay={this.renderSearchRoleDropdown()}
              trigger={['click']}
            >
              <Button size="large">
                Role: <b>{searchRole}</b> <Icon type="down" />
              </Button>
            </Dropdown>
          </div>
          <Button
            icon="user-add"
            onClick={this.openModal}
            type="primary"
            size="large"
            className="btn-create-user"
            disabled={loading}
          >
            Create User
          </Button>
        </div>
        <Table
          columns={this.columns}
          dataSource={userList}
          loading={loading}
          rowKey="id"
          size="small"
        />
        <PageUserListCreate
          visible={modalVisible}
          currentUser={userMe}
          editingUser={editingUser}
          userCreate={userCreate}
          userUpdate={userUpdate}
          refetch={refetch}
          close={this.closeModal}
          setUserMutate={this.setUserMutate}
        />
      </div>
    );
  }
}

const WithDashboard = Dashboard.with(PageUserList);
const ThenWithGraphQL = compose(
  graphql(userListGql, {
    name: 'data',
  }),
  graphql(userCreateGql, {
    name: 'userCreate',
  }),
  graphql(userUpdateGql, {
    name: 'userUpdate',
  }),
  graphql(userDeleteGql, {
    name: 'userDelete',
  }),
  graphql(resendUserTokenGql, {
    name: 'resendUserToken',
  }),
)(WithDashboard);

export default ThenWithGraphQL;
