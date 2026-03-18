import { io } from 'socket.io-client';
import Constants from 'expo-constants';

const SOCKET_URL = Constants?.expoConfig?.extra?.SOCKET_URL || 'http://192.168.1.1:5000';

let socket = null;

export const connectSocket = (userId) => {
  if (socket && socket.connected) {
    return socket;
  }

  socket = io(SOCKET_URL, {
    auth: {
      userId,
    },
    reconnectionDelay: 1000,
    reconnection: true,
    reconnectionAttempts: 10,
  });

  socket.on('connect', () => {
    console.log('Socket connected');
  });

  socket.on('disconnect', () => {
    console.log('Socket disconnected');
  });

  socket.on('error', (error) => {
    console.error('Socket error:', error);
  });

  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export const getSocket = () => socket;

export default socket;
