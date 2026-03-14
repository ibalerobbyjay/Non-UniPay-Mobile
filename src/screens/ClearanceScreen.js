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
import api from "../services/api";

export default function ClearanceScreen({ navigation }) {
  useEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  const { user } = useContext(AuthContext);

  const [clearance, setClearance] = useState(null);
  const [breakdown, setBreakdown] = useState(null);
  const [currentExamPeriod, setCurrentExamPeriod] = useState(null);
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
        api.get("/current-exam-period"),
      ]);

      setClearance(clearanceRes.data);
      setBreakdown(breakdownRes.data.breakdown);
      setCurrentExamPeriod(examPeriodRes.data.exam_period);
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
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0f3c91" />
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

  let statusIcon = "help-circle";
  let iconColor = "#94a3b8";
  let statusText = "";
  let statusMessage = "";
  let backgroundColor = "#f8fafc";

  if (!hasFees) {
    statusIcon = "information-circle";
    iconColor = "#64748b";
    backgroundColor = "#f1f5f9";
    statusMessage =
      "No fees are set for this semester. Please contact the administrator.";
  } else if (isCleared) {
    statusIcon = "checkmark-circle";
    iconColor = "#4caf50";
    backgroundColor = "#f0fdf4";
    statusText = "CLEARED";
    statusMessage = "You are cleared to take examinations";
  } else {
    statusIcon = "alert-circle";
    iconColor = "rgb(244, 180, 20)";
    backgroundColor = "#fffbeb";
    statusText = "PENDING";
    statusMessage = "Please settle your fees to get clearance";
  }

  const firstFee =
    breakdown?.tuition?.fees?.[0] ||
    breakdown?.miscellaneous?.fees?.[0] ||
    breakdown?.exam?.fees?.[0];
  const schoolYear = firstFee?.school_year || "N/A";
  const semester = firstFee?.semester || "N/A";

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
        <Text style={styles.headerTitle}>Exam Clearance</Text>
      </LinearGradient>

      {/* Status Card */}
      <View style={[styles.statusCard, { backgroundColor }]}>
        <View style={[styles.statusIconContainer, { borderColor: iconColor }]}>
          <Ionicons name={statusIcon} size={64} color={iconColor} />
        </View>
        {statusText ? (
          <Text style={[styles.statusText, { color: iconColor }]}>
            {statusText}
          </Text>
        ) : null}
        <Text style={styles.statusMessage}>{statusMessage}</Text>
      </View>

      {/* Clearance Details Card */}
      <View style={styles.detailsCard}>
        <Text style={styles.detailsTitle}>Clearance Details</Text>

        <View style={styles.detailRow}>
          <Ionicons name="person-outline" size={22} color="#0f3c91" />
          <View style={styles.detailTextContainer}>
            <Text style={styles.detailLabel}>Student Name</Text>
            <Text style={styles.detailValue}>{user?.name || "N/A"}</Text>
          </View>
        </View>

        <View style={styles.detailRow}>
          <Ionicons name="calendar-outline" size={22} color="#0f3c91" />
          <View style={styles.detailTextContainer}>
            <Text style={styles.detailLabel}>School Year</Text>
            <Text style={styles.detailValue}>{schoolYear}</Text>
          </View>
        </View>

        <View style={styles.detailRow}>
          <Ionicons name="book-outline" size={22} color="#0f3c91" />
          <View style={styles.detailTextContainer}>
            <Text style={styles.detailLabel}>Semester</Text>
            <Text style={styles.detailValue}>{semester}</Text>
          </View>
        </View>

        {currentExamPeriod && (
          <View style={styles.detailRow}>
            <Ionicons name="timer-outline" size={22} color="#0f3c91" />
            <View style={styles.detailTextContainer}>
              <Text style={styles.detailLabel}>Exam Period</Text>
              <Text style={styles.detailValue}>{currentExamPeriod}</Text>
            </View>
          </View>
        )}

        {clearance?.cleared_at && (
          <View style={styles.detailRow}>
            <Ionicons name="checkmark-done-outline" size={22} color="#4caf50" />
            <View style={styles.detailTextContainer}>
              <Text style={styles.detailLabel}>Cleared On</Text>
              <Text style={styles.detailValue}>
                {new Date(clearance.cleared_at).toLocaleDateString()}
              </Text>
            </View>
          </View>
        )}
      </View>

      {/* ── Note Card: Pending ── */}
      {hasFees && !isCleared && (
        <View
          style={[
            styles.noteCard,
            { borderColor: "rgb(244, 180, 20)", backgroundColor: "#fffbeb" },
          ]}
        >
          <View style={[styles.noteIconWrap, { backgroundColor: "#fef3c7" }]}>
            <Ionicons name="warning" size={20} color="rgb(244, 180, 20)" />
          </View>
          <View style={styles.noteBody}>
            <Text style={[styles.noteTitle, { color: "#92400e" }]}>
              Action Required
            </Text>
            <Text style={[styles.noteText, { color: "#92400e" }]}>
              To get your clearance, please pay your school fees through the
              Payment section.
            </Text>
            {breakdown?.remaining_balance > 0 && (
              <View style={[styles.notePill, { backgroundColor: "#fde68a" }]}>
                <Ionicons name="cash-outline" size={13} color="#92400e" />
                <Text style={[styles.notePillText, { color: "#92400e" }]}>
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
            { borderColor: "#86efac", backgroundColor: "#f0fdf4" },
          ]}
        >
          <View style={[styles.noteIconWrap, { backgroundColor: "#dcfce7" }]}>
            <Ionicons name="shield-checkmark" size={20} color="#16a34a" />
          </View>
          <View style={styles.noteBody}>
            <Text style={[styles.noteTitle, { color: "#15803d" }]}>
              You're All Set!
            </Text>
            <Text style={[styles.noteText, { color: "#166534" }]}>
              Your fees are fully settled. You are officially cleared to take
              your examinations this semester.
            </Text>
            {clearance?.cleared_at && (
              <View style={[styles.notePill, { backgroundColor: "#bbf7d0" }]}>
                <Ionicons name="checkmark-circle" size={13} color="#15803d" />
                <Text style={[styles.notePillText, { color: "#15803d" }]}>
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
            { borderColor: "#cbd5e1", backgroundColor: "#f8fafc" },
          ]}
        >
          <View style={[styles.noteIconWrap, { backgroundColor: "#f1f5f9" }]}>
            <Ionicons name="receipt-outline" size={20} color="#64748b" />
          </View>
          <View style={styles.noteBody}>
            <Text style={[styles.noteTitle, { color: "#475569" }]}>
              No Fees Assigned
            </Text>
            <Text style={[styles.noteText, { color: "#64748b" }]}>
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
  container: { flex: 1, backgroundColor: "#f8fafc" },
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
    shadowColor: "#0f3c91",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#fff",
  },
  statusCard: {
    marginTop: -20,
    marginHorizontal: 20,
    padding: 24,
    borderRadius: 24,
    alignItems: "center",
    shadowColor: "#0f3c91",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 10,
    borderWidth: 1,
    borderColor: "rgba(15,60,145,0.1)",
  },
  statusIconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "#fff",
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
  statusText: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 8,
  },
  statusMessage: {
    fontSize: 16,
    color: "#475569",
    textAlign: "center",
    lineHeight: 22,
  },
  detailsCard: {
    backgroundColor: "#fff",
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
    borderColor: "#f1f5f9",
  },
  detailsTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0f3c91",
    marginBottom: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  detailTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  detailLabel: {
    fontSize: 14,
    color: "#64748b",
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1e293b",
  },

  // ── Note cards ──
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
  noteBody: {
    flex: 1,
    gap: 6,
  },
  noteTitle: {
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 2,
  },
  noteText: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "400",
  },
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
  notePillText: {
    fontSize: 12,
    fontWeight: "600",
  },
});
