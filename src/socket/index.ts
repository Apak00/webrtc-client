/* eslint-disable no-console */
/* eslint-disable compat/compat */
import { io } from 'socket.io-client';
import { iceConfig } from './config';
import { AppSocket } from './events';

let socket: AppSocket;
const lc = new RTCPeerConnection(iceConfig);

export const sendIceCandidate =
  (roomId: string) =>
  (e: any): void => {
    socket.emit('ice:candidate', { roomId, candidate: e.candidate });
  };

export const initSocketConn = (): AppSocket => {
  socket = io('https://webrtc-server-one.herokuapp.com/', {
    path: '/socket.io',
    transports: ['websocket'],
    secure: true,
    withCredentials: true,
  });

  socket.on('answer:forward', ({ answer }) => {
    lc.setRemoteDescription(answer);
  });

  socket.on('negotiation:answer:forward', ({ sdp }) => {
    const desc = new RTCSessionDescription(sdp);
    lc.setRemoteDescription(desc);
  });

  return socket;
};

export const createRoom = (callback: (roomId: string) => void): void => {
  socket?.emit('room:create', {}, callback);
};

export const joinRoom = ({
  stream,
  roomId,
  addNewStream,
}: {
  stream: MediaStream;
  roomId: string;
  addNewStream: any;
}): void => {
  socket?.emit('join:room', { roomId });
  lc.onicecandidate = sendIceCandidate(roomId);
  lc.ontrack = (e) => {
    addNewStream(e.streams[0]);
  };
  lc.onnegotiationneeded = () => {
    lc.createOffer()
      .then((newOffer) => {
        return lc.setLocalDescription(newOffer);
      })
      .then(() => {
        socket.emit('negotiation:offer', {
          roomId,
          sdp: lc.localDescription,
        });

        return true;
      })
      .catch(console.error);
  };

  stream.getTracks().forEach((track) => {
    lc.addTrack(track, stream);
  });
};
