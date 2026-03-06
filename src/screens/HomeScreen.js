import { Ionicons } from "@expo/vector-icons";
import { useRoute } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { useContext, useEffect, useState } from "react";
import {
  Alert,
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
  const [totalFees, setTotalFees] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const route = useRoute();

  useEffect(() => {
    if (route.params?.paymentSuccess) {
      Alert.alert("Success", "Paid Successfully ✅");
      loadData();
      navigation.setParams({ paymentSuccess: false });
    }
  }, [route.params?.paymentSuccess]);

  const loadData = async () => {
    try {
      const [profileRes, clearanceRes, breakdownRes] = await Promise.all([
        api.get("/student/profile"),
        api.get("/clearance"),
        api.get("/fees/breakdown"),
      ]);

      setProfile(profileRes.data);
      setClearance(clearanceRes.data);

      const breakdown = breakdownRes.data.breakdown;
      const totalDue = breakdown?.grand_total || 0;
      const totalPaid = breakdown?.total_paid || 0;
      const remainingBalance =
        breakdown?.remaining_balance ?? Math.max(totalDue - totalPaid, 0);

      setTotalFees(remainingBalance);
    } catch (error) {
      console.error("Error loading data:", error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

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
      {/* Header with gradient */}
      <LinearGradient
        colors={["#0f3c91", "#1a4da8"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      >
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.greeting}>Hello, {user?.name}!</Text>
            <Text style={styles.studentNo}>
              {profile?.student_no || "Loading..."}
            </Text>
          </View>
          <View style={styles.profileBadge}>
            <Ionicons
              name="person-circle"
              size={50}
              color="rgba(255,255,255,0.9)"
            />
          </View>
        </View>
      </LinearGradient>

      {/* Clearance Card */}
      <View style={styles.clearanceCard}>
        <View style={styles.clearanceInner}>
          <Ionicons
            name={
              clearance?.status === "cleared"
                ? "checkmark-circle"
                : "alert-circle"
            }
            size={48}
            color={
              clearance?.status === "cleared" ? "#4caf50" : "rgb(244, 180, 20)"
            }
          />
          <View style={styles.clearanceInfo}>
            <Text style={styles.clearanceTitle}>Exam Clearance</Text>
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
          </View>
        </View>
      </View>

      {/* Quick Actions Section */}
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
            <Text
              style={[
                styles.actionSubtitle,
                totalFees === 0 && { color: "#4caf50", fontWeight: "600" },
              ]}
            >
              {totalFees === 0
                ? "Fully Paid"
                : `Remaining: ₱${totalFees.toLocaleString()}`}
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
  container: {
    flex: 1,
    backgroundColor: "#f0f2f5", // soft neutral background
  },
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
    color: "#64748b",
    marginTop: 3,
  },
});
