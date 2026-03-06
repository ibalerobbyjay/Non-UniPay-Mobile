import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import api from "../services/api";

export default function PaymentScreen({ navigation }) {
  const [feeBreakdown, setFeeBreakdown] = useState(null);
  const [selectedFees, setSelectedFees] = useState({});
  const [selectedTotal, setSelectedTotal] = useState(0);
  const [paidFeeIds, setPaidFeeIds] = useState(new Set()); // 👈 track paid fees
  const [loading, setLoading] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  // Load fee breakdown and payment history concurrently
  const loadData = async () => {
    try {
      const [feesRes, historyRes] = await Promise.all([
        api.get("/fees/breakdown"),
        api.get("/payments/history"),
      ]);

      const breakdown = feesRes.data.breakdown;
      setFeeBreakdown(breakdown);

      // Build set of paid fee IDs from completed payments
      const payments = historyRes.data.payments || [];
      const paidFees = new Set();
      payments.forEach((payment) => {
        if (payment.status === "paid" && payment.fees) {
          payment.fees.forEach((fee) => {
            paidFees.add(fee.id);
          });
        }
      });
      setPaidFeeIds(paidFees);
    } catch (error) {
      console.error("Error loading data:", error);
      Alert.alert("Error", "Failed to load fee information");
    } finally {
      setFetching(false);
    }
  };

  const toggleFee = (feeId, amount) => {
    // Do nothing if fee is already paid
    if (paidFeeIds.has(feeId)) return;

    setSelectedFees((prev) => {
      const newSelected = { ...prev };
      if (newSelected[feeId]) {
        delete newSelected[feeId];
      } else {
        newSelected[feeId] = { amount };
      }
      const total = Object.values(newSelected).reduce(
        (sum, fee) => sum + fee.amount,
        0,
      );
      setSelectedTotal(total);
      return newSelected;
    });
  };

  const handlePayment = () => {
    if (selectedTotal === 0) {
      Alert.alert("Error", "Please select at least one fee to pay");
      return;
    }

    if (selectedTotal < 100) {
      Alert.alert("Error", "Minimum payment amount is ₱100");
      return;
    }

    if (selectedTotal > 100000) {
      Alert.alert("Error", "Amount exceeds PayMongo maximum of ₱100,000");
      return;
    }

    Alert.alert(
      "Confirm Payment",
      `Pay ₱${selectedTotal.toLocaleString()} for selected fees via GCash?`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Proceed", onPress: processPayment },
      ],
    );
  };

  const processPayment = async () => {
    setLoading(true);

    try {
      const feeIds = Object.keys(selectedFees);

      const response = await api.post("/payments/initiate", {
        amount: selectedTotal,
        fee_ids: feeIds,
      });

      if (response.data.success) {
        const { payment_url, payment_id } = response.data;
        const supported = await Linking.canOpenURL(payment_url);
        if (supported) {
          await Linking.openURL(payment_url);
          startStatusCheck(payment_id);
        } else {
          Alert.alert("Error", "Cannot open GCash payment page");
        }
      } else {
        Alert.alert(
          "Error",
          response.data.message || "Payment initiation failed",
        );
      }
    } catch (error) {
      console.error("Payment error:", error.response?.data || error.message);
      Alert.alert(
        "Payment Failed",
        error.response?.data?.message || "An error occurred",
      );
    } finally {
      setLoading(false);
    }
  };

  const startStatusCheck = (paymentId) => {
    setCheckingStatus(true);
    const interval = setInterval(async () => {
      try {
        const res = await api.get(`/payments/status/${paymentId}`);
        const status = res.data.status;
        if (status === "paid") {
          clearInterval(interval);
          setCheckingStatus(false);
          Alert.alert(
            "Payment Successful! 🎉",
            "Your payment has been processed.",
            [
              {
                text: "OK",
                onPress: () =>
                  navigation.navigate("Home", { paymentSuccess: true }),
              },
            ],
          );
        } else if (status === "failed") {
          clearInterval(interval);
          setCheckingStatus(false);
          Alert.alert("Payment Failed ❌", "Please try again.");
        }
      } catch (err) {
        console.error("Status check error:", err);
        clearInterval(interval);
        setCheckingStatus(false);
      }
    }, 5000);
  };

  // Render a single fee item
  const renderFeeItem = (fee, categoryColor = "#0f3c91") => {
    const isSelected = !!selectedFees[fee.id];
    const isPaid = paidFeeIds.has(fee.id); // 👈 check if already paid

    // If paid, show a read-only version without checkbox
    if (isPaid) {
      return (
        <View key={fee.id} style={[styles.feeItem, styles.feeItemPaid]}>
          <View style={styles.feeInfo}>
            <Text style={styles.feeName}>{fee.name}</Text>
            <Text style={[styles.feeAmount, { color: "#4caf50" }]}>
              ₱{parseFloat(fee.amount).toLocaleString()} – Paid
            </Text>
          </View>
          <Ionicons name="checkmark-circle" size={24} color="#4caf50" />
        </View>
      );
    }

    // Otherwise, selectable with checkbox
    return (
      <TouchableOpacity
        key={fee.id}
        style={[styles.feeItem, isSelected && styles.feeItemSelected]}
        onPress={() => toggleFee(fee.id, parseFloat(fee.amount))}
      >
        <View style={styles.feeInfo}>
          <Text style={styles.feeName}>{fee.name}</Text>
          <Text style={styles.feeAmount}>
            ₱{parseFloat(fee.amount).toLocaleString()}
          </Text>
        </View>
        <Ionicons
          name={isSelected ? "checkbox" : "square-outline"}
          size={24}
          color={isSelected ? categoryColor : "#999"}
        />
      </TouchableOpacity>
    );
  };

  if (fetching) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0f3c91" />
      </View>
    );
  }

  const hasFees =
    [
      ...(feeBreakdown?.tuition?.fees || []),
      ...(feeBreakdown?.miscellaneous?.fees || []),
      ...(feeBreakdown?.exam?.fees || []),
    ].length > 0;

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Ionicons name="card" size={80} color="#0f3c91" />
        </View>
        <Text style={styles.title}>Pay School Fees</Text>
        <Text style={styles.subtitle}>Select the fees you want to pay</Text>

        {hasFees ? (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {/* Tuition Fees */}
            {feeBreakdown?.tuition?.fees?.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Tuition Fees</Text>
                {feeBreakdown.tuition.fees.map((fee) =>
                  renderFeeItem(fee, "#0f3c91"),
                )}
              </View>
            )}

            {/* Miscellaneous Fees */}
            {feeBreakdown?.miscellaneous?.fees?.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Miscellaneous Fees</Text>
                {feeBreakdown.miscellaneous.fees.map((fee) =>
                  renderFeeItem(fee, "rgb(244, 180, 20)"),
                )}
              </View>
            )}

            {/* Exam Fees */}
            {feeBreakdown?.exam?.fees?.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Exam Fees</Text>
                {feeBreakdown.exam.fees.map((fee) =>
                  renderFeeItem(fee, "#0f3c91"),
                )}
              </View>
            )}
          </ScrollView>
        ) : (
          <View style={styles.emptyContainer}>
            <Ionicons name="alert-circle-outline" size={60} color="#94a3b8" />
            <Text style={styles.emptyText}>No fees available</Text>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total Selected:</Text>
            <Text style={styles.totalAmount}>
              ₱{selectedTotal.toLocaleString()}
            </Text>
          </View>

          <TouchableOpacity
            style={[
              styles.payButton,
              (loading || checkingStatus || selectedTotal === 0) &&
                styles.payButtonDisabled,
            ]}
            onPress={handlePayment}
            disabled={loading || checkingStatus || selectedTotal === 0}
          >
            {loading || checkingStatus ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="wallet" size={24} color="#fff" />
                <Text style={styles.payButtonText}>Pay with GCash</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
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
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  iconContainer: {
    alignItems: "center",
    marginBottom: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
    color: "#0f3c91",
  },
  subtitle: {
    textAlign: "center",
    marginTop: 5,
    marginBottom: 20,
    color: "#64748b",
  },
  scrollContent: {
    paddingBottom: 20,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0f3c91",
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  feeItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 3,
    elevation: 1,
  },
  feeItemSelected: {
    backgroundColor: "#f8fafc",
    borderColor: "#0f3c91",
    borderWidth: 1.5,
  },
  feeItemPaid: {
    backgroundColor: "#f0fdf4", // light green background
    borderColor: "#4caf50",
    borderWidth: 1,
    opacity: 0.9,
  },
  feeInfo: {
    flex: 1,
  },
  feeName: {
    fontSize: 15,
    fontWeight: "500",
    color: "#1e293b",
    marginBottom: 4,
  },
  feeAmount: {
    fontSize: 16,
    fontWeight: "600",
    color: "#0f3c91",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 100,
  },
  emptyText: {
    fontSize: 16,
    color: "#94a3b8",
    marginTop: 12,
    textAlign: "center",
  },
  footer: {
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    backgroundColor: "#fff",
    marginHorizontal: -16,
    paddingHorizontal: 16,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  totalLabel: {
    fontSize: 16,
    color: "#475569",
  },
  totalAmount: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#0f3c91",
  },
  payButton: {
    backgroundColor: "#0f3c91",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    padding: 18,
    borderRadius: 30,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  payButtonDisabled: {
    backgroundColor: "#a0aec0",
    opacity: 0.6,
  },
  payButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
    marginLeft: 10,
  },
});
