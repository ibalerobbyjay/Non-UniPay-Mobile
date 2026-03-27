import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { useCallback, useEffect, useRef, useState } from "react";
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
import { useTheme } from "../contexts/ThemeContext";
import api from "../services/api";

export default function PaymentScreen({ navigation }) {
  useEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  const { colors } = useTheme();

  const [feeBreakdown, setFeeBreakdown] = useState(null);
  const [selectedFees, setSelectedFees] = useState({});
  const [selectedTotal, setSelectedTotal] = useState(0);
  const [paidFeeIds, setPaidFeeIds] = useState(new Set());
  const [pendingFeeIds, setPendingFeeIds] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const autoRefreshIntervalRef = useRef(null);
  const isFirstLoad = useRef(true);

  const loadData = useCallback(async ({ skipLoading = false } = {}) => {
    if (!skipLoading) setFetching(true);
    try {
      const [feesRes, historyRes] = await Promise.all([
        api.get("/fees/breakdown"),
        api.get("/payments/history"),
      ]);
      const breakdown = feesRes.data.breakdown;
      setFeeBreakdown(breakdown);

      const payments = historyRes.data.payments || [];
      const paidFees = new Set();
      const pendingFees = new Set();

      payments.forEach((payment) => {
        if (payment.status === "paid" && payment.fees) {
          payment.fees.forEach((fee) => paidFees.add(fee.id));
        } else if (payment.status === "pending" && payment.fees) {
          payment.fees.forEach((fee) => pendingFees.add(fee.id));
        }
      });

      setPaidFeeIds(paidFees);
      setPendingFeeIds(pendingFees);
    } catch (error) {
      console.error("Error loading data:", error);
      Alert.alert("Error", "Failed to load fee information");
    } finally {
      if (!skipLoading) setFetching(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (isFirstLoad.current) {
        loadData({ skipLoading: false });
        isFirstLoad.current = false;
      } else {
        loadData({ skipLoading: true });
      }

      autoRefreshIntervalRef.current = setInterval(() => {
        if (!loading) {
          loadData({ skipLoading: true });
        }
      }, 5000);

      return () => {
        if (autoRefreshIntervalRef.current) {
          clearInterval(autoRefreshIntervalRef.current);
          autoRefreshIntervalRef.current = null;
        }
      };
    }, [loadData, loading]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData({ skipLoading: false });
  };

  const toggleFee = (feeId, amount) => {
    if (loading || paidFeeIds.has(feeId) || pendingFeeIds.has(feeId)) return;

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

        // Mark these fees as pending immediately
        setPendingFeeIds((prev) => new Set([...prev, ...feeIds]));
        // Clear selected fees
        setSelectedFees({});
        setSelectedTotal(0);

        const supported = await Linking.canOpenURL(payment_url);
        if (supported) {
          await Linking.openURL(payment_url);
          // The app will be backgrounded. When the user returns (via deep link),
          // the screen will refresh (focus) and auto-refresh will pick up the updated status.
        } else {
          Alert.alert("Error", "Cannot open GCash payment page");
          // Remove pending mark if we failed to open the URL
          setPendingFeeIds((prev) => {
            const newSet = new Set(prev);
            feeIds.forEach((id) => newSet.delete(id));
            return newSet;
          });
        }
      } else {
        Alert.alert(
          "Error",
          response.data.message || "Payment initiation failed",
        );
      }
    } catch (error) {
      Alert.alert(
        "Payment Failed",
        error.response?.data?.message || "An error occurred",
      );
    } finally {
      setLoading(false);
    }
  };

  const renderFeeItem = (fee, categoryColor) => {
    const isSelected = !!selectedFees[fee.id];
    const isPaid = paidFeeIds.has(fee.id);
    const isPending = pendingFeeIds.has(fee.id);
    const activeCategoryColor = categoryColor || colors.brand;
    const isDisabled = loading || isPaid || isPending;

    if (isPaid) {
      return (
        <View
          key={fee.id}
          style={[
            styles.feeItem,
            {
              backgroundColor: colors.surface,
              borderColor: "#4caf50",
              borderWidth: 1,
            },
          ]}
        >
          <View style={styles.feeInfo}>
            <Text style={[styles.feeName, { color: colors.textPrimary }]}>
              {fee.name}
            </Text>
            <Text style={[styles.feeAmount, { color: "#4caf50" }]}>
              ₱{parseFloat(fee.amount).toLocaleString()} – Paid
            </Text>
          </View>
          <Ionicons name="checkmark-circle" size={24} color="#4caf50" />
        </View>
      );
    }

    if (isPending) {
      return (
        <View
          key={fee.id}
          style={[
            styles.feeItem,
            {
              backgroundColor: colors.surface,
              borderColor: "#ff9800",
              borderWidth: 1,
              opacity: 0.7,
            },
          ]}
        >
          <View style={styles.feeInfo}>
            <Text style={[styles.feeName, { color: colors.textPrimary }]}>
              {fee.name}
            </Text>
            <Text style={[styles.feeAmount, { color: "#ff9800" }]}>
              ₱{parseFloat(fee.amount).toLocaleString()} – Pending
            </Text>
          </View>
          <Ionicons name="time-outline" size={24} color="#ff9800" />
        </View>
      );
    }

    return (
      <TouchableOpacity
        key={fee.id}
        style={[
          styles.feeItem,
          {
            backgroundColor: colors.surface,
            borderColor: isSelected ? colors.brand : colors.border,
            borderWidth: isSelected ? 1.5 : 1,
            opacity: isDisabled ? 0.6 : 1,
          },
        ]}
        onPress={() => !isDisabled && toggleFee(fee.id, parseFloat(fee.amount))}
        activeOpacity={0.7}
        disabled={isDisabled}
      >
        <View style={styles.feeInfo}>
          <Text style={[styles.feeName, { color: colors.textPrimary }]}>
            {fee.name}
          </Text>
          <Text style={[styles.feeAmount, { color: colors.brand }]}>
            ₱{parseFloat(fee.amount).toLocaleString()}
          </Text>
        </View>
        <Ionicons
          name={isSelected ? "checkbox" : "square-outline"}
          size={24}
          color={isSelected ? activeCategoryColor : colors.textMuted}
        />
      </TouchableOpacity>
    );
  };

  if (fetching) {
    return (
      <View
        style={[
          styles.loadingContainer,
          { backgroundColor: colors.background },
        ]}
      >
        <ActivityIndicator size="large" color={colors.brand} />
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
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={[colors.gradientStart, colors.gradientEnd]}
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
            tintColor={colors.brand}
          />
        }
      >
        <View style={styles.iconContainer}>
          <Ionicons name="card" size={80} color={colors.brand} />
        </View>
        <Text style={[styles.title, { color: colors.brand }]}>School Fees</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Select the fees you want to pay
        </Text>

        {hasFees ? (
          <View style={styles.feesContainer}>
            {feeBreakdown?.tuition?.fees?.length > 0 && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.brand }]}>
                  Tuition Fees
                </Text>
                {feeBreakdown.tuition.fees.map((fee) =>
                  renderFeeItem(fee, colors.brand),
                )}
              </View>
            )}
            {feeBreakdown?.miscellaneous?.fees?.length > 0 && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.brand }]}>
                  Miscellaneous Fees
                </Text>
                {feeBreakdown.miscellaneous.fees.map((fee) =>
                  renderFeeItem(fee, "rgb(244, 180, 20)"),
                )}
              </View>
            )}
            {feeBreakdown?.exam?.fees?.length > 0 && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.brand }]}>
                  Exam Fees
                </Text>
                {feeBreakdown.exam.fees.map((fee) =>
                  renderFeeItem(fee, colors.brand),
                )}
              </View>
            )}
          </View>
        ) : (
          <View style={styles.emptyContainer}>
            <Ionicons
              name="alert-circle-outline"
              size={60}
              color={colors.textMuted}
            />
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              No fees available
            </Text>
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      <View
        style={[
          styles.footer,
          { backgroundColor: colors.surface, borderTopColor: colors.border },
        ]}
      >
        <View style={styles.totalRow}>
          <Text style={[styles.totalLabel, { color: colors.textSecondary }]}>
            Total to pay:
          </Text>
          <Text style={[styles.totalAmount, { color: colors.brand }]}>
            ₱{selectedTotal.toLocaleString()}
          </Text>
        </View>
        <TouchableOpacity
          style={[
            styles.payButton,
            { backgroundColor: colors.brand },
            (loading || selectedTotal === 0) && styles.payButtonDisabled,
          ]}
          onPress={handlePayment}
          disabled={loading || selectedTotal === 0}
        >
          {loading ? (
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
  headerTitle: { fontSize: 24, fontWeight: "bold", color: "#fff" },
  content: { flex: 1, paddingHorizontal: 20, paddingTop: 20 },
  iconContainer: { alignItems: "center", marginBottom: 10 },
  title: { fontSize: 24, fontWeight: "bold", textAlign: "center" },
  subtitle: { textAlign: "center", marginTop: 5, marginBottom: 20 },
  feesContainer: { paddingBottom: 20 },
  section: { marginBottom: 24 },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  feeItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderRadius: 16,
    marginBottom: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  feeInfo: { flex: 1 },
  feeName: { fontSize: 15, fontWeight: "500", marginBottom: 4 },
  feeAmount: { fontSize: 16, fontWeight: "600" },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyText: { marginTop: 16, fontSize: 16 },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
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
  totalLabel: { fontSize: 16 },
  totalAmount: { fontSize: 24, fontWeight: "bold" },
  payButton: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
    borderRadius: 30,
    gap: 8,
    elevation: 3,
  },
  payButtonDisabled: { backgroundColor: "#94a3b8", opacity: 0.6 },
  payButtonText: { color: "#fff", fontSize: 18, fontWeight: "600" },
});
