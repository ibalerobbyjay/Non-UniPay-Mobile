import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const storageKey = (uid) => `onboarding_v5_${uid}`;

const TAB_COUNT = 5;

// ─── Step definitions ─────────────────────────────────────────────────────────
const BASE_STEPS = [
  {
    id: "welcome",
    type: "center",
    layoutKey: null,
    tabIndex: null,
    icon: "sparkles-outline",
    iconColor: "#a5b4fc",
    title: "Welcome to UniPay! ",
    body: "This is your all-in-one student portal for managing school fees, checking exam clearance, and paying your balance. Let's take a quick tour!",
  },
  {
    id: "header",
    type: "element",
    layoutKey: "header",
    tabIndex: null,
    icon: "person-outline",
    iconColor: "#93c5fd",
    title: "Your Dashboard Header",
    body: "At the top you'll see your name, student number, and the current exam period. Tap the bell to check notifications, or tap your profile photo to open your profile.",
  },
  {
    id: "clearance_card",
    type: "element",
    layoutKey: "clearance",
    tabIndex: null,
    icon: "shield-checkmark-outline",
    iconColor: "#6ee7b7",
    title: "Exam Clearance Status",
    body: "This card shows CLEARED or PENDING. You need a ₱0 remaining balance to be automatically cleared for exams. It updates instantly after every payment.",
  },
  {
    id: "summary_cards",
    type: "element",
    layoutKey: "cards",
    tabIndex: null,
    icon: "layers-outline",
    iconColor: "#c4b5fd",
    title: "Fee Summary Cards",
    body: "Swipe through three cards:\n\n① Total Fees — your full amount due\n② Total Paid — what you've paid with a breakdown\n③ Remaining — your balance and payment status.",
  },
  {
    id: "fees_action",
    type: "element",
    layoutKey: "fees",
    tabIndex: null,
    icon: "cash-outline",
    iconColor: "#93c5fd",
    title: "View Fees Shortcut",
    body: "Jump straight to your full fee breakdown — tuition, miscellaneous, and exam fees are listed separately with amounts and subtotals.",
  },
  {
    id: "pay_action",
    type: "element",
    layoutKey: "pay",
    tabIndex: null,
    icon: "card-outline",
    iconColor: "#fde68a",
    title: "Pay Your Fees",
    body: "Tap here to pay via GCash. You'll see your exact balance due, enter your GCash reference number, and submit. Payments reflect within minutes and clearance updates automatically.",
  },
  {
    id: "history_action",
    type: "element",
    layoutKey: "history",
    tabIndex: null,
    icon: "time-outline",
    iconColor: "#6ee7b7",
    title: "Payment History",
    body: "View every transaction you've made — date, amount, and reference number. You can download an official receipt for any payment directly from this screen.",
  },
  {
    id: "tab_home",
    type: "tab",
    layoutKey: null,
    tabIndex: 0,
    icon: "home-outline",
    iconColor: "#93c5fd",
    title: "Home Tab",
    body: "This is your main dashboard. Come back here any time for a quick overview of your fees, clearance status, and quick actions.",
  },
  {
    id: "tab_fees",
    type: "tab",
    layoutKey: null,
    tabIndex: 1,
    icon: "cash-outline",
    iconColor: "#93c5fd",
    title: "Fees Screen",
    body: "The Fees tab shows a full itemized list of everything you owe — organized by Tuition, Miscellaneous, and Exam fees. Grand total and remaining balance are at the bottom.",
  },
  {
    id: "tab_unibot",
    type: "unibot",
    layoutKey: null,
    tabIndex: 2,
    icon: "chatbubble-ellipses-outline",
    iconColor: "#fde68a",
    title: "UniBot — Your AI Assistant ",
    body: 'That glowing button in the center of the nav bar is UniBot! Your AI-powered helper, available 24/7.\n\nAsk it anything:\n• "How do I pay my fees?"\n• "Why am I not cleared?"\n• "What documents do I need?"\n\nJust tap the center button!',
  },
  {
    id: "tab_clearance",
    type: "tab",
    layoutKey: null,
    tabIndex: 3,
    icon: "checkmark-circle-outline",
    iconColor: "#6ee7b7",
    title: "Clearance Screen",
    body: "The Clearance tab shows your official exam clearance details — cleared/pending status, exam period, semester, school year, and the exact date you were cleared.",
  },
  {
    id: "tab_profile",
    type: "tab",
    layoutKey: null,
    tabIndex: 4,
    icon: "person-circle-outline",
    iconColor: "#c4b5fd",
    title: "Your Profile",
    body: "The Profile tab lets you:\n\n• Update contact info, course & year\n• Change your profile photo\n• Change your password\n• Toggle dark / light mode\n• Read Privacy Policy & Terms\n• Log out",
  },
  {
    id: "tips",
    type: "center",
    layoutKey: null,
    tabIndex: null,
    icon: "bulb-outline",
    iconColor: "#fde68a",
    title: "Helpful Tips 💡",
    body: "• Pull down on any screen to refresh\n• GCash payments need a valid reference number\n• Profile edits: 3-day cooldown; photos: 7-day cooldown\n• Clearance updates automatically — no need to ask\n• UniBot can answer most questions instantly",
  },
  {
    id: "done",
    type: "center",
    layoutKey: null,
    tabIndex: null,
    icon: "checkmark-circle-outline",
    iconColor: "#6ee7b7",
    title: "You're all set! ",
    body: "That's the full tour! UniBot is always here if you get stuck. Good luck on your exams — we're rooting for you!",
  },
];

const BORDER_RADIUS = {
  header: 0,
  clearance: 38,
  cards: 45,
  fees: 25,
  pay: 25,
  history: 25,
};

const STEP_VERTICAL_PADDING = {
  header: -30,
  clearance: 10,
  cards: -8,
  fees: -3,
  pay: -3,
  history: -3,
};

const STEP_HORIZONTAL_PADDING = {
  header: -10,
  clearance: -20,
  cards: -18,
  fees: 0,
  pay: 0,
  history: 0,
};

const STEP_VERTICAL_SHIFT = {
  header: 40,
  clearance: 30,
  cards: 30,
  fees: 35,
  pay: 35,
  history: 35,
};

export default function OnboardingGuide({
  userId,
  userName,
  getElementRect,
  scrollToElement,
  tabBarHeight: tabBarHeightProp,
  tabBarY: tabBarYProp,
}) {
  const insets = useSafeAreaInsets();
  const { width: SW, height: SH } = Dimensions.get("window");

  const s = (n) => Math.round((SW / 360) * n);
  const vs = (n) => Math.round((SH / 800) * n);

  const TAB_BAR_HEIGHT =
    tabBarHeightProp ?? (Platform.OS === "ios" ? 49 + insets.bottom : 56);
  const TAB_BAR_TOP = tabBarYProp ?? SH - TAB_BAR_HEIGHT;
  const TAB_W = SW / TAB_COUNT;
  const UNIBOT_ICON_SIZE = s(34);

  function tabRect(index) {
    return {
      x: index * TAB_W,
      y: TAB_BAR_TOP,
      width: TAB_W,
      height: TAB_BAR_HEIGHT,
      borderRadius: 0,
    };
  }

  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);
  const [targetRect, setTargetRect] = useState(null);
  const [isLoadingRect, setIsLoadingRect] = useState(false);

  const STEPS = BASE_STEPS.map((st, idx) => {
    if (idx === 0 && userName) {
      return { ...st, title: `Welcome, ${userName.split(" ")[0]}! ` };
    }
    return st;
  });

  const overlayAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(vs(20))).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const ringFadeAnim = useRef(new Animated.Value(1)).current;
  const unibotBounce = useRef(new Animated.Value(0)).current;

  // Show on first launch
  useEffect(() => {
    if (!userId) return;
    AsyncStorage.getItem(storageKey(userId)).then((done) => {
      if (!done) setVisible(true);
    });
  }, [userId]);

  // Overlay fade-in
  useEffect(() => {
    if (!visible) return;
    Animated.timing(overlayAnim, {
      toValue: 1,
      duration: 320,
      useNativeDriver: true,
    }).start();
  }, [visible]);

  // Card slide-in per step
  useEffect(() => {
    if (!visible) return;
    fadeAnim.setValue(0);
    slideAnim.setValue(vs(22));
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 240,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 110,
        friction: 11,
        useNativeDriver: true,
      }),
    ]).start();
  }, [step, visible]);

  // Spotlight pulse loop
  useEffect(() => {
    if (!visible) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.06,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [step, visible]);

  // ── Bouncing arrow for both unibot and tab steps ───────────────────────────
  useEffect(() => {
    const stepType = STEPS[step]?.type;
    if (!visible || (stepType !== "unibot" && stepType !== "tab")) {
      unibotBounce.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(unibotBounce, {
          toValue: -12,
          duration: 420,
          useNativeDriver: true,
        }),
        Animated.timing(unibotBounce, {
          toValue: 0,
          duration: 420,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [step, visible]);

  // ── Rect resolver ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!visible) return;
    const currentStep = STEPS[step];

    if (currentStep.type === "tab") {
      setTargetRect(tabRect(currentStep.tabIndex));
      return;
    }

    if (
      currentStep.type === "unibot" ||
      currentStep.type === "center" ||
      !currentStep.layoutKey
    ) {
      setTargetRect(null);
      return;
    }

    let attempts = 0;
    const maxAttempts = 10;

    const load = async () => {
      const rect = await getElementRect(
        currentStep.layoutKey,
        BORDER_RADIUS[currentStep.layoutKey],
      );
      if (!rect) {
        attempts++;
        if (attempts < maxAttempts) setTimeout(load, 150);
        return;
      }

      const visibleTop = 100;
      const visibleBottom = SH - TAB_BAR_HEIGHT - 20;
      const isVisible =
        rect.y >= visibleTop && rect.y + rect.height <= visibleBottom;

      if (!isVisible && scrollToElement) {
        scrollToElement(rect.y - 100);
        setTimeout(async () => {
          const r2 = await getElementRect(
            currentStep.layoutKey,
            BORDER_RADIUS[currentStep.layoutKey],
          );
          if (r2) setTargetRect(r2);
        }, 300);
      } else {
        setTargetRect(rect);
      }
    };

    load();
  }, [
    step,
    visible,
    getElementRect,
    scrollToElement,
    TAB_BAR_HEIGHT,
    TAB_BAR_TOP,
  ]);

  useEffect(() => {
    if (targetRect && !isLoadingRect) {
      Animated.timing(ringFadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [targetRect, isLoadingRect]);

  const dismiss = async () => {
    Animated.timing(overlayAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => setVisible(false));
    if (userId) await AsyncStorage.setItem(storageKey(userId), "true");
  };

  const goNext = () => {
    if (step >= STEPS.length - 1) {
      dismiss();
      return;
    }
    Animated.timing(ringFadeAnim, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start(() => setStep((p) => p + 1));
  };

  const goPrev = () => {
    if (step <= 0) return;
    Animated.timing(ringFadeAnim, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start(() => setStep((p) => p - 1));
  };

  if (!visible) return null;

  const current = STEPS[step];
  const isFirst = step === 0;
  const isLast = step === STEPS.length - 1;
  const rect = targetRect;
  const progress = ((step + 1) / STEPS.length) * 100;

  const CARD_MARGIN = s(16);
  const CARD_EST_H = vs(230);
  const GAP = vs(14);

  const lk = current.layoutKey;
  const vPad = lk ? (STEP_VERTICAL_PADDING[lk] ?? 4) : 0;
  const hPad = lk ? (STEP_HORIZONTAL_PADDING[lk] ?? 4) : 0;
  const vShift = lk ? (STEP_VERTICAL_SHIFT[lk] ?? 0) : 0;

  // ── Tooltip position ───────────────────────────────────────────────────────
  let tooltipStyle = {};
  let arrowDir = null;
  let arrowLeft = null;

  if (current.type === "tab" && rect) {
    tooltipStyle = { bottom: SH - TAB_BAR_TOP + GAP + 8 };
    arrowDir = "bottom";
    const cx = rect.x + rect.width / 2;
    const cw = SW - CARD_MARGIN * 2;
    arrowLeft = Math.max(12, Math.min(cx - CARD_MARGIN - 12, cw - 24));
  } else if (current.type === "unibot") {
    tooltipStyle = { bottom: SH - TAB_BAR_TOP + 58 + GAP + 24 };
    arrowDir = null;
  } else if (current.type === "center" || !rect) {
    tooltipStyle = { top: SH / 2 - CARD_EST_H / 2 };
  } else {
    const below = SH - (rect.y + rect.height);
    const above = rect.y;
    if (below >= CARD_EST_H + GAP) {
      tooltipStyle = { top: rect.y + rect.height + GAP };
      arrowDir = "top";
      arrowLeft = rect.x + rect.width / 2 - CARD_MARGIN - 12;
    } else if (above >= CARD_EST_H + GAP) {
      tooltipStyle = { bottom: SH - rect.y + GAP };
      arrowDir = "bottom";
      arrowLeft = rect.x + rect.width / 2 - CARD_MARGIN - 12;
    } else {
      tooltipStyle = { top: Math.max(rect.y + rect.height + GAP, vs(8)) };
      arrowDir = "top";
      arrowLeft = rect.x + rect.width / 2 - CARD_MARGIN - 12;
    }
  }

  // ── Spotlight rect (element steps only — tab steps use the arrow instead) ──
  let spotRect = null;
  if (current.type === "element" && rect) {
    spotRect = {
      top: rect.y + vShift - vPad,
      left: rect.x - hPad,
      width: rect.width + hPad * 2,
      height: rect.height + vPad * 2,
      borderRadius: (rect.borderRadius ?? s(16)) + Math.min(hPad, vPad),
    };
  }

  // ── UniBot arrow position — always centred on the middle tab ──────────────
  const unibotCenterX = TAB_W * 2 + TAB_W / 2 - UNIBOT_ICON_SIZE / 2;
  const unibotBottom = SH - TAB_BAR_TOP + 15;

  const sectionLabel =
    current.type === "tab" || current.type === "unibot"
      ? "Navigation"
      : current.type === "element"
        ? "Home Screen"
        : "Overview";

  return (
    <Modal
      transparent
      animationType="none"
      visible={visible}
      statusBarTranslucent
    >
      <Animated.View style={[styles.overlay, { opacity: overlayAnim }]}>
        {/* ── Spotlight (element steps only) ── */}
        {spotRect && !isLoadingRect && (
          <Animated.View
            style={[
              styles.spotlight,
              {
                top: spotRect.top,
                left: spotRect.left,
                width: spotRect.width,
                height: spotRect.height,
                borderRadius: spotRect.borderRadius,
                transform: [{ scale: pulseAnim }],
                opacity: ringFadeAnim,
              },
            ]}
          />
        )}

        {/* ── UniBot bouncing yellow arrow ── */}
        {current.type === "unibot" && (
          <Animated.View
            style={[
              styles.unibotIndicator,
              {
                left: unibotCenterX,
                bottom: unibotBottom,
                transform: [{ translateY: unibotBounce }],
              },
            ]}
          >
            <Ionicons
              name="arrow-down-circle"
              size={s(34)}
              color="rgb(244,180,20)"
            />
            <Text style={[styles.unibotTapText, { fontSize: s(11) }]}>
              Tap me!
            </Text>
          </Animated.View>
        )}

        {/* ── Tab bouncing blue arrow ── */}
        {current.type === "tab" && rect && (
          <Animated.View
            style={[
              styles.unibotIndicator,
              {
                left: rect.x + rect.width / 2 - UNIBOT_ICON_SIZE / 2,
                bottom: unibotBottom,
                transform: [{ translateY: unibotBounce }],
              },
            ]}
          >
            <Ionicons name="arrow-down-circle" size={s(34)} color="#60a5fa" />
          </Animated.View>
        )}

        {/* ── Tooltip card ── */}
        <Animated.View
          style={[
            styles.card,
            {
              left: CARD_MARGIN,
              right: CARD_MARGIN,
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
            tooltipStyle,
          ]}
        >
          {arrowDir && rect && !isLoadingRect && (
            <Animated.View
              style={[
                styles.arrow,
                arrowDir === "top" ? styles.arrowTop : styles.arrowBottom,
                { left: arrowLeft, opacity: ringFadeAnim },
              ]}
            />
          )}

          <View style={styles.glassBg} />
          <View style={styles.glassBorder} />

          <View
            style={[
              styles.cardContent,
              {
                paddingHorizontal: s(18),
                paddingTop: vs(14),
                paddingBottom: vs(16),
              },
            ]}
          >
            {/* Progress */}
            <View
              style={[
                styles.progressTrack,
                { height: vs(3), marginBottom: vs(12) },
              ]}
            >
              <View style={[styles.progressFill, { width: `${progress}%` }]} />
            </View>

            {/* Chip + close */}
            <View style={[styles.chipRow, { marginBottom: vs(8) }]}>
              <View
                style={[
                  styles.chip,
                  { backgroundColor: current.iconColor + "1a" },
                ]}
              >
                <Ionicons
                  name={current.icon}
                  size={s(12)}
                  color={current.iconColor}
                />
                <Text
                  style={[
                    styles.chipText,
                    { color: current.iconColor, fontSize: s(11) },
                  ]}
                >
                  {sectionLabel}
                </Text>
              </View>
              <TouchableOpacity
                onPress={dismiss}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                style={styles.closeBtn}
              >
                <Ionicons
                  name="close"
                  size={s(16)}
                  color="rgba(255,255,255,0.35)"
                />
              </TouchableOpacity>
            </View>

            {/* Title */}
            <Text
              style={[
                styles.title,
                { fontSize: s(16), marginBottom: vs(7), lineHeight: s(22) },
              ]}
            >
              {current.title}
            </Text>

            {/* Body */}
            <Text
              style={[
                styles.body,
                { fontSize: s(13), lineHeight: s(21), marginBottom: vs(16) },
              ]}
            >
              {current.body}
            </Text>

            {/* Footer */}
            <View style={styles.footer}>
              <Text style={[styles.stepLabel, { fontSize: s(11) }]}>
                {step + 1} / {STEPS.length}
              </Text>
              <View style={[styles.btnRow, { gap: s(8) }]}>
                {!isFirst && (
                  <TouchableOpacity
                    onPress={goPrev}
                    style={[
                      styles.backBtn,
                      {
                        paddingHorizontal: s(14),
                        paddingVertical: vs(8),
                        borderRadius: s(12),
                      },
                    ]}
                  >
                    <Ionicons
                      name="chevron-back"
                      size={s(13)}
                      color="rgba(255,255,255,0.5)"
                    />
                    <Text style={[styles.backText, { fontSize: s(13) }]}>
                      Back
                    </Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  onPress={goNext}
                  style={[
                    styles.nextBtn,
                    {
                      paddingHorizontal: s(20),
                      paddingVertical: vs(8),
                      borderRadius: s(12),
                      gap: s(4),
                    },
                  ]}
                >
                  <Text style={[styles.nextText, { fontSize: s(13) }]}>
                    {isLast ? "Get Started" : "Next"}
                  </Text>
                  {!isLast && (
                    <Ionicons
                      name="chevron-forward"
                      size={s(13)}
                      color="#fff"
                    />
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(4, 10, 35, 0.78)",
  },
  spotlight: {
    position: "absolute",
    borderWidth: 2,
    borderColor: "rgba(130, 160, 255, 0.85)",
    backgroundColor: "rgba(100, 140, 255, 0.07)",
    shadowColor: "#6b9fff",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 14,
    elevation: 0,
  },
  unibotIndicator: {
    position: "absolute",
    alignItems: "center",
    gap: 2,
  },
  unibotTapText: {
    color: "rgb(244,180,20)",
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  card: {
    position: "absolute",
    borderRadius: 24,
    overflow: "visible",
  },
  arrow: {
    position: "absolute",
    width: 0,
    height: 0,
    backgroundColor: "transparent",
    borderStyle: "solid",
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderBottomWidth: 12,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    zIndex: 10,
  },
  arrowTop: {
    top: -10,
    borderBottomColor: "rgba(10, 18, 56, 0.88)",
  },
  arrowBottom: {
    bottom: -10,
    borderTopWidth: 12,
    borderBottomWidth: 0,
    borderTopColor: "rgba(10, 18, 56, 0.88)",
  },
  glassBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(10, 18, 56, 0.88)",
    borderRadius: 24,
  },
  glassBorder: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  cardContent: {},
  progressTrack: {
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.1)",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 2,
    backgroundColor: "#818cf8",
  },
  chipRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
  },
  chipText: {
    fontWeight: "600",
    letterSpacing: 0.3,
  },
  closeBtn: {
    padding: 4,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  title: {
    fontWeight: "800",
    color: "#fff",
    letterSpacing: -0.3,
  },
  body: {
    color: "rgba(255,255,255,0.74)",
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  stepLabel: {
    color: "rgba(255,255,255,0.28)",
    fontWeight: "500",
  },
  btnRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  backText: {
    fontWeight: "600",
    color: "rgba(255,255,255,0.55)",
  },
  nextBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#4f6ef7",
  },
  nextText: {
    fontWeight: "700",
    color: "#fff",
  },
});
