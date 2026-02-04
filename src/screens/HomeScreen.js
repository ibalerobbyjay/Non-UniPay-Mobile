import { Ionicons } from "@expo/vector-icons";
import { useContext, useEffect, useState } from "react";
import {
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

  const loadData = async () => {
    try {
      const [profileRes, clearanceRes, feesRes] = await Promise.all([
        api.get("/student/profile"),
        api.get("/clearance"),
        api.get("/fees/total"),
      ]);

      setProfile(profileRes.data);
      setClearance(clearanceRes.data);
      setTotalFees(feesRes.data.total);
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
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.header}>
        <Text style={styles.greeting}>Hello, {user?.name}!</Text>
        <Text style={styles.studentNo}>
          {profile?.student_no || "Loading..."}
        </Text>
      </View>

      <View style={styles.clearanceCard}>
        <View style={styles.clearanceHeader}>
          <Ionicons
            name={
              clearance?.status === "cleared"
                ? "checkmark-circle"
                : "alert-circle"
            }
            size={40}
            color={clearance?.status === "cleared" ? "#4caf50" : "#ff9800"}
          />
          <View style={styles.clearanceInfo}>
            <Text style={styles.clearanceTitle}>Exam Clearance</Text>
            <Text
              style={[
                styles.clearanceStatus,
                {
                  color:
                    clearance?.status === "cleared" ? "#4caf50" : "#ff9800",
                },
              ]}
            >
              {clearance?.status === "cleared" ? "CLEARED" : "PENDING"}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.quickActions}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>

        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => navigation.navigate("Fees")}
        >
          <Ionicons name="cash-outline" size={30} color="#667eea" />
          <View style={styles.actionInfo}>
            <Text style={styles.actionTitle}>View Fees</Text>
            <Text style={styles.actionSubtitle}>
              Total: ₱{totalFees.toLocaleString()}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color="#ccc" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => navigation.navigate("Payment")}
        >
          <Ionicons name="card-outline" size={30} color="#667eea" />
          <View style={styles.actionInfo}>
            <Text style={styles.actionTitle}>Pay Fees</Text>
            <Text style={styles.actionSubtitle}>Pay via GCash</Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color="#ccc" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => navigation.navigate("PaymentHistory")}
        >
          <Ionicons name="time-outline" size={30} color="#667eea" />
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
    backgroundColor: "#f5f5f5",
  },
  header: {
    backgroundColor: "#667eea",
    padding: 20,
    paddingTop: 60,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  greeting: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
  },
  studentNo: {
    fontSize: 16,
    color: "#fff",
    marginTop: 5,
  },
  clearanceCard: {
    backgroundColor: "#fff",
    margin: 20,
    padding: 20,
    borderRadius: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  clearanceHeader: {
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
  },
  clearanceStatus: {
    fontSize: 24,
    fontWeight: "bold",
    marginTop: 5,
  },
  quickActions: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 15,
  },
  actionCard: {
    backgroundColor: "#fff",
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  actionInfo: {
    flex: 1,
    marginLeft: 15,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  actionSubtitle: {
    fontSize: 14,
    color: "#666",
    marginTop: 2,
  },
});
