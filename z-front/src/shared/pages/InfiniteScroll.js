import React, { Component } from 'react';
import faker from 'faker';

import './InfiniteScroll.scss';

const totalRow = 1000000;
const ROW_HEIGHT = 30;

const dataCache = {};
const getDataById = id => {
  if (!(id in dataCache)) {
    dataCache[id] = {
      id,
      firstName: faker.name.firstName(),
      lastName: faker.name.lastName(),
      address: faker.address.streetAddress(),
    };
  }
  return dataCache[id];
};
const getDataList = (frId, toId) => {
  const dataList = [];
  while (frId < toId) {
    const data = getDataById(frId);
    dataList.push(data);
    frId += 1; // eslint-disable-line
  }
  return dataList;
};

class InfiniteScroll extends Component {
  constructor(props) {
    super(props);
    this.state = {
      nRowTop: 0,
      nRowRender: 0,
    };
  }

  componentDidMount() {
    this.updateRenderIndex();
    window.addEventListener('resize', this.updateRenderIndex, true);
  }
  componentWillUnmount() {
    window.removeEventListener('resize', this.updateRenderIndex, true);
  }

  setContainerRef = node => {
    this.containerDOMNode = node;
  };

  updateRenderIndex = () => {
    const { scrollTop, clientHeight } = this.containerDOMNode;
    const nRowTop = Math.floor(scrollTop / ROW_HEIGHT);
    if (nRowTop !== this.state.nRowTop) {
      this.setState({ nRowTop });
    }
    const nRowRender =
      Math.ceil(clientHeight / ROW_HEIGHT) + (scrollTop % ROW_HEIGHT !== 0 ? 1 : 0);
    if (nRowRender !== this.state.nRowRender) {
      this.setState({ nRowRender });
    }
  };

  render() {
    const { nRowTop, nRowRender } = this.state;

    const spaceTop = nRowTop * ROW_HEIGHT;
    const spaceBot = (totalRow - nRowTop - nRowRender) * ROW_HEIGHT;

    const dataList = getDataList(nRowTop, nRowTop + nRowRender);

    return (
      <div className="InfiniteScroll">
        <div className="thead">
          <div className="tr">
            <div className="th">id</div>
            <div className="th">First name</div>
            <div className="th">Last name</div>
            <div className="th">Address</div>
          </div>
        </div>
        <div className="tbody" ref={this.setContainerRef} onScroll={this.updateRenderIndex}>
          <div style={{ height: spaceTop }} />
          {dataList.map(d => (
            <div className="tr" key={d.id}>
              <div className="td">{d.id}</div>
              <div className="td">{d.firstName}</div>
              <div className="td">{d.lastName}</div>
              <div className="td">{d.address}</div>
            </div>
          ))}
          <div style={{ height: spaceBot }} />
        </div>
      </div>
    );
  }
}

export default InfiniteScroll;
