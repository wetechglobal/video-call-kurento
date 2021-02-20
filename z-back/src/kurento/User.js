export default class User {
  constructor(socket) {
    this.id = socket.id;
    this.socket = socket;
    this.outgoingMedia = null;
    this.incomingMediaMap = {};
    this.iceCandidateQueueMap = {};
  }

  addIceCandidate(data, candidate) {
    const { sender } = data;
    if (sender === this.id && this.outgoingMedia) {
      this.outgoingMedia.addIceCandidate(candidate);
      return;
    }
    if (sender in this.incomingMediaMap) {
      this.incomingMediaMap[sender].addIceCandidate(candidate);
      return;
    }
    if (!(sender in this.iceCandidateQueueMap)) {
      this.iceCandidateQueueMap[sender] = [];
    }
    this.iceCandidateQueueMap[sender].push(candidate);
  }

  sendMessage(data) {
    this.socket.emit('message', data);
  }
  getRoomId() {
    if (this.isDictation) {
      return this.dictationRoomId;
    }
    return this.roomId;
  }
}
