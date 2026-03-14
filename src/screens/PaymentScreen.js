import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import api from "../services/api";

export default function PaymentScreen({ navigation }) {
  // Hide the navigation header
  useEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  const [feeBreakdown, setFeeBreakdown] = useState(null);
  const [selectedFees, setSelectedFees] = useState({});
  const [selectedTotal, setSelectedTotal] = useState(0);
  const [paidFeeIds, setPaidFeeIds] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    try {
      const [feesRes, historyRes] = await Promise.all([
        api.get("/fees/breakdown"),
        api.get("/payments/history"),
      ]);

      const breakdown = feesRes.data.breakdown;
      setFeeBreakdown(breakdown);

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
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, []),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
  };

  const toggleFee = (feeId, amount) => {
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

  const renderFeeItem = (fee, categoryColor = "#0f3c91") => {
    const isSelected = !!selectedFees[fee.id];
    const isPaid = paidFeeIds.has(fee.id);

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

    return (
      <TouchableOpacity
        key={fee.id}
        style={[styles.feeItem, isSelected && styles.feeItemSelected]}
        onPress={() => toggleFee(fee.id, parseFloat(fee.amount))}
        activeOpacity={0.7}
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
          color={isSelected ? categoryColor : "#94a3b8"}
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
          <Text style={styles.headerTitle}>Pay Fees</Text>
          <View style={{ width: 40 }} />
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#0f3c91"
          />
        }
      >
        <View style={styles.iconContainer}>
          <Ionicons name="card" size={80} color="#0f3c91" />
        </View>
        <Text style={styles.title}>School Fees</Text>
        <Text style={styles.subtitle}>Select the fees you want to pay</Text>

        {hasFees ? (
          <View style={styles.feesContainer}>
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
          </View>
        ) : (
          <View style={styles.emptyContainer}>
            <Ionicons name="alert-circle-outline" size={60} color="#94a3b8" />
            <Text style={styles.emptyText}>No fees available</Text>
          </View>
        )}

        {/* Spacer for footer */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total to pay:</Text>
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
              <Ionicons name="wallet-outline" size={24} color="#fff" />
              <Text style={styles.payButtonText}>Pay with GCash</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
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
    justifyContent: "space-between",
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
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
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
  feesContainer: {
    paddingBottom: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0f3c91",
    marginBottom: 12,
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
    borderColor: "#f1f5f9",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  feeItemSelected: {
    backgroundColor: "#f8fafc",
    borderColor: "#0f3c91",
    borderWidth: 1.5,
  },
  feeItemPaid: {
    backgroundColor: "#f0fdf4",
    borderColor: "#4caf50",
    borderWidth: 1,
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
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: "#94a3b8",
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 8,
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
    fontSize: 24,
    fontWeight: "bold",
    color: "#0f3c91",
  },
  payButton: {
    backgroundColor: "#0f3c91",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
    borderRadius: 30,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    gap: 8,
  },
  payButtonDisabled: {
    backgroundColor: "#94a3b8",
    opacity: 0.6,
  },
  payButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
});
