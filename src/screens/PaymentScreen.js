import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Image,
  Linking,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useTheme } from "../contexts/ThemeContext";
import api from "../services/api";

// ─── Loading Overlay ──────────────────────────────────────────────────────────
function LoadingOverlay({ visible }) {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();

      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.12,
            duration: 750,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 750,
            useNativeDriver: true,
          }),
        ]),
      ).start();
    } else {
      fadeAnim.setValue(0);
      pulseAnim.stopAnimation();
      pulseAnim.setValue(1);
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <Animated.View style={[styles.loadingOverlay, { opacity: fadeAnim }]}>
        <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
        <LinearGradient
          colors={["rgba(5,15,50,0.88)", "rgba(10,25,80,0.95)"]}
          style={StyleSheet.absoluteFill}
        />
        <Animated.View
          style={[
            styles.loadingLogoRing,
            { transform: [{ scale: pulseAnim }] },
          ]}
        >
          <Image
            source={require("../../assets/logo.png")}
            style={styles.loadingLogo}
          />
        </Animated.View>
        <ActivityIndicator
          size="large"
          color="#f4b400"
          style={{ marginTop: 32 }}
        />
        <Text style={styles.loadingText}>Loading fees…</Text>
        <Text style={styles.loadingSubText}>Please wait</Text>
      </Animated.View>
    </Modal>
  );
}

export default function PaymentScreen({ navigation }) {
  useEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  const { colors } = useTheme();

  const [feeBreakdown, setFeeBreakdown] = useState(null);
  const [selectedFees, setSelectedFees] = useState({});
  const [selectedTotal, setSelectedTotal] = useState(0);

  // paidFeeIds: fees fully covered by a confirmed payment (amount paid >= current fee amount)
  const [paidFeeIds, setPaidFeeIds] = useState(new Set());
  // partialFeeIds: fees with a confirmed payment but amount paid < current fee amount
  const [partialFeeIds, setPartialFeeIds] = useState(new Map()); // feeId -> { paidAmount }
  // pendingFeeIds: fees in a pending (unconfirmed) payment
  const [pendingFeeIds, setPendingFeeIds] = useState(new Set());

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);

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

      // Build a map of current fee amounts from the breakdown
      const currentFeeAmounts = {};
      [
        ...(breakdown?.tuition?.fees || []),
        ...(breakdown?.miscellaneous?.fees || []),
        ...(breakdown?.exam?.fees || []),
      ].forEach((fee) => {
        currentFeeAmounts[fee.id] = parseFloat(fee.amount);
      });

      const payments = historyRes.data.payments || [];

      // Accumulate how much has been paid per fee across all confirmed payments
      const paidAmountPerFee = {}; // feeId -> total amount paid
      const pendingFees = new Set();

      payments.forEach((payment) => {
        if (payment.status === "paid" && payment.fees) {
          payment.fees.forEach((fee) => {
            const prev = paidAmountPerFee[fee.id] || 0;
            // fee.pivot_amount is what was paid for this fee in this payment
            // fall back to fee.amount if pivot not available
            const paidForThisFee = parseFloat(
              fee.pivot_amount ?? fee.amount ?? 0,
            );
            paidAmountPerFee[fee.id] = prev + paidForThisFee;
          });
        } else if (payment.status === "pending" && payment.fees) {
          payment.fees.forEach((fee) => pendingFees.add(fee.id));
        }
      });

      // Now classify fees
      const fullyPaid = new Set();
      const partial = new Map(); // feeId -> { paidAmount, remaining }

      Object.entries(paidAmountPerFee).forEach(([feeId, paidAmount]) => {
        const id = parseInt(feeId, 10);
        const currentAmount = currentFeeAmounts[id];

        if (currentAmount === undefined) return; // fee no longer exists

        if (paidAmount >= currentAmount) {
          // Paid in full based on current fee amount
          fullyPaid.add(id);
        } else {
          // Was paid but fee was edited higher — show remaining balance owed
          partial.set(id, {
            paidAmount,
            remaining: currentAmount - paidAmount,
          });
        }
      });

      setPaidFeeIds(fullyPaid);
      setPartialFeeIds(partial);
      setPendingFeeIds(pendingFees);

      // Clear any selected fees that are now fully paid or pending
      setSelectedFees((prev) => {
        const next = { ...prev };
        let changed = false;
        Object.keys(next).forEach((id) => {
          const numId = parseInt(id, 10);
          if (fullyPaid.has(numId) || pendingFees.has(numId)) {
            delete next[id];
            changed = true;
          }
        });
        if (changed) {
          const total = Object.values(next).reduce(
            (sum, fee) => sum + fee.amount,
            0,
          );
          setSelectedTotal(total);
        }
        return changed ? next : prev;
      });
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

  const getAllSelectableFees = () => {
    const allFees = [
      ...(feeBreakdown?.tuition?.fees || []),
      ...(feeBreakdown?.miscellaneous?.fees || []),
      ...(feeBreakdown?.exam?.fees || []),
    ];
    // Selectable = not fully paid and not pending
    // Partial fees ARE selectable (they still owe the remaining balance)
    return allFees.filter(
      (fee) => !paidFeeIds.has(fee.id) && !pendingFeeIds.has(fee.id),
    );
  };

  const isAllSelected = (() => {
    const selectableFees = getAllSelectableFees();
    return (
      selectableFees.length > 0 &&
      selectableFees.every((fee) => !!selectedFees[fee.id])
    );
  })();

  const selectAll = () => {
    if (loading) return;
    const selectableFees = getAllSelectableFees();

    if (isAllSelected) {
      setSelectedFees({});
      setSelectedTotal(0);
    } else {
      const newSelected = {};
      selectableFees.forEach((fee) => {
        const partial = partialFeeIds.get(fee.id);
        // If partially paid, only select the remaining balance
        const amountDue = partial ? partial.remaining : parseFloat(fee.amount);
        newSelected[fee.id] = { amount: amountDue };
      });
      const total = Object.values(newSelected).reduce(
        (sum, f) => sum + f.amount,
        0,
      );
      setSelectedFees(newSelected);
      setSelectedTotal(total);
    }
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
    setConfirmModalVisible(true);
  };

  const processPayment = async () => {
    setLoading(true);
    setConfirmModalVisible(false);
    try {
      const feeIds = Object.keys(selectedFees);
      const response = await api.post("/payments/initiate", {
        amount: selectedTotal,
        fee_ids: feeIds,
      });

      if (response.data.success) {
        const { payment_url } = response.data;

        setPendingFeeIds((prev) => new Set([...prev, ...feeIds.map(Number)]));
        setSelectedFees({});
        setSelectedTotal(0);

        const supported = await Linking.canOpenURL(payment_url);
        if (supported) {
          await Linking.openURL(payment_url);
        } else {
          Alert.alert("Error", "Cannot open GCash payment page");
          setPendingFeeIds((prev) => {
            const newSet = new Set(prev);
            feeIds.forEach((id) => newSet.delete(Number(id)));
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
    const partialInfo = partialFeeIds.get(fee.id); // { paidAmount, remaining }
    const activeCategoryColor = categoryColor || colors.brand;
    const isDisabled = loading || isPaid || isPending;

    // ── Fully Paid ────────────────────────────────────────────────────────────
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

    // ── Pending ───────────────────────────────────────────────────────────────
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

    // ── Partially Paid (fee was edited higher after payment) ──────────────────
    if (partialInfo) {
      const amountDue = partialInfo.remaining;
      return (
        <TouchableOpacity
          key={fee.id}
          style={[
            styles.feeItem,
            {
              backgroundColor: colors.surface,
              borderColor: isSelected ? "#e65100" : "#ff9800",
              borderWidth: isSelected ? 1.5 : 1,
              opacity: loading ? 0.6 : 1,
            },
          ]}
          onPress={() => !loading && toggleFee(fee.id, amountDue)}
          activeOpacity={0.7}
          disabled={loading}
        >
          <View style={styles.feeInfo}>
            <Text style={[styles.feeName, { color: colors.textPrimary }]}>
              {fee.name}
            </Text>
            <Text style={[styles.feeAmount, { color: "#ff9800" }]}>
              ₱{parseFloat(fee.amount).toLocaleString()} – Balance Due
            </Text>
            <Text style={[styles.feeSubAmount, { color: colors.textMuted }]}>
              Paid ₱{partialInfo.paidAmount.toLocaleString()} · Still owe ₱
              {amountDue.toLocaleString()}
            </Text>
          </View>
          <Ionicons
            name={isSelected ? "checkbox" : "square-outline"}
            size={24}
            color={isSelected ? "#e65100" : "#ff9800"}
          />
        </TouchableOpacity>
      );
    }

    // ── Unpaid / Selectable ───────────────────────────────────────────────────
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
    return <LoadingOverlay visible={fetching} />;
  }

  const hasFees =
    [
      ...(feeBreakdown?.tuition?.fees || []),
      ...(feeBreakdown?.miscellaneous?.fees || []),
      ...(feeBreakdown?.exam?.fees || []),
    ].length > 0;

  const selectableFeesCount = getAllSelectableFees().length;

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
          {hasFees && selectableFeesCount > 0 && (
            <TouchableOpacity
              onPress={selectAll}
              disabled={loading}
              style={[
                styles.selectAllHeaderBtn,
                {
                  backgroundColor: isAllSelected
                    ? colors.brand
                    : "rgba(255,255,255,0.2)",
                  borderColor: colors.brand,
                },
              ]}
            >
              <Ionicons
                name={isAllSelected ? "checkbox" : "square-outline"}
                size={16}
                color="#fff"
              />
              <Text style={[styles.selectAllHeaderText, { color: "#fff" }]}>
                {isAllSelected ? "Deselect All" : "Select All"}
              </Text>
            </TouchableOpacity>
          )}
          {!(hasFees && selectableFeesCount > 0) && (
            <View style={{ width: 40 }} />
          )}
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

        <View style={styles.subtitleRow}>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Select the fees you want to pay
          </Text>
        </View>

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

      {/* Footer */}
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

      {/* Confirmation Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={confirmModalVisible}
        onRequestClose={() => setConfirmModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[styles.modalContainer, { backgroundColor: colors.surface }]}
          >
            <Ionicons
              name="alert-circle-outline"
              size={64}
              color={colors.brand}
            />
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
              Confirm Payment
            </Text>
            <Text
              style={[styles.modalMessage, { color: colors.textSecondary }]}
            >
              Pay ₱{selectedTotal.toLocaleString()} for selected fees via GCash?
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  styles.modalCancelButton,
                  { borderColor: colors.border },
                ]}
                onPress={() => setConfirmModalVisible(false)}
              >
                <Text
                  style={[
                    styles.modalButtonText,
                    { color: colors.textSecondary },
                  ]}
                >
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  styles.modalConfirmButton,
                  { backgroundColor: colors.brand },
                ]}
                onPress={processPayment}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.modalConfirmButtonText}>Proceed</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  selectAllHeaderBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  selectAllHeaderText: { fontSize: 13, fontWeight: "600" },
  content: { flex: 1, paddingHorizontal: 20, paddingTop: 20 },
  iconContainer: { alignItems: "center", marginBottom: 10 },
  title: { fontSize: 24, fontWeight: "bold", textAlign: "center" },
  subtitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 5,
    marginBottom: 20,
  },
  subtitle: { textAlign: "center", fontSize: 14 },
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
  feeSubAmount: { fontSize: 12, marginTop: 2 },
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
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: {
    width: "80%",
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: "bold",
    marginTop: 16,
    marginBottom: 8,
  },
  modalMessage: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 24,
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  modalCancelButton: {
    borderWidth: 1,
    backgroundColor: "transparent",
  },
  modalConfirmButton: {
    backgroundColor: "transparent",
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  modalConfirmButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  loadingOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingLogoRing: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 3,
    borderColor: "rgba(244,180,0,0.65)",
    overflow: "hidden",
    shadowColor: "#f4b400",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.55,
    shadowRadius: 22,
    elevation: 14,
  },
  loadingLogo: {
    width: "100%",
    height: "100%",
  },
  loadingText: {
    marginTop: 20,
    fontSize: 18,
    fontWeight: "700",
    color: "#fff",
    letterSpacing: 0.3,
  },
  loadingSubText: {
    marginTop: 5,
    fontSize: 13,
    color: "rgba(255,255,255,0.4)",
  },
});
