import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRoute } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { useCallback, useContext, useState } from "react";
import {
  Alert,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { AuthContext } from "../contexts/AuthContext";
import api from "../services/api";

export default function HomeScreen({ navigation }) {
  const { user } = useContext(AuthContext);
  const [profile, setProfile] = useState(null);
  const [clearance, setClearance] = useState(null);
  const [breakdown, setBreakdown] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const route = useRoute();

  // Wrap loadData in useCallback so it can be safely used as a dependency
  const loadData = useCallback(async () => {
    try {
      const [profileRes, clearanceRes, breakdownRes, unreadRes] =
        await Promise.all([
          api.get("/student/profile"),
          api.get("/clearance"),
          api.get("/fees/breakdown"),
          api.get("/notifications/unread-count"),
        ]);

      setProfile(profileRes.data);
      setClearance(clearanceRes.data);
      setBreakdown(breakdownRes.data.breakdown);
      setUnreadCount(unreadRes.data.count);
    } catch (error) {
      console.error("Error loading data:", error);
    }
  }, []); // no external dependencies – state setters are stable

  // Initial load when screen gains focus
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData]),
  );

  // Auto-refresh every 5 seconds while screen is focused
  useFocusEffect(
    useCallback(() => {
      const interval = setInterval(loadData, 5000); // 5000 ms = 5 seconds
      return () => clearInterval(interval);
    }, [loadData]),
  );

  // Handle payment success from deep link or navigation param
  useFocusEffect(
    useCallback(() => {
      if (route.params?.paymentSuccess) {
        Alert.alert("Success", "Paid Successfully ✅");
        loadData();
        navigation.setParams({ paymentSuccess: false });
      }
    }, [route.params?.paymentSuccess, loadData, navigation]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  // Check if any fees exist
  const hasFees =
    [
      ...(breakdown?.tuition?.fees || []),
      ...(breakdown?.miscellaneous?.fees || []),
      ...(breakdown?.exam?.fees || []),
    ].length > 0;

  const totalDue = breakdown?.grand_total || 0;
  const totalPaid = breakdown?.total_paid || 0;
  const remainingBalance = hasFees
    ? (breakdown?.remaining_balance ?? Math.max(totalDue - totalPaid, 0))
    : null;

  let feeStatusText = "";
  let feeStatusColor = "#64748b";

  if (!hasFees) {
    feeStatusText = "No fees available";
    feeStatusColor = "#f97316";
  } else if (remainingBalance === 0) {
    feeStatusText = "Fully Paid";
    feeStatusColor = "#4caf50";
  } else {
    feeStatusText = `Remaining: ₱${remainingBalance.toLocaleString()}`;
    feeStatusColor = "#64748b";
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor="#0f3c91"
        />
      }
    >
      <LinearGradient
        colors={["#0f3c91", "#1a4da8"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      >
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.greeting}>{user?.name}</Text>
            <Text style={styles.studentNo}>
              {profile?.student_no || "Loading..."}
            </Text>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity
              onPress={() => navigation.navigate("Notifications")}
              style={styles.notificationBadge}
            >
              <Ionicons name="notifications-outline" size={28} color="white" />
              {unreadCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => navigation.navigate("Profile")}
              style={styles.profileBadge}
            >
              {profile?.profile_picture ? (
                <Image
                  source={{ uri: profile.profile_picture }}
                  style={styles.profileImage}
                />
              ) : (
                <Ionicons
                  name="person-circle"
                  size={50}
                  color="rgba(255,255,255,0.9)"
                />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>

      <View style={styles.clearanceCard}>
        <View style={styles.clearanceInner}>
          <Ionicons
            name={
              !hasFees
                ? "information-circle"
                : clearance?.status === "cleared"
                  ? "checkmark-circle"
                  : "alert-circle"
            }
            size={48}
            color={
              !hasFees
                ? "#64748b"
                : clearance?.status === "cleared"
                  ? "#4caf50"
                  : "rgb(244, 180, 20)"
            }
          />
          <View style={styles.clearanceInfo}>
            <Text style={styles.clearanceTitle}>Exam Clearance</Text>
            {hasFees && (
              <Text
                style={[
                  styles.clearanceStatus,
                  {
                    color:
                      clearance?.status === "cleared"
                        ? "#4caf50"
                        : "rgb(244, 180, 20)",
                  },
                ]}
              >
                {clearance?.status === "cleared" ? "CLEARED" : "PENDING"}
              </Text>
            )}
          </View>
        </View>
      </View>

      <View style={styles.quickActions}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>

        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => navigation.navigate("Fees")}
          activeOpacity={0.7}
        >
          <View style={[styles.iconCircle, { backgroundColor: "#0f3c91" }]}>
            <Ionicons name="cash-outline" size={26} color="#fff" />
          </View>
          <View style={styles.actionInfo}>
            <Text style={styles.actionTitle}>View Fees</Text>
            <Text style={[styles.actionSubtitle, { color: feeStatusColor }]}>
              {feeStatusText}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color="#ccc" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => navigation.navigate("Payment")}
          activeOpacity={0.7}
        >
          <View
            style={[
              styles.iconCircle,
              { backgroundColor: "rgb(244, 180, 20)" },
            ]}
          >
            <Ionicons name="card-outline" size={26} color="#0f3c91" />
          </View>
          <View style={styles.actionInfo}>
            <Text style={styles.actionTitle}>Pay Fees</Text>
            <Text style={styles.actionSubtitle}>Pay via GCash</Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color="#ccc" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => navigation.navigate("PaymentHistory")}
          activeOpacity={0.7}
        >
          <View style={[styles.iconCircle, { backgroundColor: "#0f3c91" }]}>
            <Ionicons name="time-outline" size={26} color="#fff" />
          </View>
          <View style={styles.actionInfo}>
            <Text style={styles.actionTitle}>Payment History</Text>
            <Text style={styles.actionSubtitle}>View transactions</Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color="#ccc" />
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f0f2f5" },
  headerGradient: {
    paddingTop: 60,
    paddingBottom: 30,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  greeting: {
    fontSize: 26,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 4,
  },
  studentNo: {
    fontSize: 16,
    color: "rgba(255,255,255,0.9)",
  },
  profileBadge: {
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 35,
    padding: 5,
  },
  profileImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: "rgb(244, 180, 20)",
  },
  clearanceCard: {
    marginTop: -20,
    marginHorizontal: 20,
    backgroundColor: "#fff",
    borderRadius: 25,
    padding: 20,
    shadowColor: "#0f3c91",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.8)",
  },
  clearanceInner: {
    flexDirection: "row",
    alignItems: "center",
  },
  clearanceInfo: {
    marginLeft: 15,
    flex: 1,
  },
  clearanceTitle: {
    fontSize: 16,
    color: "#666",
    marginBottom: 4,
  },
  clearanceStatus: {
    fontSize: 26,
    fontWeight: "bold",
  },
  quickActions: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#0f3c91",
    marginBottom: 18,
    letterSpacing: -0.3,
  },
  actionCard: {
    backgroundColor: "#fff",
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 20,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 3,
    borderWidth: 1,
    borderColor: "#f0f0f0",
  },
  iconCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  actionInfo: {
    flex: 1,
    marginLeft: 16,
  },
  actionTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: "#1e293b",
  },
  actionSubtitle: {
    fontSize: 14,
    marginTop: 3,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  notificationBadge: {
    marginRight: 15,
    padding: 5,
    position: "relative",
  },
  badge: {
    position: "absolute",
    top: -5,
    right: -5,
    backgroundColor: "#ff3b30",
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 3,
  },
  badgeText: {
    color: "white",
    fontSize: 10,
    fontWeight: "bold",
  },
});
