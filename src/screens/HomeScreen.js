import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRoute } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { useCallback, useContext, useEffect, useRef, useState } from "react";
import {
  Alert,
  Dimensions,
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

const { width } = Dimensions.get("window");
const CARD_WIDTH = width - 40;
const CARD_INTERVAL = CARD_WIDTH + 16;
const AUTO_SWIPE_DELAY = 5000;

// ─── Donut Ring (pure RN — no SVG library) ────────────────────────────────
function DonutRing({ percentage }) {
  const pct = isNaN(percentage) ? 0 : Math.min(Math.max(percentage, 0), 100);
  const size = 76;
  const ring = size;
  const hole = size - 18;
  const deg = (pct / 100) * 360;
  const firstHalfDeg = Math.min(deg, 180);
  const secondHalfDeg = Math.max(deg - 180, 0);

  return (
    <View
      style={{
        width: ring,
        height: ring,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <View
        style={{
          position: "absolute",
          width: ring,
          height: ring,
          borderRadius: ring / 2,
          borderWidth: 9,
          borderColor: "rgba(255,255,255,0.25)",
        }}
      />
      <View
        style={{
          position: "absolute",
          width: ring,
          height: ring,
          borderRadius: ring / 2,
          overflow: "hidden",
        }}
      >
        <View
          style={{
            position: "absolute",
            width: ring,
            height: ring / 2,
            top: 0,
            left: 0,
            overflow: "hidden",
          }}
        >
          <View
            style={{
              width: ring,
              height: ring,
              borderRadius: ring / 2,
              borderWidth: 9,
              borderColor: pct > 0 ? "#fff" : "transparent",
              transform: [{ rotate: `${firstHalfDeg - 180}deg` }],
            }}
          />
        </View>
      </View>
      {deg > 180 && (
        <View
          style={{
            position: "absolute",
            width: ring,
            height: ring,
            borderRadius: ring / 2,
            overflow: "hidden",
          }}
        >
          <View
            style={{
              position: "absolute",
              width: ring,
              height: ring / 2,
              bottom: 0,
              left: 0,
              overflow: "hidden",
            }}
          >
            <View
              style={{
                width: ring,
                height: ring,
                borderRadius: ring / 2,
                borderWidth: 9,
                borderColor: "#fff",
                position: "absolute",
                bottom: 0,
                transform: [{ rotate: `${secondHalfDeg}deg` }],
              }}
            />
          </View>
        </View>
      )}
      <View
        style={{
          width: hole,
          height: hole,
          borderRadius: hole / 2,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text style={styles.ringPct}>{Math.round(pct)}%</Text>
        <Text style={styles.ringSub}>paid</Text>
      </View>
    </View>
  );
}

// ─── Breakdown Bars (Card 2) ───────────────────────────────────────────────
// API shape: breakdown.tuition.total, breakdown.miscellaneous.total, breakdown.exam.total
// breakdown.total_paid is the total amount paid across all categories
function BreakdownBars({ breakdown }) {
  const grandTotal = breakdown?.grand_total || 0;
  const totalPaid = parseFloat(breakdown?.total_paid || 0);

  const categories = [
    { label: "Tuition", total: breakdown?.tuition?.total || 0 },
    { label: "Miscellaneous", total: breakdown?.miscellaneous?.total || 0 },
    { label: "Exam", total: breakdown?.exam?.total || 0 },
  ];

  // Distribute paid amount across categories proportionally (largest first)
  let remaining = totalPaid;
  const withPaid = categories.map((cat) => {
    const catPaid = Math.min(remaining, cat.total);
    remaining = Math.max(remaining - catPaid, 0);
    const pct = cat.total > 0 ? (catPaid / cat.total) * 100 : 0;
    return { ...cat, pct };
  });

  return (
    <View style={styles.barsWrap}>
      {withPaid.map((cat) => (
        <View key={cat.label} style={styles.barRow}>
          <View style={styles.barLabelRow}>
            <Text style={styles.barLabel}>{cat.label}</Text>
            <Text style={styles.barAmt}>₱{cat.total.toLocaleString()}</Text>
          </View>
          <View style={styles.barTrack}>
            <View
              style={[styles.barFill, { width: `${Math.min(cat.pct, 100)}%` }]}
            />
          </View>
        </View>
      ))}
    </View>
  );
}

// ─── Payment Status Card (Card 3) ─────────────────────────────────────────
// Uses breakdown.status ("paid", "partial", "unpaid") + remaining_balance
function PaymentStatus({ breakdown, remainingBalance }) {
  const status = breakdown?.status || "unpaid";
  const grandTotal = breakdown?.grand_total || 0;
  const totalPaid = parseFloat(breakdown?.total_paid || 0);

  const statusConfig = {
    paid: { label: "Fully Paid", icon: "checkmark-circle", color: "#4ade80" },
    partial: { label: "Partial", icon: "time", color: "#fbbf24" },
    unpaid: { label: "Not Paid", icon: "close-circle", color: "#f87171" },
  };
  const cfg = statusConfig[status] || statusConfig.unpaid;

  return (
    <View style={styles.statusWrap}>
      <Ionicons name={cfg.icon} size={28} color={cfg.color} />
      <Text style={[styles.statusLabel, { color: cfg.color }]}>
        {cfg.label}
      </Text>
      <View style={styles.dueDivider} />
      <View style={styles.dueStat}>
        <Text style={styles.dueVal}>
          {grandTotal > 0
            ? `${Math.round((totalPaid / grandTotal) * 100)}%`
            : "0%"}
        </Text>
        <Text style={styles.dueLbl}>of total</Text>
      </View>
    </View>
  );
}

// ─── Main Screen ───────────────────────────────────────────────────────────
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
  const [activeCardIndex, setActiveCardIndex] = useState(0);

  const route = useRoute();
  const cardScrollRef = useRef(null);
  const autoSwipeTimer = useRef(null);
  const currentIndex = useRef(0);
  const direction = useRef(1);
  const isUserScrolling = useRef(false);

  const TOTAL_CARDS = 3;

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

  const startAutoSwipe = useCallback(() => {
    if (autoSwipeTimer.current) clearInterval(autoSwipeTimer.current);
    autoSwipeTimer.current = setInterval(() => {
      if (isUserScrolling.current) return;
      let next = currentIndex.current + direction.current;
      if (next >= TOTAL_CARDS - 1) {
        next = TOTAL_CARDS - 1;
        direction.current = -1;
      } else if (next <= 0) {
        next = 0;
        direction.current = 1;
      }
      cardScrollRef.current?.scrollTo({
        x: next * CARD_INTERVAL,
        animated: true,
      });
      currentIndex.current = next;
      setActiveCardIndex(next);
    }, AUTO_SWIPE_DELAY);
  }, []);

  useEffect(() => {
    startAutoSwipe();
    return () => {
      if (autoSwipeTimer.current) clearInterval(autoSwipeTimer.current);
    };
  }, [startAutoSwipe]);

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
  const totalPaid = parseFloat(breakdown?.total_paid || 0);
  const remainingBalance =
    breakdown?.remaining_balance ?? Math.max(totalDue - totalPaid, 0);
  const paidPercentage = totalDue > 0 ? (totalPaid / totalDue) * 100 : 0;

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

  const handleCardScroll = (event) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / CARD_INTERVAL);
    const clamped = Math.max(0, Math.min(index, TOTAL_CARDS - 1));
    currentIndex.current = clamped;
    setActiveCardIndex(clamped);
  };

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
          ref={cardScrollRef}
          horizontal
          pagingEnabled={false}
          showsHorizontalScrollIndicator={false}
          snapToInterval={CARD_INTERVAL}
          snapToAlignment="center"
          decelerationRate="fast"
          contentContainerStyle={styles.summaryCardsScroll}
          onScroll={handleCardScroll}
          scrollEventThrottle={16}
          onScrollBeginDrag={() => {
            isUserScrolling.current = true;
            if (autoSwipeTimer.current) clearInterval(autoSwipeTimer.current);
          }}
          onScrollEndDrag={() => {
            isUserScrolling.current = false;
            startAutoSwipe();
          }}
          onMomentumScrollEnd={handleCardScroll}
        >
          {/* Card 1 — Total Fees + Donut Ring (% paid) */}
          <LinearGradient
            colors={[colors.gradientStart, colors.gradientEnd]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.summaryCard, { width: CARD_WIDTH }]}
          >
            <View style={styles.cardLeft}>
              <View style={styles.summaryIconCircle}>
                <Ionicons name="cash-outline" size={24} color="#0f3c91" />
              </View>
              <View>
                <Text style={styles.summaryLabel}>Total Fees</Text>
                <Text style={styles.summaryValue}>
                  ₱{totalDue.toLocaleString()}
                </Text>
              </View>
            </View>
            <DonutRing percentage={paidPercentage} />
          </LinearGradient>

          {/* Card 2 — Total Paid + Breakdown Bars */}
          <LinearGradient
            colors={[colors.gradientStart, colors.gradientEnd]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.summaryCard, { width: CARD_WIDTH }]}
          >
            <View style={styles.cardLeft}>
              <View style={styles.summaryIconCircle}>
                <Ionicons name="checkmark-circle" size={24} color="#0f3c91" />
              </View>
              <View>
                <Text style={styles.summaryLabel}>Total Paid</Text>
                <Text style={styles.summaryValue}>
                  ₱{Math.round(totalPaid).toLocaleString()}
                </Text>
              </View>
            </View>
            <BreakdownBars breakdown={breakdown} />
          </LinearGradient>

          {/* Card 3 — Remaining + Payment Status */}
          <LinearGradient
            colors={
              remainingBalance === 0
                ? ["#4caf50", "#2e7d32"]
                : ["#f97316", "#ea580c"]
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.summaryCard, { width: CARD_WIDTH }]}
          >
            <View style={styles.cardLeft}>
              <View style={styles.summaryIconCircle}>
                <Ionicons
                  name={remainingBalance === 0 ? "happy" : "alert-circle"}
                  size={24}
                  color={remainingBalance === 0 ? "#4caf50" : "#f97316"}
                />
              </View>
              <View>
                <Text style={styles.summaryLabel}>Remaining</Text>
                <Text style={styles.summaryValue}>
                  {hasFees ? `₱${remainingBalance.toLocaleString()}` : "—"}
                </Text>
              </View>
            </View>
            <PaymentStatus
              breakdown={breakdown}
              remainingBalance={remainingBalance}
            />
          </LinearGradient>
        </ScrollView>

        {/* Dot indicators */}
        <View style={styles.dotsContainer}>
          {[0, 1, 2].map((index) => (
            <View
              key={index}
              style={[
                styles.dot,
                activeCardIndex === index
                  ? [styles.dotActive, { backgroundColor: colors.brand }]
                  : [styles.dotInactive, { backgroundColor: colors.textMuted }],
              ]}
            />
          ))}
        </View>
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

  summaryCardsContainer: { marginTop: 20, marginBottom: 6 },
  summaryCardsScroll: { paddingHorizontal: 20, gap: 16 },
  summaryCard: {
    height: 150,
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 6,
  },
  cardLeft: { flex: 1, justifyContent: "space-between", height: "100%" },
  summaryIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
  },
  summaryLabel: {
    fontSize: 13,
    color: "rgba(255,255,255,0.85)",
    fontWeight: "500",
  },
  summaryValue: { fontSize: 24, fontWeight: "bold", color: "#fff" },

  // Donut Ring
  ringPct: { fontSize: 15, fontWeight: "800", color: "#fff" },
  ringSub: { fontSize: 9, color: "rgba(255,255,255,0.75)", marginTop: 1 },

  // Breakdown Bars
  barsWrap: { width: 115, gap: 8 },
  barRow: { gap: 3 },
  barLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  barLabel: { fontSize: 9, color: "rgba(255,255,255,0.85)", fontWeight: "600" },
  barAmt: { fontSize: 9, color: "rgba(255,255,255,0.7)" },
  barTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.25)",
    overflow: "hidden",
  },
  barFill: { height: "100%", borderRadius: 3, backgroundColor: "#fff" },

  // Payment Status (Card 3)
  statusWrap: { alignItems: "center", gap: 4 },
  statusLabel: { fontSize: 11, fontWeight: "700" },
  dueStat: { alignItems: "center" },
  dueVal: { fontSize: 16, fontWeight: "800", color: "#fff" },
  dueLbl: { fontSize: 9, color: "rgba(255,255,255,0.7)", marginTop: 1 },
  dueDivider: {
    width: 40,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.25)",
    marginVertical: 2,
  },

  // Dots
  dotsContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 12,
    gap: 6,
  },
  dot: { borderRadius: 4, height: 7 },
  dotActive: { width: 22 },
  dotInactive: { width: 7, opacity: 0.4 },

  // Quick Actions
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
