// FeesScreen.js — Updated with OnboardingGuide (screen="fees")
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { useCallback, useContext, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Image,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import OnboardingGuide from "../components/OnboardingGuide";
import { AuthContext } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";
import api from "../services/api";

export default function FeesScreen({ navigation }) {
  useEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  const { token, user } = useContext(AuthContext);
  const { colors } = useTheme();
  const [breakdown, setBreakdown] = useState(null);
  const [examPeriod, setExamPeriod] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // ── Onboarding refs ─────────────────────────────────────────────────────
  const feesHeaderRef = useRef(null);
  const feesSummaryRef = useRef(null);
  const feesSectionsRef = useRef(null);
  const feesTotalRef = useRef(null);

  const refs = {
    feesHeader: feesHeaderRef,
    feesSummary: feesSummaryRef,
    feesSections: feesSectionsRef,
    feesTotal: feesTotalRef,
  };

  const scrollViewRef = useRef(null);

  const getElementRect = (key, borderRadius = 20) => {
    const ref = refs[key];
    if (ref?.current && typeof ref.current.measureInWindow === "function") {
      return new Promise((resolve) => {
        ref.current.measureInWindow((x, y, w, h) => {
          if (w > 0 && h > 0)
            resolve({ x, y, width: w, height: h, borderRadius });
          else resolve(null);
        });
      });
    }
    return Promise.resolve(null);
  };

  const scrollToElement = (y) => {
    scrollViewRef.current?.scrollTo({ y, animated: true });
  };

  const pulseAnim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (loading) {
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
      pulseAnim.stopAnimation();
      pulseAnim.setValue(1);
    }
  }, [loading]);

  useFocusEffect(
    useCallback(() => {
      if (!token) return;
      loadFees();
    }, [token]),
  );

  const loadFees = async () => {
    try {
      const AsyncStorage =
        require("@react-native-async-storage/async-storage").default;
      const storedToken = await AsyncStorage.getItem("@token");
      if (storedToken)
        api.defaults.headers.Authorization = `Bearer ${storedToken}`;
      const [breakdownRes, examPeriodRes] = await Promise.all([
        api.get("/fees/breakdown"),
        api.get("/exam-period/current").catch(() => ({ data: {} })),
      ]);
      setBreakdown(breakdownRes.data.breakdown);
      setExamPeriod(examPeriodRes.data);
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
      <Modal visible={loading} transparent animationType="fade">
        <View style={styles.loadingOverlay}>
          <BlurView
            intensity={40}
            tint="dark"
            style={StyleSheet.absoluteFill}
          />
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
        </View>
      </Modal>
    );
  }

  const hasFees =
    [
      ...(breakdown?.tuition?.fees || []),
      ...(breakdown?.miscellaneous?.fees || []),
      ...(breakdown?.exam?.fees || []),
    ].length > 0;

  // ── Always derive these from current backend values — never trust a cached
  //    remaining_balance, because an admin may have edited fee amounts after
  //    the student paid. grand_total always reflects current fee amounts.
  const totalDue = parseFloat(breakdown?.grand_total || 0);
  const totalPaid = parseFloat(breakdown?.total_paid || 0);

  // Recompute locally so both the summary card and the grand total card
  // always show the same number from the same source of truth.
  const remainingBalance = Math.max(totalDue - totalPaid, 0);

  // ── Summary card content ─────────────────────────────────────────────────
  let summaryLabel = "Remaining Balance";
  let summaryAmount = `₱${remainingBalance.toLocaleString()}`;
  let summaryIcon = "wallet-outline";
  let summaryColor = colors.brand;

  if (!hasFees) {
    summaryLabel = "No Fees";
    summaryAmount = "Not Available";
    summaryIcon = "alert-circle-outline";
    summaryColor = "#f97316";
  } else if (hasFees && totalDue > 0 && remainingBalance <= 0) {
    // Only show "Fully Paid" when there are actual fees AND nothing is owed.
    // This prevents a false "Fully Paid" when fees were raised after payment.
    summaryLabel = "Payment Status";
    summaryAmount = "Fully Paid";
    summaryIcon = "checkmark-circle";
    summaryColor = "#4caf50";
  }

  const epName = examPeriod?.exam_period;
  const epColor = epName
    ? epName.toLowerCase().includes("prelim")
      ? "#818cf8"
      : epName.toLowerCase().includes("midterm")
        ? "#f59e0b"
        : epName.toLowerCase().includes("semi")
          ? "#f97316"
          : epName.toLowerCase().includes("final")
            ? "#22c55e"
            : "rgba(255,255,255,0.7)"
    : "rgba(255,255,255,0.5)";

  return (
    <>
      <ScrollView
        ref={scrollViewRef}
        style={[styles.container, { backgroundColor: colors.background }]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.brand}
          />
        }
      >
        {/* ── Header ── */}
        <LinearGradient
          ref={feesHeaderRef}
          collapsable={false}
          colors={[colors.gradientStart, colors.gradientEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerGradient}
        >
          <View style={styles.headerRow}>
            <Text style={styles.headerTitle}>School Fees</Text>
            {hasFees && (
              <TouchableOpacity
                style={styles.payButton}
                onPress={() => navigation.navigate("Payment")}
                activeOpacity={0.8}
              >
                <Ionicons name="card-outline" size={20} color="#fff" />
                <Text style={styles.payButtonText}>Pay</Text>
              </TouchableOpacity>
            )}
          </View>
          <View style={styles.headerMeta}>
            {epName ? (
              <View
                style={[
                  styles.epPill,
                  {
                    backgroundColor: `${epColor}30`,
                    borderColor: `${epColor}60`,
                  },
                ]}
              >
                <Ionicons
                  name="time-outline"
                  size={12}
                  color={epColor}
                  style={{ marginRight: 4 }}
                />
                <Text style={[styles.epPillText, { color: epColor }]}>
                  {epName}
                </Text>
                {examPeriod?.semester && (
                  <Text style={[styles.epPillSep, { color: epColor }]}>
                    {" · "}
                    {examPeriod.semester}
                  </Text>
                )}
              </View>
            ) : (
              <Text style={styles.headerSubtitle}>Current Academic Year</Text>
            )}
            {examPeriod?.school_year && (
              <Text style={styles.headerSchoolYear}>
                {examPeriod.school_year}
              </Text>
            )}
          </View>
        </LinearGradient>

        {/* ── Summary Card ── */}
        <View
          ref={feesSummaryRef}
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
            <Text
              style={[styles.summaryLabel, { color: colors.textSecondary }]}
            >
              {summaryLabel}
            </Text>
            <Text style={[styles.summaryAmount, { color: summaryColor }]}>
              {summaryAmount}
            </Text>
          </View>
          {hasFees && (
            <View
              style={[
                styles.grandTotalPill,
                {
                  backgroundColor: colors.surfaceSecondary ?? colors.background,
                },
              ]}
            >
              <Text
                style={[styles.grandTotalLabel, { color: colors.textMuted }]}
              >
                Total
              </Text>
              <Text
                style={[styles.grandTotalValue, { color: colors.textPrimary }]}
              >
                ₱{totalDue.toLocaleString()}
              </Text>
            </View>
          )}
        </View>

        {!epName && hasFees && (
          <View
            style={[
              styles.warningBanner,
              { backgroundColor: "#fef9c3", borderColor: "#fde047" },
            ]}
          >
            <Ionicons
              name="information-circle-outline"
              size={16}
              color="#ca8a04"
            />
            <Text style={styles.warningText}>
              No exam period is currently active. Showing semester-wide fees
              only.
            </Text>
          </View>
        )}

        {/* ── Fee Sections ── */}
        {hasFees ? (
          <>
            <View ref={refs.feesSections} collapsable={false}>
              {breakdown?.tuition?.fees?.length > 0 && (
                <FeeSection
                  title="Tuition Fees"
                  icon="school-outline"
                  iconBg={colors.brand}
                  iconColor="#fff"
                  fees={breakdown.tuition.fees}
                  subtotal={breakdown.tuition.total}
                  colors={colors}
                />
              )}
              {breakdown?.miscellaneous?.fees?.length > 0 && (
                <FeeSection
                  title="Miscellaneous Fees"
                  icon="document-text-outline"
                  iconBg="rgb(244, 180, 20)"
                  iconColor="#0f3c91"
                  fees={breakdown.miscellaneous.fees}
                  subtotal={breakdown.miscellaneous.total}
                  colors={colors}
                />
              )}
              {breakdown?.exam?.fees?.length > 0 && (
                <FeeSection
                  title="Exam Fees"
                  icon="create-outline"
                  iconBg={colors.brand}
                  iconColor="#fff"
                  fees={breakdown.exam.fees}
                  subtotal={breakdown.exam.total}
                  colors={colors}
                />
              )}
            </View>

            {/* ── Grand Total ── */}
            <View ref={refs.feesTotal} collapsable={false}>
              <View
                style={[
                  styles.grandTotalCard,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                ]}
              >
                <View style={styles.grandTotalRow}>
                  <Text
                    style={[
                      styles.grandTotalFooterLabel,
                      { color: colors.textSecondary },
                    ]}
                  >
                    Grand Total
                  </Text>
                  <Text
                    style={[
                      styles.grandTotalFooterValue,
                      { color: colors.brand },
                    ]}
                  >
                    ₱{totalDue.toLocaleString()}
                  </Text>
                </View>
                <View style={styles.grandTotalRow}>
                  <Text
                    style={[
                      styles.grandTotalFooterLabel,
                      { color: colors.textSecondary },
                    ]}
                  >
                    Total Paid
                  </Text>
                  <Text
                    style={[styles.grandTotalFooterValue, { color: "#22c55e" }]}
                  >
                    ₱{totalPaid.toLocaleString()}
                  </Text>
                </View>
                <View
                  style={[
                    styles.grandTotalDivider,
                    { borderColor: colors.border },
                  ]}
                />
                <View style={styles.grandTotalRow}>
                  <Text
                    style={[
                      styles.grandTotalFooterLabel,
                      { color: colors.textPrimary, fontWeight: "700" },
                    ]}
                  >
                    Balance Due
                  </Text>
                  <Text
                    style={[
                      styles.grandTotalFooterValue,
                      {
                        color: remainingBalance === 0 ? "#22c55e" : "#ef4444",
                        fontSize: 20,
                      },
                    ]}
                  >
                    ₱{remainingBalance.toLocaleString()}
                  </Text>
                </View>
              </View>
            </View>
          </>
        ) : (
          <View style={styles.emptyContainer}>
            <Ionicons
              name="receipt-outline"
              size={60}
              color={colors.textMuted}
            />
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              {epName
                ? `No fees set for ${epName} this semester.`
                : "No fees have been set for this semester."}
            </Text>
          </View>
        )}

        <View style={{ height: 30 }} />
      </ScrollView>

      {/* ── Onboarding Guide ── */}
      <OnboardingGuide
        screen="fees"
        userId={user?.id}
        getElementRect={getElementRect}
        scrollToElement={scrollToElement}
      />
    </>
  );
}

function FeeSection({
  title,
  icon,
  iconBg,
  iconColor,
  fees,
  subtotal,
  colors,
}) {
  return (
    <View
      style={[
        styles.section,
        { backgroundColor: colors.surface, borderColor: colors.borderLight },
      ]}
    >
      <View
        style={[styles.sectionHeader, { borderBottomColor: colors.border }]}
      >
        <View style={[styles.iconCircle, { backgroundColor: iconBg }]}>
          <Ionicons name={icon} size={22} color={iconColor} />
        </View>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
          {title}
        </Text>
      </View>
      {fees.map((fee) => (
        <View
          key={fee.id}
          style={[styles.feeItem, { borderBottomColor: colors.borderLight }]}
        >
          <View style={styles.feeNameWrap}>
            <Text style={[styles.feeName, { color: colors.textSecondary }]}>
              {fee.name}
            </Text>
            {fee.exam_period && (
              <View style={styles.feePeriodTag}>
                <Ionicons name="time-outline" size={10} color="#c2410c" />
                <Text style={styles.feePeriodTagText}>{fee.exam_period}</Text>
              </View>
            )}
          </View>
          <Text style={[styles.feeAmount, { color: colors.brand }]}>
            ₱{parseFloat(fee.amount).toLocaleString()}
          </Text>
        </View>
      ))}
      <View style={[styles.subtotalRow, { borderTopColor: colors.border }]}>
        <Text style={[styles.subtotalLabel, { color: colors.textPrimary }]}>
          Subtotal
        </Text>
        <Text style={[styles.subtotalAmount, { color: colors.brand }]}>
          ₱{parseFloat(subtotal || 0).toLocaleString()}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingOverlay: { flex: 1, justifyContent: "center", alignItems: "center" },
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
  loadingLogo: { width: "100%", height: "100%" },
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
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  headerTitle: { fontSize: 28, fontWeight: "bold", color: "#fff" },
  payButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 30,
    gap: 6,
  },
  payButtonText: { color: "#fff", fontSize: 14, fontWeight: "600" },
  headerMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
  },
  headerSubtitle: { fontSize: 15, color: "rgba(255,255,255,0.85)" },
  headerSchoolYear: {
    fontSize: 12,
    color: "rgba(255,255,255,0.55)",
    fontWeight: "500",
  },
  epPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
  },
  epPillText: { fontSize: 12, fontWeight: "700", letterSpacing: 0.3 },
  epPillSep: { fontSize: 12, fontWeight: "500" },
  warningBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 20,
    marginTop: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  warningText: { flex: 1, fontSize: 12, color: "#92400e", lineHeight: 17 },
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
  summaryAmount: { fontSize: 26, fontWeight: "bold" },
  grandTotalPill: {
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    marginLeft: 8,
  },
  grandTotalLabel: { fontSize: 10, fontWeight: "500", marginBottom: 2 },
  grandTotalValue: { fontSize: 14, fontWeight: "700" },
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
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  feeNameWrap: { flex: 1, marginRight: 8 },
  feeName: { fontSize: 15 },
  feePeriodTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    marginTop: 3,
    alignSelf: "flex-start",
    backgroundColor: "rgba(234,88,12,0.1)",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
  },
  feePeriodTagText: { fontSize: 10, color: "#c2410c", fontWeight: "600" },
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
  grandTotalCard: {
    marginHorizontal: 20,
    marginTop: 20,
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 4,
  },
  grandTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
  },
  grandTotalDivider: { borderTopWidth: 1, marginVertical: 8 },
  grandTotalFooterLabel: { fontSize: 15, color: "#64748b" },
  grandTotalFooterValue: { fontSize: 16, fontWeight: "700" },
  emptyContainer: { alignItems: "center", marginTop: 50, marginBottom: 30 },
  emptyText: {
    fontSize: 16,
    marginTop: 12,
    textAlign: "center",
    paddingHorizontal: 30,
  },
});
