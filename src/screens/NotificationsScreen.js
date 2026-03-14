import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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

  // Hide the navigation header
  useEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

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
            } catch (error) {
              console.error("Error clearing notifications:", error);
              Alert.alert("Error", "Failed to clear notifications.");
            }
          },
        },
      ],
    );
  };

  const handleNotificationPress = (item) => {
    if (item.type === "payment_success" || item.type === "payment_failed") {
      navigation.navigate("PaymentHistory");
    }
  };

  useFocusEffect(
    useCallback(() => {
      const fetchData = async () => {
        await loadNotifications();
        await markAllAsRead();
      };
      fetchData();
    }, []),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadNotifications();
    await markAllAsRead();
    setRefreshing(false);
  };

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

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.notificationItem,
        !item.is_read && styles.notificationUnread,
      ]}
      onPress={() => handleNotificationPress(item)}
      activeOpacity={0.7}
    >
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
      <View style={styles.content}>
        {!item.is_read && <View style={styles.unreadDot} />}
        <Text style={styles.message}>{item.message}</Text>
        <Text style={styles.timestamp}>{formatDate(item.created_at)}</Text>
        {(item.type === "payment_success" ||
          item.type === "payment_failed") && (
          <Text style={styles.tapHint}>Tap to view details</Text>
        )}
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0f3c91" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={["#0f3c91", "#1a4da8"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Notifications</Text>
          {notifications.length > 0 && (
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
                <Text style={styles.markReadBtnText}></Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.clearBtn}
                onPress={handleClearAll}
              >
                <Ionicons name="trash-outline" size={16} color="#fff" />
                <Text style={styles.clearBtnText}></Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {notifications.length > 0 && (
          <Text style={styles.headerSubtitle}>
            {notifications.length} notification
            {notifications.length !== 1 ? "s" : ""}
            {unreadCount > 0 ? ` • ${unreadCount} unread` : " • All read"}
          </Text>
        )}
      </LinearGradient>

      <FlatList
        data={notifications}
        renderItem={renderItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
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
  headerGradient: {
    paddingTop: 60,
    paddingBottom: 30,
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
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
    flex: 1,
  },
  headerSubtitle: {
    fontSize: 13,
    color: "rgba(255,255,255,0.7)",
    marginTop: 8,
    paddingLeft: 52, // align with back button offset
  },
  headerActions: {
    flexDirection: "row",
    gap: 8,
  },
  markReadBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    gap: 6,
  },
  markReadBtnText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
  },
  clearBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(244, 67, 54, 0.35)",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    gap: 6,
  },
  clearBtnText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
  },
  listContent: {
    padding: 16,
    paddingBottom: 30,
  },
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
    alignItems: "flex-start",
  },
  notificationUnread: {
    borderLeftWidth: 4,
    borderLeftColor: "#0f3c91",
    backgroundColor: "#f8fafc",
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
    flexShrink: 0,
  },
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
});
