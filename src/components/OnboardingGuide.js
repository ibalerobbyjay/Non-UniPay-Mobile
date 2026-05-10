// OnboardingGuide.js — Universal onboarding component with UniBot mascot
// Supports: home, fees, clearance, profile screens
// Usage: <OnboardingGuide screen="home" userId={...} userName={...} getElementRect={...} scrollToElement={...} />

import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Image,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// ─── MASCOT IMAGES (one per screen) ──────────────────────────────────────────
import uniBotProfile from "../../assets/graduate.png"; // Profile
import uniBotClearance from "../../assets/like.png"; // Clearance
import uniBotImage from "../../assets/mascot.png"; // Home
import uniBotFees from "../../assets/pen.png"; // Fees

const SCREEN_MASCOT = {
  home: uniBotImage,
  fees: uniBotFees,
  clearance: uniBotClearance,
  profile: uniBotProfile,
};

// bump version per-screen to allow re-triggering independently
const storageKey = (uid, screen) => `onboarding_v6_${screen}_${uid}`;

const TAB_COUNT = 5;

// ─── HOME SCREEN STEPS ────────────────────────────────────────────────────────
const HOME_STEPS = [
  {
    id: "welcome",
    type: "center",
    layoutKey: null,
    tabIndex: null,
    icon: "sparkles-outline",
    iconColor: "#a5b4fc",
    title: "Welcome to UniPay! ",
    body: "Your all-in-one student portal for managing school fees, checking exam clearance, and paying your balance. I'm UniBot — let me show you around!",
  },
  {
    id: "header",
    type: "element",
    layoutKey: "header",
    tabIndex: null,
    icon: "person-outline",
    iconColor: "#93c5fd",
    title: "Your Dashboard Header",
    body: "See your name, student number, and current exam period at a glance. Tap the bell  for notifications, or your photo to open your profile.",
  },
  {
    id: "clearance_card",
    type: "element",
    layoutKey: "clearance",
    tabIndex: null,
    icon: "shield-checkmark-outline",
    iconColor: "#6ee7b7",
    title: "Exam Clearance Status",
    body: "This card shows CLEARED  or PENDING . You need a ₱0 remaining balance to be automatically cleared for exams. It updates instantly after every payment.",
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
    body: "Tap here to pay via GCash. You'll see your exact balance due, enter your GCash reference number, and submit. Payments reflect within minutes!",
  },
  {
    id: "history_action",
    type: "element",
    layoutKey: "history",
    tabIndex: null,
    icon: "time-outline",
    iconColor: "#6ee7b7",
    title: "Payment History",
    body: "View every transaction — date, amount, and reference number. Download an official receipt for any payment directly from this screen.",
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
    body: "The Fees tab shows a full itemized list of everything you owe — organized by Tuition, Miscellaneous, and Exam fees.",
  },
  {
    id: "tab_pay",
    type: "tab",
    layoutKey: null,
    tabIndex: 2,
    icon: "card-outline",
    iconColor: "#fde68a",
    title: "Pay Tab",
    body: "The glowing center button takes you directly to the payment screen. Tap it any time to pay your fees via GCash quickly.",
  },
  {
    id: "tab_unibot",
    type: "unibot",
    layoutKey: null,
    tabIndex: null,
    icon: "chatbubble-ellipses-outline",
    iconColor: "#fde68a",
    title: "UniBot — Your AI Assistant ",
    body: 'That glowing button in the bottom-right corner is me — UniBot! Available 24/7 to help.\n\nAsk anything:\n• "How do I pay my fees?"\n• "Why am I not cleared?"\n• "What documents do I need?"\n\nJust tap the UniBot button!',
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
    title: "Helpful Tips ",
    body: "• Pull down on any screen to refresh\n• GCash payments need a valid reference number\n• Profile edits: 3-day cooldown; photos: 7-day cooldown\n• Clearance updates automatically — no need to ask\n• Ask me (UniBot) anything, anytime!",
  },
  {
    id: "done",
    type: "center",
    layoutKey: null,
    tabIndex: null,
    icon: "checkmark-circle-outline",
    iconColor: "#6ee7b7",
    title: "You're all set! ",
    body: "That's the full tour! I'm UniBot and I'm always here if you get stuck. Good luck on your exams — we're rooting for you! ",
  },
];

// ─── FEES SCREEN STEPS ────────────────────────────────────────────────────────
const FEES_STEPS = [
  {
    id: "fees_welcome",
    type: "center",
    layoutKey: null,
    tabIndex: null,
    icon: "cash-outline",
    iconColor: "#93c5fd",
    title: "School Fees Screen ",
    body: "Hi! I'm UniBot. This screen shows all your fees for the current semester. Let me walk you through everything here!",
  },
  {
    id: "fees_header",
    type: "element",
    layoutKey: "feesHeader",
    tabIndex: null,
    icon: "calendar-outline",
    iconColor: "#fde68a",
    title: "Exam Period & Pay Button",
    body: "The header shows your current exam period and semester. The 'Pay' button on the right is a quick shortcut to go directly to the payment screen.",
  },
  {
    id: "fees_summary",
    type: "element",
    layoutKey: "feesSummary",
    tabIndex: null,
    icon: "wallet-outline",
    iconColor: "#6ee7b7",
    title: "Fee Summary Card",
    body: "This card shows your remaining balance (or 'Fully Paid' if you're all settled). The pill on the right shows your grand total for quick reference.",
  },
  {
    id: "fees_sections",
    type: "center",
    layoutKey: null,
    tabIndex: null,
    icon: "list-outline",
    iconColor: "#c4b5fd",
    title: "Fee Breakdown Sections",
    body: "Your fees are organized into three sections:\n\n Tuition Fees\n Miscellaneous Fees\n Exam Fees\n\nEach section shows individual items with amounts and a subtotal.",
  },
  {
    id: "fees_total",
    type: "element",
    layoutKey: "feesTotal",
    tabIndex: null,
    icon: "calculator-outline",
    iconColor: "#fde68a",
    title: "Grand Total Summary",
    body: "At the bottom you'll see:\n\n• Grand Total — full amount\n• Total Paid — what you've already paid\n• Balance Due — what's remaining\n\nBalance Due turns green when fully paid! ",
  },
  {
    id: "fees_done",
    type: "center",
    layoutKey: null,
    tabIndex: null,
    icon: "checkmark-circle-outline",
    iconColor: "#6ee7b7",
    title: "Fees Screen Tour Done! ",
    body: "You now know how to read your fee breakdown. Pull down to refresh, or tap 'Pay' to settle your balance. Ask me anything anytime! ",
  },
];

// ─── CLEARANCE SCREEN STEPS ───────────────────────────────────────────────────
const CLEARANCE_STEPS = [
  {
    id: "clearance_welcome",
    type: "center",
    layoutKey: null,
    tabIndex: null,
    icon: "shield-checkmark-outline",
    iconColor: "#6ee7b7",
    title: "Exam Clearance Screen ",
    body: "Hi! I'm UniBot. This screen is your official clearance record. Let me explain what everything means!",
  },
  {
    id: "clearance_header",
    type: "element",
    layoutKey: "clearanceHeader",
    tabIndex: null,
    icon: "camera-outline",
    iconColor: "#93c5fd",
    title: "Header & Screenshot Mode",
    body: "The header shows your current exam period. Tap the  camera icon to enter Screenshot Mode — this hides the status bar for a clean clearance screenshot you can share!",
  },
  {
    id: "clearance_status",
    type: "element",
    layoutKey: "clearanceStatus",
    tabIndex: null,
    icon: "checkmark-circle-outline",
    iconColor: "#6ee7b7",
    title: "Your Clearance Status",
    body: "This card shows CLEARED  or PENDING .\n\n• CLEARED — Your fees are fully paid. You can take exams!\n• PENDING — You still have a balance to settle.\n\nStatus updates automatically after payment.",
  },
  {
    id: "clearance_details",
    type: "element",
    layoutKey: "clearanceDetails",
    tabIndex: null,
    icon: "document-text-outline",
    iconColor: "#c4b5fd",
    title: "Clearance Details",
    body: "This card contains your:\n\n Student Name\n School Year & Semester\n Current Exam Period\n Date Cleared (if applicable)\n\nThese details are official and can be used for verification.",
  },
  {
    id: "clearance_note",
    type: "element",
    layoutKey: "clearanceNote",
    tabIndex: null,
    icon: "alert-circle-outline",
    iconColor: "#fde68a",
    title: "Action Card",
    body: "The note card at the bottom gives you guidance:\n\n• If PENDING — shows your remaining balance and directs you to pay\n• If CLEARED — confirms you're all set for exams\n• If No Fees — tells you to contact the administrator",
  },
  {
    id: "clearance_done",
    type: "center",
    layoutKey: null,
    tabIndex: null,
    icon: "checkmark-circle-outline",
    iconColor: "#6ee7b7",
    title: "Clearance Screen Done! ",
    body: "You're all set! Remember: clearance updates automatically — no need to ask anyone. Pay your fees and watch it flip to CLEARED instantly. I'm here if you need me! ",
  },
];

// ─── PROFILE SCREEN STEPS ────────────────────────────────────────────────────
const PROFILE_STEPS = [
  {
    id: "profile_welcome",
    type: "center",
    layoutKey: null,
    tabIndex: null,
    icon: "person-circle-outline",
    iconColor: "#c4b5fd",
    title: "Your Profile Screen ",
    body: "Hi! I'm UniBot. This is your personal profile page. Let me show you what you can do here!",
  },
  {
    id: "profile_header",
    type: "element",
    layoutKey: "profileHeader",
    tabIndex: null,
    icon: "camera-outline",
    iconColor: "#93c5fd",
    title: "Profile Header & Avatar",
    body: "Tap your profile photo to change it . You can take a new photo or pick from your gallery.\n\nNote: Profile photos have a 7-day cooldown between updates. The  icon appears when locked.\n\nTap the ID card icon (top right) to view your Student ID.",
  },
  {
    id: "profile_info",
    type: "element",
    layoutKey: "profileInfo",
    tabIndex: null,
    icon: "create-outline",
    iconColor: "#fde68a",
    title: "Student Information",
    body: "View your student details here:\n\n• Student number, email, course, year level, contact\n\nTap the ✏️ edit icon to update your info. Note: Edits have a 3-day cooldown. The  lock icon appears when you need to wait.",
  },
  {
    id: "profile_security",
    type: "element",
    layoutKey: "profileSecurity",
    tabIndex: null,
    icon: "shield-checkmark-outline",
    iconColor: "#6ee7b7",
    title: "Account Security",
    body: "Tap 'Change Password' to update your login password.\n\nThe password strength meter helps you create a secure password:\n\n🔴 Weak → 🟡 Fair → 🟢 Strong\n\nAlways use at least 8 characters with a mix of letters, numbers, and symbols.",
  },
  {
    id: "profile_appearance",
    type: "element",
    layoutKey: "profileAppearance",
    tabIndex: null,
    icon: "moon-outline",
    iconColor: "#c4b5fd",
    title: "Dark Mode Toggle",
    body: "Toggle between dark  and light  themes to suit your preference. The change applies instantly across the entire app!",
  },
  {
    id: "profile_support",
    type: "element",
    layoutKey: "profileSupport",
    tabIndex: null,
    icon: "help-circle-outline",
    iconColor: "#93c5fd",
    title: "Support & Legal",
    body: "Need help? Tap 'Contact Support' to email our team directly.\n\nYou can also read our Privacy Policy and Terms of Service from here anytime.",
  },
  {
    id: "profile_logout",
    type: "element",
    layoutKey: "profileLogout",
    tabIndex: null,
    icon: "log-out-outline",
    iconColor: "#f87171",
    title: "Logout Button",
    body: "When you're done, tap the Logout button to sign out securely. A confirmation dialog will appear to prevent accidental logouts.",
  },
  {
    id: "profile_done",
    type: "center",
    layoutKey: null,
    tabIndex: null,
    icon: "checkmark-circle-outline",
    iconColor: "#6ee7b7",
    title: "Profile Tour Done! ",
    body: "You now know your way around the Profile screen. Remember: keep your contact info updated so you never miss important announcements. I'm UniBot — always here to help! ",
  },
];

const SCREEN_STEPS = {
  home: HOME_STEPS,
  fees: FEES_STEPS,
  clearance: CLEARANCE_STEPS,
  profile: PROFILE_STEPS,
};

const BORDER_RADIUS = {
  header: 0,
  clearance: 38,
  cards: 45,
  fees: 25,
  pay: 25,
  history: 25,
  // fees screen
  feesHeader: 0,
  feesSummary: 25,
  feesSections: 20,
  feesTotal: 20,
  // clearance screen
  clearanceHeader: 0,
  clearanceStatus: 24,
  clearanceDetails: 20,
  clearanceNote: 18,
  // profile screen
  profileHeader: 0,
  profileInfo: 20,
  profileSecurity: 20,
  profileAppearance: 20,
  profileSupport: 20,
  profileLogout: 30,
};

const STEP_VERTICAL_PADDING = {
  header: -30,
  clearance: 10,
  cards: -8,
  fees: -3,
  pay: -3,
  history: -3,
  feesHeader: -30,
  feesSummary: 10,
  feesSections: 0,
  feesTotal: 0,
  clearanceHeader: -30,
  clearanceStatus: 10,
  clearanceDetails: 0,
  clearanceNote: 0,
  profileHeader: -30,
  profileInfo: 0,
  profileSecurity: 0,
  profileAppearance: 0,
  profileSupport: 0,
  profileLogout: 0,
};

const STEP_HORIZONTAL_PADDING = {
  header: -10,
  clearance: -20,
  cards: -18,
  fees: 0,
  pay: 0,
  history: 0,
  feesHeader: -10,
  feesSummary: -20,
  feesSections: 0,
  feesTotal: 0,
  clearanceHeader: -10,
  clearanceStatus: -20,
  clearanceDetails: 0,
  clearanceNote: 0,
  profileHeader: -10,
  profileInfo: 0,
  profileSecurity: 0,
  profileAppearance: 0,
  profileSupport: 0,
  profileLogout: 0,
};

const STEP_VERTICAL_SHIFT = {
  header: 40,
  clearance: 30,
  cards: 30,
  fees: 35,
  pay: 35,
  history: 35,
  feesHeader: 40,
  feesSummary: 30,
  feesSections: 0,
  feesTotal: 0,
  clearanceHeader: 40,
  clearanceStatus: 30,
  clearanceDetails: 0,
  clearanceNote: 0,
  profileHeader: 40,
  profileInfo: 0,
  profileSecurity: 0,
  profileAppearance: 0,
  profileSupport: 0,
  profileLogout: 0,
};

export default function OnboardingGuide({
  screen = "home",
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

  // ─── Pick the correct mascot image for this screen ───────────────────────
  const mascotImage = SCREEN_MASCOT[screen] ?? uniBotImage;

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

  const BASE_STEPS = SCREEN_STEPS[screen] || HOME_STEPS;

  const STEPS = BASE_STEPS.map((st, idx) => {
    if (idx === 0 && userName && screen === "home") {
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
  // UniBot mascot entrance animation
  const unibotMascotScale = useRef(new Animated.Value(0)).current;
  const unibotMascotBounce = useRef(new Animated.Value(0)).current;

  // Show on first launch per screen
  useEffect(() => {
    if (!userId) return;
    AsyncStorage.getItem(storageKey(userId, screen)).then((done) => {
      if (!done) setVisible(true);
    });
  }, [userId, screen]);

  // Overlay fade-in
  useEffect(() => {
    if (!visible) return;
    Animated.timing(overlayAnim, {
      toValue: 1,
      duration: 320,
      useNativeDriver: true,
    }).start();
  }, [visible]);

  // UniBot mascot pop-in on each step
  useEffect(() => {
    if (!visible) return;
    unibotMascotScale.setValue(0);
    Animated.spring(unibotMascotScale, {
      toValue: 1,
      tension: 120,
      friction: 8,
      useNativeDriver: true,
    }).start();
  }, [step, visible]);

  // UniBot mascot idle bounce
  useEffect(() => {
    if (!visible) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(unibotMascotBounce, {
          toValue: -6,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(unibotMascotBounce, {
          toValue: 0,
          duration: 900,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
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

  // Spotlight pulse loop (kept for compatibility but spotlight never renders)
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

  // Bouncing arrow for unibot and tab steps
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

  // Rect resolver
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
        BORDER_RADIUS[currentStep.layoutKey] ?? 20,
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
            BORDER_RADIUS[currentStep.layoutKey] ?? 20,
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
    if (userId) await AsyncStorage.setItem(storageKey(userId, screen), "true");
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
  const CARD_EST_H = vs(240);
  const GAP = vs(14);

  const lk = current.layoutKey;
  const vPad = lk ? (STEP_VERTICAL_PADDING[lk] ?? 4) : 0;
  const hPad = lk ? (STEP_HORIZONTAL_PADDING[lk] ?? 4) : 0;
  const vShift = lk ? (STEP_VERTICAL_SHIFT[lk] ?? 0) : 0;

  // Tooltip position
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
    tooltipStyle = { bottom: s(100) };
    arrowDir = null;
  } else if (current.type === "center" || !rect) {
    // Always anchor card to bottom so mascot has full space above it
    tooltipStyle = { bottom: vs(40) };
  } else {
    const below = SH - (rect.y + rect.height);
    const above = rect.y;
    const SAFE_TOP = vs(52); // never let the card go above this (accounts for status bar)
    const arrowX = rect.x + rect.width / 2 - CARD_MARGIN - 12;

    if (below >= CARD_EST_H + GAP) {
      // Enough space below — preferred position
      tooltipStyle = { top: rect.y + rect.height + GAP };
      arrowDir = "top";
      arrowLeft = arrowX;
    } else if (above >= CARD_EST_H + GAP) {
      // Enough space above — clamp so card never goes off the top
      const rawTop = rect.y - CARD_EST_H - GAP;
      tooltipStyle = { top: Math.max(rawTop, SAFE_TOP) };
      arrowDir = "bottom";
      arrowLeft = arrowX;
    } else {
      // Fallback — place below, clamped to safe top
      tooltipStyle = { top: Math.max(rect.y + rect.height + GAP, SAFE_TOP) };
      arrowDir = "top";
      arrowLeft = arrowX;
    }
  }

  // ─── HIGHLIGHT REMOVED ──────────────────────────────────────────────────────
  const spotRect = null;

  // ── UniBot floating button position (bottom-right corner) ──────────────────
  const unibotCenterX = SW - s(72);
  const unibotBottom = s(180);

  const sectionLabel =
    current.type === "tab" || current.type === "unibot"
      ? "Navigation"
      : current.type === "element"
        ? screen === "home"
          ? "Home Screen"
          : screen === "fees"
            ? "Fees Screen"
            : screen === "clearance"
              ? "Clearance"
              : "Profile"
        : "Overview";

  // Whether to show the mascot
  const showBigMascot = current.type === "center" || current.type === "unibot";
  const showSmallMascot = current.type === "element" || current.type === "tab";

  return (
    <Modal
      transparent
      animationType="none"
      visible={visible}
      statusBarTranslucent
    >
      <Animated.View style={[styles.overlay, { opacity: overlayAnim }]}>
        {/* ── UniBot bouncing yellow arrow — points to bottom-right FAB ── */}
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
                top: TAB_BAR_TOP - s(50),
                transform: [{ translateY: unibotBounce }],
              },
            ]}
          >
            <Ionicons name="arrow-down-circle" size={s(34)} color="#60a5fa" />
          </Animated.View>
        )}

        {/* ── Big Mascot (center/unibot steps) — uses screen-specific image ── */}
        {showBigMascot && (
          <Animated.View
            style={[
              styles.bigMascotWrap,
              {
                // Always place mascot above the card (card is bottom-anchored)
                bottom: (tooltipStyle.bottom ?? vs(40)) + CARD_EST_H + vs(8),
                transform: [
                  { scale: unibotMascotScale },
                  { translateY: unibotMascotBounce },
                ],
              },
            ]}
          >
            <Image
              source={mascotImage}
              resizeMode="contain"
              style={[styles.bigMascotImg, { width: s(180), height: s(180) }]}
            />
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

            {/* Chip + small mascot + close */}
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

              <View style={styles.chipRight}>
                {/* Small mascot in card header — uses screen-specific image ── */}
                {showSmallMascot && (
                  <Animated.View
                    style={[
                      styles.smallMascotWrap,
                      { transform: [{ translateY: unibotMascotBounce }] },
                    ]}
                  >
                    <Image
                      source={mascotImage}
                      resizeMode="contain"
                      style={[
                        styles.smallMascotImg,
                        { width: s(100), height: s(100) },
                      ]}
                    />
                  </Animated.View>
                )}
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
                    {isLast ? "Let's Go! " : "Next"}
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
  bigMascotWrap: {
    position: "absolute",
    alignSelf: "center",
    left: 0,
    right: 0,
    alignItems: "center",
  },
  bigMascotImg: {
    borderRadius: 0,
    resizeMode: "contain",
  },
  smallMascotWrap: {
    marginRight: 4,
  },
  smallMascotImg: {
    borderRadius: 0,
    resizeMode: "contain",
  },
  chipRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
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
