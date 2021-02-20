import { Button, Modal, notification } from 'antd';
import { WebRtcPeer } from 'kurento-utils';
import React, { Component, Fragment } from 'react';
import { socket, backend } from '../config';
import browserStorage from '../utils/browserStorage';

import './Dictation.scss';

// We need to have the sessionId here because the event will fire before the component mount
// So we need to register the 'id' event intermediately right after import
// Let's assume that we will always have the sessionId below this
let sessionId = '';
socket.on('id', id => {
  sessionId = id;
});

const recordStateToText = {
  loading: 'Loading...',
  error: 'An error occured',
  ready: 'Ready to record',
  recording: 'Recording...',
  paused: 'Paused',
  previewLoading: 'Please wait until the preview is ready',
  replayLoading: 'Please wait until the replay is ready',
};

class RTCParticipant {
  constructor(id, name) {
    this.id = id;
    this.name = name;
    this.rtcPeer = null;
    this.iceCandidateQueue = [];
  }

  offerToReceiveVideo = (err, sdpOffer) => {
    if (err) {
      console.error('offerToReceiveVideo: ', err);
      return;
    }
    socket.emit('message', {
      id: 'receiveVideoFrom',
      sender: this.id,
      sdpOffer,
    });
  };

  onIceCandidate = candidate => {
    socket.emit('message', {
      id: 'onIceCandidate',
      sender: this.id,
      candidate,
    });
  };

  dispose = () => {
    this.rtcPeer.dispose();
    this.rtcPeer = null;
  };
}

class Dictation extends Component {
  state = {
    // We have
    //    loading
    //    error
    //    ready
    //    recording
    //    paused
    //    previewLoading
    //    previewReady
    //    replayLoading
    //    replayReady
    recordState: 'loading',
    stamp: '00:00',
    replayDone: false,
  };
  // Participants map with socket id
  participants = {};
  // Only necessary in dictation
  recordingFilename = '';
  dictationDelete = false;
  // Unnecessary in dictation but just set it
  //    to prepare for the video group
  localName = '';
  isOwner = false;
  // Use interval to count timestamp
  // TODO This can be improved to have a better performance
  stampTimer = 0;
  // To clear cache in browser every time the player re-render
  playerId = 0;

  componentDidMount() {
    // Register listeners on socket
    socket.on('error', this.onError);
    socket.on('message', this.onMessage);
    // Start the webrtc process via socket
    socket.emit('message', {
      id: 'register',
      qs: {
        dictation: true,
        roomId: this.props.caseId,
        authToken: browserStorage.get('authToken'),
      },
    });
    // Start stamp interval
    // TODO This can be improved to have a better performance
    this.stampTimer = setInterval(this.stampInterval, 100);
  }
  componentWillUnmount() {
    // Clear all listeners to avoid memory leak
    socket.removeListener('error', this.onError);
    socket.removeListener('message', this.onMessage);
    clearInterval(this.stampTimer);
    Object.values(this.participants).forEach(p => {
      p.dispose();
    });
  }

  stampSeconds = 0;
  stampInterval = () => {
    if (this.state.recordState !== 'recording') {
      return;
    }
    this.stampSeconds += 0.1;

    let secs;
    let hrs;
    let mins;

    secs = Math.floor(this.stampSeconds);
    hrs = Math.floor(secs / 3600);
    secs %= 3600;
    mins = Math.floor(secs / 60);
    secs %= 60;

    if (mins < 10) {
      mins = '0' + mins;
    }
    if (secs < 10) {
      secs = '0' + secs;
    }

    let stamp = mins + ':' + secs;
    if (hrs) {
      stamp = hrs + ':' + stamp;
    }

    if (stamp === this.state.stamp) {
      return;
    }
    this.setState({ stamp });
  };

  onMessage = msg => {
    // Auto transform message id to handler
    // Eg. existingParticipants will be mapped to onExistingParticipants
    const fn =
      this['on' + msg.id.charAt(0).toUpperCase() + msg.id.slice(1)] ||
      (() => console.error('No handler for message:', msg));
    fn(msg);
  };
  onError = err => {
    notification.error({
      message: 'An error occured',
    });
    console.error('Get unexpected error:', err);
  };

  onRegistered = msg => {
    if (msg.err) {
      this.onError(msg);
      this.setState({
        recordState: 'error',
      });
      return;
    }
    socket.emit('message', {
      id: 'joinRoom',
      // Send joinRoom message with unique room name for dictation
      //    because there can be many people do dictation in the same room
      // We need to keep them separated so we append a unique name based on time stamp
      // TODO make the roomId correct so later we can use this for video room
      roomId: `${msg.roomId}-dictation-${Date.now()}`,
    });
    this.localName = msg.name;
    this.isOwner = msg.isOwner;
  };
  onIceCandidate = msg => {
    if (!(msg.sessionId in this.participants)) {
      // TODO add to ice candidate queue
      console.error('onIceCandidate: Missing rtc peer for sessionId=' + msg.sessionId);
      return;
    }
    this.participants[msg.sessionId].rtcPeer.addIceCandidate(msg.candidate, err => {
      if (err) {
        console.error('Can not add ice candidate:', err);
      }
    });
  };
  onExistingParticipants = msg => {
    const constraints = {
      audio: true,
      video: false, //{
      // optional: [
      // To get the highest video quality
      // { minWidth: 320 },
      // For dictation we just need the lowest
      // TODO in video call we need to uncomment these lines
      // { minWidth: 640 },
      // { minWidth: 1024 },
      // { minWidth: 1280 },
      // { minWidth: 1920 },
      // { minWidth: 2560 },
      // ],
      // },
    };
    // Create video for current user to send to server
    const localParticipant = new RTCParticipant(sessionId, this.localName);
    this.participants[sessionId] = localParticipant;
    // Create a peer to send the video to other participants
    const comp = this;
    localParticipant.rtcPeer = WebRtcPeer.WebRtcPeerSendonly(
      {
        localVideo: null,
        mediaConstraints: constraints,
        onicecandidate: localParticipant.onIceCandidate,
      },
      function(err) {
        // Need to pass regular function here
        if (err) {
          comp.onError(err);
          return;
        }
        comp.setState({
          recordState: 'ready',
        });
        this.generateOffer(localParticipant.offerToReceiveVideo);
      },
    );
    // Get access to video from all the current participants
    msg.data.forEach(id => {
      this.receiveVideoFrom(id, msg.names[id]);
    });
  };
  receiveVideoFrom = (id, name) => {
    const participant = new RTCParticipant(id, name);
    this.participants[id] = participant;
    // Create a peer to receive the video from other participants
    const comp = this;
    participant.rtcPeer = WebRtcPeer.WebRtcPeerRecvonly(
      {
        remoteVideo: null,
        onicecandidate: participant.onIceCandidate,
      },
      function(err) {
        // Need to pass regular function here
        if (err) {
          comp.onError(err);
          return;
        }
        this.generateOffer(participant.offerToReceiveVideo);
      },
    );
  };
  onReceiveVideoAnswer = msg => {
    const participant = this.participants[msg.sessionId];
    const comp = this;
    participant.rtcPeer.processAnswer(msg.sdpAnswer, function(err) {
      // Need to pass regular function here
      if (err) {
        comp.onError(err);
        return;
      }
      participant.isAnswer = true;
      while (participant.iceCandidateQueue.length) {
        const candidate = participant.iceCandidateQueue.shift();
        participant.rtcPeer.addIceCandidate(candidate);
      }
    });
  };

  onNewParticipantArrived = msg => {
    this.receiveVideoFrom(msg.new_user_id, msg.name);
  };
  onParticipantLeft = msg => {
    if (!(msg.sessionId in this.participants)) {
      return;
    }
    const participant = this.participants[msg.sessionId];
    participant.dispose();
    delete this.participants[msg.sessionId];
  };

  onStartRecording = () => {
    this.setState({
      recordState: 'recording',
      replayDone: false,
    });
  };
  onStopRecording = () => {
    this.setState({
      recordState: 'paused',
    });
  };
  onEndcall = () => {
    if (!this.recordingFilename) {
      notification.success({
        message: 'Your session is finished',
      });
      return;
    }
    this.setState({
      recordState: 'previewLoading',
    });
  };

  onRecordingFilename = msg => {
    this.recordingFilename = msg.recordingFilename
      .replace(/tmp\/mag-files/, 'temp')
      .replace(/\.[^.]+$/, '.flac');
  };
  onConvertFlacFinished = msg => {
    if (msg.isError) {
      this.onError(msg);
      return;
    }
    this.setState({
      recordState: msg.replay ? 'replayReady' : 'previewReady',
    });
  };
  onDictationFinished = () => {
    setTimeout(
      () =>
        notification.success({
          message: `Your dictation session has been ${this.dictationDelete ? 'deleted' : 'saved'}`,
        }),
      680,
    );
    // Reset state and variables
    this.setState({
      recordState: 'ready',
      stamp: '00:00',
    });
    this.recordingFilename = '';
    this.stampSeconds = 0;
    if (!this.dictationDelete) {
      this.props.refetch();
    }
  };

  closureOnSubmitDictationClick = ok => () => {
    if (this.state.recordState === 'previewReady') {
      socket.emit('message', {
        id: 'submitDictation',
        ok,
      });
      this.dictationDelete = !ok;
    } else {
      this.setState({
        recordState: 'paused',
        replayDone: true,
      });
    }
  };

  onToggleStartClick = () => {
    switch (this.state.recordState) {
      case 'ready':
      case 'paused':
        socket.emit('message', {
          id: 'startRecording',
        });
        return;
      case 'recording':
        socket.emit('message', {
          id: 'stopRecording',
        });
        return;
      default:
        return;
    }
  };
  onTogglePauseClick = () => {
    switch (this.state.recordState) {
      case 'paused':
      case 'recording':
        this.onToggleStartClick();
        return;
      default:
        return;
    }
  };
  onReplayClick = () => {
    if (this.state.replayDone) {
      this.setState({
        recordState: 'replayReady',
      });
      this.playerId -= 1;
      return;
    }
    socket.emit('message', {
      id: 'generateReplay',
    });
    this.setState({
      recordState: 'replayLoading',
    });
  };
  onStopClick = () => {
    switch (this.state.recordState) {
      case 'recording':
      case 'paused':
        Modal.confirm({
          title: 'Stop dictation',
          content: `Do you want to stop dictation? You'll need to preview your dictation and submit to save it.`,
          okType: 'danger',
          okText: 'Stop',
          maskClosable: true,
          onOk: () => {
            socket.emit('message', {
              id: 'endcall',
            });
          },
        });
        return;
      default:
        return;
    }
  };
  onDiscardClick = () => {
    switch (this.state.recordState) {
      case 'recording':
      case 'paused':
      case 'previewLoading':
        Modal.confirm({
          title: 'Discard dictation',
          content: 'Do you want to discard the current dictation?',
          okType: 'danger',
          okText: 'Discard',
          maskClosable: true,
          onOk: this.props.close,
        });
        return;
      default:
        this.props.close();
        return;
    }
  };

  renderPlayer() {
    // To clear cache
    this.playerId += 1;

    return (
      <Fragment>
        <audio controls>
          <source
            src={`${backend}${this.recordingFilename}?clearCache=${this.playerId}`}
            type="audio/flac"
          />
        </audio>
        <div className="Preview text-center">
          (Player for flac is only supported on chromium based browser)
        </div>
        <div className="Submit text-center">
          <Button type="primary" onClick={this.closureOnSubmitDictationClick(true)}>
            {this.state.recordState === 'replayReady' ? 'Back' : 'Submit'}
          </Button>
          {this.state.recordState !== 'replayReady' && (
            <Button type="danger" onClick={this.closureOnSubmitDictationClick(false)}>
              Cancel
            </Button>
          )}
        </div>
      </Fragment>
    );
  }
  renderRecorder() {
    const { recordState, stamp } = this.state;
    return (
      <Fragment>
        <span
          className={recordState + ' RecordButton pull-left'}
          onClick={this.onToggleStartClick}
        />
        <div className="pull-left">
          <div className={recordState + ' Status Text'}>
            {recordStateToText[recordState]}
            {recordState === 'paused' && (
              <Fragment>
                <span className="divider">|</span>
                <a onClick={this.onReplayClick}>Replay Recording</a>
              </Fragment>
            )}
          </div>
          <div className="Action Text">
            <a className={recordState} onClick={this.onTogglePauseClick}>
              {recordState === 'paused' || recordState === 'replayLoading' ? 'Resume' : 'Pause'}
            </a>
            <span className="divider">|</span>
            <a className={recordState} onClick={this.onStopClick}>
              Stop
            </a>
            <span className="divider">|</span>
            <a onClick={this.onDiscardClick}>Close</a>
          </div>
        </div>
        <div className="TimeStamp pull-right">{stamp}</div>
      </Fragment>
    );
  }

  render() {
    const { recordState } = this.state;
    const shouldRenderPlayer = recordState === 'previewReady' || recordState === 'replayReady';
    return (
      <div className="Dictation clearfix">
        {shouldRenderPlayer && this.renderPlayer()}
        {!shouldRenderPlayer && this.renderRecorder()}
      </div>
    );
  }
}

export default Dictation;
