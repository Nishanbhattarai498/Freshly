import React, { createContext, useContext, useEffect, useReducer, useRef, useCallback } from 'react';
import { AppState, Platform } from 'react-native';
import { useUser } from '@clerk/clerk-expo';
import { api } from '../../services/api';
import { addNewMessageListener, addConversationStartedListener, notifyLocalNewMessage } from '../../services/socket';

type Message = any;
type Conversation = any;

type State = {
  conversations: Conversation[];
  unreadMap: Record<string, boolean>;
};

type Actions =
  | { type: 'set_conversations'; payload: Conversation[] }
  | { type: 'add_or_update_conversation'; payload: Conversation }
  | { type: 'mark_unread'; payload: { convId: string } }
  | { type: 'mark_read'; payload: { convId: string } };

const initialState: State = { conversations: [], unreadMap: {} };

function reducer(state: State, action: Actions): State {
  switch (action.type) {
    case 'set_conversations':
      return { ...state, conversations: action.payload };
    case 'add_or_update_conversation': {
      const conv = action.payload;
      const exists = state.conversations.some(c => String(c.id) === String(conv.id));
      if (exists) {
        const updated = [conv, ...state.conversations.filter(c => String(c.id) !== String(conv.id))];
        return { ...state, conversations: updated };
      }
      return { ...state, conversations: [conv, ...state.conversations] };
    }
    case 'mark_unread': {
      return { ...state, unreadMap: { ...state.unreadMap, [action.payload.convId]: true } };
    }
    case 'mark_read': {
      const m = { ...state.unreadMap };
      delete m[action.payload.convId];
      return { ...state, unreadMap: m };
    }
    default:
      return state;
  }
}

const MessagesContext = createContext<{
  state: State;
  fetchConversations: () => Promise<void>;
  fetchConversationById: (id: string) => Promise<Conversation | null>;
  markRead: (id: string) => void;
  notifyLocalNewMessage: (data: any) => void;
} | null>(null);

export const MessagesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(reducer, initialState);
  const appState = useRef(AppState.currentState);
  const { user } = useUser();
  const pushTokenRef = useRef<string | null>(null);

  const fetchConversations = useCallback(async () => {
    try {
      const res = await api.get('/messages');
      const convs = Array.isArray(res.data)
        ? res.data
        : (res.data?.conversations ?? res.data ?? []);
      dispatch({ type: 'set_conversations', payload: convs });
    } catch (e) {
      console.error('MessagesProvider: failed to fetch conversations', e);
    }
  }, []);

  const fetchConversationById = useCallback(async (id: string) => {
    try {
      const res = await api.get(`/messages/${id}`);
      return res.data.conversation;
    } catch (e) {
      console.error('MessagesProvider: failed to fetch conversation', e);
      return null;
    }
  }, []);

  useEffect(() => {
    // Track app state for optional background behaviour
    const sub = AppState.addEventListener('change', next => {
      appState.current = next;
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    // Global socket listeners — update shared state immediately when socket emits
    // Notifications are currently disabled (no push/local notifications).
    // Keep placeholder variables so cleanup works if re-enabled later.
    let notificationsModule: any = null;
    let notificationReceivedListener: any = null;
    let notificationResponseListener: any = null;

    // No-op initializer: push/local notifications are intentionally disabled.
    const tryInitNotifications = async () => {
      return;
    };

    tryInitNotifications();

    const offNew = addNewMessageListener((data: any) => {
      try {
        const convId = data?.conversationId ?? data?.conversation?.id;
        const message = data?.message;
        const conv = data?.conversation;
        if (!convId || !message) return;

        // If provider doesn't have full conversation, attempt optimistic update
        if (conv) {
          dispatch({ type: 'add_or_update_conversation', payload: conv });
        } else {
          // minimal optimistic wrapper
          const meId = message?.receiverId || null;
          const sender = data?.sender ?? { displayName: 'Someone', avatarUrl: '' };
          const optimisticConv = {
            id: convId,
            participant1: sender,
            participant2: { displayName: 'You', avatarUrl: '' },
            messages: [message],
            status: 'ACCEPTED',
          };
          dispatch({ type: 'add_or_update_conversation', payload: optimisticConv });
        }

        // Always mark unread when a new message arrives in background/foreground
        dispatch({ type: 'mark_unread', payload: { convId } });

        // If app is backgrounded, show a local notification (do not show for my own messages)
        try {
          const senderId = data?.sender?.id ?? message?.senderId;
          if (senderId && senderId !== user?.id && appState.current !== 'active' && notificationsModule) {
            notificationsModule.scheduleNotificationAsync({
              content: {
                title: data?.sender?.displayName ?? 'New message',
                body: (message?.content || '').slice(0, 200),
                data: { conversationId: convId }
              },
              trigger: null
            }).catch((e: any) => console.warn('Failed to schedule local notification', e));
          }
        } catch (e) {
          // swallow
        }
      } catch (e) {
        console.error('MessagesProvider new_message handler error', e);
      }
    });

    const offConv = addConversationStartedListener((payload: any) => {
      const conv = payload?.conversation ?? payload;
      if (!conv || !conv.id) return;
      dispatch({ type: 'add_or_update_conversation', payload: conv });
      if (conv.messages && conv.messages.length) dispatch({ type: 'mark_unread', payload: { convId: conv.id } });
    });

    // Initial load
    fetchConversations();

    return () => {
      offNew();
      offConv();
      try { notificationReceivedListener?.remove?.(); } catch (e) {}
      try { notificationResponseListener?.remove?.(); } catch (e) {}
    };
  }, [fetchConversations]);

  const markRead = useCallback((id: string) => {
    dispatch({ type: 'mark_read', payload: { convId: id } });
  }, []);

  const localNotify = useCallback((data: any) => {
    try {
      // propagate to registered socket listeners (and thus provider reducers)
      notifyLocalNewMessage(data);
    } catch (e) {
      console.error('MessagesProvider localNotify error', e);
    }
  }, []);

  return (
    <MessagesContext.Provider value={{ state, fetchConversations, fetchConversationById, markRead, notifyLocalNewMessage: localNotify }}>
      {children}
    </MessagesContext.Provider>
  );
};

export const useMessages = () => {
  const ctx = useContext(MessagesContext);
  if (!ctx) throw new Error('useMessages must be used within MessagesProvider');
  return ctx;
};

export default MessagesProvider;
