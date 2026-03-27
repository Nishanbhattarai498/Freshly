import { io, type Socket } from 'socket.io-client';
import Constants from 'expo-constants';

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
	const explicit = Constants?.expoConfig?.extra?.SOCKET_URL;
	if (explicit) return explicit;

	const hostUri = Constants?.expoConfig?.hostUri || Constants?.expoGoConfig?.debuggerHost;
	const host = hostUri ? hostUri.split(':')[0] : null;
	if (host) return `http://${host}:3000`;

	return 'http://localhost:3000';
};

const SOCKET_URL = resolveSocketUrl();
let socket: FreshlySocket | null = null;

export const connectSocket = (userId: string): FreshlySocket => {
	if (socket?.connected) return socket;

	socket = io(SOCKET_URL, {
		transports: ['websocket', 'polling'],
		auth: { userId },
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

export const disconnectSocket = (): void => {
	if (!socket) return;
	socket.disconnect();
	socket = null;
};

export const getSocket = (): FreshlySocket | null => socket;

export default socket;
