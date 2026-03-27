import { io, type Socket } from 'socket.io-client';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

type ServerToClientEvents = {
	connect: () => void;
	disconnect: () => void;
	new_message: (payload: unknown) => void;
	conversation_started: (payload: unknown) => void;
	error: (error: unknown) => void;
};

type ClientToServerEvents = {
	join_user: (userId: string, cb?: (res: { ok: boolean }) => void) => void;
	join_conversation: (conversationId: number | string, cb?: (res: { ok: boolean }) => void) => void;
	leave_conversation: (conversationId: number | string, cb?: (res: { ok: boolean }) => void) => void;
};

type FreshlySocket = Socket<ServerToClientEvents, ClientToServerEvents>;

const resolveSocketUrl = (): string => {
	const fromEnv = process.env.EXPO_PUBLIC_SOCKET_URL;
	if (fromEnv) return fromEnv.replace(/\/$/, '');

	const explicit = Constants?.expoConfig?.extra?.SOCKET_URL as string | undefined;
	if (explicit) return explicit.replace(/\/$/, '');

	const hostUri = Constants?.expoConfig?.hostUri || Constants?.expoGoConfig?.debuggerHost;
	let host = hostUri ? hostUri.split(':')[0] : null;
	if (host && (host === 'localhost' || host === '127.0.0.1') && Platform.OS === 'android') {
		host = '10.0.2.2';
	}
	if (host) return `http://${host}:3000`;

	if (Platform.OS === 'android') return 'http://10.0.2.2:3000';

	return 'http://localhost:3000';
};

const SOCKET_URL = resolveSocketUrl();
let socket: FreshlySocket | null = null;
let socketUserId: string | null = null;

export const connectSocket = (userId: string): FreshlySocket => {
	if (socket && socketUserId !== userId) {
		socket.removeAllListeners();
		socket.disconnect();
		socket = null;
		socketUserId = null;
	}

	if (socket?.connected) return socket;

	socket = io(SOCKET_URL, {
		transports: ['websocket', 'polling'],
		auth: { userId },
		reconnectionDelay: 1000,
		reconnection: true,
		reconnectionAttempts: 10,
	});
	socketUserId = userId;

	socket.on('connect', () => {
		console.log('Socket connected');
	});

	socket.on('disconnect', () => {
		console.log('Socket disconnected');
	});

	socket.on('error', (error) => {
		console.error('Socket error:', error);
	});

	socket.on('connect_error', (error) => {
		console.error('Socket connect error:', error?.message || error);
	});

	return socket;
};

export const disconnectSocket = (): void => {
	if (!socket) return;
	socket.removeAllListeners();
	socket.disconnect();
	socket = null;
	socketUserId = null;
};

export const getSocket = (): FreshlySocket | null => socket;

export default socket;
