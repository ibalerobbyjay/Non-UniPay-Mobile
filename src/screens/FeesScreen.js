import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";
import api from "../services/api";

export default function FeesScreen() {
  const [fees, setFees] = useState([]);
  const [breakdown, setBreakdown] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
const totalDue = breakdown?.grand_total || 0;
const totalPaid = breakdown?.total_paid || 0;
const remainingBalance = breakdown?.remaining_balance ?? Math.max(totalDue - totalPaid, 0);
  useEffect(() => {
    loadFees();
  }, []);

  const loadFees = async () => {
    try {
      const [feesRes, breakdownRes] = await Promise.all([
        api.get("/fees"),
        api.get("/fees/breakdown"),
      ]);

      setFees(feesRes.data.fees);
      setBreakdown(breakdownRes.data.breakdown);
    } catch (error) {
      console.error("Error loading fees:", error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadFees();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#667eea" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>School Fees</Text>
        <Text style={styles.headerSubtitle}>2024-2025 Academic Year</Text>
      </View>

      {/* Total Summary */}
      <View style={styles.summaryCard}>
        <Text style={styles.summaryLabel}>
  {remainingBalance === 0 ? "Payment Status" : "Remaining Balance"}
</Text>

<Text
  style={[
    styles.summaryAmount,
    { color: remainingBalance === 0 ? "green" : "#667eea" }
  ]}
>
  {remainingBalance === 0
    ? "Fully Paid ✅"
    : `₱${remainingBalance.toLocaleString()}`}
</Text>
      </View>

      {/* Tuition Fees */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="school" size={24} color="#667eea" />
          <Text style={styles.sectionTitle}>Tuition Fees</Text>
        </View>
        {breakdown?.tuition?.fees.map((fee) => (
          <View key={fee.id} style={styles.feeItem}>
            <Text style={styles.feeName}>{fee.name}</Text>
            <Text style={styles.feeAmount}>
              ₱{parseFloat(fee.amount).toLocaleString()}
            </Text>
          </View>
        ))}
        <View style={styles.subtotalRow}>
          <Text style={styles.subtotalLabel}>Subtotal</Text>
          <Text style={styles.subtotalAmount}>
            ₱{breakdown?.tuition?.total?.toLocaleString() || "0"}
          </Text>
        </View>
      </View>

      {/* Miscellaneous Fees */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="documents" size={24} color="#667eea" />
          <Text style={styles.sectionTitle}>Miscellaneous Fees</Text>
        </View>
        {breakdown?.miscellaneous?.fees.map((fee) => (
          <View key={fee.id} style={styles.feeItem}>
            <Text style={styles.feeName}>{fee.name}</Text>
            <Text style={styles.feeAmount}>
              ₱{parseFloat(fee.amount).toLocaleString()}
            </Text>
          </View>
        ))}
        <View style={styles.subtotalRow}>
          <Text style={styles.subtotalLabel}>Subtotal</Text>
          <Text style={styles.subtotalAmount}>
            ₱{breakdown?.miscellaneous?.total?.toLocaleString() || "0"}
          </Text>
        </View>
      </View>

      {/* Exam Fees */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="create" size={24} color="#667eea" />
          <Text style={styles.sectionTitle}>Exam Fees</Text>
        </View>
        {breakdown?.exam?.fees.map((fee) => (
          <View key={fee.id} style={styles.feeItem}>
            <Text style={styles.feeName}>{fee.name}</Text>
            <Text style={styles.feeAmount}>
              ₱{parseFloat(fee.amount).toLocaleString()}
            </Text>
          </View>
        ))}
        <View style={styles.subtotalRow}>
          <Text style={styles.subtotalLabel}>Subtotal</Text>
          <Text style={styles.subtotalAmount}>
            ₱{breakdown?.exam?.total?.toLocaleString() || "0"}
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    backgroundColor: "#667eea",
    padding: 20,
    paddingTop: 60,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#fff",
  },
  headerSubtitle: {
    fontSize: 16,
    color: "#fff",
    marginTop: 5,
    opacity: 0.9,
  },
  summaryCard: {
    backgroundColor: "#fff",
    margin: 20,
    padding: 20,
    borderRadius: 15,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryLabel: {
    fontSize: 16,
    color: "#666",
  },
  summaryAmount: {
    fontSize: 36,
    fontWeight: "bold",
    color: "#667eea",
    marginTop: 10,
  },
  section: {
    backgroundColor: "#fff",
    marginHorizontal: 20,
    marginBottom: 15,
    padding: 15,
    borderRadius: 10,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginLeft: 10,
  },
  feeItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10,
  },
  feeName: {
    fontSize: 16,
    color: "#333",
    flex: 1,
  },
  feeAmount: {
    fontSize: 16,
    fontWeight: "600",
    color: "#667eea",
  },
  subtotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  subtotalLabel: {
    fontSize: 16,
    fontWeight: "bold",
  },
  subtotalAmount: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#667eea",
  },
});
