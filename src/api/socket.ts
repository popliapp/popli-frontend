import { io, Socket } from 'socket.io-client';
import { BASE_URL } from './client';

let chatSocket: Socket | null = null;
let notificationSocket: Socket | null = null;

export const connectSockets = (token: string) => {
  if (chatSocket || notificationSocket) disconnectSockets();

  chatSocket = io(`${BASE_URL}/chat`, {
    auth: { token },
    transports: ['websocket'],
  });

  notificationSocket = io(`${BASE_URL}/notifications`, {
    auth: { token },
    transports: ['websocket'],
  });
};

export const disconnectSockets = () => {
  if (chatSocket) {
    chatSocket.disconnect();
    chatSocket = null;
  }
  if (notificationSocket) {
    notificationSocket.disconnect();
    notificationSocket = null;
  }
};

export const getChatSocket = () => chatSocket;
export const getNotificationSocket = () => notificationSocket;
