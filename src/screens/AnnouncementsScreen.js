// AnnouncementsScreen.js
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { useCallback, useContext, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  FlatList,
  Modal,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { AuthContext } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";
import api from "../services/api";

// ── Priority helpers ──────────────────────────────────────────────────────
const PRIORITY_META = {
  urgent: {
    color: "#dc3545",
    icon: "alert-circle",
    label: "Urgent",
    emoji: "🚨",
  },
  important: {
    color: "#f4b414",
    icon: "star",
    label: "Important",
    emoji: "⭐",
  },
  normal: {
    color: "#0f3c91",
    icon: "megaphone-outline",
    label: "Normal",
    emoji: "📢",
  },
};

function priorityMeta(p) {
  return PRIORITY_META[p] ?? PRIORITY_META.normal;
}

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function dueDateMeta(dueDateStr) {
  if (!dueDateStr) return null;
  const due = new Date(dueDateStr);
  const now = new Date();
  const diffDays = Math.ceil((due - now) / (1000 * 60 * 60 * 24));
  const isOverdue = due < now;
  const isDueSoon = !isOverdue && diffDays <= 7;
  return {
    isOverdue,
    isDueSoon,
    color: isOverdue ? "#dc3545" : isDueSoon ? "#f4b414" : "#4caf50",
    bg: isOverdue
      ? "rgba(220,53,69,0.12)"
      : isDueSoon
        ? "rgba(244,180,20,0.12)"
        : "rgba(76,175,80,0.12)",
    icon: isOverdue ? "alert-circle-outline" : "calendar-outline",
    label:
      (isOverdue ? "Overdue · " : isDueSoon ? "Due soon · " : "Due · ") +
      due.toLocaleDateString("en-PH", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
  };
}

// ── Detail modal ──────────────────────────────────────────────────────────
function AnnouncementModal({ visible, announcement: a, onClose, colors }) {
  if (!a) return null;
  const meta = priorityMeta(a.priority);
  const ddMeta = dueDateMeta(a.due_date);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={[modalStyles.overlay, { backgroundColor: colors.overlay }]}>
        <View style={[modalStyles.sheet, { backgroundColor: colors.surface }]}>
          {/* Header gradient */}
          <LinearGradient
            colors={[colors.gradientStart, colors.gradientEnd]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={modalStyles.header}
          >
            <View style={{ flex: 1 }}>
              <View style={modalStyles.headerBadgeRow}>
                <View
                  style={[
                    modalStyles.priorityBadge,
                    { backgroundColor: meta.color + "33" },
                  ]}
                >
                  <Ionicons name={meta.icon} size={13} color={meta.color} />
                  <Text
                    style={[
                      modalStyles.priorityBadgeText,
                      { color: meta.color },
                    ]}
                  >
                    {meta.label}
                  </Text>
                </View>
                <View style={modalStyles.audienceBadge}>
                  <Ionicons
                    name="people-outline"
                    size={13}
                    color="rgba(255,255,255,0.85)"
                  />
                  <Text style={modalStyles.audienceBadgeText}>
                    {audienceLabel(a)}
                  </Text>
                </View>
              </View>
              <Text style={modalStyles.headerTitle}>{a.title}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={modalStyles.closeBtn}>
              <Ionicons name="close" size={20} color="#fff" />
            </TouchableOpacity>
          </LinearGradient>

          {/* Meta row */}
          <View
            style={[modalStyles.metaRow, { borderBottomColor: colors.border }]}
          >
            <View style={modalStyles.metaItem}>
              <Ionicons
                name="person-circle-outline"
                size={16}
                color={colors.brand}
              />
              <Text
                style={[modalStyles.metaText, { color: colors.textSecondary }]}
              >
                {a.creator?.name ?? "Admin"}
              </Text>
            </View>
            <View style={modalStyles.metaItem}>
              <Ionicons name="time-outline" size={16} color={colors.brand} />
              <Text
                style={[modalStyles.metaText, { color: colors.textSecondary }]}
              >
                {new Date(a.created_at).toLocaleDateString("en-PH", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </Text>
            </View>
            {ddMeta && (
              <View style={modalStyles.metaItem}>
                <Ionicons name={ddMeta.icon} size={16} color={ddMeta.color} />
                <Text
                  style={[
                    modalStyles.metaText,
                    { color: ddMeta.color, fontWeight: "700" },
                  ]}
                >
                  {ddMeta.label}
                </Text>
              </View>
            )}
          </View>

          {/* Body */}
          <View style={modalStyles.bodyScroll}>
            <Text
              style={[modalStyles.bodyText, { color: colors.textSecondary }]}
            >
              {a.body}
            </Text>
          </View>

          {/* Footer */}
          <View style={[modalStyles.footer, { borderTopColor: colors.border }]}>
            <TouchableOpacity
              style={[
                modalStyles.closeFooterBtn,
                { backgroundColor: colors.brand },
              ]}
              onPress={onClose}
            >
              <Text style={modalStyles.closeFooterText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function audienceLabel(a) {
  if (a.audience === "course") return `Course: ${a.audience_value ?? ""}`;
  if (a.audience === "year_level") return `Year ${a.audience_value ?? ""}`;
  return "All Students";
}

// ── Announcement card ─────────────────────────────────────────────────────
function AnnouncementCard({ item, onPress, colors }) {
  const meta = priorityMeta(item.priority);
  const ddMeta = dueDateMeta(item.due_date);
  const scale = useRef(new Animated.Value(1)).current;

  const onPressIn = () =>
    Animated.spring(scale, { toValue: 0.97, useNativeDriver: true }).start();
  const onPressOut = () =>
    Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start();

  return (
    <TouchableOpacity
      activeOpacity={1}
      onPress={() => onPress(item)}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
    >
      <Animated.View
        style={[
          cardStyles.card,
          {
            backgroundColor: colors.surface,
            borderColor: colors.borderLight,
            shadowColor: colors.shadow,
            transform: [{ scale }],
          },
        ]}
      >
        {/* Priority stripe */}
        <View style={[cardStyles.stripe, { backgroundColor: meta.color }]} />

        <View style={cardStyles.content}>
          {/* Top badges */}
          <View style={cardStyles.badgeRow}>
            <View
              style={[
                cardStyles.priorityBadge,
                { backgroundColor: meta.color + "1a" },
              ]}
            >
              <Ionicons name={meta.icon} size={11} color={meta.color} />
              <Text style={[cardStyles.priorityText, { color: meta.color }]}>
                {meta.label}
              </Text>
            </View>
            <View
              style={[
                cardStyles.audienceBadge,
                { backgroundColor: colors.brandLight },
              ]}
            >
              <Ionicons name="people-outline" size={11} color={colors.brand} />
              <Text style={[cardStyles.audienceText, { color: colors.brand }]}>
                {audienceLabel(item)}
              </Text>
            </View>
            {ddMeta && (
              <View
                style={[
                  cardStyles.priorityBadge,
                  { backgroundColor: ddMeta.bg },
                ]}
              >
                <Ionicons name={ddMeta.icon} size={11} color={ddMeta.color} />
                <Text
                  style={[cardStyles.priorityText, { color: ddMeta.color }]}
                >
                  {ddMeta.label}
                </Text>
              </View>
            )}
            <Text style={[cardStyles.timeText, { color: colors.textMuted }]}>
              {timeAgo(item.created_at)}
            </Text>
          </View>

          {/* Title */}
          <Text
            style={[cardStyles.title, { color: colors.textPrimary }]}
            numberOfLines={2}
          >
            {item.title}
          </Text>

          {/* Preview */}
          <Text
            style={[cardStyles.preview, { color: colors.textSecondary }]}
            numberOfLines={2}
          >
            {item.body}
          </Text>

          {/* Footer */}
          <View style={cardStyles.footer}>
            <Ionicons
              name="person-circle-outline"
              size={14}
              color={colors.textMuted}
            />
            <Text style={[cardStyles.footerText, { color: colors.textMuted }]}>
              {item.creator?.name ?? "Admin"}
            </Text>
            <View
              style={[
                cardStyles.readMoreBtn,
                { backgroundColor: colors.brandLight },
              ]}
            >
              <Text style={[cardStyles.readMoreText, { color: colors.brand }]}>
                Read more
              </Text>
              <Ionicons name="chevron-forward" size={12} color={colors.brand} />
            </View>
          </View>
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────
function EmptyState({ colors }) {
  return (
    <View style={emptyStyles.wrap}>
      <LinearGradient
        colors={[colors.gradientStart + "22", colors.gradientEnd + "11"]}
        style={emptyStyles.iconCircle}
      >
        <Ionicons name="megaphone-outline" size={48} color={colors.brand} />
      </LinearGradient>
      <Text style={[emptyStyles.title, { color: colors.textPrimary }]}>
        No Announcements
      </Text>
      <Text style={[emptyStyles.sub, { color: colors.textSecondary }]}>
        There are no announcements for you right now. Pull down to refresh.
      </Text>
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────
export default function AnnouncementsScreen({ navigation }) {
  const { user } = useContext(AuthContext);
  const { colors } = useTheme();

  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const [selected, setSelected] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [filter, setFilter] = useState("all"); // all | normal | important | urgent

  const loadAnnouncements = async (pageNum = 1, replace = true) => {
    try {
      if (replace) setLoading(true);
      const res = await api.get("/announcements", {
        params: { per_page: 15, page: pageNum },
      });
      const { announcements: items, pagination } = res.data;

      setAnnouncements((prev) => (replace ? items : [...prev, ...items]));
      setPage(pagination.current_page);
      setLastPage(pagination.last_page);
    } catch (e) {
      console.error("[Announcements] load error:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      navigation.setOptions({ headerShown: false });
      loadAnnouncements(1, true);
    }, []),
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadAnnouncements(1, true);
  };

  const onEndReached = () => {
    if (!loadingMore && page < lastPage) {
      setLoadingMore(true);
      loadAnnouncements(page + 1, false);
    }
  };

  const openDetail = (item) => {
    setSelected(item);
    setModalVisible(true);
  };

  // Client-side filter
  const filtered =
    filter === "all"
      ? announcements
      : announcements.filter((a) => a.priority === filter);

  const s = makeStyles(colors);

  return (
    <View style={[s.container]}>
      {/* Header */}
      <LinearGradient
        colors={[colors.gradientStart, colors.gradientEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={s.header}
      >
        <View style={s.headerInner}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={s.backBtn}
          >
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={s.headerTitle}>Announcements</Text>
            <Text style={s.headerSub}>Stay updated with the latest news</Text>
          </View>
          <View style={s.headerIcon}>
            <Ionicons name="megaphone" size={28} color="#fff" />
          </View>
        </View>

        {/* Filter chips */}
        <View style={s.filterRow}>
          {["all", "normal", "important", "urgent"].map((f) => (
            <TouchableOpacity
              key={f}
              style={[s.filterChip, filter === f && s.filterChipActive]}
              onPress={() => setFilter(f)}
            >
              <Text
                style={[
                  s.filterChipText,
                  filter === f && s.filterChipTextActive,
                ]}
              >
                {f === "all" ? "All" : priorityMeta(f).label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </LinearGradient>

      {/* List */}
      {loading ? (
        <View style={s.centered}>
          <ActivityIndicator size="large" color={colors.brand} />
          <Text style={[s.loadingText, { color: colors.textMuted }]}>
            Loading…
          </Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={
            filtered.length === 0
              ? { flex: 1 }
              : { padding: 16, paddingBottom: 32 }
          }
          renderItem={({ item }) => (
            <AnnouncementCard
              item={item}
              onPress={openDetail}
              colors={colors}
            />
          )}
          ListEmptyComponent={<EmptyState colors={colors} />}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.brand}
            />
          }
          onEndReached={onEndReached}
          onEndReachedThreshold={0.3}
          ListFooterComponent={
            loadingMore ? (
              <ActivityIndicator
                color={colors.brand}
                style={{ marginVertical: 16 }}
              />
            ) : null
          }
        />
      )}

      {/* Detail modal */}
      <AnnouncementModal
        visible={modalVisible}
        announcement={selected}
        onClose={() => setModalVisible(false)}
        colors={colors}
      />
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────
function makeStyles(colors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: { paddingTop: 52, paddingBottom: 16, paddingHorizontal: 20 },
    headerInner: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      marginBottom: 16,
    },
    headerTitle: { fontSize: 26, fontWeight: "800", color: "#fff" },
    headerSub: { fontSize: 13, color: "rgba(255,255,255,0.75)", marginTop: 2 },
    headerIcon: {
      width: 52,
      height: 52,
      borderRadius: 26,
      backgroundColor: "rgba(255,255,255,0.15)",
      justifyContent: "center",
      alignItems: "center",
    },
    backBtn: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: "rgba(255,255,255,0.2)",
      justifyContent: "center",
      alignItems: "center",
      marginRight: 12,
    },
    filterRow: { flexDirection: "row", gap: 8 },
    filterChip: {
      paddingVertical: 6,
      paddingHorizontal: 14,
      borderRadius: 30,
      backgroundColor: "rgba(255,255,255,0.15)",
    },
    filterChipActive: { backgroundColor: "#fff" },
    filterChipText: {
      fontSize: 12,
      fontWeight: "600",
      color: "rgba(255,255,255,0.85)",
    },
    filterChipTextActive: { color: colors.brand },
    centered: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      gap: 12,
    },
    loadingText: { fontSize: 14 },
  });
}

const cardStyles = StyleSheet.create({
  card: {
    flexDirection: "row",
    borderRadius: 16,
    marginBottom: 12,
    overflow: "hidden",
    borderWidth: 1,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  stripe: { width: 4, flexShrink: 0 },
  content: { flex: 1, padding: 14 },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
    marginBottom: 6,
  },
  priorityBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 30,
  },
  priorityText: { fontSize: 11, fontWeight: "700" },
  audienceBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 30,
  },
  audienceText: { fontSize: 11, fontWeight: "600" },
  timeText: { fontSize: 11, marginLeft: "auto" },
  title: { fontSize: 15, fontWeight: "700", marginBottom: 4, lineHeight: 20 },
  preview: { fontSize: 13, lineHeight: 18, marginBottom: 10 },
  footer: { flexDirection: "row", alignItems: "center", gap: 5 },
  footerText: { fontSize: 12, flex: 1 },
  readMoreBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    paddingVertical: 3,
    paddingHorizontal: 10,
    borderRadius: 30,
  },
  readMoreText: { fontSize: 12, fontWeight: "600" },
});

const modalStyles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "flex-end" },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    height: "88%",
    overflow: "hidden",
  },
  header: {
    padding: 20,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  headerBadgeRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 8,
    flexWrap: "wrap",
  },
  priorityBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 3,
    paddingHorizontal: 10,
    borderRadius: 30,
  },
  priorityBadgeText: { fontSize: 11, fontWeight: "700" },
  audienceBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 3,
    paddingHorizontal: 10,
    borderRadius: 30,
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  audienceBadgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: "rgba(255,255,255,0.9)",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#fff",
    lineHeight: 24,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  metaRow: {
    flexDirection: "row",
    gap: 16,
    padding: 14,
    borderBottomWidth: 1,
    flexWrap: "wrap",
  },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  metaText: { fontSize: 13 },
  bodyScroll: { flex: 1, padding: 20 },
  bodyText: { fontSize: 15, lineHeight: 26 },
  footer: { padding: 16, paddingBottom: 32, borderTopWidth: 1 },
  closeFooterBtn: { borderRadius: 30, padding: 15, alignItems: "center" },
  closeFooterText: { color: "#fff", fontWeight: "700", fontSize: 16 },
});

const emptyStyles = StyleSheet.create({
  wrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  title: { fontSize: 20, fontWeight: "700", marginBottom: 8 },
  sub: { fontSize: 14, textAlign: "center", lineHeight: 22 },
});
