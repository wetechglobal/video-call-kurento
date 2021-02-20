import React, { Component } from 'react';

import emitter from './emitter';

const oneMinute = 60000;
const oneHour = oneMinute * 60;
const oneDay = oneHour * 24;
const oneMonth = oneDay * 30;
const oneYear = oneMonth * 12;

const timestamp = diff => {
  if (diff < oneMinute) {
    return 'just now';
  }
  if (diff > oneYear) {
    return 'over a year ago';
  }

  let type = '';
  let duration = 0;
  if (diff > oneMonth) {
    type = 'month';
    duration = oneMonth;
  } else if (diff > oneDay) {
    type = 'day';
    duration = oneDay;
  } else if (diff > oneHour) {
    type = 'hour';
    duration = oneHour;
  } else {
    type = 'minute';
    duration = oneMinute;
  }

  let number = Math.ceil(diff / duration);
  if (number === 1) {
    number = 'a';
  } else {
    type += 's';
  }

  return `${number} ${type} ago`;
};

class TimeDiff extends Component {
  static getDerivedStateFromProps(nextProps, prevState) {
    if (nextProps.time === this.props.time) {
      return;
    }
    return {
      time: typeof nextProps.time === 'string' ? new Date(nextProps.time) : nextProps.time,
    };
  }

  constructor(props) {
    super(props);
    let { time } = this.props;
    if (typeof time === 'string') {
      time = new Date(time);
    }
    this.state = {
      now: emitter.now,
      time,
    };
    emitter.on('now', this.handleEmitterNow);
  }
  componentWillUnmount() {
    emitter.removeListener('now', this.handleEmitterNow);
  }

  handleEmitterNow = () => {
    this.setState({
      now: emitter.now,
    });
  };

  render() {
    return <span>{timestamp(this.state.now - this.state.time)}</span>;
  }
}

export default TimeDiff;
