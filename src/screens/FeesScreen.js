import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useTheme } from "../contexts/ThemeContext";
import api from "../services/api";

export default function FeesScreen({ navigation }) {
  useEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  const { colors } = useTheme();
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
      ...(breakdown?.tuition?.fees || []),
      ...(breakdown?.miscellaneous?.fees || []),
      ...(breakdown?.exam?.fees || []),
    ].length > 0;

  const totalDue = breakdown?.grand_total || 0;
  const totalPaid = breakdown?.total_paid || 0;
  const remainingBalance =
    breakdown?.remaining_balance ?? Math.max(totalDue - totalPaid, 0);

  let summaryLabel = "Remaining Balance";
  let summaryAmount = `₱${remainingBalance.toLocaleString()}`;
  let summaryIcon = "wallet-outline";
  let summaryColor = colors.brand;

  if (!hasFees) {
    summaryLabel = "No Fees";
    summaryAmount = "Not Available";
    summaryIcon = "alert-circle-outline";
    summaryColor = "#f97316";
  } else if (remainingBalance === 0) {
    summaryLabel = "Payment Status";
    summaryAmount = "Fully Paid";
    summaryIcon = "checkmark-circle";
    summaryColor = "#4caf50";
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={colors.brand}
        />
      }
    >
      {/* Header */}
      <LinearGradient
        colors={[colors.gradientStart, colors.gradientEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      >
        <Text style={styles.headerTitle}>School Fees</Text>
        <Text style={styles.headerSubtitle}>Current Academic Year</Text>
      </LinearGradient>

      {/* Summary Card */}
      <View
        style={[
          styles.summaryCard,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
      >
        <View
          style={[
            styles.summaryIconContainer,
            { backgroundColor: summaryColor + "20" },
          ]}
        >
          <Ionicons name={summaryIcon} size={32} color={summaryColor} />
        </View>
        <View style={styles.summaryTextContainer}>
          <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
            {summaryLabel}
          </Text>
          <Text style={[styles.summaryAmount, { color: summaryColor }]}>
            {summaryAmount}
          </Text>
        </View>
      </View>

      {hasFees ? (
        <>
          {breakdown?.tuition?.fees?.length > 0 && (
            <View
              style={[
                styles.section,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.borderLight,
                },
              ]}
            >
              <View
                style={[
                  styles.sectionHeader,
                  { borderBottomColor: colors.border },
                ]}
              >
                <View
                  style={[styles.iconCircle, { backgroundColor: colors.brand }]}
                >
                  <Ionicons name="school-outline" size={22} color="#fff" />
                </View>
                <Text
                  style={[styles.sectionTitle, { color: colors.textPrimary }]}
                >
                  Tuition Fees
                </Text>
              </View>
              {breakdown.tuition.fees.map((fee) => (
                <View
                  key={fee.id}
                  style={[
                    styles.feeItem,
                    { borderBottomColor: colors.borderLight },
                  ]}
                >
                  <Text
                    style={[styles.feeName, { color: colors.textSecondary }]}
                  >
                    {fee.name}
                  </Text>
                  <Text style={[styles.feeAmount, { color: colors.brand }]}>
                    ₱{parseFloat(fee.amount).toLocaleString()}
                  </Text>
                </View>
              ))}
              <View
                style={[styles.subtotalRow, { borderTopColor: colors.border }]}
              >
                <Text
                  style={[styles.subtotalLabel, { color: colors.textPrimary }]}
                >
                  Subtotal
                </Text>
                <Text style={[styles.subtotalAmount, { color: colors.brand }]}>
                  ₱{breakdown.tuition.total?.toLocaleString() || "0"}
                </Text>
              </View>
            </View>
          )}

          {breakdown?.miscellaneous?.fees?.length > 0 && (
            <View
              style={[
                styles.section,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.borderLight,
                },
              ]}
            >
              <View
                style={[
                  styles.sectionHeader,
                  { borderBottomColor: colors.border },
                ]}
              >
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
                <Text
                  style={[styles.sectionTitle, { color: colors.textPrimary }]}
                >
                  Miscellaneous Fees
                </Text>
              </View>
              {breakdown.miscellaneous.fees.map((fee) => (
                <View
                  key={fee.id}
                  style={[
                    styles.feeItem,
                    { borderBottomColor: colors.borderLight },
                  ]}
                >
                  <Text
                    style={[styles.feeName, { color: colors.textSecondary }]}
                  >
                    {fee.name}
                  </Text>
                  <Text style={[styles.feeAmount, { color: colors.brand }]}>
                    ₱{parseFloat(fee.amount).toLocaleString()}
                  </Text>
                </View>
              ))}
              <View
                style={[styles.subtotalRow, { borderTopColor: colors.border }]}
              >
                <Text
                  style={[styles.subtotalLabel, { color: colors.textPrimary }]}
                >
                  Subtotal
                </Text>
                <Text style={[styles.subtotalAmount, { color: colors.brand }]}>
                  ₱{breakdown.miscellaneous.total?.toLocaleString() || "0"}
                </Text>
              </View>
            </View>
          )}

          {breakdown?.exam?.fees?.length > 0 && (
            <View
              style={[
                styles.section,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.borderLight,
                },
              ]}
            >
              <View
                style={[
                  styles.sectionHeader,
                  { borderBottomColor: colors.border },
                ]}
              >
                <View
                  style={[styles.iconCircle, { backgroundColor: colors.brand }]}
                >
                  <Ionicons name="create-outline" size={22} color="#fff" />
                </View>
                <Text
                  style={[styles.sectionTitle, { color: colors.textPrimary }]}
                >
                  Exam Fees
                </Text>
              </View>
              {breakdown.exam.fees.map((fee) => (
                <View
                  key={fee.id}
                  style={[
                    styles.feeItem,
                    { borderBottomColor: colors.borderLight },
                  ]}
                >
                  <Text
                    style={[styles.feeName, { color: colors.textSecondary }]}
                  >
                    {fee.name}
                  </Text>
                  <Text style={[styles.feeAmount, { color: colors.brand }]}>
                    ₱{parseFloat(fee.amount).toLocaleString()}
                  </Text>
                </View>
              ))}
              <View
                style={[styles.subtotalRow, { borderTopColor: colors.border }]}
              >
                <Text
                  style={[styles.subtotalLabel, { color: colors.textPrimary }]}
                >
                  Subtotal
                </Text>
                <Text style={[styles.subtotalAmount, { color: colors.brand }]}>
                  ₱{breakdown.exam.total?.toLocaleString() || "0"}
                </Text>
              </View>
            </View>
          )}
        </>
      ) : (
        <View style={styles.emptyContainer}>
          <Ionicons name="receipt-outline" size={60} color={colors.textMuted} />
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>
            No fees have been set for this semester.
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  headerGradient: {
    paddingTop: 60,
    paddingBottom: 30,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    elevation: 8,
    shadowColor: "#0f3c91",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 5,
  },
  headerSubtitle: { fontSize: 16, color: "rgba(255,255,255,0.9)" },
  summaryCard: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: -20,
    marginHorizontal: 20,
    padding: 20,
    borderRadius: 25,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 10,
    borderWidth: 1,
  },
  summaryIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  summaryTextContainer: { flex: 1 },
  summaryLabel: { fontSize: 14, marginBottom: 4 },
  summaryAmount: { fontSize: 28, fontWeight: "bold" },
  section: {
    marginHorizontal: 20,
    marginTop: 20,
    padding: 20,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
    paddingBottom: 10,
    borderBottomWidth: 1,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
    elevation: 3,
  },
  sectionTitle: { fontSize: 18, fontWeight: "700" },
  feeItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  feeName: { fontSize: 15, flex: 1 },
  feeAmount: { fontSize: 15, fontWeight: "600" },
  subtotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
    paddingTop: 15,
    borderTopWidth: 1,
  },
  subtotalLabel: { fontSize: 16, fontWeight: "700" },
  subtotalAmount: { fontSize: 16, fontWeight: "700" },
  emptyContainer: { alignItems: "center", marginTop: 50, marginBottom: 30 },
  emptyText: { fontSize: 16, marginTop: 12, textAlign: "center" },
});
