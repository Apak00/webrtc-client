import { Socket } from 'socket.io-client';
import { Room } from './types';

interface Error {
  error: string;
}

interface Success<T> {
  data: T;
}

export type Response<T> = Error | Success<T>;

export interface ServerEvents {
  'room:disconnected': (room: Omit<Room, 'id'>) => void;
  'room:connected': (room: { roomId: string }) => void;
  'user:connected': (payload: { roomId: string; offer: any; socketId: string }) => void;
  'user:answered:forward': (payload: { answer: any }) => void;
  'ice:candidate:forward': (payload: { candidate: any }) => void;
}

export interface ClientEvents {
  'room:create': (payload: Omit<Room, 'id'>, callback: (res: string) => void) => void;
  'room:join': (payload: { roomId: string; offer: any }) => void;
  'user:answered': (payload: { socketId: string; answer: any }) => void;
  'ice:candidate': (payload: { socketId?: string; candidate: any }) => void;
}

export type AppSocket = Socket<ServerEvents, ClientEvents>;
