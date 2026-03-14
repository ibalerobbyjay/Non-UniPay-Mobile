import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import api from "../services/api";

export default function NotificationsScreen() {
  const navigation = useNavigation();

  useEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // ── Selection state ──────────────────────────────────────────────────────
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [deleting, setDeleting] = useState(false);

  // Animated bar for selection toolbar
  const toolbarAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(toolbarAnim, {
      toValue: selectionMode ? 1 : 0,
      useNativeDriver: true,
      tension: 80,
      friction: 12,
    }).start();
  }, [selectionMode]);

  // ── Data fetching ────────────────────────────────────────────────────────
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
      const fetchData = async () => {
        await loadNotifications();
        await markAllAsRead();
      };
      fetchData();
      // Exit selection mode when leaving screen
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
    await markAllAsRead();
    setRefreshing(false);
  };

  // ── Selection helpers ────────────────────────────────────────────────────
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
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectAll = () => {
    setSelectedIds(new Set(notifications.map((n) => n.id)));
  };

  const isAllSelected =
    selectedIds.size === notifications.length && notifications.length > 0;

  // ── Delete actions ───────────────────────────────────────────────────────
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
              console.error("Error deleting notifications:", error);
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
              console.error("Error clearing notifications:", error);
              Alert.alert("Error", "Failed to clear notifications.");
            }
          },
        },
      ],
    );
  };

  // ── Navigation on tap ────────────────────────────────────────────────────
  const handleNotificationPress = (item) => {
    if (selectionMode) {
      toggleSelect(item.id);
      return;
    }
    if (item.type === "payment_success" || item.type === "payment_failed") {
      navigation.navigate("PaymentHistory");
    }
  };

  // ── Icon helpers ─────────────────────────────────────────────────────────
  const getIconName = (type) => {
    switch (type) {
      case "payment_success":
        return "checkmark-circle";
      case "payment_failed":
        return "close-circle";
      default:
        return "information-circle";
    }
  };

  const getIconColor = (type) => {
    switch (type) {
      case "payment_success":
        return "#4caf50";
      case "payment_failed":
        return "#f44336";
      default:
        return "#f97316";
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString() + " " + date.toLocaleTimeString();
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  // ── Render item ──────────────────────────────────────────────────────────
  const renderItem = ({ item }) => {
    const isSelected = selectedIds.has(item.id);

    return (
      <TouchableOpacity
        style={[
          styles.notificationItem,
          !item.is_read && !isSelected && styles.notificationUnread,
          isSelected && styles.notificationSelected,
        ]}
        onPress={() => handleNotificationPress(item)}
        onLongPress={() => {
          if (!selectionMode) enterSelectionMode(item.id);
          else toggleSelect(item.id);
        }}
        delayLongPress={300}
        activeOpacity={0.7}
      >
        {/* Left: checkbox in selection mode, icon otherwise */}
        <View style={styles.itemLeft}>
          {selectionMode ? (
            <View
              style={[styles.checkbox, isSelected && styles.checkboxSelected]}
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

        {/* Content */}
        <View style={styles.content}>
          {!item.is_read && !isSelected && <View style={styles.unreadDot} />}
          <Text style={[styles.message, isSelected && { color: "#0f3c91" }]}>
            {item.message}
          </Text>
          <Text style={styles.timestamp}>{formatDate(item.created_at)}</Text>
          {!selectionMode &&
            (item.type === "payment_success" ||
              item.type === "payment_failed") && (
              <Text style={styles.tapHint}>Tap to view details</Text>
            )}
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0f3c91" />
      </View>
    );
  }

  // ── Animated toolbar values ──────────────────────────────────────────────
  const toolbarTranslate = toolbarAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [80, 0],
  });
  const toolbarOpacity = toolbarAnim;

  return (
    <View style={styles.container}>
      {/* ── Header ── */}
      <LinearGradient
        colors={["#0f3c91", "#1a4da8"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      >
        <View style={styles.headerRow}>
          {selectionMode ? (
            // Selection mode header
            <TouchableOpacity
              onPress={exitSelectionMode}
              style={styles.backButton}
            >
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.backButton}
            >
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
          )}

          <Text style={styles.headerTitle}>
            {selectionMode ? `${selectedIds.size} selected` : "Notifications"}
          </Text>

          {selectionMode ? (
            // Select all toggle
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

        {!selectionMode && notifications.length > 0 && (
          <Text style={styles.headerSubtitle}>
            {notifications.length} notification
            {notifications.length !== 1 ? "s" : ""}
            {unreadCount > 0 ? ` • ${unreadCount} unread` : " • All read"}
          </Text>
        )}

        {selectionMode && (
          <Text style={styles.headerSubtitle}>
            Long press to select • tap to toggle
          </Text>
        )}
      </LinearGradient>

      {/* ── List ── */}
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
            tintColor="#0f3c91"
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons
              name="notifications-off-outline"
              size={64}
              color="#cbd5e1"
            />
            <Text style={styles.emptyText}>No notifications</Text>
          </View>
        }
      />

      {/* ── Floating delete toolbar (appears in selection mode) ── */}
      {selectionMode && (
        <Animated.View
          style={[
            styles.selectionToolbar,
            {
              opacity: toolbarOpacity,
              transform: [{ translateY: toolbarTranslate }],
            },
          ]}
        >
          <View style={styles.toolbarInner}>
            <View style={styles.toolbarLeft}>
              <Ionicons name="checkmark-circle" size={18} color="#0f3c91" />
              <Text style={styles.toolbarCount}>
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
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  // ── Header ──
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
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#fff",
    flex: 1,
  },
  headerSubtitle: {
    fontSize: 13,
    color: "rgba(255,255,255,0.7)",
    marginTop: 8,
    paddingLeft: 52,
  },
  headerActions: {
    flexDirection: "row",
    gap: 8,
  },
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
  selectAllText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
  },

  // ── List ──
  listContent: {
    padding: 16,
    paddingBottom: 30,
  },

  // ── Notification item ──
  notificationItem: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: "#f1f5f9",
    alignItems: "center",
  },
  notificationUnread: {
    borderLeftWidth: 4,
    borderLeftColor: "#0f3c91",
    backgroundColor: "#f8fafc",
  },
  notificationSelected: {
    borderWidth: 2,
    borderColor: "#0f3c91",
    backgroundColor: "#eff6ff",
  },
  itemLeft: {
    marginRight: 14,
    flexShrink: 0,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
  },

  // ── Checkbox ──
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: "#cbd5e1",
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxSelected: {
    backgroundColor: "#0f3c91",
    borderColor: "#0f3c91",
  },

  // ── Content ──
  content: {
    flex: 1,
    position: "relative",
  },
  unreadDot: {
    position: "absolute",
    top: 0,
    right: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#0f3c91",
    borderWidth: 2,
    borderColor: "#fff",
  },
  message: {
    fontSize: 15,
    fontWeight: "500",
    color: "#1e293b",
    marginBottom: 6,
    lineHeight: 21,
    paddingRight: 20,
  },
  timestamp: {
    fontSize: 12,
    color: "#94a3b8",
    marginBottom: 4,
  },
  tapHint: {
    fontSize: 12,
    color: "#0f3c91",
    fontWeight: "500",
  },

  // ── Empty state ──
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 80,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: "#94a3b8",
  },

  // ── Selection toolbar ──
  selectionToolbar: {
    position: "absolute",
    bottom: 24,
    left: 16,
    right: 16,
  },
  toolbarInner: {
    backgroundColor: "#fff",
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
    borderColor: "#e0e9ff",
  },
  toolbarLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  toolbarCount: {
    fontSize: 15,
    fontWeight: "600",
    color: "#0f3c91",
  },
  deleteSelectedBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ef4444",
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 30,
    gap: 7,
  },
  deleteSelectedText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },
});
