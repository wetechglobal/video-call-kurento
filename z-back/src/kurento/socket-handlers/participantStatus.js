// To update participant status in the participant list page for admin
//
// The roomId, roomTokenId need to be attached with the socket

// Staff/admin sockets connected from the participant list page
const registeredSockets = {};
// Participant sockets connected from the video call page
//    with the roomTokenId as the key
const participantSockets = {};

const emitParticipantStatus = (socket, status) => {
  const { roomTokenId, roomId } = socket;
  Object.entries(registeredSockets).forEach(([k, v]) => {
    v.emit('participantStatus', {
      id: roomTokenId,
      roomId,
      status,
    });
  });
  if (status) {
    participantSockets[roomTokenId] = socket;
  } else {
    delete participantSockets[roomTokenId];
  }
};

const emitParticipantJoin = socket => emitParticipantStatus(socket, true);
const emitParticipantLeave = socket => emitParticipantStatus(socket, false);

const registerParticipantStatus = io => {
  io.on('connection', socket => {
    socket.on('participantStatus', () => {
      registeredSockets[socket.id] = socket;
    });
    socket.on('disconnect', () => {
      delete registeredSockets[socket.id];
      if (socket.roomTokenId) {
        emitParticipantLeave(socket);
        delete participantSockets[socket.roomTokenId];
      }
    });
  });
};

const isInRoom = roomTokenId => roomTokenId in participantSockets;
const getSocketFromRoomTokenId = roomTokenId => participantSockets[roomTokenId];

export {
  registerParticipantStatus,
  emitParticipantJoin,
  emitParticipantLeave,
  isInRoom,
  getSocketFromRoomTokenId,
};
