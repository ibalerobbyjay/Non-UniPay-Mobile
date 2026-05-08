import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import uniBotImage from "../../assets/unibot.png";
import { useTheme } from "../contexts/ThemeContext";
import api from "../services/api";

// ─── PERSISTED MESSAGES (survives navigation) ─────────────────────
let persistedMessages = [
  {
    id: "welcome",
    role: "assistant",
    content:
      "Hi! I'm UniBot 👋 I can help you with anything about the UniPay app — fees, payments, clearance, and more. What would you like to know?",
  },
];

// ─── MESSAGE BUBBLE ───────────────────────────────────────────────
function MessageBubble({ message, colors, onLongPress }) {
  const isUser = message.role === "user";
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onLongPress={() => onLongPress(message)}
      style={[
        styles.bubbleRow,
        isUser ? styles.bubbleRowUser : styles.bubbleRowBot,
      ]}
    >
      {!isUser && (
        <View style={styles.botAvatar}>
          <Image
            source={uniBotImage}
            style={{ width: 32, height: 32, borderRadius: 16 }}
          />
        </View>
      )}
      <View
        style={[
          styles.messageWrapper,
          isUser ? styles.messageWrapperUser : styles.messageWrapperBot,
        ]}
      >
        <View
          style={[
            styles.bubble,
            isUser
              ? { backgroundColor: colors.brand, borderBottomRightRadius: 4 }
              : {
                  backgroundColor: colors.surface,
                  borderBottomLeftRadius: 4,
                  borderWidth: 1,
                  borderColor: colors.borderLight,
                },
          ]}
        >
          <Text
            style={[
              styles.bubbleText,
              { color: isUser ? "#fff" : colors.textPrimary },
            ]}
          >
            {message.content}
          </Text>
        </View>
        {message.reaction && (
          <Text
            style={[
              styles.reaction,
              isUser ? styles.reactionUser : styles.reactionBot,
            ]}
          >
            {message.reaction}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

// ─── SUGGESTIONS ────────────────────────────────────────────────
const SUGGESTIONS = [
  "How do I pay my fees?",
  "What does PENDING clearance mean?",
  "How do I refresh my data?",
  "Where is my student number?",
  "Who are the developers of this app?",
];

export default function ChatbotScreen({ navigation }) {
  const { colors } = useTheme();

  const [messages, setMessages] = useState(persistedMessages);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [actionVisible, setActionVisible] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const flatListRef = useRef(null);
  const scrollViewRef = useRef(null);
  const autoScrollInterval = useRef(null);
  const currentOffsetRef = useRef(0); // always fresh
  const directionRef = useRef(1); // 1 = right, -1 = left

  // Auto‑scroll measurements
  const [contentWidth, setContentWidth] = useState(0);
  const [viewWidth, setViewWidth] = useState(0);
  const [isAutoScrollingEnabled, setIsAutoScrollingEnabled] = useState(true);

  // ─── HEADER / MESSAGE SCROLL ─────────────────────────────────
  useEffect(() => {
    if (navigation) navigation.setOptions({ headerShown: false });
  }, [navigation]);

  useEffect(() => {
    if (flatListRef.current) {
      flatListRef.current.scrollToEnd({ animated: true });
    }
  }, [messages.length]);

  // ─── AUTO‑SCROLL LOGIC (using refs to avoid stale state) ──────
  const startAutoScroll = () => {
    if (autoScrollInterval.current) clearInterval(autoScrollInterval.current);
    if (!isAutoScrollingEnabled) return;

    autoScrollInterval.current = setInterval(() => {
      if (!scrollViewRef.current) return;
      const maxScroll = contentWidth - viewWidth;
      if (maxScroll <= 0) return;

      let newOffset = currentOffsetRef.current + directionRef.current;
      let newDirection = directionRef.current;

      if (newOffset >= maxScroll) {
        newOffset = maxScroll;
        newDirection = -1;
      } else if (newOffset <= 0) {
        newOffset = 0;
        newDirection = 1;
      }

      if (newDirection !== directionRef.current)
        directionRef.current = newDirection;
      if (newOffset !== currentOffsetRef.current) {
        scrollViewRef.current.scrollTo({ x: newOffset, animated: false });
        currentOffsetRef.current = newOffset;
      }
    }, 16); // 1px per frame → smooth & slow
  };

  const stopAutoScroll = () => {
    if (autoScrollInterval.current) {
      clearInterval(autoScrollInterval.current);
      autoScrollInterval.current = null;
    }
  };

  // Start/stop based on suggestions visibility
  useEffect(() => {
    if (messages.length === 1 && contentWidth > viewWidth && viewWidth > 0) {
      setIsAutoScrollingEnabled(true);
      startAutoScroll();
    } else {
      stopAutoScroll();
    }
    return () => stopAutoScroll();
  }, [messages.length, contentWidth, viewWidth]);

  // Pause on user touch, resume after 3 seconds
  const handleUserInteraction = () => {
    if (!isAutoScrollingEnabled) return;
    stopAutoScroll();
    setTimeout(() => {
      if (messages.length === 1 && contentWidth > viewWidth && viewWidth > 0) {
        startAutoScroll();
      }
    }, 3000);
  };

  const onScroll = (event) => {
    currentOffsetRef.current = event.nativeEvent.contentOffset.x;
  };

  // ─── HELPER: update state AND persist ─────────────────────────
  const updateMessages = (updater) => {
    setMessages((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      persistedMessages = next;
      return next;
    });
  };

  // ─── SEND MESSAGE ─────────────────────────────────────────────
  const sendMessage = async (text) => {
    const userText = (text || input).trim();
    if (!userText || loading) return;

    if (editingId) {
      updateMessages((prev) =>
        prev.map((m) => (m.id === editingId ? { ...m, content: userText } : m)),
      );
      setEditingId(null);
      setInput("");
      return;
    }

    const userMsg = {
      id: Date.now().toString(),
      role: "user",
      content: userText,
    };
    const newMessages = [...messages, userMsg];
    persistedMessages = newMessages;
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    const history = newMessages
      .filter((m) => m.id !== "welcome")
      .map((m) => ({ role: m.role, content: m.content }));

    try {
      const res = await api.post("/chatbot", { messages: history });
      const reply =
        res.data?.reply || "I didn't get a response. Please try again.";
      updateMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString() + "_bot",
          role: "assistant",
          content: reply,
        },
      ]);
    } catch (err) {
      console.log(
        "Chatbot error:",
        err?.response?.status,
        err?.response?.data,
        err?.message,
      );
      updateMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString() + "_err",
          role: "assistant",
          content:
            "Sorry, something went wrong. Please check your connection and try again.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  // ─── LONG PRESS ACTIONS ───────────────────────────────────────
  const handleLongPress = (msg) => {
    setSelectedMessage(msg);
    setActionVisible(true);
  };

  const copyMessage = async () => {
    await Clipboard.setStringAsync(selectedMessage.content);
    setActionVisible(false);
  };

  const editMessage = () => {
    if (selectedMessage.role !== "user") return;
    setInput(selectedMessage.content);
    setEditingId(selectedMessage.id);
    setActionVisible(false);
  };

  const reactMessage = (emoji) => {
    updateMessages((prev) =>
      prev.map((m) =>
        m.id === selectedMessage.id ? { ...m, reaction: emoji } : m,
      ),
    );
    setActionVisible(false);
  };

  // ─── RENDER ─────────────────────────────────────────────────
  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      {/* HEADER (unchanged) */}
      <LinearGradient
        colors={[colors.gradientStart, colors.gradientEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <View style={styles.headerAvatar}>
            <Image
              source={uniBotImage}
              style={{ width: 42, height: 42, borderRadius: 21 }}
            />
          </View>
          <View>
            <Text style={styles.headerTitle}>UniBot</Text>
            <Text style={styles.headerSub}>UniPay Assistant</Text>
          </View>
        </View>
      </LinearGradient>

      {/* MESSAGES FlatList (unchanged) */}
      <FlatList
        ref={flatListRef}
        data={messages}
        nestedScrollEnabled={true}
        scrollEventThrottle={16}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <MessageBubble
            message={item}
            colors={colors}
            onLongPress={handleLongPress}
          />
        )}
        contentContainerStyle={styles.messageList}
        keyboardShouldPersistTaps="handled"
        ListFooterComponent={
          loading ? (
            <View style={styles.typingIndicator}>
              <View style={styles.botAvatar}>
                <Image
                  source={uniBotImage}
                  style={{ width: 32, height: 32, borderRadius: 16 }}
                />
              </View>
              <View
                style={[
                  styles.typingBubble,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.borderLight,
                  },
                ]}
              >
                <ActivityIndicator size="small" color={colors.brand} />
                <Text
                  style={[styles.typingText, { color: colors.textSecondary }]}
                >
                  UniBot is typing…
                </Text>
              </View>
            </View>
          ) : null
        }
      />

      {/* SUGGESTION CHIPS with auto‑scroll (fixed) */}
      {messages.length === 1 && (
        <View style={styles.suggestionsContainer}>
          <ScrollView
            ref={scrollViewRef}
            horizontal
            showsHorizontalScrollIndicator={true}
            nestedScrollEnabled={true}
            scrollEnabled={true}
            alwaysBounceHorizontal={true}
            overScrollMode="always"
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.suggestionsList}
            onLayout={(e) => setViewWidth(e.nativeEvent.layout.width)}
            onScroll={onScroll}
            scrollEventThrottle={16}
            onTouchStart={handleUserInteraction}
          >
            <View
              onLayout={(e) => setContentWidth(e.nativeEvent.layout.width)}
              style={{ flexDirection: "row", gap: 8 }}
            >
              {SUGGESTIONS.map((item) => (
                <TouchableOpacity
                  key={item}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.brand,
                    },
                  ]}
                  onPress={() => sendMessage(item)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.chipText, { color: colors.brand }]}>
                    {item}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>
      )}

      {/* INPUT BAR (unchanged) */}
      <View
        style={[
          styles.inputBar,
          {
            backgroundColor: colors.surface,
            borderTopColor: colors.borderLight,
          },
        ]}
      >
        <TextInput
          style={[
            styles.textInput,
            {
              backgroundColor: colors.inputBackground,
              borderColor: colors.border,
              color: colors.textPrimary,
            },
          ]}
          placeholder="Ask about UniPay…"
          placeholderTextColor={colors.textMuted}
          value={input}
          onChangeText={setInput}
          multiline
          maxLength={500}
          onSubmitEditing={() => sendMessage()}
          returnKeyType="send"
          blurOnSubmit
        />
        <TouchableOpacity
          style={[
            styles.sendBtn,
            (!input.trim() || loading) && styles.sendBtnDisabled,
          ]}
          onPress={() => sendMessage()}
          disabled={!input.trim() || loading}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={
              input.trim() && !loading
                ? [colors.gradientStart, colors.gradientEnd]
                : ["#cbd5e1", "#cbd5e1"]
            }
            style={styles.sendBtnGradient}
          >
            <Ionicons name="send" size={18} color="#fff" />
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* LONG PRESS ACTION MODAL (unchanged) */}
      <Modal transparent visible={actionVisible} animationType="fade">
        <TouchableOpacity
          style={styles.modalOverlay}
          onPress={() => setActionVisible(false)}
        >
          <View style={[styles.modalBox, { backgroundColor: colors.surface }]}>
            <TouchableOpacity style={styles.modalItem} onPress={copyMessage}>
              <Text style={styles.modalText}>Copy</Text>
            </TouchableOpacity>

            {selectedMessage?.role === "user" && (
              <TouchableOpacity style={styles.modalItem} onPress={editMessage}>
                <Text style={styles.modalText}>Edit</Text>
              </TouchableOpacity>
            )}

            <View style={styles.reactionRow}>
              {["👍", "❤️", "😂", "😮", "😢"].map((emoji) => (
                <TouchableOpacity
                  key={emoji}
                  onPress={() => reactMessage(emoji)}
                >
                  <Text style={styles.emoji}>{emoji}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </KeyboardAvoidingView>
  );
}

// ─── STYLES ─────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingTop: 56,
    paddingBottom: 16,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    elevation: 8,
    shadowColor: "#0f3c91",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  backBtn: {
    marginRight: 12,
    padding: 4,
  },
  headerCenter: { flexDirection: "row", alignItems: "center", gap: 12 },
  headerAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgb(244,180,20)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerAvatarText: { fontSize: 18, fontWeight: "800", color: "#0f3c91" },
  headerTitle: { fontSize: 18, fontWeight: "700", color: "#fff" },
  headerSub: { fontSize: 13, color: "rgba(255,255,255,0.8)" },
  messageList: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  bubbleRow: {
    flexDirection: "row",
    marginBottom: 12,
    alignItems: "flex-start",
  },
  bubbleRowUser: { justifyContent: "flex-end" },
  bubbleRowBot: { justifyContent: "flex-start" },
  botAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgb(244,180,20)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
    flexShrink: 0,
  },
  botAvatarText: { fontSize: 14, fontWeight: "800", color: "#0f3c91" },
  messageWrapper: {
    maxWidth: "75%",
    flexDirection: "column",
  },
  messageWrapperBot: { alignItems: "flex-start" },
  messageWrapperUser: { alignItems: "flex-end" },
  bubble: {
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
    width: "100%",
  },
  bubbleText: { fontSize: 15, lineHeight: 22 },
  reaction: { fontSize: 16, marginTop: 4 },
  reactionBot: { textAlign: "left" },
  reactionUser: { textAlign: "right" },
  typingIndicator: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  typingBubble: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 18,
    borderBottomLeftRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 8,
    borderWidth: 1,
    elevation: 2,
  },
  typingText: { fontSize: 14 },
  suggestionsContainer: {
    paddingVertical: 10,
  },
  suggestionsList: {
    paddingHorizontal: 16,
    gap: 8,
    flexDirection: "row",
    alignItems: "center",
  },
  chip: {
    borderWidth: 1.5,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  chipText: { fontSize: 13, fontWeight: "600" },
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 16,
    paddingVertical: 20,
    borderTopWidth: 1,
    gap: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 4,
  },
  textInput: {
    flex: 1,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    fontSize: 15,
    borderWidth: 1,
    maxHeight: 100,
  },
  sendBtn: { alignSelf: "flex-end" },
  sendBtnDisabled: { opacity: 0.6 },
  sendBtnGradient: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalBox: { width: 220, borderRadius: 16, padding: 12 },
  modalItem: { paddingVertical: 10 },
  modalText: { fontSize: 14, fontWeight: "600" },
  reactionRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 10,
  },
  emoji: { fontSize: 22 },
});
