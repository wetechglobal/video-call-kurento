import { notification } from 'antd';
import React from 'react';
import Dictation from './pagesBack/Dictation';

class DictationContainer extends React.Component {
  static inst = null;

  state = {
    dictationData: null,
  };

  componentDidMount() {
    DictationContainer.inst = this;
  }
  componentWillUnmount() {
    DictationContainer.inst = null;
  }

  openDictation = dictationData => {
    if (typeof RTCPeerConnection === 'undefined') {
      notification.error({
        message: 'Your browser doesnt support WebRTC',
        key: 'RTCPeerConnection-undefined',
      });
      return;
    }
    this.setState({ dictationData });
  };
  closeDictation = () => {
    this.setState({ dictationData: null });
  };

  render() {
    const { dictationData } = this.state;
    return (
      <div>
        {this.props.children}
        {dictationData && (
          <Dictation
            caseId={dictationData.caseId}
            refetch={dictationData.refetch}
            close={this.closeDictation}
          />
        )}
      </div>
    );
  }
}

export default DictationContainer;
