import React, { useEffect, useState, useRef, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, KeyboardAvoidingView, Platform, ActivityIndicator, Image, Alert, StyleSheet, Keyboard } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { api } from '../../services/api';
import { useUser } from '@clerk/clerk-expo';
import { Send, ArrowLeft, CheckCircle, Mic, Play } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { formatDistanceToNow, format } from 'date-fns';
import { useColorScheme } from 'nativewind';
import { useAudioRecorder, useAudioPlayer, useAudioPlayerStatus, RecordingPresets, requestRecordingPermissionsAsync, setAudioModeAsync } from 'expo-audio';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { connectSocket, joinConversation, leaveConversation, notifyLocalNewMessage } from '../../services/socket';
import { useMessages } from '../contexts/MessagesContext';


interface Message {
  id: number;
  content: string;
  senderId: string;
  createdAt: string;
  type: 'TEXT' | 'AUDIO' | 'IMAGE';
  mediaUrl?: string;
}

interface Conversation {
  id: number;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  participant1Id: string;
  participant2Id: string;
  participant1: { displayName: string; avatarUrl: string };
  participant2: { displayName: string; avatarUrl: string };
  item?: { title: string };
}

const formatDuration = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const AudioMessage = ({ url, isMe, isDark, messageId }: { url?: string, isMe: boolean, isDark: boolean, messageId: string }) => {
  const [playableUri, setPlayableUri] = useState<string>('');

  useEffect(() => {
    let cancelled = false;

    async function ensureFile() {
      if (!url) {
        setPlayableUri('');
        return;
      }

      // If server returned a data URI, persist to cache so expo-audio can stream it
      if (url.startsWith('data:audio')) {
        const base64 = url.split(',')[1] || '';
        const cacheDir: string | null = (FileSystem as any).cacheDirectory ?? (FileSystem as any).documentDirectory ?? null;
        if (!cacheDir) {
          setPlayableUri(url);
          return;
        }
        const filePath = `${cacheDir}voice_${messageId}.m4a`;
        try {
          const info = await FileSystem.getInfoAsync(filePath);
          if (!info.exists) {
            const encoding = ((FileSystem as any).EncodingType?.Base64 ?? 'base64') as any;
            await FileSystem.writeAsStringAsync(filePath, base64, { encoding });
          }
          if (!cancelled) setPlayableUri(filePath);
        } catch (e) {
          console.error('Failed to prepare audio file', e);
        }
      } else {
        setPlayableUri(url);
      }
    }

    ensureFile();
    return () => { cancelled = true; };
  }, [url, messageId]);

  const player = useAudioPlayer(playableUri || '');
  const status = useAudioPlayerStatus(player);

  const togglePlay = () => {
    if (!playableUri) return;
    if (status.playing) {
      player.pause();
    } else {
      player.play();
    }
  };

  const progress = status.duration ? Math.min((status.currentTime / status.duration) * 100, 100) : 0;

  return (
    <View style={styles.audioContainer}>
      <TouchableOpacity onPress={togglePlay} style={styles.playButton} disabled={!playableUri}>
        {status.playing ? (
          <View style={{ width: 12, height: 12, backgroundColor: isMe ? 'white' : '#374151' }} />
        ) : (
          <Play size={20} color={isMe ? 'white' : '#374151'} fill={isMe ? 'white' : '#374151'} />
        )}
      </TouchableOpacity>
      <View style={styles.audioWaveform}>
        <View style={[styles.audioProgress, { width: `${progress}%` }]} />
      </View>
      <Text style={[styles.audioDuration, isMe ? styles.textWhite : styles.textGray]}>
        {formatDuration(status.duration || 0)}
      </Text>
    </View>
  );
};

export default function Chat() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { user } = useUser();
  const { colorScheme } = useColorScheme();
  const insets = useSafeAreaInsets();
  const { state: messagesState } = useMessages();
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [sending, setSending] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  // Audio Recording State
  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const [isRecording, setIsRecording] = useState(false);

  const messageIdsRef = useRef<Set<string>>(new Set());

  const fetchChat = useCallback(async (opts?: { before?: string }) => {
    try {
      const query = opts?.before ? `?before=${encodeURIComponent(opts.before)}&limit=20` : '';
      const res = await api.get(`/messages/${id}${query}`);
      if (!opts?.before) {
        setConversation(res.data.conversation);
      }

      // Deduplicate incoming messages by id (stringified) to avoid duplicate keys
      const messagesRaw = Array.isArray(res.data?.messages) ? res.data.messages : [];
      const uniqIncoming = Array.from(new Map(messagesRaw.filter((m: any) => m && m.id != null).map((m: any) => [String(m.id), m as Message])).values()) as Message[];

      if (!opts?.before) {
        setMessages(uniqIncoming);
        messageIdsRef.current = new Set(uniqIncoming.map((m: any) => m.id?.toString()));
        // if fewer than limit, no more to load
        setHasMore(uniqIncoming.length >= 20);
      } else {
        // loading older messages: append to the tail (since list is inverted)
        if (uniqIncoming.length === 0) {
          setHasMore(false);
          return;
        }
        setMessages(prev => {
          // merge preserving existing newer messages first
          const merged = [...prev, ...uniqIncoming];
          const uniq = Array.from(new Map(merged.map((m: any) => [String(m.id), m as Message])).values()) as Message[];
          // update seen ids
          messageIdsRef.current = new Set(uniq.map((m: any) => m.id?.toString()));
          return uniq;
        });
        setHasMore(uniqIncoming.length >= 20);
      }
    } catch (error) {
      console.error('Error fetching chat:', error);
      if (!opts?.before) setMessages([]);
    } finally {
      if (!opts?.before) setLoading(false);
      setLoadingMore(false);
    }
  }, [id]);

  useEffect(() => {
    fetchChat();

    // Seed messages from provider if available to avoid waiting for network
    try {
      const convFromProvider = messagesState?.conversations?.find((c: any) => String(c.id) === String(id));
      if (convFromProvider && convFromProvider.messages && convFromProvider.messages.length && messages.length === 0) {
        setMessages(convFromProvider.messages);
        messageIdsRef.current = new Set(convFromProvider.messages.map((m: any) => String(m.id)));
      }
    } catch (e) {
      // ignore if provider not available
    }

      let socket: any = null;
      if (user?.id) {
        socket = connectSocket(user.id);
        joinConversation(String(id));

        socket.on('new_message', (data: any) => {
          const convId = data?.conversationId ?? data?.conversation?.id;
          if (!convId || String(convId) !== String(id)) return;

          const mid = data?.message?.id?.toString();
          if (!mid) return;

          setMessages(prev => {
            if (messageIdsRef.current.has(mid)) return prev;
            messageIdsRef.current.add(mid);
            const merged = [data.message, ...prev];
            const uniq = Array.from(new Map(merged.map((m: any) => [String(m.id), m as Message])).values()) as Message[];
            return uniq;
          });
        });
      }

      // Poll as fallback if socket isn't delivering
      const poll = setInterval(() => fetchChat(), 5000);

      return () => {
        if (socket) {
          leaveConversation(String(id));
          socket.off('new_message');
        }
        clearInterval(poll);
      };
    }, [id, user?.id]);

  const loadOlder = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    const oldest = messages.length ? messages[messages.length - 1].createdAt : undefined;
    await fetchChat({ before: oldest });
  };

  useEffect(() => {
    if (messages.length > 0) {
      AsyncStorage.setItem(`lastRead_${id}`, new Date().toISOString());
    }
  }, [messages, id]);

  // Detect duplicate keys and auto-deduplicate to prevent React key errors
  useEffect(() => {
    if (messages.length <= 1) return;
    const counts: Record<string, number> = {};
    messages.forEach((m: any) => {
      const key = m.id?.toString() ?? `${m.createdAt ?? ''}_${m.senderId ?? ''}`;
      counts[key] = (counts[key] || 0) + 1;
    });
    const dups = Object.entries(counts).filter(([_, v]) => v > 1);
    if (dups.length > 0) {
      console.warn('Duplicate message keys detected:', dups.map(d => d[0]));
      console.warn('Messages snapshot:', messages);

      // Deduplicate preserving first occurrence (newest at index 0)
      const uniqMap = new Map<string, any>();
      for (const m of messages) {
        const key = m.id?.toString() ?? `${m.createdAt ?? ''}_${m.senderId ?? ''}`;
        if (!uniqMap.has(key)) uniqMap.set(key, m);
      }
      const uniq = Array.from(uniqMap.values());
      // update seen ids and messages state
      messageIdsRef.current = new Set(uniq.map((m: any) => m.id?.toString()).filter(Boolean));
      setMessages(uniq);
    }
  }, [messages]);

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      (e) => {
        if (Platform.OS === 'android') {
            setKeyboardHeight(e.endCoordinates.height);
        }
        flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
      }
    );
    const keyboardDidHideListener = Keyboard.addListener(
        'keyboardDidHide',
        () => {
            if (Platform.OS === 'android') {
                setKeyboardHeight(0);
            }
        }
    );

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

  async function startRecording() {
    try {
      const permission = await requestRecordingPermissionsAsync();
      if (permission.status === 'granted') {
        await setAudioModeAsync({
          allowsRecording: true,
          playsInSilentMode: true,
        });
        
        await audioRecorder.prepareToRecordAsync();
        audioRecorder.record();
        setIsRecording(true);
      } else {
        Alert.alert('Permission Denied', 'Please grant microphone permission to send voice messages.');
      }
    } catch (err) {
      console.error('Failed to start recording', err);
    }
  }

  async function stopRecording() {
    if (!isRecording) return;
    
    try {
      await audioRecorder.stop();
      setIsRecording(false);
      const uri = audioRecorder.uri;
      if (uri) {
        await sendVoiceMessage(uri);
      }
    } catch (err) {
      console.error('Failed to stop recording', err);
      Alert.alert('Recording failed', 'Could not finish recording. Please try again.');
    }
  }

  const sendVoiceMessage = async (uri: string) => {
    setSending(true);
    try {
      const info = await FileSystem.getInfoAsync(uri);
      const maxBytes = 1.2 * 1024 * 1024; // ~1.2MB base64 cap on backend
      if (info.exists && info.size && info.size > maxBytes) {
        Alert.alert('Voice message too large', 'Please keep recordings under ~60 seconds.');
        return;
      }

      const encoding = ((FileSystem as any).EncodingType?.Base64 ?? 'base64') as any;
      const base64 = await FileSystem.readAsStringAsync(uri, { encoding });
      const res = await api.post(`/messages/${id}/messages`, { 
        type: 'AUDIO',
        mediaBase64: `data:audio/aac;base64,${base64}`,
        content: ''
      });

      const mid = res.data.id?.toString();
      if (mid) messageIdsRef.current.add(mid);
      setMessages(prev => {
        const merged = [res.data, ...prev];
        const uniq = Array.from(new Map(merged.map((m: any) => [m.id?.toString(), m as Message])).values()) as Message[];
        return uniq;
      });
      try { notifyLocalNewMessage({ conversationId: id, message: res.data, sender: { id: user?.id, displayName: user?.fullName || user?.firstName || 'You' } }); } catch (e) { console.error(e); }
    } catch (error) {
      console.error('Error sending voice message:', error);
      Alert.alert('Send failed', 'Could not send voice message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const handleSend = async () => {
    if (!newMessage.trim()) return;
    
    setSending(true);
    try {
      const res = await api.post(`/messages/${id}/messages`, { content: newMessage, type: 'TEXT' });
      setNewMessage('');
      const mid = res.data.id?.toString();
      if (mid) messageIdsRef.current.add(mid);
      setMessages(prev => {
        const merged = [res.data, ...prev];
        const uniq = Array.from(new Map(merged.map((m: any) => [m.id?.toString(), m as Message])).values()) as Message[];
        return uniq;
      });
      // notify inbox / global listeners so Messages tab updates immediately
      try { notifyLocalNewMessage({ conversationId: id, message: res.data, sender: { id: user?.id, displayName: user?.fullName || user?.firstName || 'You' } }); } catch (e) { console.error(e); }
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSending(false);
    }
  };

  const handleAccept = async () => {
    try {
      await api.put(`/messages/${id}/accept`);
      const res = await api.get(`/messages/${id}`);
      setConversation(res.data.conversation);
    } catch (error) {
      console.error('Error accepting chat:', error);
    }
  };



  if (loading) {
    return (
      <View style={[styles.container, styles.center, colorScheme === 'dark' && styles.darkContainer]}>
        <ActivityIndicator size="large" color="#22c55e" />
      </View>
    );
  }

  if (!conversation || !user) return null;

  const otherUser = conversation.participant1Id === user.id ? conversation.participant2 : conversation.participant1;
  const isReceiver = conversation.participant2Id === user.id;
  const isPending = conversation.status === 'PENDING';
  const isDark = colorScheme === 'dark';

  const formatTimestamp = (iso: string) => {
    if (!iso) return '';
    const d = new Date(iso);
    return format(d, 'MMM d, h:mm a');
  };

  return (
    <View style={[styles.container, isDark && styles.darkContainer]}>
      <LinearGradient
        pointerEvents="none"
        colors={isDark ? ['rgba(15,23,42,0.6)', 'rgba(15,23,42,1)'] : ['rgba(14,165,233,0.08)', 'rgba(34,197,94,0.06)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[StyleSheet.absoluteFillObject, styles.bgGradient]}
      />
      {/* Header */}
      <LinearGradient
        colors={isDark ? ['#0f172a', '#1f2937'] : ['#0ea5e9', '#22c55e']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: insets.top + 10 }]}
      >
        <TouchableOpacity onPress={() => router.replace('/(tabs)/messages')} style={styles.backButton}>
          <ArrowLeft size={24} color={isDark ? '#fff' : '#0f172a'} />
        </TouchableOpacity>
        <View style={styles.avatarContainer}>
            <Image 
            source={{ uri: otherUser.avatarUrl || 'https://via.placeholder.com/40' }} 
            style={[styles.avatar, isDark && styles.darkBorder]}
            />
            <View style={[styles.onlineIndicator, isDark && styles.darkBorder]} />
        </View>
        <View style={styles.headerTextContainer}>
          <Text style={[styles.headerTitle, isDark && styles.darkText]}>{otherUser.displayName}</Text>
          {conversation.item && (
            <Text style={[styles.headerSubtitle, isDark && styles.darkSubText]}>Re: {conversation.item.title}</Text>
          )}
        </View>
      </LinearGradient>

      {/* Messages */}
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined} 
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item, index) => `${item.id ?? 'temp'}_${item.createdAt ?? ''}_${index}`}
          inverted 
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 20, paddingTop: 16 }}
          onEndReached={() => { loadOlder(); }}
          onEndReachedThreshold={0.1}
          ListFooterComponent={loadingMore ? <ActivityIndicator size="small" color="#22c55e" /> : null}
          renderItem={({ item }) => {
            const isMe = item.senderId === user.id;
            const bubbleContent = (
              <>
                {item.type === 'AUDIO' ? (
                  <AudioMessage url={item.mediaUrl} isMe={isMe} isDark={isDark} messageId={String(item.id)} />
                ) : (
                  <Text style={[styles.messageText, isMe ? styles.textWhite : [styles.textBlack, isDark && styles.textWhite]]}>{item.content}</Text>
                )}
                <View style={[styles.metaRow, isMe ? styles.metaRowMe : styles.metaRowOther]}>
                  <Text style={[styles.timestamp, isMe ? styles.timestampMe : styles.timestampOther]}>
                    {formatTimestamp(item.createdAt)}
                  </Text>
                </View>
              </>
            );

            return (
              <View style={[styles.messageRow, isMe ? styles.messageRowMe : styles.messageRowOther]}>
                {!isMe && (
                  <View style={styles.avatarWrapper}>
                    <Image 
                      source={{ uri: otherUser.avatarUrl }} 
                      style={styles.messageAvatar}
                    />
                  </View>
                )}

                {isMe ? (
                  <LinearGradient
                    colors={['#22c55e', '#16a34a']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[styles.messageBubble, styles.messageBubbleMe]}
                  >
                    {bubbleContent}
                  </LinearGradient>
                ) : (
                  <View 
                    style={[
                      styles.messageBubble,
                      styles.messageBubbleOther,
                      isDark && styles.darkMessageBubbleOther
                    ]}
                  >
                    {bubbleContent}
                  </View>
                )}
              </View>
            );
          }}
        />

        {/* Accept Request Banner */}
        {isPending && isReceiver && (
          <View style={[styles.banner, isDark && styles.darkBanner]}>
            <Text style={[styles.bannerText, isDark && styles.darkBannerText]}>
              {otherUser.displayName} wants to chat with you.
            </Text>
            <TouchableOpacity 
              onPress={handleAccept}
              style={styles.acceptButton}
            >
              <CheckCircle size={16} color="white" style={{ marginRight: 8 }} />
              <Text style={styles.acceptButtonText}>Accept Request</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Input Area */}
        <View style={[
            styles.inputContainer, 
            isDark && styles.darkInputContainer,
            { paddingBottom: Math.max(insets.bottom, 20) + (Platform.OS === 'android' ? 0 : 0), marginBottom: Platform.OS === 'android' ? keyboardHeight : 0 }
        ]}>
          <TextInput
            value={newMessage}
            onChangeText={setNewMessage}
            placeholder={isPending && isReceiver ? "Accept to reply..." : "Type a message..."}
            editable={!(isPending && isReceiver)}
            style={[styles.input, isDark && styles.darkInput]}
            placeholderTextColor="#9ca3af"
          />
          
          {newMessage.trim() ? (
             <TouchableOpacity 
                onPress={handleSend}
                disabled={sending || (isPending && isReceiver)}
                style={styles.sendButton}
            >
                <LinearGradient
                  colors={['#22c55e', '#16a34a']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.sendButtonInner}
                >
                  {sending ? (
                  <ActivityIndicator size="small" color="white" />
                  ) : (
                  <Send size={20} color="white" />
                  )}
                </LinearGradient>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity 
                onPressIn={startRecording}
                onPressOut={stopRecording}
                disabled={isPending && isReceiver}
                style={[styles.micButton, isRecording && styles.micButtonActive, isDark && !isRecording && styles.darkMicButton]}
            >
                <Mic size={24} color={isRecording ? 'white' : '#6b7280'} />
            </TouchableOpacity>
          )}
        </View>
        {isRecording && (
            <View style={[styles.recordingIndicator, { bottom: 100 + insets.bottom }]}>
                <Text style={styles.recordingText}>Recording... Release to send</Text>
            </View>
        )}
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  darkContainer: { backgroundColor: '#0b1224' },
  center: { justifyContent: 'center', alignItems: 'center' },
  bgGradient: { opacity: 1 },
  header: { paddingBottom: 16, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 0, zIndex: 10, borderBottomLeftRadius: 20, borderBottomRightRadius: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 8 },
  darkHeader: { borderBottomColor: 'transparent' },
  backButton: { marginRight: 12, padding: 4 },
  avatarContainer: { position: 'relative', marginRight: 12 },
  avatar: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: '#e5e7eb' },
  darkBorder: { borderColor: '#4b5563' },
  onlineIndicator: { position: 'absolute', bottom: 0, right: 0, width: 12, height: 12, backgroundColor: '#22c55e', borderRadius: 6, borderWidth: 2, borderColor: 'white' },
  headerTextContainer: { flex: 1 },
  headerTitle: { fontWeight: 'bold', fontSize: 18, color: '#111827' },
  darkText: { color: 'white' },
  headerSubtitle: { fontSize: 12, color: '#6b7280' },
  darkSubText: { color: '#9ca3af' },
  messageRow: { marginBottom: 16, flexDirection: 'row', alignItems: 'flex-end' },
  messageRowMe: { justifyContent: 'flex-end' },
  messageRowOther: { justifyContent: 'flex-start' },
  avatarWrapper: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: '#e5e7eb', backgroundColor: 'white', marginRight: 8, padding: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 2 },
  messageAvatar: { width: '100%', height: '100%', borderRadius: 16 },
  messageBubble: { paddingHorizontal: 16, paddingVertical: 12, borderRadius: 18, maxWidth: '80%', shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.12, shadowRadius: 8, elevation: 4 },
  messageBubbleMe: { borderTopRightRadius: 6 },
  messageBubbleOther: { backgroundColor: 'rgba(255,255,255,0.94)', borderTopLeftRadius: 6, borderWidth: 1, borderColor: '#e5e7eb' },
  darkMessageBubbleOther: { backgroundColor: 'rgba(31,41,55,0.9)', borderColor: '#374151' },
  messageText: { fontSize: 16, lineHeight: 22 },
  textWhite: { color: 'white' },
  textBlack: { color: '#0f172a' },
  textGray: { color: '#6b7280' },
  metaRow: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', marginTop: 8 },
  metaRowMe: { },
  metaRowOther: { },
  timestamp: { fontSize: 11, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  timestampMe: { color: 'white', backgroundColor: 'rgba(255,255,255,0.18)' },
  timestampOther: { color: '#6b7280', backgroundColor: 'rgba(15,23,42,0.04)' },
  audioContainer: { flexDirection: 'row', alignItems: 'center' },
  playButton: { backgroundColor: 'rgba(255,255,255,0.2)', padding: 8, borderRadius: 20, marginRight: 8 },
  audioWaveform: { height: 4, backgroundColor: 'rgba(255,255,255,0.3)', width: 96, borderRadius: 2, overflow: 'hidden', marginRight: 8 },
  audioProgress: { height: '100%', backgroundColor: 'white', width: '33%' },
  audioDuration: { fontSize: 12 },
  banner: { backgroundColor: '#eff6ff', padding: 16, margin: 16, borderRadius: 12, borderWidth: 1, borderColor: '#dbeafe', alignItems: 'center' },
  darkBanner: { backgroundColor: 'rgba(30, 58, 138, 0.3)', borderColor: '#1e40af' },
  bannerText: { color: '#1e40af', fontWeight: '500', marginBottom: 12, textAlign: 'center' },
  darkBannerText: { color: '#bfdbfe' },
  acceptButton: { backgroundColor: '#2563eb', paddingHorizontal: 24, paddingVertical: 8, borderRadius: 9999, flexDirection: 'row', alignItems: 'center' },
  acceptButtonText: { color: 'white', fontWeight: 'bold' },
  inputContainer: { padding: 12, backgroundColor: 'rgba(255,255,255,0.92)', borderTopWidth: 1, borderTopColor: 'rgba(226,232,240,0.8)', flexDirection: 'row', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 10, marginHorizontal: 10, borderRadius: 20 },
  darkInputContainer: { backgroundColor: 'rgba(30,41,59,0.9)', borderTopColor: 'rgba(71,85,105,0.7)' },
  input: { flex: 1, backgroundColor: 'rgba(241,245,249,0.9)', borderRadius: 24, paddingHorizontal: 20, paddingVertical: 12, marginRight: 12, color: '#0f172a', fontSize: 16, maxHeight: 100 },
  darkInput: { backgroundColor: 'rgba(55,65,81,0.9)', color: 'white' },
  sendButton: { width: 52, height: 52, borderRadius: 26, overflow: 'hidden', shadowColor: '#22c55e', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 6, elevation: 6 },
  sendButtonInner: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  micButton: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f3f4f6' },
  darkMicButton: { backgroundColor: '#374151' },
  micButtonActive: { backgroundColor: '#ef4444', transform: [{ scale: 1.1 }] },
  recordingIndicator: { position: 'absolute', alignSelf: 'center', backgroundColor: '#ef4444', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 9999, zIndex: 20 },
  recordingText: { color: 'white', fontWeight: 'bold' },
});
