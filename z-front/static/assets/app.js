// Need to support old and mobile browsers but there's no time to
//    setup the babel and webpack thing to use new ES features
// Just write our old day javascript

var backUrl = 'https://staging-video.magconnect.com.au/';
// var backUrl = 'http://localhost:3001';

(function () {
  // Read query string param
  // For admin from dashboard link with query string roomId=...
  // For guest from invitation token link with query string t=...
  var qs = (function (str) {
    if (!str) {
      return {};
    }
    var obj = {};
    var arr = str.split('&');
    for (var i = 0; i < arr.length; ++i) {
      var params = arr[i].split('=');
      var k = params[0], v = params[1];
      obj[k] = decodeURIComponent((v || '').replace(/\+/g, ' '));
    }
    return obj;
  })(window.location.search.substr(1));
  // Redirect to dashboard page if the qs is empty
  if (!qs.t && !qs.roomId) {
    location.href = '/-';
    return;
  }

  // Check for unsupported WebRTC
  if (!DetectRTC.isWebRTCSupported) {
    showError('Your browser does not support WebRTC');
    return;
  }

  // Add authToken to qs for admin
  if (qs.roomId) {
    qs.authToken = qs.authToken
      || localStorage.getItem('authToken')
      || Cookies.get('authToken')
      || '';
    if (qs.authToken.charAt(0) === '"') {
      qs.authToken = JSON.parse(qs.authToken);
    }
  }

  // Start
  setTimeout(function () {
    socket.emit('authenticate', qs);
  });

  // Init socket
  var socket = io(backUrl);
  // Add log
  var oldOn = socket.on.bind(socket);
  var oldEmit = socket.emit.bind(socket);
  socket.on = function (eventName, fn) {
    oldOn(eventName, function () {
      console.log('on ' + eventName);
      fn.apply(null, arguments);
    });
  };
  socket.emit = function (eventName, data) {
    oldEmit(eventName, data);
    console.log('emit ' + eventName);
  };
  // Add events
  socket.on('invalid-room', onInvalidRoom);
  socket.on('authenticated', onAuthenticated);
  socket.on('created', onCreated);
  socket.on('joined', onJoined);
  socket.on('full', onFull);
  socket.on('ready', onReady);
  socket.on('offer', onOffer);
  socket.on('answer', onAnswer);
  socket.on('icecandidate', onIceCandidate);
  socket.on('participant-left', onParticipantLeft);
  socket.on('has-been-removed', onHasBeenRemoved);

  var rtcPeerConnection = null;
  var localStream = null;
  var $localVideo = document.getElementById('local-video');
  var $remoteVideo = document.getElementById('remote-video');
  var $container = document.getElementById('container');
  var $notify = document.getElementById('notify');
  var $notifyFail = document.getElementById('notifyfail');

  $notify.addEventListener('click', function () {
    socket.emit('notify-participants');
    showMessage('Notification sent. Waiting for participant...');
    $notify.style.display = 'none';
  })

  $notifyFail.addEventListener('click', async function () {
    swal({
      title: 'Please describe the issues',
      html:
        '<label style="float:left;margin-bottom: -15px;">What best describes the problem: </label>          ' +
        '<select  id="swal-input2" class="swal2-input">           ' +
        '    <option value="1">We could not talk or see each other (I can see myself on the screen)</option>  ' +
        '    <option value="2">We could not talk or see each other (I can\'t see myself on the screen)</option>    ' +
        '    <option value="3">We could talk but could not see each other (I can see myself on the screen)</option>    ' +
        '    <option value="4">We could talk but could not see each other (I can\'t see myself on the screen)</option>    ' +
        '    <option value="5">I can\'t connect to my camera or mic</option>    ' +
        '    <option value="6">Other</option>    ' +
        '</select>                               ' +
        '<textarea id="swal-input1" class="swal2-textarea" placeholder="Describe the problem more..."></textarea>'
      ,
      confirmButtonText: 'Send',
      showCancelButton: true,
      preConfirm: function () {
        return new Promise(function (resolve) {
          resolve({
            description: document.getElementById('swal-input1').value,
            options: document.getElementById('swal-input2').value
          })
        })
      },
    }).then(function (result) {
      if (result.value) {
        if (result.value.options == 6 && !result.value.descript) {
          swal("Please describe the problem more...")
        } else {
          socket.emit('notify-fail', result.value);
        }
      }
    }).catch(swal.noop)
  })

  function onInvalidRoom() {
    showError('The link you followed was invalid or expired');
  }
  function onAuthenticated(e) {
    socket.emit('join');
    if (!(e && e.isInstantSession)) {
      $notify.style.display = 'block';
      $notifyFail.style.display = 'block';

    }
  }
  function onCreated() {
    getUserMedia(function () {
      $container.style.display = 'block';
    });
  }
  function onJoined() {
    getUserMedia(function () {
      socket.emit('ready');
      $container.style.display = 'block';
    });
  }
  function onFull() {
    showError('The session is full, only 2 participants can join a session at the same time');
  }
  function onReady() {
    createPeerConnection();
  }
  function onOffer(offerSdp) {
    createPeerConnection(offerSdp);
  }
  function onAnswer(answerSdp) {
    rtcPeerConnection.setRemoteDescription(new RTCSessionDescription(answerSdp));
  }
  function onIceCandidate(candidate) {
    if (candidate) {
      rtcPeerConnection.addIceCandidate(new RTCIceCandidate(candidate));
      return;
    }
    try {
      var ua = window.navigator.userAgent;
      if (ua.indexOf("Edge") > -1 || /edg/i.test(ua)) {
        rtcPeerConnection.addIceCandidate(null);
      }
    } catch (err) { }
  }
  function onParticipantLeft() {
    showMessage('The participant has left');
    $remoteVideo.style.display = 'none';
  }
  function onHasBeenRemoved() {
    localStream.getTracks().forEach(function (t) {
      t.stop();
    });
    socket.disconnect();
    $container.style.display = 'none';
    showError('You have been removed from the session');
  }

  function getUserMedia(cb) {
    return navigator.mediaDevices.getUserMedia({ audio: true, video: true }).then(function (stream) {
      setVideoStream($localVideo, stream);
      localStream = stream;
      cb();
    }).catch(function (err) {
      showError('Can not access your microphone and webcam, please try again');
      console.error(err);
    });
  }

  function createPeerConnection(offerSdp) {
    rtcPeerConnection = new RTCPeerConnection({
      iceServers: [{
        urls: [
          'stun:45.32.191.203:3478',
          'stun:45.32.191.203:3479'
        ]
      }, {
        urls: [
          'turn:45.32.191.203:3478',
          'turn:45.32.191.203:3479'
        ],
        username: '0',
        credential: '0'
      }]
    });
    rtcPeerConnection.onicecandidate = onPeerIceCandidate;
    rtcPeerConnection.onaddstream = onPeerAddStream;
    rtcPeerConnection.onerror = onPeerError;
    rtcPeerConnection.addStream(localStream);
    if (!offerSdp) {
      rtcPeerConnection.createOffer(function (localSdp) {
        rtcPeerConnection.setLocalDescription(localSdp);
        socket.emit('offer', localSdp);
      }, function (err) {
        console.error(err);
      });
    } else {
      rtcPeerConnection.setRemoteDescription(new RTCSessionDescription(offerSdp));
      rtcPeerConnection.createAnswer(function (localSdp) {
        rtcPeerConnection.setLocalDescription(localSdp);
        socket.emit('answer', localSdp);
      }, function (err) {
        console.error(err);
      });
    }
  }

  function onPeerIceCandidate(e) {
    socket.emit('icecandidate', e && e.candidate ? {
      sdpMLineIndex: e.candidate.sdpMLineIndex,
      candidate: e.candidate.candidate
    } : null);
  }
  function onPeerAddStream(e) {
    setVideoStream($remoteVideo, e.stream);
    // fixPositionRemoteVideo();
    hideMessage();
  }
  function onPeerError(err) {
    console.error(err);
  }

  function setVideoStream(video, stream) {
    try {
      video.srcObject = stream;
    } catch (err) {
      console.error(err);
      try {
        video.src = URL.createObjectURL(stream);
      } catch (err2) {
        console.error(err2);
        showError();
      }
    }
    video.style.display = 'block';
  }

  function showError(msg) {
    swal({
      type: 'error',
      title: 'Error',
      text: msg || 'An error occurred please try again'
    });
  }

  var $message = document.getElementById('message');
  function showMessage(msg) {
    $message.innerHTML = msg;
  }
  function hideMessage() {
    $message.innerHTML = '';
    $notify.style.display = 'none';
    $notifyFail.style.display = 'none';

  }

  // var batchId = 0;
  // function batchFixPositionRemoteVideo() {
  //   if (batchId) {
  //     clearTimeout(batchId);
  //   }
  //   batchId = setTimeout(fixPositionRemoteVideo, 170);
  // }

  // var isScreenRotated = false;
  // function fixPositionRemoteVideo() {
  //   var cw = $container[isScreenRotated ? 'clientHeight' : 'clientWidth'];
  //   var ch = $container[isScreenRotated ? 'clientWidth' : 'clientHeight'];
  //   var vw = $remoteVideo.clientWidth;
  //   var vh = $remoteVideo.clientHeight;
  //   var nvw = cw, nvh = ch, t = 0, l = 0;

  //   var isContainerTaller = cw/ch < vw/vh;
  //   if (isContainerTaller) {
  //     nvw = cw
  //     nvh = vh * nvw / vw;
  //     t = (ch - nvh) / 2;
  //   } else {
  //     nvh = ch;
  //     nvw = vw * nvh / vh;
  //     l = (cw - nvw) / 2;
  //   }
  //   if (isScreenRotated) {
  //     var tTemp = t;
  //     t = l;
  //     l = tTemp;
  //   }
  //   $remoteVideo.style.width = nvw + 'px';
  //   $remoteVideo.style.height = nvh + 'px';
  //   $remoteVideo.style.top = t + 'px';
  //   $remoteVideo.style.left = l + 'px';
  //   $container.setAttribute('class', isScreenRotated ? 'screen-rotated' : undefined);
  //   window.removeEventListener('resize', batchFixPositionRemoteVideo);
  //   window.addEventListener('resize', batchFixPositionRemoteVideo);
  //   batchId = 0;
  // }

  var audioMuteBtn = document.getElementById('audio-mute-btn');
  var videoMuteBtn = document.getElementById('video-mute-btn');
  var audioMutedText = document.getElementById('audio-muted-text');
  var videoMutedText = document.getElementById('video-muted-text');
  function toggleAudio() {
    localStream.getAudioTracks().forEach(function (t) {
      t.enabled = !t.enabled;
    });
    audioMuteBtn.classList.toggle('active');
    audioMutedText.classList.toggle('active');
  }
  function toggleVideo() {
    localStream.getVideoTracks().forEach(function (t) {
      t.enabled = !t.enabled;
    });
    videoMuteBtn.classList.toggle('active');
    videoMutedText.classList.toggle('active');
  }
  audioMuteBtn.addEventListener('click', toggleAudio);
  videoMuteBtn.addEventListener('click', toggleVideo);
})();
