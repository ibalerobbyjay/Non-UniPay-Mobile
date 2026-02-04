import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
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
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [clearanceRes, profileRes] = await Promise.all([
        api.get("/clearance"),
        api.get("/student/profile"),
      ]);

      setClearance(clearanceRes.data);
      setProfile(profileRes.data);
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
        <ActivityIndicator size="large" color="#667eea" />
      </View>
    );
  }

  const isCleared = clearance?.status === "cleared";

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Exam Clearance</Text>
      </View>

      <View
        style={[styles.statusCard, isCleared ? styles.cleared : styles.pending]}
      >
        <Ionicons
          name={isCleared ? "checkmark-circle" : "alert-circle"}
          size={100}
          color={isCleared ? "#4caf50" : "#ff9800"}
        />
        <Text style={styles.statusText}>
          {isCleared ? "CLEARED" : "PENDING"}
        </Text>
        <Text style={styles.statusSubtext}>
          {isCleared
            ? "You are cleared to take examinations"
            : "Please settle your fees to get clearance"}
        </Text>
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

      {!isCleared && (
        <View style={styles.noteCard}>
          <Ionicons name="information-circle" size={24} color="#ff9800" />
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
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    backgroundColor: "#667eea",
    padding: 20,
    paddingTop: 60,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#fff",
  },
  statusCard: {
    backgroundColor: "#fff",
    margin: 20,
    padding: 40,
    borderRadius: 15,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cleared: {
    borderWidth: 3,
    borderColor: "#4caf50",
  },
  pending: {
    borderWidth: 3,
    borderColor: "#ff9800",
  },
  statusText: {
    fontSize: 32,
    fontWeight: "bold",
    marginTop: 20,
  },
  statusSubtext: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginTop: 10,
  },
  infoCard: {
    backgroundColor: "#fff",
    marginHorizontal: 20,
    marginBottom: 15,
    padding: 20,
    borderRadius: 10,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  infoLabel: {
    fontSize: 16,
    color: "#666",
  },
  infoValue: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  noteCard: {
    backgroundColor: "#fff3cd",
    margin: 20,
    padding: 15,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
  },
  noteText: {
    flex: 1,
    marginLeft: 10,
    fontSize: 14,
    color: "#856404",
  },
});
