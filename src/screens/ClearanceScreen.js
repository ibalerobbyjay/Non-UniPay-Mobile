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

export default function ClearanceScreen() {
  const [clearance, setClearance] = useState(null);
  const [profile, setProfile] = useState(null);
  const [breakdown, setBreakdown] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, []),
  );

  const loadData = async () => {
    try {
      const [clearanceRes, profileRes, breakdownRes] = await Promise.all([
        api.get("/clearance"),
        api.get("/student/profile"),
        api.get("/fees/breakdown"),
      ]);

      setClearance(clearanceRes.data);
      setProfile(profileRes.data);
      setBreakdown(breakdownRes.data.breakdown);
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

  // Check if any fees exist
  const hasFees =
    [
      ...(breakdown?.tuition?.fees || []),
      ...(breakdown?.miscellaneous?.fees || []),
      ...(breakdown?.exam?.fees || []),
    ].length > 0;

  // Determine card appearance based on fees existence and clearance status
  let cardStyle = styles.statusCard;
  let iconName = "help-circle";
  let iconColor = "#94a3b8";
  let statusText = "";
  let statusMessage = "";

  if (!hasFees) {
    cardStyle = [styles.statusCard, styles.noFees];
    iconName = "information-circle";
    iconColor = "#64748b";
    statusMessage =
      "No fees are set for this semester. Please contact the administrator.";
  } else if (isCleared) {
    cardStyle = [styles.statusCard, styles.cleared];
    iconName = "checkmark-circle";
    iconColor = "#4caf50";
    statusText = "CLEARED";
    statusMessage = "You are cleared to take examinations";
  } else {
    cardStyle = [styles.statusCard, styles.pending];
    iconName = "alert-circle";
    iconColor = "rgb(244, 180, 20)";
    statusText = "PENDING";
    statusMessage = "Please settle your fees to get clearance";
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
      <LinearGradient
        colors={["#0f3c91", "#1a4da8"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      >
        <Text style={styles.headerTitle}>Exam Clearance</Text>
      </LinearGradient>

      <View style={cardStyle}>
        <View style={styles.statusIconContainer}>
          <Ionicons name={iconName} size={80} color={iconColor} />
        </View>
        {statusText ? (
          <Text style={[styles.statusText, { color: iconColor }]}>
            {statusText}
          </Text>
        ) : null}
        <Text style={styles.statusSubtext}>{statusMessage}</Text>
      </View>

      <View style={styles.infoCard}>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Student Name:</Text>
          <Text style={styles.infoValue}>{profile?.user?.name}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Student No:</Text>
          <Text style={styles.infoValue}>{profile?.student_no}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Course:</Text>
          <Text style={styles.infoValue}>{profile?.course}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Year Level:</Text>
          <Text style={styles.infoValue}>{profile?.year_level}</Text>
        </View>
        {clearance?.exam_period && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Exam Period:</Text>
            <Text style={styles.infoValue}>{clearance.exam_period}</Text>
          </View>
        )}
      </View>

      {hasFees && !isCleared && (
        <View style={styles.noteCard}>
          <Ionicons
            name="information-circle"
            size={28}
            color="rgb(244, 180, 20)"
          />
          <Text style={styles.noteText}>
            To get your clearance, please pay your school fees through the
            Payment section.
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f0f2f5" },
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
  statusCard: {
    backgroundColor: "#fff",
    marginTop: -20,
    marginHorizontal: 20,
    padding: 25,
    borderRadius: 25,
    alignItems: "center",
    shadowColor: "#0f3c91",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 10,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.8)",
  },
  cleared: { borderColor: "#4caf50" },
  pending: { borderColor: "rgb(244, 180, 20)" },
  noFees: { borderColor: "#94a3b8" },
  statusIconContainer: { marginBottom: 15 },
  statusText: {
    fontSize: 32,
    fontWeight: "bold",
    marginBottom: 8,
  },
  statusSubtext: {
    fontSize: 16,
    color: "#64748b",
    textAlign: "center",
    lineHeight: 22,
  },
  infoCard: {
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
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f8f9fa",
  },
  infoLabel: {
    fontSize: 15,
    color: "#64748b",
    fontWeight: "500",
  },
  infoValue: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1e293b",
  },
  noteCard: {
    backgroundColor: "#fff3cd",
    marginHorizontal: 20,
    marginTop: 15,
    marginBottom: 25,
    padding: 16,
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgb(244, 180, 20)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  noteText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    color: "#856404",
    fontWeight: "500",
    lineHeight: 20,
  },
});
