import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { useCallback, useContext, useEffect, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { AuthContext } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";
import api from "../services/api";

export default function ClearanceScreen({ navigation }) {
  useEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  const { user } = useContext(AuthContext);
  const { colors } = useTheme();

  const [clearance, setClearance] = useState(null);
  const [breakdown, setBreakdown] = useState(null);
  const [examPeriodData, setExamPeriodData] = useState(null); // { exam_period, semester, school_year }
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, []),
  );

  const loadData = async () => {
    try {
      const [clearanceRes, breakdownRes, examPeriodRes] = await Promise.all([
        api.get("/clearance"),
        api.get("/fees/breakdown"),
        // Use the same endpoint as HomeScreen for consistency
        api.get("/exam-period/current").catch(() => ({ data: {} })),
      ]);
      setClearance(clearanceRes.data);
      setBreakdown(breakdownRes.data.breakdown);
      setExamPeriodData(examPeriodRes.data); // { exam_period, semester, school_year }
    } catch (error) {
      console.error("Error loading clearance:", error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
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

  const isCleared = clearance?.status === "cleared";
  const hasFees =
    [
      ...(breakdown?.tuition?.fees || []),
      ...(breakdown?.miscellaneous?.fees || []),
      ...(breakdown?.exam?.fees || []),
    ].length > 0;

  const currentExamPeriod = examPeriodData?.exam_period ?? null;
  const currentSemester = examPeriodData?.semester ?? null;
  const currentSchoolYear = examPeriodData?.school_year ?? null;

  let statusIcon = "help-circle";
  let iconColor = colors.textMuted;
  let statusText = "";
  let statusMessage = "";

  if (!hasFees) {
    statusIcon = "information-circle";
    iconColor = colors.textSecondary;
    statusMessage =
      "No fees are set for this semester. Please contact the administrator.";
  } else if (isCleared) {
    statusIcon = "checkmark-circle";
    iconColor = "#4caf50";
    statusText = "CLEARED";
    statusMessage = "You are cleared to take examinations";
  } else {
    statusIcon = "alert-circle";
    iconColor = "rgb(244, 180, 20)";
    statusText = "PENDING";
    statusMessage = "Please settle your fees to get clearance";
  }

  // Prefer data from the exam period API; fall back to first fee's fields
  const firstFee =
    breakdown?.tuition?.fees?.[0] ||
    breakdown?.miscellaneous?.fees?.[0] ||
    breakdown?.exam?.fees?.[0];
  const schoolYear = currentSchoolYear || firstFee?.school_year || "N/A";
  const semester = currentSemester || firstFee?.semester || "N/A";

  const detailRows = [
    ["person-outline", "Student Name", user?.name || "N/A"],
    ["calendar-outline", "School Year", schoolYear],
    ["book-outline", "Semester", semester],
    ...(currentExamPeriod
      ? [["timer-outline", "Exam Period", currentExamPeriod]]
      : []),
    ...(clearance?.cleared_at
      ? [
          [
            "checkmark-done-outline",
            "Cleared On",
            new Date(clearance.cleared_at).toLocaleDateString(),
            "#4caf50",
          ],
        ]
      : []),
  ];

  // Exam period accent color for the header pill
  const epColor = currentExamPeriod
    ? currentExamPeriod.toLowerCase().includes("prelim")
      ? "#818cf8"
      : currentExamPeriod.toLowerCase().includes("midterm")
        ? "#f59e0b"
        : currentExamPeriod.toLowerCase().includes("semi")
          ? "#f97316"
          : currentExamPeriod.toLowerCase().includes("final")
            ? "#22c55e"
            : "rgba(255,255,255,0.7)"
    : null;

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
      {/* ── Gradient Header ── */}
      <LinearGradient
        colors={[colors.gradientStart, colors.gradientEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      >
        <Text style={styles.headerTitle}>Exam Clearance</Text>

        {/* Exam period pill in header */}
        <View style={styles.headerMeta}>
          {currentExamPeriod ? (
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
                {currentExamPeriod}
              </Text>
              {currentSemester && (
                <Text style={[styles.epPillSep, { color: epColor }]}>
                  {" · "}
                  {currentSemester}
                </Text>
              )}
            </View>
          ) : (
            <View style={styles.epPillNone}>
              <Ionicons
                name="time-outline"
                size={12}
                color="rgba(255,255,255,0.5)"
                style={{ marginRight: 4 }}
              />
              <Text style={styles.epPillNoneText}>No exam period set</Text>
            </View>
          )}
          {currentSchoolYear && (
            <Text style={styles.headerSchoolYear}>{currentSchoolYear}</Text>
          )}
        </View>
      </LinearGradient>

      {/* ── Status Card ── */}
      <View
        style={[
          styles.statusCard,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
      >
        <View
          style={[
            styles.statusIconContainer,
            { borderColor: iconColor, backgroundColor: colors.background },
          ]}
        >
          <Ionicons name={statusIcon} size={64} color={iconColor} />
        </View>
        {statusText ? (
          <Text style={[styles.statusText, { color: iconColor }]}>
            {statusText}
          </Text>
        ) : null}
        <Text style={[styles.statusMessage, { color: colors.textSecondary }]}>
          {statusMessage}
        </Text>
      </View>

      {/* ── Clearance Details Card ── */}
      <View
        style={[
          styles.detailsCard,
          { backgroundColor: colors.surface, borderColor: colors.borderLight },
        ]}
      >
        <Text
          style={[
            styles.detailsTitle,
            { color: colors.brand, borderBottomColor: colors.border },
          ]}
        >
          Clearance Details
        </Text>
        {detailRows.map(([icon, label, value, iconOverride], i) => (
          <View
            key={label}
            style={[
              styles.detailRow,
              { borderBottomColor: colors.borderLight },
              i === detailRows.length - 1 && { borderBottomWidth: 0 },
            ]}
          >
            <Ionicons
              name={icon}
              size={22}
              color={iconOverride || colors.brand}
            />
            <View style={styles.detailTextContainer}>
              <Text
                style={[styles.detailLabel, { color: colors.textSecondary }]}
              >
                {label}
              </Text>
              <Text style={[styles.detailValue, { color: colors.textPrimary }]}>
                {value}
              </Text>
            </View>
          </View>
        ))}
      </View>

      {/* ── Fee Summary (balance) ── */}
      {hasFees && (
        <View
          style={[
            styles.balanceCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.borderLight,
            },
          ]}
        >
          <View style={styles.balanceRow}>
            <Text
              style={[styles.balanceLabel, { color: colors.textSecondary }]}
            >
              Grand Total
            </Text>
            <Text style={[styles.balanceValue, { color: colors.textPrimary }]}>
              ₱{(breakdown?.grand_total || 0).toLocaleString()}
            </Text>
          </View>
          <View style={styles.balanceRow}>
            <Text
              style={[styles.balanceLabel, { color: colors.textSecondary }]}
            >
              Total Paid
            </Text>
            <Text style={[styles.balanceValue, { color: "#22c55e" }]}>
              ₱{parseFloat(breakdown?.total_paid || 0).toLocaleString()}
            </Text>
          </View>
          <View
            style={[styles.balanceDivider, { borderColor: colors.border }]}
          />
          <View style={styles.balanceRow}>
            <Text
              style={[
                styles.balanceLabel,
                { color: colors.textPrimary, fontWeight: "700" },
              ]}
            >
              Balance Due
            </Text>
            <Text
              style={[
                styles.balanceValue,
                {
                  color:
                    (breakdown?.remaining_balance ?? 0) === 0
                      ? "#22c55e"
                      : "#ef4444",
                  fontSize: 18,
                },
              ]}
            >
              ₱{(breakdown?.remaining_balance ?? 0).toLocaleString()}
            </Text>
          </View>
        </View>
      )}

      {/* ── Note Card: Pending ── */}
      {hasFees && !isCleared && (
        <View
          style={[
            styles.noteCard,
            {
              borderColor: "rgb(244,180,20)",
              backgroundColor: colors.cooldownBg,
            },
          ]}
        >
          <View
            style={[
              styles.noteIconWrap,
              { backgroundColor: "rgba(244,180,20,0.15)" },
            ]}
          >
            <Ionicons name="warning" size={20} color="rgb(244, 180, 20)" />
          </View>
          <View style={styles.noteBody}>
            <Text style={[styles.noteTitle, { color: colors.cooldownText }]}>
              Action Required
            </Text>
            <Text style={[styles.noteText, { color: colors.cooldownText }]}>
              To get your clearance, please pay your school fees through the
              Payment section.
            </Text>
            {breakdown?.remaining_balance > 0 && (
              <View
                style={[
                  styles.notePill,
                  { backgroundColor: "rgba(244,180,20,0.2)" },
                ]}
              >
                <Ionicons
                  name="cash-outline"
                  size={13}
                  color="rgb(244, 180, 20)"
                />
                <Text
                  style={[styles.notePillText, { color: "rgb(244, 180, 20)" }]}
                >
                  Remaining Balance: ₱
                  {Number(breakdown.remaining_balance).toLocaleString("en-PH", {
                    minimumFractionDigits: 2,
                  })}
                </Text>
              </View>
            )}
          </View>
        </View>
      )}

      {/* ── Note Card: Cleared ── */}
      {hasFees && isCleared && (
        <View
          style={[
            styles.noteCard,
            { borderColor: "#86efac", backgroundColor: colors.surface },
          ]}
        >
          <View
            style={[
              styles.noteIconWrap,
              { backgroundColor: "rgba(34,197,94,0.15)" },
            ]}
          >
            <Ionicons name="shield-checkmark" size={20} color="#16a34a" />
          </View>
          <View style={styles.noteBody}>
            <Text style={[styles.noteTitle, { color: "#16a34a" }]}>
              You're All Set!
            </Text>
            <Text style={[styles.noteText, { color: colors.textSecondary }]}>
              Your fees are fully settled. You are officially cleared to take
              your examinations this semester.
            </Text>
            {clearance?.cleared_at && (
              <View
                style={[
                  styles.notePill,
                  { backgroundColor: "rgba(34,197,94,0.15)" },
                ]}
              >
                <Ionicons name="checkmark-circle" size={13} color="#16a34a" />
                <Text style={[styles.notePillText, { color: "#16a34a" }]}>
                  Cleared on{" "}
                  {new Date(clearance.cleared_at).toLocaleDateString("en-PH", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </Text>
              </View>
            )}
          </View>
        </View>
      )}

      {/* ── Note Card: No Fees ── */}
      {!hasFees && (
        <View
          style={[
            styles.noteCard,
            { borderColor: colors.border, backgroundColor: colors.surface },
          ]}
        >
          <View
            style={[
              styles.noteIconWrap,
              { backgroundColor: colors.borderLight },
            ]}
          >
            <Ionicons
              name="receipt-outline"
              size={20}
              color={colors.textSecondary}
            />
          </View>
          <View style={styles.noteBody}>
            <Text style={[styles.noteTitle, { color: colors.textSecondary }]}>
              No Fees Assigned
            </Text>
            <Text style={[styles.noteText, { color: colors.textMuted }]}>
              No fees have been set for your course this semester. If you
              believe this is an error, please contact the Cashier's Office or
              your school administrator.
            </Text>
          </View>
        </View>
      )}

      <View style={{ height: 30 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },

  // Header
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
    marginBottom: 8,
  },
  headerMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
  },
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
  epPillNone: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  epPillNoneText: { fontSize: 12, color: "rgba(255,255,255,0.5)" },

  // Status Card
  statusCard: {
    marginTop: -20,
    marginHorizontal: 20,
    padding: 24,
    borderRadius: 24,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 10,
    borderWidth: 1,
  },
  statusIconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    borderWidth: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  statusText: { fontSize: 28, fontWeight: "bold", marginBottom: 8 },
  statusMessage: { fontSize: 16, textAlign: "center", lineHeight: 22 },

  // Details Card
  detailsCard: {
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
  detailsTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  detailTextContainer: { flex: 1, marginLeft: 12 },
  detailLabel: { fontSize: 14, marginBottom: 2 },
  detailValue: { fontSize: 16, fontWeight: "600" },

  // Balance Card
  balanceCard: {
    marginHorizontal: 20,
    marginTop: 16,
    padding: 18,
    borderRadius: 18,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 3,
  },
  balanceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 5,
  },
  balanceDivider: { borderTopWidth: 1, marginVertical: 8 },
  balanceLabel: { fontSize: 14 },
  balanceValue: { fontSize: 16, fontWeight: "700" },

  // Note Cards
  noteCard: {
    marginHorizontal: 20,
    marginTop: 16,
    padding: 16,
    borderRadius: 18,
    flexDirection: "row",
    alignItems: "flex-start",
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 3,
    gap: 12,
  },
  noteIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
    marginTop: 1,
  },
  noteBody: { flex: 1, gap: 6 },
  noteTitle: { fontSize: 15, fontWeight: "700", marginBottom: 2 },
  noteText: { fontSize: 14, lineHeight: 20 },
  notePill: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    marginTop: 6,
    gap: 5,
  },
  notePillText: { fontSize: 12, fontWeight: "600" },
});
