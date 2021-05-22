import { io } from 'socket.io-client';

import { AppSocket } from './events';

let socket: AppSocket;

const socketURL = 'http://localhost:3000';
// const socketURL = 'https://webrtc-server-one.herokuapp.com';

export const initSocketConn = (): AppSocket => {
  socket = io(socketURL, {
    path: '/socket.io',
    transports: ['websocket'],
    secure: true,
    withCredentials: true,
  });

  return socket;
};

export const sendIceCandidate =
  (target: string) =>
  (e: any): void => {
    socket.emit('ice:candidate', { target, candidate: e.candidate });
  };

export const createRoom = (callback: (roomId: string) => void): void => {
  socket?.emit('room:create', {}, callback);
};
