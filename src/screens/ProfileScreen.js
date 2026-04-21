import { Ionicons } from "@expo/vector-icons";
import { Picker } from "@react-native-picker/picker";
import { useFocusEffect } from "@react-navigation/native";
import { BlurView } from "expo-blur";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { useCallback, useContext, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Image,
  Linking,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { AuthContext } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";
import api, { getImageUrl } from "../services/api";

// ── No more hardcoded COURSES constant ──────────────────────────────────────
const YEAR_LEVELS = ["1", "2", "3", "4"];
const SUPPORT_EMAIL = "nonunipay@gmail.com";

// ─── Password strength helper ────────────────────────────────────────────────
function getPasswordStrength(pw) {
  if (!pw) return { score: 0, label: "", color: "#e2e8f0" };
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (score <= 1) return { score, label: "Weak", color: "#ef4444" };
  if (score <= 3) return { score, label: "Fair", color: "#f59e0b" };
  return { score, label: "Strong", color: "#22c55e" };
}

// ─── Privacy Policy content ──────────────────────────────────────────────────
const PRIVACY_CONTENT = [
  { heading: null, body: "Last updated: January 1, 2026" },
  {
    heading: "1. INFORMATION WE COLLECT",
    body: "We collect information you provide directly to us, such as your name, student number, email address, contact number, course, and year level. We may also collect a profile photo if you choose to upload one.",
  },
  {
    heading: "2. HOW WE USE YOUR INFORMATION",
    body: "Your information is used to manage your student account, send important announcements and notifications, verify your identity, and improve the portal's services.",
  },
  {
    heading: "3. DATA SHARING",
    body: "We do not sell or rent your personal information to third parties. Your data may be shared with authorized school staff and administrators for academic and administrative purposes only.",
  },
  {
    heading: "4. DATA RETENTION",
    body: "Your account data is retained for the duration of your enrollment and for a reasonable period afterward as required by school policy. You may request deletion of your account at any time.",
  },
  {
    heading: "5. SECURITY",
    body: "We implement industry-standard security measures to protect your personal information from unauthorized access, alteration, disclosure, or destruction.",
  },
  {
    heading: "6. YOUR RIGHTS",
    body: "You have the right to access, correct, or request deletion of your personal information. To exercise these rights, contact our support team.",
  },
  {
    heading: "7. COOKIES & LOCAL STORAGE",
    body: "The app uses local storage to save your preferences such as notification settings. No tracking cookies are used.",
  },
  {
    heading: "8. CHANGES TO THIS POLICY",
    body: "We may update this Privacy Policy from time to time. We will notify you of any significant changes through the app.",
  },
  {
    heading: "9. CONTACT",
    body: `For privacy-related concerns, email us at ${SUPPORT_EMAIL}.`,
  },
];

const TERMS_CONTENT = [
  { heading: null, body: "Last updated: January 1, 2025" },
  {
    heading: "1. ACCEPTANCE OF TERMS",
    body: "By using the Student Portal, you agree to be bound by these Terms of Service. If you do not agree, please discontinue use immediately.",
  },
  {
    heading: "2. ELIGIBILITY",
    body: "The portal is intended for currently enrolled students of the institution. Access is granted upon successful registration with a valid student number.",
  },
  {
    heading: "3. ACCOUNT RESPONSIBILITY",
    body: "You are responsible for maintaining the confidentiality of your login credentials. You agree to notify us immediately of any unauthorized use of your account.",
  },
  {
    heading: "4. ACCEPTABLE USE",
    body: "You agree not to upload harmful or misleading content, attempt to gain unauthorized access to systems, disrupt portal services, or violate any applicable laws or regulations.",
  },
  {
    heading: "5. PROFILE UPDATES",
    body: "Profile information updates are subject to cooldown periods. Profile details may be updated once every 3 days, and profile photos once every 7 days.",
  },
  {
    heading: "6. INTELLECTUAL PROPERTY",
    body: "All content, logos, and materials on this portal are the property of the institution and may not be reproduced without written permission.",
  },
  {
    heading: "7. DISCLAIMER",
    body: "The portal is provided as is. We do not guarantee uninterrupted availability and are not liable for any data loss or damages resulting from use of the portal.",
  },
  {
    heading: "8. TERMINATION",
    body: "We reserve the right to suspend or terminate accounts that violate these terms, without prior notice.",
  },
  {
    heading: "9. GOVERNING LAW",
    body: "These terms are governed by the laws of the Republic of the Philippines.",
  },
  {
    heading: "10. CONTACT",
    body: `For questions about these terms, email us at ${SUPPORT_EMAIL}.`,
  },
];

// ─── Reusable Alert Modal ────────────────────────────────────────────────────
function AlertModal({ visible, title, message, icon, onClose }) {
  const { colors } = useTheme();
  const iconName = icon || "alert-circle-outline";
  const iconColor = icon === "checkmark-circle" ? "#22c55e" : colors.brand;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={alertModalStyles.overlay}>
        <View
          style={[alertModalStyles.card, { backgroundColor: colors.surface }]}
        >
          <Ionicons name={iconName} size={56} color={iconColor} />
          <Text style={[alertModalStyles.title, { color: colors.textPrimary }]}>
            {title}
          </Text>
          <Text
            style={[alertModalStyles.message, { color: colors.textSecondary }]}
          >
            {message}
          </Text>
          <TouchableOpacity
            style={[alertModalStyles.button, { backgroundColor: colors.brand }]}
            onPress={onClose}
          >
            <Text style={alertModalStyles.buttonText}>OK</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ─── Reusable Legal Modal ────────────────────────────────────────────────────
function LegalModal({ visible, onClose, title, sections }) {
  const { colors } = useTheme();

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={[modalStyles.overlay, { backgroundColor: colors.overlay }]}>
        <View style={[modalStyles.sheet, { backgroundColor: colors.surface }]}>
          <LinearGradient
            colors={[colors.gradientStart, colors.gradientEnd]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={modalStyles.header}
          >
            <Text style={modalStyles.headerTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose} style={modalStyles.closeBtn}>
              <Ionicons name="close" size={22} color="#fff" />
            </TouchableOpacity>
          </LinearGradient>

          <ScrollView
            style={modalStyles.body}
            contentContainerStyle={modalStyles.bodyContent}
            showsVerticalScrollIndicator={false}
          >
            {sections.map((section, i) => (
              <View key={i} style={modalStyles.sectionBlock}>
                {section.heading && (
                  <Text style={[modalStyles.heading, { color: colors.brand }]}>
                    {section.heading}
                  </Text>
                )}
                <Text
                  style={[
                    modalStyles.paragraph,
                    { color: colors.textSecondary },
                  ]}
                >
                  {section.body}
                </Text>
              </View>
            ))}
          </ScrollView>

          <View
            style={[
              modalStyles.footer,
              {
                borderTopColor: colors.border,
                backgroundColor: colors.surface,
              },
            ]}
          >
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

// ─── Logout Confirmation Modal ───────────────────────────────────────────────
function LogoutModal({ visible, onConfirm, onCancel, colors }) {
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onCancel}
      statusBarTranslucent
    >
      <View style={logoutModalStyles.overlay}>
        <View
          style={[logoutModalStyles.card, { backgroundColor: colors.surface }]}
        >
          <View style={logoutModalStyles.iconWrap}>
            <View style={logoutModalStyles.iconCircle}>
              <Ionicons name="log-out-outline" size={36} color="#f44336" />
            </View>
          </View>
          <Text
            style={[logoutModalStyles.title, { color: colors.textPrimary }]}
          >
            Logout
          </Text>
          <Text
            style={[logoutModalStyles.message, { color: colors.textSecondary }]}
          >
            Are you sure you want to log out of your account?
          </Text>
          <View style={logoutModalStyles.buttonRow}>
            <TouchableOpacity
              style={[
                logoutModalStyles.btn,
                logoutModalStyles.cancelBtn,
                {
                  borderColor: colors.border,
                  backgroundColor: colors.surfaceSecondary,
                },
              ]}
              onPress={onCancel}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  logoutModalStyles.cancelText,
                  { color: colors.textSecondary },
                ]}
              >
                Cancel
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[logoutModalStyles.btn, logoutModalStyles.confirmBtn]}
              onPress={onConfirm}
              activeOpacity={0.8}
            >
              <Ionicons name="log-out-outline" size={18} color="#fff" />
              <Text style={logoutModalStyles.confirmText}>Logout</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── Logout Loading Overlay ──────────────────────────────────────────────────
function LogoutLoadingOverlay({ visible }) {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();

      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 700,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 700,
            useNativeDriver: true,
          }),
        ]),
      ).start();
    } else {
      fadeAnim.setValue(0);
      pulseAnim.stopAnimation();
      pulseAnim.setValue(1);
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="none">
      <Animated.View
        style={[logoutLoadingStyles.overlay, { opacity: fadeAnim }]}
      >
        <LinearGradient
          colors={["rgba(5,15,50,0.88)", "rgba(10,25,80,0.95)"]}
          style={StyleSheet.absoluteFill}
        />
        <Animated.View
          style={[
            logoutLoadingStyles.logoRing,
            { transform: [{ scale: pulseAnim }] },
          ]}
        >
          <Image
            source={require("../../assets/logo.png")}
            style={logoutLoadingStyles.logo}
          />
        </Animated.View>
        <ActivityIndicator
          size="large"
          color="#f4b400"
          style={{ marginTop: 32 }}
        />
        <Text style={logoutLoadingStyles.text}>Signing out…</Text>
        <Text style={logoutLoadingStyles.subText}>Please wait</Text>
      </Animated.View>
    </Modal>
  );
}

// ─── Profile Loading Overlay ─────────────────────────────────────────────────
function ProfileLoadingOverlay({ visible }) {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();

      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.12,
            duration: 750,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 750,
            useNativeDriver: true,
          }),
        ]),
      ).start();
    } else {
      fadeAnim.setValue(0);
      pulseAnim.stopAnimation();
      pulseAnim.setValue(1);
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <Animated.View
        style={[profileLoadingStyles.overlay, { opacity: fadeAnim }]}
      >
        <LinearGradient
          colors={["rgba(5,15,50,0.88)", "rgba(10,25,80,0.95)"]}
          style={StyleSheet.absoluteFill}
        />
        <Animated.View
          style={[
            profileLoadingStyles.logoRing,
            { transform: [{ scale: pulseAnim }] },
          ]}
        >
          <Image
            source={require("../../assets/logo.png")}
            style={profileLoadingStyles.logo}
          />
        </Animated.View>
        <ActivityIndicator
          size="large"
          color="#f4b400"
          style={{ marginTop: 32 }}
        />
        <Text style={profileLoadingStyles.text}>Loading profile…</Text>
        <Text style={profileLoadingStyles.subText}>Please wait</Text>
      </Animated.View>
    </Modal>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────
export default function ProfileScreen({ navigation }) {
  useEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  const { user, logout } = useContext(AuthContext);
  const { isDark, toggleTheme, colors } = useTheme();

  const [profile, setProfile] = useState(null);
  const [courses, setCourses] = useState([]); // ← dynamic courses
  const [coursesLoading, setCoursesLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    contact: "",
    course: "",
    year_level: "",
    email: "",
  });
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [cooldownMessage, setCooldownMessage] = useState(null);
  const [nextAllowed, setNextAllowed] = useState(null);
  const [pictureCooldown, setPictureCooldown] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [showQrModal, setShowQrModal] = useState(false);

  // Security
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    current_password: "",
    new_password: "",
    confirm_password: "",
  });
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);

  // Modals
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [showImagePickerModal, setShowImagePickerModal] = useState(false);

  // Alert modal state
  const [alertModal, setAlertModal] = useState({
    visible: false,
    title: "",
    message: "",
    icon: null,
    onConfirm: null,
  });

  const showAlert = (
    title,
    message,
    icon = "alert-circle-outline",
    onConfirm = null,
  ) => {
    setAlertModal({ visible: true, title, message, icon, onConfirm });
  };

  const closeAlert = () => {
    if (alertModal.onConfirm) {
      alertModal.onConfirm();
    }
    setAlertModal({
      visible: false,
      title: "",
      message: "",
      icon: null,
      onConfirm: null,
    });
  };

  // ─── Fetch courses from API ────────────────────────────────────────────────
  const loadCourses = async () => {
    try {
      setCoursesLoading(true);
      const response = await api.get("/school-years");
      // The response contains { school_years: [], current_semester: {}, courses: [] }
      const fetchedCourses = response.data.courses || [];
      setCourses(fetchedCourses);
    } catch (error) {
      console.error("Error loading courses:", error);
      setCourses([]);
    } finally {
      setCoursesLoading(false);
    }
  };

  // ─── Fetch profile ─────────────────────────────────────────────────────────
  const loadProfile = async () => {
    try {
      const response = await api.get("/student/profile");
      const data = response.data;
      setProfile(data);
      setFormData({
        contact: data.contact || "",
        course: data.course || "",
        year_level: data.year_level?.toString() || "",
        email: data.user?.email || user?.email || "",
      });

      if (data.last_profile_update) {
        const last = new Date(data.last_profile_update);
        const next = new Date(last);
        next.setDate(next.getDate() + 3);
        const now = new Date();
        if (now < next) {
          const daysLeft = Math.ceil((next - now) / (1000 * 60 * 60 * 24));
          setCooldownMessage(
            `You can edit your profile again in ${daysLeft} day(s).`,
          );
          setNextAllowed(next.toDateString());
        } else {
          setCooldownMessage(null);
          setNextAllowed(null);
        }
      }

      if (data.last_picture_update) {
        const last = new Date(data.last_picture_update);
        const next = new Date(last);
        next.setDate(next.getDate() + 7);
        const now = new Date();
        if (now < next) {
          const daysLeft = Math.ceil((next - now) / (1000 * 60 * 60 * 24));
          setPictureCooldown(`Photo update available in ${daysLeft} day(s).`);
        } else {
          setPictureCooldown(null);
        }
      }
    } catch (error) {
      console.error("Error loading profile:", error);
    } finally {
      setInitialLoading(false);
    }
  };

  // ─── Load both on focus ────────────────────────────────────────────────────
  useFocusEffect(
    useCallback(() => {
      // Run both in parallel for speed
      Promise.all([loadProfile(), loadCourses()]);
    }, []),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadProfile(), loadCourses()]);
    setRefreshing(false);
  };

  const handleUpdate = async () => {
    setLoading(true);
    try {
      await api.put("/student/profile", {
        ...formData,
        year_level: parseInt(formData.year_level) || 0,
      });
      showAlert("Success", "Profile updated successfully.", "checkmark-circle");
      setEditing(false);
      loadProfile();
    } catch (error) {
      if (error.response?.status === 429) {
        showAlert("Too Soon", error.response.data.message);
      } else if (error.response?.status === 422) {
        const errors = error.response.data.errors;
        const firstError = Object.values(errors)[0][0];
        showAlert("Validation Error", firstError);
      } else {
        showAlert("Error", "Failed to update profile.");
      }
    } finally {
      setLoading(false);
    }
  };

  // ─── Image picker functions ──────────────────────────────────────────────
  const pickImage = () => {
    if (pictureCooldown) {
      showAlert("Locked", pictureCooldown);
      return;
    }
    setShowImagePickerModal(true);
  };

  const takePhoto = async () => {
    setShowImagePickerModal(false);
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      showAlert(
        "Permission required",
        "Camera access is needed to take photos.",
      );
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      uploadImage(result.assets[0].uri);
    }
  };

  const pickFromGallery = async () => {
    setShowImagePickerModal(false);
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      showAlert(
        "Permission required",
        "Gallery access is needed to select photos.",
      );
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      uploadImage(result.assets[0].uri);
    }
  };

  const uploadImage = async (uri) => {
    setUploading(true);
    const form = new FormData();
    form.append("profile_picture", {
      uri,
      type: "image/jpeg",
      name: "profile.jpg",
    });
    try {
      const response = await api.post("/student/profile/picture", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      if (response.data.success) {
        showAlert("Success", "Profile picture updated.", "checkmark-circle");
        loadProfile();
      } else {
        showAlert("Error", response.data.message || "Upload failed");
      }
    } catch (error) {
      if (error.response?.status === 429)
        showAlert("Too Soon", error.response.data.message);
      else showAlert("Error", "Failed to upload image.");
    } finally {
      setUploading(false);
    }
  };

  const handleChangePassword = async () => {
    if (
      !passwordForm.current_password ||
      !passwordForm.new_password ||
      !passwordForm.confirm_password
    ) {
      showAlert("Missing Fields", "Please fill in all password fields.");
      return;
    }
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      showAlert("Mismatch", "New passwords do not match.");
      return;
    }
    if (passwordForm.new_password.length < 8) {
      showAlert("Too Short", "New password must be at least 8 characters.");
      return;
    }
    if (passwordForm.new_password === passwordForm.current_password) {
      showAlert(
        "Same Password",
        "New password must differ from your current one.",
      );
      return;
    }
    setPasswordLoading(true);
    try {
      await api.put("/student/change-password", {
        current_password: passwordForm.current_password,
        new_password: passwordForm.new_password,
        new_password_confirmation: passwordForm.confirm_password,
      });
      showAlert(
        "Success",
        "Password changed successfully.",
        "checkmark-circle",
        () => {
          setChangingPassword(false);
          setPasswordForm({
            current_password: "",
            new_password: "",
            confirm_password: "",
          });
        },
      );
    } catch (error) {
      if (error.response?.status === 422) {
        const msg = Object.values(error.response.data.errors)[0][0];
        showAlert("Validation Error", msg);
      } else if (error.response?.status === 403) {
        showAlert("Wrong Password", "Your current password is incorrect.");
      } else {
        showAlert("Error", "Failed to change password. Please try again.");
      }
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleContactSupport = async () => {
    const mailtoUrl = `mailto:${SUPPORT_EMAIL}?subject=Student Portal Support&body=Student No: ${profile?.student_no || ""}\nName: ${user?.name || ""}\n\nDescribe your issue:\n`;
    const canOpen = await Linking.canOpenURL(mailtoUrl);
    if (canOpen) {
      await Linking.openURL(mailtoUrl);
    } else {
      showAlert(
        "No Mail App Found",
        `Please send your inquiry directly to:\n\n${SUPPORT_EMAIL}`,
      );
    }
  };

  const handleLogout = () => setShowLogoutModal(true);

  const confirmLogout = async () => {
    setShowLogoutModal(false);
    setTimeout(async () => {
      setLoggingOut(true);
      await new Promise((resolve) => setTimeout(resolve, 1200));
      await logout();
      setLoggingOut(false);
    }, 150);
  };

  const strength = getPasswordStrength(passwordForm.new_password);
  const s = makeStyles(colors);

  const avatarUri = getImageUrl(profile?.profile_picture);

  if (initialLoading) {
    return <ProfileLoadingOverlay visible={initialLoading} />;
  }

  return (
    <>
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
        {/* ── Enhanced Header ── */}
        <LinearGradient
          colors={[colors.gradientStart, colors.gradientEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerGradient}
        >
          {/* Top row with icons */}
          <View style={styles.headerTopRow}>
            <View style={{ width: 40 }} />
            <View style={styles.headerIcons}>
              <TouchableOpacity
                onPress={() => {
                  if (profile?.student_no) {
                    setShowQrModal(true);
                  } else {
                    showAlert("No ID", "Student number not available.");
                  }
                }}
                style={styles.headerIconBtn}
              >
                <Ionicons name="id-card-outline" size={22} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Avatar & name */}
          <View style={styles.avatarSection}>
            <TouchableOpacity
              onPress={pickImage}
              style={styles.avatarContainer}
              disabled={uploading}
            >
              {avatarUri ? (
                <Image
                  source={{
                    uri: avatarUri,
                    headers: { "ngrok-skip-browser-warning": "true" },
                  }}
                  style={styles.avatar}
                  onError={(e) =>
                    console.warn("[Profile] Image failed to load:", avatarUri)
                  }
                />
              ) : (
                <Ionicons name="person-circle" size={100} color="#fff" />
              )}
              {uploading && (
                <View style={styles.uploadOverlay}>
                  <ActivityIndicator color="#fff" />
                </View>
              )}
              <View
                style={[
                  styles.editBadge,
                  pictureCooldown && { backgroundColor: "#94a3b8" },
                ]}
              >
                <Ionicons
                  name={pictureCooldown ? "lock-closed" : "camera"}
                  size={20}
                  color="#fff"
                />
              </View>
            </TouchableOpacity>
            <Text style={styles.name}>{user?.name}</Text>
            <Text style={styles.headerEmail}>
              {formData.email || user?.email}
            </Text>

            {/* Student number badge */}
            {profile?.student_no && (
              <View style={styles.studentIdBadge}>
                <Ionicons name="card-outline" size={14} color="#fff" />
                <Text style={styles.studentIdText}>{profile.student_no}</Text>
              </View>
            )}

            {pictureCooldown && (
              <Text style={styles.pictureCooldownText}>{pictureCooldown}</Text>
            )}
          </View>
        </LinearGradient>

        <View style={styles.content}>
          {/* ── Student Information ── */}
          <View style={s.section}>
            <View style={s.sectionHeader}>
              <Text style={s.sectionTitle}>Student Information</Text>
              {!editing &&
                (cooldownMessage ? (
                  <Ionicons
                    name="lock-closed-outline"
                    size={24}
                    color={colors.textMuted}
                  />
                ) : (
                  <TouchableOpacity onPress={() => setEditing(true)}>
                    <Ionicons
                      name="create-outline"
                      size={24}
                      color={colors.brand}
                    />
                  </TouchableOpacity>
                ))}
            </View>

            {cooldownMessage && !editing && (
              <View style={s.cooldownBanner}>
                <Ionicons
                  name="time-outline"
                  size={18}
                  color={colors.warning}
                />
                <Text style={s.cooldownText}>{cooldownMessage}</Text>
              </View>
            )}

            {editing ? (
              <View>
                <View style={s.inputGroup}>
                  <Text style={s.inputLabel}>Email</Text>
                  <TextInput
                    style={s.input}
                    value={formData.email}
                    onChangeText={(t) => setFormData({ ...formData, email: t })}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    placeholderTextColor={colors.textMuted}
                    color={colors.textPrimary}
                  />
                </View>

                <View style={s.inputGroup}>
                  <Text style={s.inputLabel}>Contact Number</Text>
                  <TextInput
                    style={s.input}
                    value={formData.contact}
                    onChangeText={(t) =>
                      setFormData({ ...formData, contact: t })
                    }
                    keyboardType="phone-pad"
                    placeholderTextColor={colors.textMuted}
                    color={colors.textPrimary}
                  />
                </View>

                {/* ── Dynamic Course Picker ── */}
                <View style={s.inputGroup}>
                  <Text style={s.inputLabel}>Course</Text>
                  <View
                    style={[
                      s.pickerContainer,
                      { backgroundColor: colors.inputBackground },
                    ]}
                  >
                    {coursesLoading ? (
                      <View style={s.pickerLoadingRow}>
                        <ActivityIndicator size="small" color={colors.brand} />
                        <Text
                          style={[
                            s.pickerLoadingText,
                            { color: colors.textMuted },
                          ]}
                        >
                          Loading courses…
                        </Text>
                      </View>
                    ) : (
                      <Picker
                        selectedValue={formData.course}
                        onValueChange={(v) =>
                          setFormData({ ...formData, course: v })
                        }
                        style={[
                          s.picker,
                          {
                            color: colors.textPrimary,
                            backgroundColor: colors.inputBackground,
                          },
                        ]}
                        dropdownIconColor={colors.textSecondary}
                        itemStyle={{
                          color: colors.textPrimary,
                          backgroundColor: colors.inputBackground,
                        }}
                      >
                        <Picker.Item
                          label="Select Course"
                          value=""
                          color={isDark ? "#94a3b8" : colors.textMuted}
                          style={{ backgroundColor: colors.inputBackground }}
                        />
                        {courses.map((c) => (
                          <Picker.Item
                            key={c.id}
                            label={c.code}
                            value={c.code}
                            color={colors.textPrimary}
                            style={{ backgroundColor: colors.inputBackground }}
                          />
                        ))}
                      </Picker>
                    )}
                  </View>
                </View>

                <View style={s.inputGroup}>
                  <Text style={s.inputLabel}>Year Level</Text>
                  <View
                    style={[
                      s.pickerContainer,
                      { backgroundColor: colors.inputBackground },
                    ]}
                  >
                    <Picker
                      selectedValue={formData.year_level}
                      onValueChange={(v) =>
                        setFormData({ ...formData, year_level: v })
                      }
                      style={[
                        s.picker,
                        {
                          color: colors.textPrimary,
                          backgroundColor: colors.inputBackground,
                        },
                      ]}
                      dropdownIconColor={colors.textSecondary}
                      itemStyle={{
                        color: colors.textPrimary,
                        backgroundColor: colors.inputBackground,
                      }}
                    >
                      <Picker.Item
                        label="Select Year"
                        value=""
                        color={isDark ? "#94a3b8" : colors.textMuted}
                        style={{ backgroundColor: colors.inputBackground }}
                      />
                      {YEAR_LEVELS.map((y) => (
                        <Picker.Item
                          key={y}
                          label={`Year ${y}`}
                          value={y}
                          color={colors.textPrimary}
                          style={{ backgroundColor: colors.inputBackground }}
                        />
                      ))}
                    </Picker>
                  </View>
                </View>

                <View style={styles.buttonRow}>
                  <TouchableOpacity
                    style={[styles.button, s.cancelButton]}
                    onPress={() => setEditing(false)}
                  >
                    <Text style={s.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.button, { backgroundColor: colors.brand }]}
                    onPress={handleUpdate}
                    disabled={loading}
                  >
                    {loading ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.saveButtonText}>Save</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View>
                {[
                  ["Student No:", profile?.student_no],
                  ["Email:", formData.email || user?.email],
                  ["Course:", profile?.course],
                  ["Year Level:", profile?.year_level],
                  ["Contact:", profile?.contact],
                ].map(([label, value], i, arr) => (
                  <View
                    key={label}
                    style={[
                      s.infoRow,
                      i === arr.length - 1 && { borderBottomWidth: 0 },
                    ]}
                  >
                    <Text style={s.infoLabel}>{label}</Text>
                    <Text style={s.infoValue}>{value}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* ── Account Security ── */}
          <View style={s.section}>
            <View style={s.sectionHeader}>
              <View style={styles.sectionTitleRow}>
                <View
                  style={[
                    styles.sectionIcon,
                    { backgroundColor: colors.brandLight },
                  ]}
                >
                  <Ionicons
                    name="shield-checkmark-outline"
                    size={18}
                    color={colors.brand}
                  />
                </View>
                <Text style={s.sectionTitle}>Account Security</Text>
              </View>
            </View>

            <TouchableOpacity
              style={s.actionRow}
              onPress={() => {
                setChangingPassword(!changingPassword);
                if (changingPassword)
                  setPasswordForm({
                    current_password: "",
                    new_password: "",
                    confirm_password: "",
                  });
              }}
            >
              <View style={styles.actionRowLeft}>
                <Ionicons name="key-outline" size={20} color={colors.brand} />
                <Text style={s.actionRowText}>Change Password</Text>
              </View>
              <Ionicons
                name={changingPassword ? "chevron-up" : "chevron-forward"}
                size={18}
                color={colors.textMuted}
              />
            </TouchableOpacity>

            {changingPassword && (
              <View style={s.passwordForm}>
                <View style={s.inputGroup}>
                  <Text style={s.inputLabel}>Current Password</Text>
                  <View style={s.passwordInputWrapper}>
                    <TextInput
                      style={s.passwordInput}
                      value={passwordForm.current_password}
                      onChangeText={(t) =>
                        setPasswordForm({
                          ...passwordForm,
                          current_password: t,
                        })
                      }
                      secureTextEntry={!showCurrentPw}
                      placeholder="Enter current password"
                      placeholderTextColor={colors.textMuted}
                      autoCapitalize="none"
                    />
                    <TouchableOpacity
                      onPress={() => setShowCurrentPw(!showCurrentPw)}
                      style={styles.eyeBtn}
                    >
                      <Ionicons
                        name={showCurrentPw ? "eye-off-outline" : "eye-outline"}
                        size={20}
                        color={colors.textMuted}
                      />
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={s.inputGroup}>
                  <Text style={s.inputLabel}>New Password</Text>
                  <View style={s.passwordInputWrapper}>
                    <TextInput
                      style={s.passwordInput}
                      value={passwordForm.new_password}
                      onChangeText={(t) =>
                        setPasswordForm({ ...passwordForm, new_password: t })
                      }
                      secureTextEntry={!showNewPw}
                      placeholder="Min. 8 characters"
                      placeholderTextColor={colors.textMuted}
                      autoCapitalize="none"
                    />
                    <TouchableOpacity
                      onPress={() => setShowNewPw(!showNewPw)}
                      style={styles.eyeBtn}
                    >
                      <Ionicons
                        name={showNewPw ? "eye-off-outline" : "eye-outline"}
                        size={20}
                        color={colors.textMuted}
                      />
                    </TouchableOpacity>
                  </View>
                  {passwordForm.new_password.length > 0 && (
                    <View style={styles.strengthRow}>
                      <View style={styles.strengthBars}>
                        {[1, 2, 3, 4, 5].map((i) => (
                          <View
                            key={i}
                            style={[
                              styles.strengthBar,
                              {
                                backgroundColor:
                                  i <= strength.score
                                    ? strength.color
                                    : colors.border,
                              },
                            ]}
                          />
                        ))}
                      </View>
                      <Text
                        style={[
                          styles.strengthLabel,
                          { color: strength.color },
                        ]}
                      >
                        {strength.label}
                      </Text>
                    </View>
                  )}
                </View>

                <View style={s.inputGroup}>
                  <Text style={s.inputLabel}>Confirm New Password</Text>
                  <View
                    style={[
                      s.passwordInputWrapper,
                      passwordForm.confirm_password.length > 0 && {
                        borderColor:
                          passwordForm.new_password ===
                          passwordForm.confirm_password
                            ? "#22c55e"
                            : "#ef4444",
                      },
                    ]}
                  >
                    <TextInput
                      style={s.passwordInput}
                      value={passwordForm.confirm_password}
                      onChangeText={(t) =>
                        setPasswordForm({
                          ...passwordForm,
                          confirm_password: t,
                        })
                      }
                      secureTextEntry={!showConfirmPw}
                      placeholder="Re-enter new password"
                      placeholderTextColor={colors.textMuted}
                      autoCapitalize="none"
                    />
                    <TouchableOpacity
                      onPress={() => setShowConfirmPw(!showConfirmPw)}
                      style={styles.eyeBtn}
                    >
                      <Ionicons
                        name={showConfirmPw ? "eye-off-outline" : "eye-outline"}
                        size={20}
                        color={colors.textMuted}
                      />
                    </TouchableOpacity>
                  </View>
                  {passwordForm.confirm_password.length > 0 &&
                    passwordForm.new_password !==
                      passwordForm.confirm_password && (
                      <Text style={styles.matchError}>
                        Passwords do not match
                      </Text>
                    )}
                </View>

                <View style={styles.buttonRow}>
                  <TouchableOpacity
                    style={[styles.button, s.cancelButton]}
                    onPress={() => {
                      setChangingPassword(false);
                      setPasswordForm({
                        current_password: "",
                        new_password: "",
                        confirm_password: "",
                      });
                    }}
                  >
                    <Text style={s.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.button,
                      { backgroundColor: colors.brand },
                      passwordLoading && { opacity: 0.7 },
                    ]}
                    onPress={handleChangePassword}
                    disabled={passwordLoading}
                  >
                    {passwordLoading ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.saveButtonText}>Update</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>

          {/* ── Appearance ── */}
          <View style={s.section}>
            <View style={s.sectionHeader}>
              <View style={styles.sectionTitleRow}>
                <View
                  style={[
                    styles.sectionIcon,
                    { backgroundColor: isDark ? "#1e293b" : "#fef9c3" },
                  ]}
                >
                  <Ionicons
                    name={isDark ? "moon" : "sunny"}
                    size={18}
                    color={isDark ? "#818cf8" : "#f59e0b"}
                  />
                </View>
                <Text style={s.sectionTitle}>Appearance</Text>
              </View>
            </View>

            <View style={s.actionRow}>
              <View style={styles.actionRowLeft}>
                <Ionicons
                  name={isDark ? "moon-outline" : "sunny-outline"}
                  size={20}
                  color={colors.brand}
                />
                <View>
                  <Text style={s.actionRowText}>Dark Mode</Text>
                  <Text style={s.actionRowSub}>
                    {isDark ? "Dark theme enabled" : "Light theme enabled"}
                  </Text>
                </View>
              </View>
              <Switch
                value={isDark}
                onValueChange={toggleTheme}
                trackColor={{ false: colors.border, true: colors.brand }}
                thumbColor="#fff"
                ios_backgroundColor={colors.border}
              />
            </View>
          </View>

          {/* ── Support & Legal ── */}
          <View style={s.section}>
            <View style={s.sectionHeader}>
              <View style={styles.sectionTitleRow}>
                <View
                  style={[
                    styles.sectionIcon,
                    { backgroundColor: isDark ? "#14532d" : "#f0fdf4" },
                  ]}
                >
                  <Ionicons
                    name="help-circle-outline"
                    size={18}
                    color="#16a34a"
                  />
                </View>
                <Text style={s.sectionTitle}>Support & Legal</Text>
              </View>
            </View>

            <TouchableOpacity
              style={s.actionRow}
              onPress={handleContactSupport}
            >
              <View style={styles.actionRowLeft}>
                <Ionicons name="mail-outline" size={20} color={colors.brand} />
                <View>
                  <Text style={s.actionRowText}>Contact Support</Text>
                  <Text style={s.actionRowSub}>{SUPPORT_EMAIL}</Text>
                </View>
              </View>
              <Ionicons
                name="chevron-forward"
                size={18}
                color={colors.textMuted}
              />
            </TouchableOpacity>

            <View style={s.divider} />

            <TouchableOpacity
              style={s.actionRow}
              onPress={() => setShowPrivacy(true)}
            >
              <View style={styles.actionRowLeft}>
                <Ionicons
                  name="document-text-outline"
                  size={20}
                  color={colors.brand}
                />
                <Text style={s.actionRowText}>Privacy Policy</Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={18}
                color={colors.textMuted}
              />
            </TouchableOpacity>

            <View style={s.divider} />

            <TouchableOpacity
              style={s.actionRow}
              onPress={() => setShowTerms(true)}
            >
              <View style={styles.actionRowLeft}>
                <Ionicons
                  name="shield-outline"
                  size={20}
                  color={colors.brand}
                />
                <Text style={s.actionRowText}>Terms of Service</Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={18}
                color={colors.textMuted}
              />
            </TouchableOpacity>
          </View>

          {/* ── Logout ── */}
          <TouchableOpacity style={s.logoutButton} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={24} color="#f44336" />
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>

          <Text style={[styles.versionText, { color: colors.textMuted }]}>
            Version 1.0.0 · Student Portal
          </Text>
        </View>
      </ScrollView>

      {/* Legal Modals */}
      <LegalModal
        visible={showPrivacy}
        onClose={() => setShowPrivacy(false)}
        title="Privacy Policy"
        sections={PRIVACY_CONTENT}
      />
      <LegalModal
        visible={showTerms}
        onClose={() => setShowTerms(false)}
        title="Terms of Service"
        sections={TERMS_CONTENT}
      />

      {/* Logout Confirmation Modal */}
      <LogoutModal
        visible={showLogoutModal}
        onConfirm={confirmLogout}
        onCancel={() => setShowLogoutModal(false)}
        colors={colors}
      />

      {/* Logout Loading Overlay */}
      <LogoutLoadingOverlay visible={loggingOut} />

      {/* Alert Modal */}
      <AlertModal
        visible={alertModal.visible}
        title={alertModal.title}
        message={alertModal.message}
        icon={alertModal.icon}
        onClose={closeAlert}
      />

      {/* Image Picker Modal */}
      <Modal
        visible={showImagePickerModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowImagePickerModal(false)}
      >
        <View style={alertModalStyles.overlay}>
          <View
            style={[alertModalStyles.card, { backgroundColor: colors.surface }]}
          >
            <Ionicons name="camera-outline" size={56} color={colors.brand} />
            <Text
              style={[alertModalStyles.title, { color: colors.textPrimary }]}
            >
              Update Profile Picture
            </Text>
            <Text
              style={[
                alertModalStyles.message,
                { color: colors.textSecondary },
              ]}
            >
              Choose an option
            </Text>
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[
                  styles.button,
                  { backgroundColor: colors.brand, flex: 1 },
                ]}
                onPress={takePhoto}
              >
                <Text style={styles.saveButtonText}>Take Photo</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.button,
                  { backgroundColor: colors.brand, flex: 1 },
                ]}
                onPress={pickFromGallery}
              >
                <Text style={styles.saveButtonText}>Gallery</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={{ marginTop: 10, padding: 8 }}
              onPress={() => setShowImagePickerModal(false)}
            >
              <Text style={{ color: colors.textMuted, fontWeight: "500" }}>
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* QR / ID Card Modal */}
      <Modal
        visible={showQrModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowQrModal(false)}
      >
        <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill} />
        <View style={alertModalStyles.overlay}>
          <View
            style={[alertModalStyles.card, { backgroundColor: colors.surface }]}
          >
            <Ionicons name="id-card-outline" size={64} color={colors.brand} />
            <Text
              style={[alertModalStyles.title, { color: colors.textPrimary }]}
            >
              Student ID Card
            </Text>

            <Text
              style={{
                fontSize: 18,
                fontWeight: "600",
                color: colors.textPrimary,
                marginTop: 8,
              }}
            >
              {user?.name}
            </Text>

            <Text
              style={[
                alertModalStyles.message,
                { color: colors.textSecondary, marginBottom: 4 },
              ]}
            >
              {profile?.student_no || "Not available"}
            </Text>

            {profile?.course && (
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "500",
                  color: colors.textPrimary,
                  marginTop: 0,
                  marginBottom: 8,
                }}
              >
                {profile.course}
              </Text>
            )}

            <Text
              style={{
                fontSize: 12,
                color: colors.textMuted,
                textAlign: "center",
                marginBottom: 16,
              }}
            >
              Show this ID number to the cashier or authorized personnel.
            </Text>

            <TouchableOpacity
              style={[
                alertModalStyles.button,
                { backgroundColor: colors.brand },
              ]}
              onPress={() => setShowQrModal(false)}
            >
              <Text style={alertModalStyles.buttonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

// ─── Dynamic styles (theme-aware) ────────────────────────────────────────────
function makeStyles(colors) {
  return StyleSheet.create({
    section: {
      backgroundColor: colors.surface,
      padding: 20,
      borderRadius: 20,
      marginBottom: 16,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 8,
      elevation: 4,
      borderWidth: 1,
      borderColor: colors.borderLight,
    },
    sectionHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 16,
      paddingBottom: 8,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    sectionTitle: { fontSize: 18, fontWeight: "700", color: colors.brand },
    cooldownBanner: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.cooldownBg,
      borderRadius: 12,
      padding: 12,
      marginBottom: 16,
      gap: 8,
      borderWidth: 1,
      borderColor: colors.cooldownBorder,
    },
    cooldownText: { color: colors.cooldownText, fontSize: 13, flex: 1 },
    infoRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.borderLight,
    },
    infoLabel: { fontSize: 15, color: colors.textSecondary },
    infoValue: { fontSize: 15, fontWeight: "600", color: colors.textPrimary },
    inputGroup: { marginBottom: 16 },
    inputLabel: {
      fontSize: 14,
      fontWeight: "600",
      marginBottom: 8,
      color: colors.textSecondary,
    },
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      padding: 14,
      fontSize: 16,
      backgroundColor: colors.inputBackground,
      color: colors.textPrimary,
    },
    pickerContainer: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      backgroundColor: colors.inputBackground,
      overflow: "hidden",
    },
    picker: { height: 50, width: "100%" },
    // Loading state inside picker container
    pickerLoadingRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      padding: 14,
      height: 50,
    },
    pickerLoadingText: {
      fontSize: 14,
    },
    cancelButton: { backgroundColor: colors.borderLight },
    cancelButtonText: {
      color: colors.textSecondary,
      fontWeight: "600",
      fontSize: 16,
    },
    actionRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: 13,
    },
    actionRowText: {
      fontSize: 15,
      color: colors.textPrimary,
      fontWeight: "500",
    },
    actionRowSub: { fontSize: 12, color: colors.textMuted, marginTop: 1 },
    divider: {
      height: 1,
      backgroundColor: colors.borderLight,
      marginVertical: 2,
    },
    passwordForm: {
      marginTop: 12,
      backgroundColor: colors.surfaceSecondary,
      borderRadius: 14,
      padding: 14,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 8,
    },
    passwordInputWrapper: {
      flexDirection: "row",
      alignItems: "center",
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      backgroundColor: colors.surface,
      paddingRight: 4,
    },
    passwordInput: {
      flex: 1,
      padding: 14,
      fontSize: 15,
      color: colors.textPrimary,
    },
    logoutButton: {
      backgroundColor: colors.surface,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      padding: 16,
      borderRadius: 30,
      borderWidth: 1,
      borderColor: "#f44336",
      elevation: 4,
      gap: 8,
      marginBottom: 12,
    },
  });
}

// ─── Modal Styles ─────────────────────────────────────────────────────────────
const alertModalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  card: {
    width: "100%",
    borderRadius: 28,
    padding: 28,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    marginTop: 16,
    marginBottom: 8,
  },
  message: {
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 28,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 30,
    minWidth: 120,
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 18,
  },
  headerTitle: { color: "#fff", fontSize: 18, fontWeight: "700", flex: 1 },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  body: { flex: 1 },
  bodyContent: { padding: 22, paddingBottom: 16 },
  sectionBlock: { marginBottom: 16 },
  heading: {
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 6,
    letterSpacing: 0.4,
  },
  paragraph: { fontSize: 14, lineHeight: 22 },
  footer: {
    padding: 16,
    paddingBottom: Platform.OS === "ios" ? 32 : 16,
    borderTopWidth: 1,
  },
  closeFooterBtn: { borderRadius: 30, padding: 16, alignItems: "center" },
  closeFooterText: { color: "#fff", fontWeight: "700", fontSize: 16 },
});

const logoutModalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  card: {
    width: "100%",
    borderRadius: 28,
    padding: 28,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 12,
  },
  iconWrap: { marginBottom: 16 },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "rgba(244,67,54,0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  title: { fontSize: 22, fontWeight: "800", marginBottom: 8 },
  message: {
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 28,
  },
  buttonRow: { flexDirection: "row", gap: 12, width: "100%" },
  btn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
  },
  cancelBtn: { borderWidth: 1 },
  confirmBtn: { backgroundColor: "#f44336" },
  cancelText: { fontSize: 15, fontWeight: "600" },
  confirmText: { color: "#fff", fontSize: 15, fontWeight: "700" },
});

const logoutLoadingStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  logoRing: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 3,
    borderColor: "rgba(244,180,0,0.65)",
    overflow: "hidden",
    shadowColor: "#f4b400",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.55,
    shadowRadius: 22,
    elevation: 14,
  },
  logo: { width: "100%", height: "100%" },
  text: {
    marginTop: 20,
    fontSize: 18,
    fontWeight: "700",
    color: "#fff",
    letterSpacing: 0.3,
  },
  subText: {
    marginTop: 5,
    fontSize: 13,
    color: "rgba(255,255,255,0.4)",
  },
});

const profileLoadingStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  logoRing: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 3,
    borderColor: "rgba(244,180,0,0.65)",
    overflow: "hidden",
    shadowColor: "#f4b400",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.55,
    shadowRadius: 22,
    elevation: 14,
  },
  logo: { width: "100%", height: "100%" },
  text: {
    marginTop: 20,
    fontSize: 18,
    fontWeight: "700",
    color: "#fff",
    letterSpacing: 0.3,
  },
  subText: {
    marginTop: 5,
    fontSize: 13,
    color: "rgba(255,255,255,0.4)",
  },
});

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerGradient: {
    paddingTop: 20,
    paddingBottom: 30,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    elevation: 8,
    shadowColor: "#0f3c91",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  headerTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  headerIcons: {
    flexDirection: "row",
    gap: 16,
  },
  headerIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.15)",
    justifyContent: "center",
    alignItems: "center",
    transform: [{ translateY: 20 }],
  },
  avatarSection: { alignItems: "center" },
  avatarContainer: { marginBottom: 15, position: "relative" },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: "rgb(244, 180, 20)",
    backgroundColor: "#fff",
  },
  uploadOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 50,
    justifyContent: "center",
    alignItems: "center",
  },
  editBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: "rgb(244, 180, 20)",
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#fff",
    elevation: 3,
  },
  name: { fontSize: 24, fontWeight: "bold", color: "#fff", marginBottom: 4 },
  headerEmail: { fontSize: 16, color: "rgba(255,255,255,0.9)" },
  studentIdBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.3)",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    marginTop: 8,
    gap: 6,
  },
  studentIdText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#fff",
  },
  pictureCooldownText: {
    fontSize: 12,
    color: "rgba(255,255,255,0.6)",
    marginTop: 8,
    fontStyle: "italic",
    textAlign: "center",
  },
  content: { padding: 20 },
  sectionTitleRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  sectionIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
    gap: 10,
  },
  button: { flex: 1, padding: 14, borderRadius: 30, alignItems: "center" },
  saveButtonText: { color: "#fff", fontWeight: "600", fontSize: 16 },
  actionRowLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  eyeBtn: { padding: 10 },
  strengthRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    gap: 8,
  },
  strengthBars: { flexDirection: "row", gap: 4, flex: 1 },
  strengthBar: { flex: 1, height: 4, borderRadius: 2 },
  strengthLabel: {
    fontSize: 12,
    fontWeight: "600",
    width: 44,
    textAlign: "right",
  },
  matchError: { fontSize: 12, color: "#ef4444", marginTop: 5, marginLeft: 2 },
  logoutText: { color: "#f44336", fontSize: 16, fontWeight: "600" },
  versionText: {
    textAlign: "center",
    fontSize: 12,
    marginBottom: 30,
    marginTop: 4,
  },
});
