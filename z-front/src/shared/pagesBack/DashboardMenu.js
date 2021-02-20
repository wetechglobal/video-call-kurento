import React from 'react';
import { Icon, Menu } from 'antd';
import { NavLink } from 'react-router-dom';

const MenuItem = Menu.Item;

const DashboardMenu = props => (
  <Menu
    className="DashboardMenu"
    theme="dark"
    mode="inline"
    selectedKeys={[
      (() => {
        const ps = props.pathname.split('/');
        const p1 = ps[2];
        const p2 = ps[3];
        if (p1 === 'cases' && p2 === 'instant-sessions') {
          return 'instant-sessions';
        }
        return p1;
      })(),
    ]}
  >
    {/*<MenuItem key="sessions">
      <NavLink to="/-/sessions">
        <Icon type="bars" />
        <span>All video sessions</span>
      </NavLink>
    </MenuItem>*/}
    <MenuItem key="cases">
      <NavLink to="/-/cases">
        <Icon type="solution" />
        <span>MAG Connect Sessions</span>
      </NavLink>
    </MenuItem>
    <MenuItem key="instant-sessions">
      <NavLink to="/-/cases/instant-sessions">
        <Icon type="fast-forward" />
        <span>Instant Sessions</span>
      </NavLink>
    </MenuItem>
    {props.isAdmin && (
      <MenuItem key="users">
        <NavLink to="/-/users">
          <Icon type="team" />
          <span>Manage Users</span>
        </NavLink>
      </MenuItem>
    )}
    {/*<MenuItem key="profile">
      <NavLink to="/-/profile">
        <Icon type="setting" />
        <span>My Profile</span>
      </NavLink>
    </MenuItem>*/}
  </Menu>
);

export default DashboardMenu;
