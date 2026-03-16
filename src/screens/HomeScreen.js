import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRoute } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { useCallback, useContext, useEffect, useRef, useState } from "react";
import {
  Alert,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { AuthContext } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";
import api from "../services/api";

export default function HomeScreen({ navigation }) {
  useEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  const { user } = useContext(AuthContext);
  const { colors } = useTheme();

  const [profile, setProfile] = useState(null);
  const [clearance, setClearance] = useState(null);
  const [breakdown, setBreakdown] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const route = useRoute();
  const scrollViewRef = useRef(null);
  const [scrollViewWidth, setScrollViewWidth] = useState(0);
  const [contentWidth, setContentWidth] = useState(0);

  const loadData = useCallback(async () => {
    try {
      const [profileRes, clearanceRes, breakdownRes, unreadRes] =
        await Promise.all([
          api.get("/student/profile"),
          api.get("/clearance"),
          api.get("/fees/breakdown"),
          api.get("/notifications/unread-count"),
        ]);
      setProfile(profileRes.data);
      setClearance(clearanceRes.data);
      setBreakdown(breakdownRes.data.breakdown);
      setUnreadCount(unreadRes.data.count);
    } catch (error) {
      console.error("Error loading data:", error);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData]),
  );
  useFocusEffect(
    useCallback(() => {
      const interval = setInterval(loadData, 5000);
      return () => clearInterval(interval);
    }, [loadData]),
  );
  useFocusEffect(
    useCallback(() => {
      if (route.params?.paymentSuccess) {
        Alert.alert("Success", "Paid Successfully ✅");
        loadData();
        navigation.setParams({ paymentSuccess: false });
      }
    }, [route.params?.paymentSuccess, loadData, navigation]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const hasFees =
    [
      ...(breakdown?.tuition?.fees || []),
      ...(breakdown?.miscellaneous?.fees || []),
      ...(breakdown?.exam?.fees || []),
    ].length > 0;

  const totalDue = breakdown?.grand_total || 0;
  const totalPaid = breakdown?.total_paid || 0;
  const remainingBalance = hasFees
    ? (breakdown?.remaining_balance ?? Math.max(totalDue - totalPaid, 0))
    : 0;

  let feeStatusText = "";
  let feeStatusColor = colors.textSecondary;
  if (!hasFees) {
    feeStatusText = "No fees available";
    feeStatusColor = "#f97316";
  } else if (remainingBalance === 0) {
    feeStatusText = "Fully Paid";
    feeStatusColor = "#4caf50";
  } else {
    feeStatusText = `₱${remainingBalance.toLocaleString()} remaining`;
    feeStatusColor = colors.textSecondary;
  }

  useEffect(() => {
    if (contentWidth === 0 || scrollViewWidth === 0) return;
    const maxOffset = contentWidth - scrollViewWidth;
    if (maxOffset <= 0) return;
    let direction = 1,
      currentOffset = 0,
      timeoutId;
    const step = 5,
      moveDelay = 50,
      pauseDelay = 1000;
    const move = () => {
      let nextOffset = currentOffset + direction * step;
      if (nextOffset >= maxOffset) {
        nextOffset = maxOffset;
        timeoutId = setTimeout(() => {
          direction = -1;
          move();
        }, pauseDelay);
      } else if (nextOffset <= 0) {
        nextOffset = 0;
        timeoutId = setTimeout(() => {
          direction = 1;
          move();
        }, pauseDelay);
      }
      currentOffset = nextOffset;
      scrollViewRef.current?.scrollTo({ x: currentOffset, animated: true });
      if (nextOffset > 0 && nextOffset < maxOffset)
        timeoutId = setTimeout(move, moveDelay);
    };
    timeoutId = setTimeout(move, moveDelay);
    return () => clearTimeout(timeoutId);
  }, [contentWidth, scrollViewWidth]);

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
        <View style={styles.overlayPattern} />
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.greeting}>{user?.name}</Text>
            <Text style={styles.studentNo}>
              {profile?.student_no || "Loading..."}
            </Text>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity
              onPress={() => navigation.navigate("Notifications")}
              style={styles.notificationBadge}
            >
              <Ionicons name="notifications-outline" size={28} color="white" />
              {unreadCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => navigation.navigate("Profile")}
              style={styles.profileBadge}
            >
              {profile?.profile_picture ? (
                <Image
                  source={{ uri: profile.profile_picture }}
                  style={styles.profileImage}
                />
              ) : (
                <Ionicons
                  name="person-circle"
                  size={50}
                  color="rgba(255,255,255,0.9)"
                />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>

      {/* Clearance Card */}
      <View
        style={[
          styles.clearanceCard,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
      >
        <View style={styles.clearanceInner}>
          <View
            style={[
              styles.clearanceIconContainer,
              { backgroundColor: colors.surfaceSecondary },
            ]}
          >
            <Ionicons
              name={
                !hasFees
                  ? "information-circle"
                  : clearance?.status === "cleared"
                    ? "checkmark-circle"
                    : "alert-circle"
              }
              size={48}
              color={
                !hasFees
                  ? colors.textMuted
                  : clearance?.status === "cleared"
                    ? "#4caf50"
                    : "rgb(244,180,20)"
              }
            />
          </View>
          <View style={styles.clearanceInfo}>
            <Text
              style={[styles.clearanceTitle, { color: colors.textSecondary }]}
            >
              Exam Clearance
            </Text>
            {hasFees ? (
              <Text
                style={[
                  styles.clearanceStatus,
                  {
                    color:
                      clearance?.status === "cleared"
                        ? "#4caf50"
                        : "rgb(244,180,20)",
                  },
                ]}
              >
                {clearance?.status === "cleared" ? "CLEARED" : "PENDING"}
              </Text>
            ) : (
              <Text
                style={[styles.clearanceStatus, { color: colors.textMuted }]}
              >
                NO FEES
              </Text>
            )}
          </View>
        </View>
      </View>

      {/* Summary Cards */}
      <View style={styles.summaryCardsContainer}>
        <ScrollView
          ref={scrollViewRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.summaryCardsScroll}
          onLayout={(e) => setScrollViewWidth(e.nativeEvent.layout.width)}
          onContentSizeChange={(w) => setContentWidth(w)}
        >
          <LinearGradient
            colors={[colors.gradientStart, colors.gradientEnd]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.summaryCard}
          >
            <View style={styles.summaryIconCircle}>
              <Ionicons name="cash-outline" size={24} color="#0f3c91" />
            </View>
            <Text style={styles.summaryLabel}>Total Fees</Text>
            <Text style={styles.summaryValue}>
              ₱{totalDue.toLocaleString()}
            </Text>
          </LinearGradient>

          <LinearGradient
            colors={[colors.gradientStart, colors.gradientEnd]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.summaryCard}
          >
            <View style={styles.summaryIconCircle}>
              <Ionicons name="checkmark-circle" size={24} color="#0f3c91" />
            </View>
            <Text style={styles.summaryLabel}>Total Paid</Text>
            <Text style={styles.summaryValue}>
              ₱{Math.round(totalPaid).toLocaleString()}
            </Text>
          </LinearGradient>

          <LinearGradient
            colors={
              remainingBalance === 0
                ? ["#4caf50", "#2e7d32"]
                : ["#f97316", "#ea580c"]
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.summaryCard}
          >
            <View style={styles.summaryIconCircle}>
              <Ionicons
                name={remainingBalance === 0 ? "happy" : "alert-circle"}
                size={24}
                color={remainingBalance === 0 ? "#4caf50" : "#f97316"}
              />
            </View>
            <Text style={styles.summaryLabel}>Remaining</Text>
            <Text style={styles.summaryValue}>
              {hasFees ? `₱${remainingBalance.toLocaleString()}` : "—"}
            </Text>
          </LinearGradient>
        </ScrollView>
      </View>

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <Text style={[styles.sectionTitle, { color: colors.brand }]}>
          Quick Actions
        </Text>

        {[
          {
            bg: "rgb(244,180,20)",
            icon: "chatbubble-ellipses-outline",
            iconColor: "#0f3c91",
            title: "UniBot",
            subtitle: "Ask about the app",
            screen: "Chatbot",
            subtitleColor: colors.textSecondary,
          },
          {
            bg: colors.brand,
            icon: "cash-outline",
            iconColor: "#fff",
            title: "View Fees",
            subtitle: feeStatusText,
            screen: "Fees",
            subtitleColor: feeStatusColor,
          },
          {
            bg: "rgb(244,180,20)",
            icon: "card-outline",
            iconColor: "#0f3c91",
            title: "Pay Fees",
            subtitle: "Pay via GCash",
            screen: "Payment",
            subtitleColor: colors.textSecondary,
          },
          {
            bg: colors.brand,
            icon: "time-outline",
            iconColor: "#fff",
            title: "Payment History",
            subtitle: "View transactions",
            screen: "PaymentHistory",
            subtitleColor: colors.textSecondary,
          },
        ].map(
          ({ bg, icon, iconColor, title, subtitle, screen, subtitleColor }) => (
            <TouchableOpacity
              key={title}
              style={[
                styles.actionCard,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.borderLight,
                },
              ]}
              onPress={() => navigation.navigate(screen)}
              activeOpacity={0.8}
            >
              <View style={[styles.iconCircle, { backgroundColor: bg }]}>
                <Ionicons name={icon} size={26} color={iconColor} />
              </View>
              <View style={styles.actionInfo}>
                <Text
                  style={[styles.actionTitle, { color: colors.textPrimary }]}
                >
                  {title}
                </Text>
                <Text style={[styles.actionSubtitle, { color: subtitleColor }]}>
                  {subtitle}
                </Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={24}
                color={colors.textMuted}
              />
            </TouchableOpacity>
          ),
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
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
    position: "relative",
    overflow: "hidden",
  },
  overlayPattern: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(255,255,255,0.05)",
    transform: [{ rotate: "5deg" }, { scale: 1.5 }],
  },
  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    zIndex: 2,
  },
  greeting: {
    fontSize: 26,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 4,
  },
  studentNo: { fontSize: 16, color: "rgba(255,255,255,0.9)" },
  headerRight: { flexDirection: "row", alignItems: "center" },
  notificationBadge: { marginRight: 15, padding: 5, position: "relative" },
  badge: {
    position: "absolute",
    top: -5,
    right: -5,
    backgroundColor: "#ff3b30",
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 3,
  },
  badgeText: { color: "white", fontSize: 10, fontWeight: "bold" },
  profileBadge: {
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 35,
    padding: 5,
  },
  profileImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: "rgb(244,180,20)",
  },
  clearanceCard: {
    marginTop: -20,
    marginHorizontal: 20,
    borderRadius: 24,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 10,
    borderWidth: 1,
  },
  clearanceInner: { flexDirection: "row", alignItems: "center" },
  clearanceIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  clearanceInfo: { flex: 1 },
  clearanceTitle: { fontSize: 16, marginBottom: 4 },
  clearanceStatus: { fontSize: 28, fontWeight: "700" },
  summaryCardsContainer: { marginTop: 20, marginBottom: 10 },
  summaryCardsScroll: { paddingHorizontal: 20, gap: 12 },
  summaryCard: {
    width: 140,
    height: 130,
    borderRadius: 20,
    padding: 16,
    justifyContent: "space-between",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  summaryIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: "rgba(255,255,255,0.9)",
    fontWeight: "500",
  },
  summaryValue: { fontSize: 18, fontWeight: "bold", color: "#fff" },
  quickActions: { padding: 20 },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 18,
    letterSpacing: -0.3,
  },
  actionCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 20,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
  },
  iconCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  actionInfo: { flex: 1, marginLeft: 16 },
  actionTitle: { fontSize: 17, fontWeight: "600", marginBottom: 2 },
  actionSubtitle: { fontSize: 14 },
});
