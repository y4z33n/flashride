import { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput,
  TouchableOpacity, KeyboardAvoidingView, Platform,
  ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '../../../lib/supabase';
import { messageService, rideService } from '../../../lib/api';
import { useAuthStore } from '../../../store/authStore';
import type { Message } from '../../../lib/types';

export default function ChatScreen() {
  const { id: rideId } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { session, profile } = useAuthStore();
  const flatListRef = useRef<FlatList>(null);

  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [rideTitle, setRideTitle] = useState('Ride Chat');

  useEffect(() => {
    loadMessages();
    loadRideTitle();

    // ── Real-time subscription ──────────────────────────
    const channel = supabase
      .channel(`chat:${rideId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `ride_id=eq.${rideId}`,
        },
        async (payload) => {
          const newMsg = payload.new as Message;

          // Skip our own optimistic messages (already in state)
          setMessages(prev => {
            if (prev.some(m => m.id === newMsg.id)) return prev;

            // Attach sender profile — fetch async then update
            supabase
              .from('profiles')
              .select('*')
              .eq('id', newMsg.sender_id)
              .single()
              .then(({ data: sender }) => {
                setMessages(current =>
                  current.map(m =>
                    m.id === newMsg.id ? { ...m, sender: sender ?? undefined } : m
                  )
                );
              });

            return [...prev, { ...newMsg, sender: undefined }];
          });
          scrollToBottom();
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [rideId]);

  const loadMessages = async () => {
    setLoading(true);
    try {
      const { data, error } = await messageService.getForRide(rideId!);
      if (error) throw error;
      setMessages(data || []);
      setTimeout(scrollToBottom, 100);
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadRideTitle = async () => {
    const { data } = await rideService.getById(rideId!);
    if (data) {
      setRideTitle(`${data.origin_address.split(',')[0]} → ${data.destination_address.split(',')[0]}`);
    }
  };

  const scrollToBottom = () => {
    flatListRef.current?.scrollToEnd({ animated: true });
  };

  const handleSend = async () => {
    const body = newMessage.trim();
    if (!body || sending) return;

    setSending(true);
    setNewMessage('');

    // Optimistic update
    const optimistic: Message = {
      id: `optimistic-${Date.now()}`,
      ride_id: rideId!,
      sender_id: session!.user.id,
      body,
      created_at: new Date().toISOString(),
      sender: profile as any,
    };
    setMessages(prev => [...prev, optimistic]);
    scrollToBottom();

    try {
      const { data, error } = await messageService.send(rideId!, session!.user.id, body);
      if (error) throw error;
      // Replace optimistic with real message
      setMessages(prev => prev.map(m => m.id === optimistic.id ? { ...data, sender: profile as any } : m));
    } catch (err: any) {
      // Remove optimistic on failure
      setMessages(prev => prev.filter(m => m.id !== optimistic.id));
      setNewMessage(body);
      Alert.alert('Failed to send', err.message);
    } finally {
      setSending(false);
    }
  };

  const isMine = (msg: Message) => msg.sender_id === session?.user?.id;

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString('en-MU', { hour: '2-digit', minute: '2-digit' });

  const renderMessage = ({ item, index }: { item: Message; index: number }) => {
    const mine = isMine(item);
    const prev = index > 0 ? messages[index - 1] : null;
    const showSender = !mine && (!prev || prev.sender_id !== item.sender_id);
    const senderName = (item.sender as any)?.full_name ?? 'Unknown';
    const initial = senderName[0]?.toUpperCase() ?? '?';

    return (
      <View style={[s.msgRow, mine ? s.msgRowMine : s.msgRowTheirs]}>
        {/* Avatar for others, only when sender changes */}
        {!mine && (
          <View style={s.avatarCol}>
            {showSender
              ? <View style={s.avatar}><Text style={s.avatarText}>{initial}</Text></View>
              : <View style={s.avatarSpacer} />
            }
          </View>
        )}

        <View style={[s.bubble, mine ? s.bubbleMine : s.bubbleTheirs]}>
          {showSender && !mine && (
            <Text style={s.senderName}>{senderName}</Text>
          )}
          <Text style={[s.msgText, mine ? s.msgTextMine : s.msgTextTheirs]}>{item.body}</Text>
          <Text style={[s.msgTime, mine ? s.msgTimeMine : s.msgTimeTheirs]}>
            {formatTime(item.created_at)}
            {item.id.startsWith('optimistic') ? ' ·· ' : ''}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Text style={s.backText}>←</Text>
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <Text style={s.headerTitle} numberOfLines={1}>{rideTitle}</Text>
          <Text style={s.headerSub}>Ride group chat</Text>
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        {loading ? (
          <View style={s.loader}>
            <ActivityIndicator size="large" color="#007AFF" />
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={item => item.id}
            renderItem={renderMessage}
            contentContainerStyle={s.messageList}
            onContentSizeChange={scrollToBottom}
            ListEmptyComponent={
              <View style={s.empty}>
                <Text style={s.emptyEmoji}>💬</Text>
                <Text style={s.emptyText}>No messages yet</Text>
                <Text style={s.emptySub}>Be the first to say hi!</Text>
              </View>
            }
          />
        )}

        {/* Input bar */}
        <View style={s.inputBar}>
          <TextInput
            style={s.input}
            value={newMessage}
            onChangeText={setNewMessage}
            placeholder="Type a message..."
            placeholderTextColor="#999"
            multiline
            maxLength={500}
            onSubmitEditing={handleSend}
            blurOnSubmit={false}
          />
          <TouchableOpacity
            style={[s.sendBtn, (!newMessage.trim() || sending) && s.sendBtnDisabled]}
            onPress={handleSend}
            disabled={!newMessage.trim() || sending}
          >
            {sending
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={s.sendBtnText}>↑</Text>}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7fa' },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#e8e8e8',
  },
  backBtn: { padding: 6, marginRight: 8 },
  backText: { fontSize: 22, color: '#007AFF' },
  headerCenter: { flex: 1 },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#111' },
  headerSub: { fontSize: 12, color: '#888' },

  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  messageList: { padding: 12, paddingBottom: 8 },

  // Message rows
  msgRow: { flexDirection: 'row', marginBottom: 4, alignItems: 'flex-end' },
  msgRowMine: { justifyContent: 'flex-end' },
  msgRowTheirs: { justifyContent: 'flex-start' },

  // Avatars (left side)
  avatarCol: { width: 32, marginRight: 6, alignItems: 'center' },
  avatar: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: '#5856D6',
    justifyContent: 'center', alignItems: 'center',
  },
  avatarText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  avatarSpacer: { width: 28 },

  // Bubbles
  bubble: {
    maxWidth: '75%', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 2,
  },
  bubbleMine: {
    backgroundColor: '#007AFF',
    borderBottomRightRadius: 4,
  },
  bubbleTheirs: {
    backgroundColor: '#fff',
    borderBottomLeftRadius: 4,
  },
  senderName: { fontSize: 11, fontWeight: '700', color: '#5856D6', marginBottom: 2 },
  msgText: { fontSize: 15, lineHeight: 20 },
  msgTextMine: { color: '#fff' },
  msgTextTheirs: { color: '#111' },
  msgTime: { fontSize: 10, marginTop: 4, alignSelf: 'flex-end' },
  msgTimeMine: { color: 'rgba(255,255,255,0.6)' },
  msgTimeTheirs: { color: '#aaa' },

  // Empty state
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 17, fontWeight: '600', color: '#444' },
  emptySub: { fontSize: 14, color: '#999', marginTop: 4 },

  // Input bar
  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end',
    paddingHorizontal: 12, paddingVertical: 10,
    backgroundColor: '#fff',
    borderTopWidth: 1, borderTopColor: '#e8e8e8',
    gap: 8,
  },
  input: {
    flex: 1, minHeight: 40, maxHeight: 120,
    backgroundColor: '#f0f0f0', borderRadius: 20,
    paddingHorizontal: 16, paddingVertical: 10,
    fontSize: 15, color: '#111',
  },
  sendBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#007AFF',
    justifyContent: 'center', alignItems: 'center',
  },
  sendBtnDisabled: { backgroundColor: '#c0d8f5' },
  sendBtnText: { color: '#fff', fontSize: 18, fontWeight: '700', marginTop: -2 },
});
