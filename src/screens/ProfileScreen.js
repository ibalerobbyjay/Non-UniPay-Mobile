import { Ionicons } from "@expo/vector-icons";
import { Picker } from "@react-native-picker/picker";
import { useFocusEffect } from "@react-navigation/native";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { useCallback, useContext, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { AuthContext } from "../contexts/AuthContext";
import api from "../services/api";

const COURSES = ["BSIT", "BEED", "BSED", "BSCRIM", "BSOA", "BSPOLSCI"];
const YEAR_LEVELS = ["1", "2", "3", "4"];
const SUPPORT_EMAIL = "nonunipay@gmail.com"; // ← change this

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
  {
    heading: null,
    body: "Last updated: January 1, 2026",
  },
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
  {
    heading: null,
    body: "Last updated: January 1, 2025",
  },
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

// ─── Reusable Legal Modal ────────────────────────────────────────────────────
function LegalModal({ visible, onClose, title, sections }) {
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={modalStyles.overlay}>
        <View style={modalStyles.sheet}>
          {/* Header */}
          <LinearGradient
            colors={["#0f3c91", "#1a4da8"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={modalStyles.header}
          >
            <Text style={modalStyles.headerTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose} style={modalStyles.closeBtn}>
              <Ionicons name="close" size={22} color="#fff" />
            </TouchableOpacity>
          </LinearGradient>

          {/* Scrollable content */}
          <ScrollView
            style={modalStyles.body}
            contentContainerStyle={modalStyles.bodyContent}
            showsVerticalScrollIndicator={false}
          >
            {sections.map((section, i) => (
              <View key={i} style={modalStyles.sectionBlock}>
                {section.heading && (
                  <Text style={modalStyles.heading}>{section.heading}</Text>
                )}
                <Text style={modalStyles.paragraph}>{section.body}</Text>
              </View>
            ))}
          </ScrollView>

          {/* Footer close button */}
          <View style={modalStyles.footer}>
            <TouchableOpacity
              style={modalStyles.closeFooterBtn}
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

// ─── Main Screen ─────────────────────────────────────────────────────────────
export default function ProfileScreen({ navigation }) {
  useEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  const { user, logout } = useContext(AuthContext);
  const [profile, setProfile] = useState(null);
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

  const loadProfile = async () => {
    try {
      const response = await api.get("/student/profile");
      setProfile(response.data);
      setFormData({
        contact: response.data.contact || "",
        course: response.data.course || "",
        year_level: response.data.year_level?.toString() || "",
        email: response.data.user?.email || user?.email || "",
      });

      if (response.data.last_profile_update) {
        const last = new Date(response.data.last_profile_update);
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

      if (response.data.last_picture_update) {
        const last = new Date(response.data.last_picture_update);
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
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, []),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadProfile();
    setRefreshing(false);
  };

  const handleUpdate = async () => {
    setLoading(true);
    try {
      await api.put("/student/profile", {
        ...formData,
        year_level: parseInt(formData.year_level) || 0,
      });
      Alert.alert("Success", "Profile updated successfully.");
      setEditing(false);
      loadProfile();
    } catch (error) {
      if (error.response?.status === 429) {
        Alert.alert("Too Soon", error.response.data.message);
      } else if (error.response?.status === 422) {
        const errors = error.response.data.errors;
        Alert.alert("Validation Error", Object.values(errors)[0][0]);
      } else {
        Alert.alert("Error", "Failed to update profile.");
      }
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async () => {
    if (pictureCooldown) {
      Alert.alert("Locked", pictureCooldown);
      return;
    }
    const permissionResult =
      await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert(
        "Permission required",
        "Please allow access to your photo library.",
      );
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
      base64: false,
    });
    if (!result.canceled && result.assets[0]) uploadImage(result.assets[0].uri);
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
        Alert.alert("Success", "Profile picture updated.");
        loadProfile();
      } else {
        Alert.alert("Error", response.data.message || "Upload failed");
      }
    } catch (error) {
      if (error.response?.status === 429)
        Alert.alert("Too Soon", error.response.data.message);
      else Alert.alert("Error", "Failed to upload image.");
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
      Alert.alert("Missing Fields", "Please fill in all password fields.");
      return;
    }
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      Alert.alert("Mismatch", "New passwords do not match.");
      return;
    }
    if (passwordForm.new_password.length < 8) {
      Alert.alert("Too Short", "New password must be at least 8 characters.");
      return;
    }
    if (passwordForm.new_password === passwordForm.current_password) {
      Alert.alert(
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
      Alert.alert("Success", "Password changed successfully.", [
        {
          text: "OK",
          onPress: () => {
            setChangingPassword(false);
            setPasswordForm({
              current_password: "",
              new_password: "",
              confirm_password: "",
            });
          },
        },
      ]);
    } catch (error) {
      if (error.response?.status === 422) {
        Alert.alert(
          "Validation Error",
          Object.values(error.response.data.errors)[0][0],
        );
      } else if (error.response?.status === 403) {
        Alert.alert("Wrong Password", "Your current password is incorrect.");
      } else {
        Alert.alert("Error", "Failed to change password. Please try again.");
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
      Alert.alert(
        "No Mail App Found",
        `Please send your inquiry directly to:\n\n${SUPPORT_EMAIL}`,
        [{ text: "OK" }],
      );
    }
  };

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      { text: "Logout", onPress: logout, style: "destructive" },
    ]);
  };

  const strength = getPasswordStrength(passwordForm.new_password);

  return (
    <>
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
        {/* Header */}
        <LinearGradient
          colors={["#0f3c91", "#1a4da8"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerGradient}
        >
          <View style={styles.avatarSection}>
            <TouchableOpacity
              onPress={pickImage}
              style={styles.avatarContainer}
              disabled={uploading}
            >
              {profile?.profile_picture ? (
                <Image
                  source={{ uri: profile.profile_picture }}
                  style={styles.avatar}
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
            <Text style={styles.email}>{formData.email || user?.email}</Text>
            {pictureCooldown && (
              <Text style={styles.pictureCooldownText}>{pictureCooldown}</Text>
            )}
          </View>
        </LinearGradient>

        <View style={styles.content}>
          {/* Student Information */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Student Information</Text>
              {!editing &&
                (cooldownMessage ? (
                  <Ionicons
                    name="lock-closed-outline"
                    size={24}
                    color="#94a3b8"
                  />
                ) : (
                  <TouchableOpacity onPress={() => setEditing(true)}>
                    <Ionicons name="create-outline" size={24} color="#0f3c91" />
                  </TouchableOpacity>
                ))}
            </View>

            {cooldownMessage && !editing && (
              <View style={styles.cooldownBanner}>
                <Ionicons name="time-outline" size={18} color="#b26a00" />
                <Text style={styles.cooldownText}>{cooldownMessage}</Text>
              </View>
            )}

            {editing ? (
              <View>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Email</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.email}
                    onChangeText={(t) => setFormData({ ...formData, email: t })}
                    autoCapitalize="none"
                    keyboardType="email-address"
                  />
                </View>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Contact Number</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.contact}
                    onChangeText={(t) =>
                      setFormData({ ...formData, contact: t })
                    }
                    keyboardType="phone-pad"
                  />
                </View>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Course</Text>
                  <View style={styles.pickerContainer}>
                    <Picker
                      selectedValue={formData.course}
                      onValueChange={(v) =>
                        setFormData({ ...formData, course: v })
                      }
                      style={styles.picker}
                    >
                      <Picker.Item label="Select Course" value="" />
                      {COURSES.map((c) => (
                        <Picker.Item key={c} label={c} value={c} />
                      ))}
                    </Picker>
                  </View>
                </View>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Year Level</Text>
                  <View style={styles.pickerContainer}>
                    <Picker
                      selectedValue={formData.year_level}
                      onValueChange={(v) =>
                        setFormData({ ...formData, year_level: v })
                      }
                      style={styles.picker}
                    >
                      <Picker.Item label="Select Year" value="" />
                      {YEAR_LEVELS.map((y) => (
                        <Picker.Item key={y} label={`Year ${y}`} value={y} />
                      ))}
                    </Picker>
                  </View>
                </View>
                <View style={styles.buttonRow}>
                  <TouchableOpacity
                    style={[styles.button, styles.cancelButton]}
                    onPress={() => setEditing(false)}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.button, styles.saveButton]}
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
                      styles.infoRow,
                      i === arr.length - 1 && { borderBottomWidth: 0 },
                    ]}
                  >
                    <Text style={styles.infoLabel}>{label}</Text>
                    <Text style={styles.infoValue}>{value}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* Account Security */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleRow}>
                <View
                  style={[styles.sectionIcon, { backgroundColor: "#eff6ff" }]}
                >
                  <Ionicons
                    name="shield-checkmark-outline"
                    size={18}
                    color="#0f3c91"
                  />
                </View>
                <Text style={styles.sectionTitle}>Account Security</Text>
              </View>
            </View>

            {/* Change Password */}
            <TouchableOpacity
              style={styles.actionRow}
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
                <Ionicons name="key-outline" size={20} color="#0f3c91" />
                <Text style={styles.actionRowText}>Change Password</Text>
              </View>
              <Ionicons
                name={changingPassword ? "chevron-up" : "chevron-forward"}
                size={18}
                color="#94a3b8"
              />
            </TouchableOpacity>

            {changingPassword && (
              <View style={styles.passwordForm}>
                {/* Current Password */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Current Password</Text>
                  <View style={styles.passwordInputWrapper}>
                    <TextInput
                      style={styles.passwordInput}
                      value={passwordForm.current_password}
                      onChangeText={(t) =>
                        setPasswordForm({
                          ...passwordForm,
                          current_password: t,
                        })
                      }
                      secureTextEntry={!showCurrentPw}
                      placeholder="Enter current password"
                      placeholderTextColor="#cbd5e1"
                      autoCapitalize="none"
                    />
                    <TouchableOpacity
                      onPress={() => setShowCurrentPw(!showCurrentPw)}
                      style={styles.eyeBtn}
                    >
                      <Ionicons
                        name={showCurrentPw ? "eye-off-outline" : "eye-outline"}
                        size={20}
                        color="#94a3b8"
                      />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* New Password */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>New Password</Text>
                  <View style={styles.passwordInputWrapper}>
                    <TextInput
                      style={styles.passwordInput}
                      value={passwordForm.new_password}
                      onChangeText={(t) =>
                        setPasswordForm({ ...passwordForm, new_password: t })
                      }
                      secureTextEntry={!showNewPw}
                      placeholder="Min. 8 characters"
                      placeholderTextColor="#cbd5e1"
                      autoCapitalize="none"
                    />
                    <TouchableOpacity
                      onPress={() => setShowNewPw(!showNewPw)}
                      style={styles.eyeBtn}
                    >
                      <Ionicons
                        name={showNewPw ? "eye-off-outline" : "eye-outline"}
                        size={20}
                        color="#94a3b8"
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
                                    : "#e2e8f0",
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

                {/* Confirm Password */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Confirm New Password</Text>
                  <View
                    style={[
                      styles.passwordInputWrapper,
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
                      style={styles.passwordInput}
                      value={passwordForm.confirm_password}
                      onChangeText={(t) =>
                        setPasswordForm({
                          ...passwordForm,
                          confirm_password: t,
                        })
                      }
                      secureTextEntry={!showConfirmPw}
                      placeholder="Re-enter new password"
                      placeholderTextColor="#cbd5e1"
                      autoCapitalize="none"
                    />
                    <TouchableOpacity
                      onPress={() => setShowConfirmPw(!showConfirmPw)}
                      style={styles.eyeBtn}
                    >
                      <Ionicons
                        name={showConfirmPw ? "eye-off-outline" : "eye-outline"}
                        size={20}
                        color="#94a3b8"
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
                    style={[styles.button, styles.cancelButton]}
                    onPress={() => {
                      setChangingPassword(false);
                      setPasswordForm({
                        current_password: "",
                        new_password: "",
                        confirm_password: "",
                      });
                    }}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.button,
                      styles.saveButton,
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

          {/* Support & Legal */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleRow}>
                <View
                  style={[styles.sectionIcon, { backgroundColor: "#f0fdf4" }]}
                >
                  <Ionicons
                    name="help-circle-outline"
                    size={18}
                    color="#16a34a"
                  />
                </View>
                <Text style={styles.sectionTitle}>Support & Legal</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.actionRow}
              onPress={handleContactSupport}
            >
              <View style={styles.actionRowLeft}>
                <Ionicons name="mail-outline" size={20} color="#0f3c91" />
                <View>
                  <Text style={styles.actionRowText}>Contact Support</Text>
                  <Text style={styles.actionRowSub}>{SUPPORT_EMAIL}</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity
              style={styles.actionRow}
              onPress={() => setShowPrivacy(true)}
            >
              <View style={styles.actionRowLeft}>
                <Ionicons
                  name="document-text-outline"
                  size={20}
                  color="#0f3c91"
                />
                <Text style={styles.actionRowText}>Privacy Policy</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity
              style={styles.actionRow}
              onPress={() => setShowTerms(true)}
            >
              <View style={styles.actionRowLeft}>
                <Ionicons name="shield-outline" size={20} color="#0f3c91" />
                <Text style={styles.actionRowText}>Terms of Service</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
            </TouchableOpacity>
          </View>

          {/* Logout */}
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={24} color="#f44336" />
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>

          <Text style={styles.versionText}>Version 1.0.0 · Student Portal</Text>
        </View>
      </ScrollView>

      {/* Modals — rendered outside ScrollView so they're never clipped */}
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
    </>
  );
}

// ─── Modal Styles ─────────────────────────────────────────────────────────────
const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#fff",
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
  headerTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
    flex: 1,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  body: {
    flex: 1,
  },
  bodyContent: {
    padding: 22,
    paddingBottom: 16,
  },
  sectionBlock: {
    marginBottom: 16,
  },
  heading: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0f3c91",
    marginBottom: 6,
    letterSpacing: 0.4,
  },
  paragraph: {
    fontSize: 14,
    color: "#475569",
    lineHeight: 22,
  },
  footer: {
    padding: 16,
    paddingBottom: Platform.OS === "ios" ? 32 : 16,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    backgroundColor: "#fff",
  },
  closeFooterBtn: {
    backgroundColor: "#0f3c91",
    borderRadius: 30,
    padding: 16,
    alignItems: "center",
  },
  closeFooterText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
});

// ─── Screen Styles ────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  headerGradient: {
    paddingTop: 60,
    paddingBottom: 30,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    elevation: 8,
    shadowColor: "#0f3c91",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
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
  email: { fontSize: 16, color: "rgba(255,255,255,0.9)" },
  pictureCooldownText: {
    fontSize: 12,
    color: "rgba(255,255,255,0.6)",
    marginTop: 8,
    fontStyle: "italic",
    textAlign: "center",
  },
  content: { padding: 20 },
  section: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: "#f1f5f9",
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  sectionTitleRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  sectionIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  sectionTitle: { fontSize: 18, fontWeight: "700", color: "#0f3c91" },
  cooldownBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fffbeb",
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: "rgb(244, 180, 20)",
  },
  cooldownText: { color: "#92400e", fontSize: 13, flex: 1 },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f8fafc",
  },
  infoLabel: { fontSize: 15, color: "#64748b" },
  infoValue: { fontSize: 15, fontWeight: "600", color: "#1e293b" },
  inputGroup: { marginBottom: 16 },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
    color: "#475569",
  },
  input: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    backgroundColor: "#f8fafc",
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    backgroundColor: "#f8fafc",
    overflow: "hidden",
  },
  picker: { height: 50, width: "100%" },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
    gap: 10,
  },
  button: { flex: 1, padding: 14, borderRadius: 30, alignItems: "center" },
  cancelButton: { backgroundColor: "#f1f5f9" },
  saveButton: { backgroundColor: "#0f3c91" },
  cancelButtonText: { color: "#475569", fontWeight: "600", fontSize: 16 },
  saveButtonText: { color: "#fff", fontWeight: "600", fontSize: 16 },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 13,
  },
  actionRowLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  actionRowText: { fontSize: 15, color: "#1e293b", fontWeight: "500" },
  actionRowSub: { fontSize: 12, color: "#94a3b8", marginTop: 1 },
  divider: { height: 1, backgroundColor: "#f1f5f9", marginVertical: 2 },
  passwordForm: {
    marginTop: 12,
    backgroundColor: "#f8fafc",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginBottom: 8,
  },
  passwordInputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    backgroundColor: "#fff",
    paddingRight: 4,
  },
  passwordInput: { flex: 1, padding: 14, fontSize: 15, color: "#1e293b" },
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
  logoutButton: {
    backgroundColor: "#fff",
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
  logoutText: { color: "#f44336", fontSize: 16, fontWeight: "600" },

  versionText: {
    textAlign: "center",
    color: "#cbd5e1",
    fontSize: 12,
    marginBottom: 30,
    marginTop: 4,
  },
});
