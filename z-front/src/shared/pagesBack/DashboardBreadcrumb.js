import React, { Component } from 'react';
import { Breadcrumb, Icon } from 'antd';
import { NavLink } from 'react-router-dom';

import breadcrumbEmitter from './breadcrumbEmitter';

const BreadcrumbItem = Breadcrumb.Item;

class DashboardBreadcrumb extends Component {
  constructor(props) {
    super(props);
    // TODO Not for SSR: memory leak
    breadcrumbEmitter.addListener('change', this.onBreadcrumbsChange);
    this.state = {
      breadcrumbs: [],
    };
  }
  componentWillUnmount() {
    breadcrumbEmitter.removeListener('change', this.onBreadcrumbsChange);
  }
  onBreadcrumbsChange = breadcrumbs => {
    this.setState({ breadcrumbs });
  };

  render() {
    return (
      <Breadcrumb className="pull-left">
        {this.state.breadcrumbs.map(b => (
          <BreadcrumbItem key={b.url}>
            <NavLink to={b.url}>
              {b.icon && <Icon type={b.icon} />}
              <span>{b.text}</span>
            </NavLink>
          </BreadcrumbItem>
        ))}
      </Breadcrumb>
    );
  }
}

export default DashboardBreadcrumb;
