import React from 'react';
import { Dropdown, Icon, Menu } from 'antd';
import { NavLink } from 'react-router-dom';

import './DashboardUser.scss';

const MenuItem = Menu.Item;

const DashboardUser = props => {
  const { me } = props;

  const userMenu = (
    <Menu className="DashboardUser-Dropdown">
      {/*<MenuItem>
        <NavLink to="/-/profile">
          <Icon type="setting" />
          <span>My Profile</span>
        </NavLink>
      </MenuItem>*/}
      <MenuItem>
        <NavLink to="/-/logout">
          <Icon type="logout" />
          <span>Logout</span>
        </NavLink>
      </MenuItem>
    </Menu>
  );

  return (
    <Dropdown overlay={userMenu} placement="bottomRight">
      <div className="DashboardUser-User pull-right">
        <span className="DashboardUser-Name">{me.displayName}</span>
        <span className="DashboardUser-Avatar" />
      </div>
    </Dropdown>
  );
};

export default DashboardUser;
