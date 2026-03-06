import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { useCallback, useState } from "react";
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
  const [breakdown, setBreakdown] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadFees();
    }, []),
  );

  const loadFees = async () => {
    try {
      const breakdownRes = await api.get("/fees/breakdown");
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
        <ActivityIndicator size="large" color="#0f3c91" />
      </View>
    );
  }

  // Check if there are any fees
  const hasFees =
    [
      ...(breakdown?.tuition?.fees || []),
      ...(breakdown?.miscellaneous?.fees || []),
      ...(breakdown?.exam?.fees || []),
    ].length > 0;

  const totalDue = breakdown?.grand_total || 0;
  const totalPaid = breakdown?.total_paid || 0;
  const remainingBalance =
    breakdown?.remaining_balance ?? Math.max(totalDue - totalPaid, 0);

  // Determine what to show in the summary card
  let summaryLabel = "Remaining Balance";
  let summaryAmount = `₱${remainingBalance.toLocaleString()}`;
  let summaryIcon = "wallet-outline";
  let summaryColor = "#0f3c91";

  if (!hasFees) {
    summaryLabel = "No Fees";
    summaryAmount = "Not Available";
    summaryIcon = "alert-circle-outline";
    summaryColor = "#f97316"; // orange
  } else if (remainingBalance === 0) {
    summaryLabel = "Payment Status";
    summaryAmount = "Fully Paid";
    summaryIcon = "checkmark-circle";
    summaryColor = "#4caf50";
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
      {/* Gradient Header */}
      <LinearGradient
        colors={["#0f3c91", "#1a4da8"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      >
        <Text style={styles.headerTitle}>School Fees</Text>
        <Text style={styles.headerSubtitle}>2024-2025 Academic Year</Text>
      </LinearGradient>

      {/* Summary Card */}
      <View style={styles.summaryCard}>
        <View style={styles.summaryIconContainer}>
          <Ionicons name={summaryIcon} size={40} color={summaryColor} />
        </View>
        <View style={styles.summaryTextContainer}>
          <Text style={styles.summaryLabel}>{summaryLabel}</Text>
          <Text style={[styles.summaryAmount, { color: summaryColor }]}>
            {summaryAmount}
          </Text>
        </View>
      </View>

      {/* Tuition Fees Section */}
      {hasFees && breakdown?.tuition?.fees?.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={[styles.iconCircle, { backgroundColor: "#0f3c91" }]}>
              <Ionicons name="school-outline" size={22} color="#fff" />
            </View>
            <Text style={styles.sectionTitle}>Tuition Fees</Text>
          </View>
          {breakdown.tuition.fees.map((fee) => (
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
              ₱{breakdown.tuition.total?.toLocaleString() || "0"}
            </Text>
          </View>
        </View>
      )}

      {/* Miscellaneous Fees Section */}
      {hasFees && breakdown?.miscellaneous?.fees?.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View
              style={[
                styles.iconCircle,
                { backgroundColor: "rgb(244, 180, 20)" },
              ]}
            >
              <Ionicons
                name="document-text-outline"
                size={22}
                color="#0f3c91"
              />
            </View>
            <Text style={styles.sectionTitle}>Miscellaneous Fees</Text>
          </View>
          {breakdown.miscellaneous.fees.map((fee) => (
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
              ₱{breakdown.miscellaneous.total?.toLocaleString() || "0"}
            </Text>
          </View>
        </View>
      )}

      {/* Exam Fees Section */}
      {hasFees && breakdown?.exam?.fees?.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={[styles.iconCircle, { backgroundColor: "#0f3c91" }]}>
              <Ionicons name="create-outline" size={22} color="#fff" />
            </View>
            <Text style={styles.sectionTitle}>Exam Fees</Text>
          </View>
          {breakdown.exam.fees.map((fee) => (
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
              ₱{breakdown.exam.total?.toLocaleString() || "0"}
            </Text>
          </View>
        </View>
      )}

      {/* If no fees at all, show a message */}
      {!hasFees && (
        <View style={styles.emptyContainer}>
          <Ionicons name="receipt-outline" size={60} color="#94a3b8" />
          <Text style={styles.emptyText}>
            No fees have been set for this semester.
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f0f2f5",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
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
  headerTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 5,
  },
  headerSubtitle: {
    fontSize: 16,
    color: "rgba(255,255,255,0.9)",
  },
  summaryCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    marginTop: -20,
    marginHorizontal: 20,
    padding: 20,
    borderRadius: 25,
    shadowColor: "#0f3c91",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.8)",
  },
  summaryIconContainer: {
    marginRight: 15,
  },
  summaryTextContainer: {
    flex: 1,
  },
  summaryLabel: {
    fontSize: 14,
    color: "#666",
    marginBottom: 4,
  },
  summaryAmount: {
    fontSize: 28,
    fontWeight: "bold",
  },
  section: {
    backgroundColor: "#fff",
    marginHorizontal: 20,
    marginTop: 20,
    padding: 20,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 3,
    borderWidth: 1,
    borderColor: "#f0f0f0",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1e293b",
  },
  feeItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f8f9fa",
  },
  feeName: {
    fontSize: 15,
    color: "#334155",
    flex: 1,
  },
  feeAmount: {
    fontSize: 15,
    fontWeight: "600",
    color: "#0f3c91",
  },
  subtotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: "#e9ecef",
  },
  subtotalLabel: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1e293b",
  },
  subtotalAmount: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0f3c91",
  },
  emptyContainer: {
    alignItems: "center",
    marginTop: 50,
    marginBottom: 30,
  },
  emptyText: {
    fontSize: 16,
    color: "#94a3b8",
    marginTop: 12,
    textAlign: "center",
  },
});
