var backurl = 'https://staging-video.magconnect.com.au/';
// var backurl = 'http://localhost:3001';
var isChrome = /Chrome/.test(navigator.userAgent || '')
  && /Google/.test(navigator.vendor || '');

$(function () {
  // Hide everything
  $('.main-video, .all-videos').hide();

  // Read query string param
  // room=...&t=...
  var qs = (function(str) {
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

  // Redirect to dashboard page if there's no dictation
  if (!qs.t && !qs.room) {
    location.href = '/-';
    return;
  }
  // Updated server
  qs.roomId = qs.room;

  // Check for unsupported web rtc
  if (!isChrome || !DetectRTC.isWebRTCSupported) {
    $('body').show();
    swal('Browser not supported', 'MAG Video requires Chrome browser on both Windows or Mac Operating Systems.', 'error');
    return;
  }

  // Add authToken to qs
  qs.authToken = qs.authToken
    || localStorage.getItem('authToken')
    || Cookies.get('authToken')
    || '';
  if (qs.authToken.charAt(0) === '"') {
    qs.authToken = JSON.parse(qs.authToken);
  }

  var isDictation = !!qs.dictation;

  var socket = io.connect(backurl);
  var localVideo;
  var localName;
  var localOwner = false;
  var sessionId;

  var participants = {};
  var selectingVideo = null;

  window.onbeforeunload = function () {
    socket.disconnect();
  };

  function sendMessage(data) {
    socket.emit('message', data);
  }
  window.sendMessage = sendMessage;

  function showUnexpectedError() {
    // TODO log and report to somewhere
    swal('Error', 'An unexpected error occurred, please report to the system admin.', 'error');
  }

  function joinRoom(roomId) {
    sendMessage({
      id: 'joinRoom',
      roomId: roomId,
    });
  }

  function onExistingParticipants(message) {
    var constraints = {
      audio: true,
      video: {
        optional: [
          { minWidth: 320 },
          { minWidth: 640 },
          { minWidth: 1024 },
          { minWidth: 1280 },
          { minWidth: 1920 },
          { minWidth: 2560 },
        ],
      },
    };
    // create video for current user to send to server
    var localParticipant = new Participant(sessionId, localName);
    participants[sessionId] = localParticipant;
    localVideo = $('#local_video video')[0];
    var video = localVideo;
    // bind function so that calling 'this' in that function will receive the current instance
    var options = {
      localVideo: video,
      mediaConstraints: constraints,
      onicecandidate: localParticipant.onIceCandidate.bind(localParticipant),
    };
    // create the peer instance
    localParticipant.rtcPeer = new kurentoUtils.WebRtcPeer.WebRtcPeerSendonly(options, function (error) {
      if (error) {
        return console.error(error);
      }
      // set localVideo to new object if on IE/Safari
      localVideo = $('#local_video video')[0];
      localVideo.src = localParticipant.rtcPeer.localVideo.src;
      localVideo.muted = true;
      selectingVideo = localVideo;
      // Internet Explorer fix to fix audio :( has to be done after attachMediaStream is finished
      participants[sessionId].rtcPeer.getLocalStream().getAudioTracks()[0].enabled = true;
      this.generateOffer(localParticipant.offerToReceiveVideo.bind(localParticipant));
    });
    // get access to video from all the participants
    for (var i in message.data) {
      var id = message.data[i];
      receiveVideoFrom(id, message.names[id]);
    }
  }

  function receiveVideoFrom(sender, name) {
    var participant = new Participant(sender, name);
    participants[sender] = participant;
    var video = createVideoForParticipant(participant);
    // bind function so that calling 'this' in that function will receive the current instance
    var options = {
      remoteVideo: video,
      onicecandidate: participant.onIceCandidate.bind(participant),
    };
    participant.rtcPeer = new kurentoUtils.WebRtcPeer.WebRtcPeerRecvonly(options, function (error) {
      if (error) {
        return console.error(error);
      }
      this.generateOffer(participant.offerToReceiveVideo.bind(participant));
    });
  }

  function onNewParticipant(message) {
    receiveVideoFrom(message.new_user_id, message.name);
  }

  function onParticipantLeft(message) {
    var participant = participants[message.sessionId];
    participant.dispose();
    delete participants[message.sessionId];
    // remove video tag
    var video = document.getElementById('video-' + participant.id);
    // Internet Explorer doesn't know element.remove(), does know this
    video.parentNode.removeChild(video);
  }

  function onReceiveVideoAnswer(message) {
    var participant = participants[message.sessionId];
    participant.rtcPeer.processAnswer(message.sdpAnswer, function (error) {
      if (error) {
        console.error(error);
        return;
      }
      participant.isAnswer = true;
      while (participant.iceCandidateQueue.length) {
        var candidate = participant.iceCandidateQueue.shift();
        participant.rtcPeer.addIceCandidate(candidate);
      }
    });
  }

  function createVideoForParticipant(participant) {
    var videoId = 'video-' + participant.id;
    var $video = $(
      '<div class="small-video" id="video-'+ participant.id + '">' +
        '<div class="member-title">' +
          '<strong class="member-name">' + participant.name + ':</strong>' +
          (localOwner ? '<span class="member-remove fa fa-remove"></span>' : '') +
        '</div>' +
        '<video autoplay></video>' +
      '</div>'
    );
    $('#video_list').append($video);
    $video.click(function () {
      selectingVideo = $video.find('video')[0];
      $('.all-videos').removeClass('active');
    });
    $video.find('.member-remove').click(function() {
      sendMessage({
        id: 'removeMember',
        data: participant.id,
      });
    });
    // return video element
    return $video.find('video')[0];
  }

  // Show preview
  var recordingFilename = '';
  function handleRecordingFilename(msg) {
    if (!isDictation) {
      return;
    }
    recordingFilename = msg.recordingFilename.replace(/tmp\/kurento-temp/, 'temp')
      .replace(/\.[^.]+$/, '.flac');
  }
  var dictationDelete = false;
  function handleConvertFlacFinished(msg) {
    if (msg.isError) {
      showUnexpectedError();
      return;
    }
    if (!isDictation) {
      return;
    }
    $('.main-video').addClass('player');
    $('.main-video').append(
      '<div id="playback-player">' +
        '<audio controls>' +
          '<source src="'+recordingFilename+'" type="audio/flac" />' +
        '</audio>' +
        '<p class="text-center text-danger">' +
          '(Player for flac is only supported on chromium based browser)' +
        '</p>' +
      '</div>'
    );
    $('#playback-msg').addClass('text-success');
    $('#playback-msg').html(
      '<p>Dictation file is ready for review.</p>' +
      '<div class="btn btn-sm btn-primary pull-right">Submit dictation</div>' +
      '<div class="btn btn-sm btn-danger pull-right">Redo dictation</div>'
    );
    $('#playback-msg').find('.btn-primary').click(function() {
      sendMessage({
        id: 'submitDictation',
        ok: true,
      });
    });
    dictationDelete = false;
    $('#playback-msg').find('.btn-danger').click(function() {
      dictationDelete = true;
      sendMessage({
        id: 'submitDictation',
        ok: false,
      });
    });
  }

  // Finish dictation
  function handleDictationFinished() {
    if (!isDictation) {
      return;
    }
    recordingFilename = '';
    swal('Finished', 'Your dictation session has been ' + (dictationDelete ? 'deleted' : 'saved'), 'success');
    $('.main-video').removeClass('player');
    $('#playback-player').remove();
    $('#playback-msg').remove();
    showUI();
  }

  // Hide/show UI
  function hideUI() {
    // small videos
    $('#local_video').hide();
    $('#video_list').hide();
    // timestamps
    $('#timestamp-start').hide();
    $('#timestamp-now').hide();
    // documents
    $('#document-title').hide();
    $('#document-container').hide();
    // main children
    $('.main-video').children().hide();
  }
  function showUI() {
    // small videos
    $('#local_video').show();
    $('#video_list').show();
    // timestamps
    $('#timestamp-start').show();
    $('#timestamp-now').show();
    // documents
    $('#document-title').show();
    $('#document-container').show();
    // main children
    $('#main-video').show();
    $('#record-btn').show();
    $('#mute-btn').show();
    $('#endcall-btn').show();
  }
  function hideAdminFunctions() {
    $('#endcall-btn').hide();
  }
  function showAdminFunctions() {
    $('#endcall-btn').show();
  }

  socket.on('error', showUnexpectedError);

  socket.on('id', function (id) {
    $('body').show();
    sessionId = id;
    sendMessage({
      id: 'register',
      qs: qs,
    });
  });

  // message handler
  socket.on('message', function (message) {
    switch (message.id) {
      case 'registered':
        if (message.err) {
          switch (message.err) {
          case 'Unauthorized':
            swal('Error', 'You do not have permission to view this page.', 'error');
            return;
          case 'Invalid':
            swal('Error', 'The link you visit is invalid.', 'error');
            return;
          case 'Closed':
            swal('Error', 'The room is closed.', 'error');
            return;
          default:
            swal('Error', 'Unexpect error.', 'error');
            return;
          }
        }
        localName = message.name;
        localOwner = message.isOwner;
        qs.roomId = message.roomId;
        // Only owner can use dictation
        if (!localOwner && isDictation) {
          swal('Error', 'You can not have dictation session.', 'error');
          return;
        }
        // init UI base on isOwner
        hideAdminFunctions();
        if (localOwner) {
          showAdminFunctions();
          if (!isDictation) {
            //$('#header').append('<a href="/?room=' + qs.roomId + '&dictation=true" target="_blank">Open Dictation section</a>');
          }
        }
        $('.main-video, .all-videos').show();
        var roomId = qs.roomId + (isDictation ? '-dictation-' + (new Date()).getTime() : '');
        joinRoom(roomId);
        break;
      case 'existingParticipants':
        onExistingParticipants(message);
        break;
      case 'newParticipantArrived':
        onNewParticipant(message);
        break;
      case 'participantLeft':
        onParticipantLeft(message);
        break;
      case 'receiveVideoAnswer':
        onReceiveVideoAnswer(message);
        break;
      case 'iceCandidate':
        var participant = participants[message.sessionId];
        if (participant != null) {
          participant.rtcPeer.addIceCandidate(message.candidate, function (error) {
            if (error) {
              console.error('Error adding candidate: ' + error);
              return;
            }
          });
        } else {
          console.error('still does not establish rtc peer for: ' + message.sessionId);
        }
        break;

      case 'startRecording':
        recordingState = 'recording';
        $('#record-btn').addClass('recording');
        $('#recording-text').addClass('recording')
          .text('Recording' + (isDictation ? ' audio' : '' ) + '...')
          .show();
        $('#timer-text').show();
        break;
      case 'stopRecording':
        recordingState = 'stopped';
        $('#record-btn').removeClass('recording');
        $('#recording-text').removeClass('recording')
          .text('Paused...')
          .show();
        break;

      case 'hasBeenRemoved':
        for (var id in participants) {
          participants[id].rtcPeer.dispose();
        }
        recordingState = '';
        $('#record-btn').removeClass('recording');
        $('#recording-text').removeClass('recording')
          .hide();
        hideUI();
        swal('Removed', 'You have been removed from the room', 'error');
        break;

      case 'endcall':
        // Hide UI
        recordingState = '';
        $('#record-btn').removeClass('recording');
        $('#recording-text').removeClass('recording')
          .hide();
        hideUI();
        // Update timer
        totalSecs = 0;
        // Show message if is dictation
        if (isDictation && recordingFilename) {
          $('.all-videos').append('<div id="playback-msg">Please wait until the playback ready</div>');
        }
        else {
          if (isDictation) {
            $('.all-videos').append('<div id="playback-msg">Your session is finished</div>');
          }
          for (var id in participants) {
            participants[id].rtcPeer.dispose();
          }
        }
        break;

      case 'recordingFilename':
        handleRecordingFilename(message);
        break;
      case 'convertFlacFinished':
        handleConvertFlacFinished(message);
        break;

      case 'dictationFinished':
        handleDictationFinished();
        break;

      case 'error':
        showUnexpectedError();
        break;

      default:
        console.error('Unrecognized message: ', message);
    }
  });

  // Check dictation state
  if (isDictation) {
    document.title = 'MAG Dictation';
    $('#record-btn').addClass('dictation');
  }

  // Record
  var recordingState = '';
  $('#record-btn').click(function () {
    if (!localOwner) {
      return;
    }
    if (recordingState === 'recording') {
      sendMessage({ id: 'stopRecording' });
    } else {
      sendMessage({ id: 'startRecording' });
    }
  });

  // Show video when click
  $('#autohide').click(function () {
    $('.all-videos').toggleClass('active');
  });
  $('#local_video').click(function () {
    selectingVideo = $('#local_video video')[0];
    $('.all-videos').removeClass('active');
  });

  // End call
  $('#endcall-btn').click(function () {
    swal({
      type: 'warning',
      title: 'Do you want to stop the ' + (isDictation ? 'dictation' :  'call') + '?',
      showCancelButton: true,
      confirmButtonText: 'Stop',
    }).then(function () {
      sendMessage({ id: 'endcall' });
    }).catch(function() {});
  });

  // Add time stamp
  var now = moment().format('LLL');
  $('#header').append('<div id="timestamp-start"><strong>Start: </strong>' + now + '</div>');
  var $now = $('<div id="timestamp-now"><strong>Now: </strong>' + now + '</div>');
  $('#header').append($now);
  setInterval(function() {
    $now.html('<strong>Now: </strong>' + moment().format('LLL'));
  }, 60000);

  // Mute
  var mute = $('#mute-btn');
  mute.click(function() {
    for (var id in participants) {
      var peer = participants[id].rtcPeer;
      if ('audioEnabled' in peer) {
        peer.audioEnabled = !peer.audioEnabled;
      } else {
        var stream = peer.peerConnection.getLocalStreams()[0];
        var track = stream && stream.getAudioTracks()[0];
        if (track) {
          track.enabled = !track.enabled;
        }
      }
    }
    mute.toggleClass('active')
    $('#muted-text').toggleClass('active');
  });

  // Update recording time
  var $timer = $('#timer-text');
  var totalSecs = 0;
  var lastStamp = '';
  setInterval(function() {
    if (recordingState !== 'recording') {
      return;
    }
    totalSecs += 0.1;
    var secs = Math.floor(totalSecs);
    var hrs = Math.floor(secs/3600);
    secs %= 3600;
    var mins = Math.floor(secs/60);
    if (mins < 10) {
      mins = '0' + mins;
    }
    secs %= 60;
    if (secs < 10) {
      secs = '0' + secs;
    }
    var stamp = mins + ':' + secs;
    if (hrs) {
      stamp = hrs + ':' + stamp;
    }
    if (stamp === lastStamp) {
      return;
    }
    $timer.text(stamp);
  }, 100);

  // Draw current video
  var canvas = document.getElementById('main-video');
  var context = canvas.getContext('2d');
  function updateMainVideo() {
    if (selectingVideo) {
      var $c = $(canvas), $v = $(selectingVideo);
      var cw = Math.floor($c.width()), ch = Math.floor($c.height()), cr = cw / ch;
      canvas.width = cw;
      canvas.height = ch;
      var vw = $v.width(), vh = $v.height(), vr = vw / vh;
      var w = cw, h = ch, t = 0, l = 0;
      if (cr < vr) {
        h = Math.floor(vh * cw / vw);
        t = Math.floor((ch - h) / 2);
      } else {
        w = Math.floor(vw * ch / vh);
        l = Math.floor((cw - w) / 2);
      }
      context.drawImage(selectingVideo, l, t, w, h);
    }
    requestAnimationFrame(updateMainVideo);
  }
  updateMainVideo();

  // ...



  /**
   * call rest API for room documents
   */
  var documents = [];
  var caseId = '';
  $('#previewDocs').hide(); // hide the first time
  $('.close-doc-preview').click(function() {
    $(this).hide();
    $('#previewDocs').hide();
    $('#previewDocs').html('');
  });

  function addPreviewDocumentListener() {
    $(document).on('click', '#document-container a', function() {
      var pdf = /^pdf$/;
      var img = /^jpg|jpeg|png|svg|gif|bmp$/;
      var audio = /^mp3|flac|wav|ogg$/;
      var video = /^mp4|webm$/;

      var index = $(this).attr('data-index');
      var fileName = documents[index];
      var ext = fileName.split('.').pop();
      var previewUrl = backurl + '/preview/case-documents-' + caseId + '/' + fileName;
      var html;

      if (pdf.test(ext)) {
        html = '<iframe title="' + previewUrl + '" src="' + previewUrl + '" />';
      } else if (img.test(ext)) {
        html = '<img alt="' + previewUrl + '" src="' + previewUrl + '" />';
      } else if (video.test(ext)) {
        html = '<video controls>' +
            '<source src="' + previewUrl + '" type="video/' + ext + '" />' +
            '<source src="' + previewUrl + '" type="video/' + ext + '" />' + '</video>';
      } else if (audio.test(ext)) {
        html = '<audio controls><source src="' + previewUrl + '" /></audio>';
      } else {
        swal('File not supported', 'This file does not support preview.', 'error');
        return;
      }
      $('#previewDocs').html(html);
      $('#previewDocs').show();
      $('.close-doc-preview').show();
    });
  }
  function getDocuments() {
    $.ajax({
      url: backurl + '/api/roomDocs/' + qs.room,
    }).done(function(res) {
      documents = res.list || [];
      caseId = res.caseId || '';
      var documentHtml = '';

      if (documents.length) {
        for (var i = 0, len = documents.length; i < len; i++) {
          documentHtml += '<a href="javascript:void(0)" data-index="' + i + '" style="display:block;">' + parseInt(i + 1) + '. ' + documents[i] + '</a>';
        }


        $('#document-container').append(documentHtml);
        addPreviewDocumentListener();
      }
    });
  }

  getDocuments();
});
