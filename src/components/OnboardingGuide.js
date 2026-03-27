import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const { width: SW, height: SH } = Dimensions.get("window");
const s = (n) => Math.round((SW / 360) * n);
const vs = (n) => Math.round((SH / 800) * n);

const storageKey = (uid) => `onboarding_v3_${uid}`;

const BASE_STEPS = [
  {
    id: "welcome",
    layoutKey: null,
    icon: "hand-right-outline",
    iconColor: "#a5b4fc",
    title: "Welcome! ",
    body: "Let's do a quick tour so you know your way around. Tap Next to begin.",
  },
  {
    id: "header",
    layoutKey: "header",
    icon: "person-outline",
    iconColor: "#93c5fd",
    title: "Your Profile",
    body: "Your name, student number, and current exam period. Tap the bell for notifications or your photo to edit your profile.",
  },
  {
    id: "clearance",
    layoutKey: "clearance",
    icon: "shield-checkmark-outline",
    iconColor: "#6ee7b7",
    title: "Exam Clearance",
    body: "Shows CLEARED or PENDING. You need a ₱0 balance to be cleared for exams.",
  },
  {
    id: "cards",
    layoutKey: "cards",
    icon: "layers-outline",
    iconColor: "#c4b5fd",
    title: "Summary Cards",
    body: "Swipe left/right through three cards — Total Fees, Total Paid, and your Remaining balance.",
  },
  {
    id: "unibot",
    layoutKey: "unibot",
    icon: "chatbubble-ellipses-outline",
    iconColor: "#fde68a",
    title: "UniBot",
    body: "Your AI assistant. Ask it anything about the app, fees, or your clearance.",
  },
  {
    id: "fees",
    layoutKey: "fees",
    icon: "cash-outline",
    iconColor: "#93c5fd",
    title: "View Fees",
    body: "See the full breakdown of your tuition, miscellaneous, and exam fees.",
  },
  {
    id: "pay",
    layoutKey: "pay",
    icon: "card-outline",
    iconColor: "#fde68a",
    title: "Pay Fees",
    body: "Settle your balance via GCash. Payments reflect within minutes.",
  },
  {
    id: "history",
    layoutKey: "history",
    icon: "time-outline",
    iconColor: "#6ee7b7",
    title: "Payment History",
    body: "Browse all past transactions — dates, amounts, and reference numbers. You can download receipt.",
  },
  {
    id: "done",
    layoutKey: null,
    icon: "checkmark-circle-outline",
    iconColor: "#6ee7b7",
    title: "You're all set! ",
    body: "That's everything! UniBot is always here if you need help. Good luck on your exams!",
  },
];

// Base border radius for each element (used for ring corners)
const BORDER_RADIUS = {
  header: 0,
  clearance: 38,
  cards: 45,
  unibot: 25,
  fees: 25,
  pay: 25,
  history: 25,
};

// Default padding values
const DEFAULT_VERTICAL_PADDING = 4; // extra space above & below
const DEFAULT_HORIZONTAL_PADDING = 4; // extra space left & right
const DEFAULT_VERTICAL_SHIFT = 0; // vertical offset (positive = down)

// Per‑element customizations
const STEP_VERTICAL_PADDING = {
  header: -30,
  clearance: 10,
  cards: -8,
  unibot: -3,
  fees: -3,
  pay: -3,
  history: -3,
};

const STEP_HORIZONTAL_PADDING = {
  header: -10,
  clearance: -20,
  cards: -18,
  unibot: 0,
  fees: 0,
  pay: 0,
  history: 0,
};

const STEP_VERTICAL_SHIFT = {
  header: 40,
  clearance: 30,
  cards: 30,
  unibot: 35,
  fees: 35,
  pay: 35,
  history: 35,
};

export default function OnboardingGuide({
  userId,
  userName,
  getElementRect,
  scrollToElement,
}) {
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);
  const [targetRect, setTargetRect] = useState(null);
  const [isLoadingRect, setIsLoadingRect] = useState(false);

  const STEPS = BASE_STEPS.map((s, idx) => {
    if (idx === 0 && userName) {
      return {
        ...s,
        title: `Welcome, ${userName}! `,
      };
    }
    return s;
  });

  const overlayAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(vs(20))).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const ringFadeAnim = useRef(new Animated.Value(1)).current; // for crossfading ring

  useEffect(() => {
    if (!userId) return;
    AsyncStorage.getItem(storageKey(userId)).then((done) => {
      if (!done) setVisible(true);
    });
  }, [userId]);

  useEffect(() => {
    if (!visible) return;
    Animated.timing(overlayAnim, {
      toValue: 1,
      duration: 320,
      useNativeDriver: true,
    }).start();
  }, [visible]);

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

  useEffect(() => {
    if (!visible) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
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

  useEffect(() => {
    if (!visible) return;
    const currentStep = STEPS[step];
    if (!currentStep.layoutKey) {
      setTargetRect(null);
      return;
    }

    const loadAndMaybeScroll = async () => {
      const rect = await getElementRect(
        currentStep.layoutKey,
        BORDER_RADIUS[currentStep.layoutKey],
      );
      if (!rect) {
        setTimeout(() => loadAndMaybeScroll(), 100);
        return;
      }

      const isVisible = rect.y >= 0 && rect.y + rect.height <= SH;
      if (!isVisible && scrollToElement) {
        const targetY = rect.y - SH / 2 + rect.height / 2;
        scrollToElement(targetY);
        setTimeout(async () => {
          const newRect = await getElementRect(
            currentStep.layoutKey,
            BORDER_RADIUS[currentStep.layoutKey],
          );
          if (newRect) setTargetRect(newRect);
        }, 300);
      } else {
        setTargetRect(rect);
      }
    };

    loadAndMaybeScroll();
  }, [step, visible, getElementRect, scrollToElement]);

  // Fade ring in after rectangle is updated
  useEffect(() => {
    if (targetRect && !isLoadingRect) {
      // If we have a rectangle and we're not loading, fade the ring back in
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

  const handleNext = () => {
    if (step >= STEPS.length - 1) {
      dismiss();
      return;
    }
    // Fade out ring
    Animated.timing(ringFadeAnim, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start(() => {
      setStep(step + 1);
      // Ring will be faded back in by the effect when targetRect is ready
    });
  };

  const handlePrev = () => {
    if (step <= 0) return;
    Animated.timing(ringFadeAnim, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start(() => {
      setStep(step - 1);
    });
  };

  if (!visible) return null;

  const current = STEPS[step];
  const isFirst = step === 0;
  const isLast = step === STEPS.length - 1;
  const rect = targetRect;
  const progress = ((step + 1) / STEPS.length) * 100;

  const CARD_MARGIN = s(16);
  const CARD_EST_H = vs(200);
  const GAP = vs(14);

  const layoutKey = current.layoutKey;
  const verticalPadding = layoutKey
    ? (STEP_VERTICAL_PADDING[layoutKey] ?? DEFAULT_VERTICAL_PADDING)
    : 0;
  const horizontalPadding = layoutKey
    ? (STEP_HORIZONTAL_PADDING[layoutKey] ?? DEFAULT_HORIZONTAL_PADDING)
    : 0;
  const verticalShift = layoutKey
    ? (STEP_VERTICAL_SHIFT[layoutKey] ?? DEFAULT_VERTICAL_SHIFT)
    : 0;

  let tooltipStyle = {};
  let arrowDirection = null;
  let arrowLeft = null;

  if (rect) {
    const spaceBelow = SH - (rect.y + rect.height);
    const spaceAbove = rect.y;
    if (spaceBelow >= CARD_EST_H + GAP) {
      tooltipStyle = { top: rect.y + rect.height + GAP };
      arrowDirection = "top";
      arrowLeft = rect.x + rect.width / 2 - CARD_MARGIN - 12;
    } else if (spaceAbove >= CARD_EST_H + GAP) {
      tooltipStyle = { bottom: SH - rect.y + GAP };
      arrowDirection = "bottom";
      arrowLeft = rect.x + rect.width / 2 - CARD_MARGIN - 12;
    } else {
      tooltipStyle = { top: Math.max(rect.y + rect.height + GAP, vs(8)) };
      arrowDirection = "top";
      arrowLeft = rect.x + rect.width / 2 - CARD_MARGIN - 12;
    }
  } else {
    tooltipStyle = { top: SH / 2 - CARD_EST_H / 2 };
  }

  return (
    <Modal
      transparent
      animationType="none"
      visible={visible}
      statusBarTranslucent
    >
      <Animated.View style={[styles.overlay, { opacity: overlayAnim }]}>
        {rect && !isLoadingRect && (
          <Animated.View
            style={[
              styles.spotlight,
              {
                top: rect.y + verticalShift - verticalPadding,
                left: rect.x - horizontalPadding,
                width: rect.width + horizontalPadding * 2,
                height: rect.height + verticalPadding * 2,
                borderRadius:
                  (rect.borderRadius ?? s(16)) +
                  Math.min(horizontalPadding, verticalPadding),
                transform: [{ scale: pulseAnim }],
                opacity: ringFadeAnim, // crossfade ring
              },
            ]}
          />
        )}

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
          {arrowDirection && rect && !isLoadingRect && (
            <Animated.View
              style={[
                styles.arrow,
                arrowDirection === "top" ? styles.arrowTop : styles.arrowBottom,
                { left: arrowLeft, opacity: ringFadeAnim },
              ]}
            />
          )}

          <View style={styles.glassBg} />
          <View style={styles.glassBorder} />

          <View style={styles.cardContent}>
            <View style={styles.progressTrack}>
              <Animated.View
                style={[styles.progressFill, { width: `${progress}%` }]}
              />
            </View>

            <View style={styles.header}>
              <View
                style={[
                  styles.iconBadge,
                  { backgroundColor: current.iconColor + "20" },
                ]}
              >
                <Ionicons
                  name={current.icon}
                  size={s(21)}
                  color={current.iconColor}
                />
              </View>
              <Text style={styles.title} numberOfLines={2}>
                {current.title}
              </Text>
              <TouchableOpacity
                onPress={dismiss}
                style={styles.closeBtn}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Ionicons
                  name="close"
                  size={s(17)}
                  color="rgba(255,255,255,0.4)"
                />
              </TouchableOpacity>
            </View>

            <Text style={styles.body}>{current.body}</Text>

            <View style={styles.footer}>
              <Text style={styles.stepLabel}>
                {step + 1} / {STEPS.length}
              </Text>
              <View style={styles.btnRow}>
                {!isFirst && (
                  <TouchableOpacity onPress={handlePrev} style={styles.backBtn}>
                    <Text style={styles.backText}>Back</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPress={handleNext} style={styles.nextBtn}>
                  <Text style={styles.nextText}>
                    {isLast ? "Done" : "Next"}
                  </Text>
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
  overlay: { flex: 1, backgroundColor: "rgba(4, 10, 35, 0.72)" },
  spotlight: {
    position: "absolute",
    borderWidth: 2,
    borderColor: "rgba(130, 160, 255, 0.8)",
    backgroundColor: "rgba(100, 140, 255, 0.07)",
    shadowColor: "#6b9fff",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: s(12),
    elevation: 0,
  },
  card: {
    position: "absolute",
    borderRadius: s(22),
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
    borderBottomColor: "rgba(12, 22, 60, 0.82)",
  },
  arrowBottom: {
    bottom: -10,
    borderTopWidth: 12,
    borderBottomWidth: 0,
    borderTopColor: "rgba(12, 22, 60, 0.82)",
  },
  glassBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(12, 22, 60, 0.82)",
    borderRadius: s(22),
  },
  glassBorder: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: s(22),
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
  },
  cardContent: {
    paddingHorizontal: s(18),
    paddingTop: vs(14),
    paddingBottom: vs(14),
  },
  progressTrack: {
    height: vs(3),
    borderRadius: vs(2),
    backgroundColor: "rgba(255,255,255,0.12)",
    marginBottom: vs(14),
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: vs(2),
    backgroundColor: "#818cf8",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: s(10),
    marginBottom: vs(10),
  },
  iconBadge: {
    width: s(40),
    height: s(40),
    borderRadius: s(12),
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  title: {
    flex: 1,
    fontSize: s(15),
    fontWeight: "700",
    color: "#fff",
    letterSpacing: -0.2,
  },
  closeBtn: {
    flexShrink: 0,
    padding: s(2),
  },
  body: {
    fontSize: s(13),
    color: "rgba(255,255,255,0.72)",
    lineHeight: s(20),
    marginBottom: vs(16),
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  stepLabel: {
    fontSize: s(11),
    color: "rgba(255,255,255,0.3)",
    fontWeight: "500",
  },
  btnRow: {
    flexDirection: "row",
    gap: s(8),
    alignItems: "center",
  },
  backBtn: {
    paddingHorizontal: s(16),
    paddingVertical: vs(8),
    borderRadius: s(12),
    backgroundColor: "rgba(255,255,255,0.09)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  backText: {
    fontSize: s(13),
    fontWeight: "600",
    color: "rgba(255,255,255,0.6)",
  },
  nextBtn: {
    paddingHorizontal: s(22),
    paddingVertical: vs(8),
    borderRadius: s(12),
    backgroundColor: "#4f6ef7",
  },
  nextText: {
    fontSize: s(13),
    fontWeight: "700",
    color: "#fff",
  },
});
