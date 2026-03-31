import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  FlatList,
  Image,
  Modal,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useTheme } from "../contexts/ThemeContext";
import api from "../services/api";

// ─── Loading Overlay (shared) ────────────────────────────────────────────────
function LoadingOverlay({ visible }) {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();

      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.12,
            duration: 750,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 750,
            useNativeDriver: true,
          }),
        ]),
      ).start();
    } else {
      fadeAnim.setValue(0);
      pulseAnim.stopAnimation();
      pulseAnim.setValue(1);
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <Animated.View style={[styles.loadingOverlay, { opacity: fadeAnim }]}>
        <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
        <LinearGradient
          colors={["rgba(5,15,50,0.88)", "rgba(10,25,80,0.95)"]}
          style={StyleSheet.absoluteFill}
        />
        <Animated.View
          style={[
            styles.loadingLogoRing,
            { transform: [{ scale: pulseAnim }] },
          ]}
        >
          <Image
            source={require("../../assets/logo.png")}
            style={styles.loadingLogo}
          />
        </Animated.View>
        <ActivityIndicator
          size="large"
          color="#f4b400"
          style={{ marginTop: 32 }}
        />
        <Text style={styles.loadingText}>Loading notifications…</Text>
        <Text style={styles.loadingSubText}>Please wait</Text>
      </Animated.View>
    </Modal>
  );
}

export default function NotificationsScreen() {
  const navigation = useNavigation();
  const { colors } = useTheme();

  useEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [deleting, setDeleting] = useState(false);
  const toolbarAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(toolbarAnim, {
      toValue: selectionMode ? 1 : 0,
      useNativeDriver: true,
      tension: 80,
      friction: 12,
    }).start();
  }, [selectionMode]);

  const loadNotifications = async () => {
    try {
      const response = await api.get("/notifications");
      setNotifications(response.data.notifications);
    } catch (error) {
      console.error("Error loading notifications:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.put("/notifications/read-all");
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch (error) {
      console.error("Error marking all as read:", error);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadNotifications();
      return () => {
        setSelectionMode(false);
        setSelectedIds(new Set());
      };
    }, []),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    exitSelectionMode();
    await loadNotifications();
    setRefreshing(false);
  };

  const enterSelectionMode = (id) => {
    setSelectionMode(true);
    setSelectedIds(new Set([id]));
  };
  const exitSelectionMode = () => {
    setSelectionMode(false);
    setSelectedIds(new Set());
  };
  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        if (next.size === 0) setSelectionMode(false);
      } else next.add(id);
      return next;
    });
  };
  const selectAll = () =>
    setSelectedIds(new Set(notifications.map((n) => n.id)));
  const isAllSelected =
    selectedIds.size === notifications.length && notifications.length > 0;

  const handleDeleteSelected = () => {
    if (selectedIds.size === 0) return;
    Alert.alert(
      "Delete Notifications",
      `Delete ${selectedIds.size} selected notification${selectedIds.size !== 1 ? "s" : ""}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setDeleting(true);
            try {
              await Promise.all(
                [...selectedIds].map((id) =>
                  api.delete(`/notifications/${id}`),
                ),
              );
              setNotifications((prev) =>
                prev.filter((n) => !selectedIds.has(n.id)),
              );
              exitSelectionMode();
            } catch (error) {
              Alert.alert("Error", "Failed to delete some notifications.");
            } finally {
              setDeleting(false);
            }
          },
        },
      ],
    );
  };

  const handleClearAll = () => {
    if (notifications.length === 0) return;
    Alert.alert(
      "Clear All Notifications",
      "Are you sure you want to delete all notifications?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear All",
          style: "destructive",
          onPress: async () => {
            try {
              await api.delete("/notifications/clear-all");
              setNotifications([]);
              exitSelectionMode();
            } catch (error) {
              Alert.alert("Error", "Failed to clear notifications.");
            }
          },
        },
      ],
    );
  };

  const handleNotificationPress = (item) => {
    if (selectionMode) {
      toggleSelect(item.id);
      return;
    }
    if (!item.is_read) {
      api.put(`/notifications/${item.id}/read`).catch(console.error);
      setNotifications((prev) =>
        prev.map((n) => (n.id === item.id ? { ...n, is_read: true } : n)),
      );
    }
    if (item.type === "payment_success" || item.type === "payment_failed")
      navigation.navigate("PaymentHistory");
  };

  const getIconName = (type) => {
    if (type === "payment_success") return "checkmark-circle";
    if (type === "payment_failed") return "close-circle";
    return "information-circle";
  };
  const getIconColor = (type) => {
    if (type === "payment_success") return "#4caf50";
    if (type === "payment_failed") return "#f44336";
    return "#f97316";
  };
  const formatDate = (d) => {
    if (!d) return "";
    const dt = new Date(d);
    return dt.toLocaleDateString() + " " + dt.toLocaleTimeString();
  };
  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const renderItem = ({ item }) => {
    const isSelected = selectedIds.has(item.id);

    return (
      <TouchableOpacity
        style={[
          styles.notificationItem,
          {
            backgroundColor: isSelected
              ? colors.brandLight
              : !item.is_read
                ? colors.surfaceSecondary
                : colors.surface,
            borderColor: isSelected
              ? colors.brand
              : !item.is_read
                ? colors.brand
                : colors.borderLight,
            borderWidth: 1,
          },
        ]}
        onPress={() => handleNotificationPress(item)}
        onLongPress={() => {
          if (!selectionMode) enterSelectionMode(item.id);
          else toggleSelect(item.id);
        }}
        delayLongPress={300}
        activeOpacity={0.7}
      >
        <View style={styles.itemLeft}>
          {selectionMode ? (
            <View
              style={[
                styles.checkbox,
                { borderColor: colors.border, backgroundColor: colors.surface },
                isSelected && {
                  backgroundColor: colors.brand,
                  borderColor: colors.brand,
                },
              ]}
            >
              {isSelected && (
                <Ionicons name="checkmark" size={14} color="#fff" />
              )}
            </View>
          ) : (
            <View
              style={[
                styles.iconContainer,
                { backgroundColor: getIconColor(item.type) + "18" },
              ]}
            >
              <Ionicons
                name={getIconName(item.type)}
                size={28}
                color={getIconColor(item.type)}
              />
            </View>
          )}
        </View>

        <View style={styles.contentBlock}>
          {!item.is_read && !isSelected && (
            <View
              style={[
                styles.unreadDot,
                { backgroundColor: colors.brand, borderColor: colors.surface },
              ]}
            />
          )}
          <Text
            style={[
              styles.message,
              { color: isSelected ? colors.brand : colors.textPrimary },
            ]}
          >
            {item.message}
          </Text>
          <Text style={[styles.timestamp, { color: colors.textMuted }]}>
            {formatDate(item.created_at)}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return <LoadingOverlay visible={loading} />;
  }

  const toolbarTranslate = toolbarAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [80, 0],
  });

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={[colors.gradientStart, colors.gradientEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity
            onPress={
              selectionMode ? exitSelectionMode : () => navigation.goBack()
            }
            style={styles.backButton}
          >
            <Ionicons
              name={selectionMode ? "close" : "arrow-back"}
              size={24}
              color="#fff"
            />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {selectionMode ? `${selectedIds.size} selected` : "Notifications"}
          </Text>
          {selectionMode ? (
            <TouchableOpacity
              style={styles.selectAllBtn}
              onPress={isAllSelected ? exitSelectionMode : selectAll}
            >
              <Ionicons
                name={
                  isAllSelected
                    ? "checkmark-done-circle"
                    : "checkmark-done-circle-outline"
                }
                size={20}
                color="#fff"
              />
              <Text style={styles.selectAllText}>
                {isAllSelected ? "Deselect" : "All"}
              </Text>
            </TouchableOpacity>
          ) : (
            notifications.length > 0 && (
              <View style={styles.headerActions}>
                <TouchableOpacity
                  style={styles.markReadBtn}
                  onPress={markAllAsRead}
                >
                  <Ionicons
                    name="checkmark-done-outline"
                    size={16}
                    color="#fff"
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.clearBtn}
                  onPress={handleClearAll}
                >
                  <Ionicons name="trash-outline" size={16} color="#fff" />
                </TouchableOpacity>
              </View>
            )
          )}
        </View>
        <Text style={styles.headerSubtitle}>
          {selectionMode
            ? "Long press to select • tap to toggle"
            : notifications.length > 0
              ? `${notifications.length} notification${notifications.length !== 1 ? "s" : ""}${unreadCount > 0 ? ` • ${unreadCount} unread` : " • All read"}`
              : ""}
        </Text>
      </LinearGradient>

      <FlatList
        data={notifications}
        renderItem={renderItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={[
          styles.listContent,
          selectionMode && { paddingBottom: 100 },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.brand}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons
              name="notifications-off-outline"
              size={64}
              color={colors.textMuted}
            />
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              No notifications
            </Text>
          </View>
        }
      />

      {selectionMode && (
        <Animated.View
          style={[
            styles.selectionToolbar,
            {
              opacity: toolbarAnim,
              transform: [{ translateY: toolbarTranslate }],
            },
          ]}
        >
          <View
            style={[
              styles.toolbarInner,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <View style={styles.toolbarLeft}>
              <Ionicons
                name="checkmark-circle"
                size={18}
                color={colors.brand}
              />
              <Text style={[styles.toolbarCount, { color: colors.brand }]}>
                {selectedIds.size} item{selectedIds.size !== 1 ? "s" : ""}{" "}
                selected
              </Text>
            </View>
            <TouchableOpacity
              style={[
                styles.deleteSelectedBtn,
                selectedIds.size === 0 && { opacity: 0.4 },
              ]}
              onPress={handleDeleteSelected}
              disabled={selectedIds.size === 0 || deleting}
            >
              {deleting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="trash" size={16} color="#fff" />
                  <Text style={styles.deleteSelectedText}>Delete</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  headerGradient: {
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 16,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    elevation: 8,
    shadowColor: "#0f3c91",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: { fontSize: 22, fontWeight: "bold", color: "#fff", flex: 1 },
  headerSubtitle: {
    fontSize: 13,
    color: "rgba(255,255,255,0.7)",
    marginTop: 8,
    paddingLeft: 52,
  },
  headerActions: { flexDirection: "row", gap: 8 },
  markReadBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  clearBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(244,67,54,0.35)",
    justifyContent: "center",
    alignItems: "center",
  },
  selectAllBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    gap: 6,
  },
  selectAllText: { color: "#fff", fontSize: 13, fontWeight: "600" },
  listContent: { padding: 16, paddingBottom: 30 },
  notificationItem: {
    flexDirection: "row",
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    alignItems: "center",
  },
  itemLeft: {
    marginRight: 14,
    width: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  checkbox: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
  },
  contentBlock: { flex: 1, position: "relative" },
  unreadDot: {
    position: "absolute",
    top: 0,
    right: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
  },
  message: {
    fontSize: 15,
    fontWeight: "500",
    marginBottom: 6,
    lineHeight: 21,
    paddingRight: 20,
  },
  timestamp: { fontSize: 12, marginBottom: 4 },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 80,
  },
  emptyText: { marginTop: 16, fontSize: 16 },
  selectionToolbar: { position: "absolute", bottom: 24, left: 16, right: 16 },
  toolbarInner: {
    borderRadius: 20,
    paddingVertical: 14,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: "#0f3c91",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 12,
    borderWidth: 1,
  },
  toolbarLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  toolbarCount: { fontSize: 15, fontWeight: "600" },
  deleteSelectedBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ef4444",
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 30,
    gap: 7,
  },
  deleteSelectedText: { color: "#fff", fontWeight: "700", fontSize: 14 },

  // Loading overlay styles
  loadingOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingLogoRing: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 3,
    borderColor: "rgba(244,180,0,0.65)",
    overflow: "hidden",
    shadowColor: "#f4b400",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.55,
    shadowRadius: 22,
    elevation: 14,
  },
  loadingLogo: {
    width: "100%",
    height: "100%",
  },
  loadingText: {
    marginTop: 20,
    fontSize: 18,
    fontWeight: "700",
    color: "#fff",
    letterSpacing: 0.3,
  },
  loadingSubText: {
    marginTop: 5,
    fontSize: 13,
    color: "rgba(255,255,255,0.4)",
  },
});
