import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { useContext, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Image,
  ImageBackground,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { AuthContext } from "../contexts/AuthContext";
import api from "../services/api";

const MAX_ATTEMPTS = 3;
const BASE_LOCKOUT_SECONDS = 30;

function formatDuration(seconds) {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s === 0 ? `${m}m` : `${m}m ${s}s`;
}

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login, logout } = useContext(AuthContext);

  // Validation
  const [emailError, setEmailError] = useState("");

  // Lockout state
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutEnd, setLockoutEnd] = useState(null);
  const [lockoutSeconds, setLockoutSeconds] = useState(0);
  const [lockoutCount, setLockoutCount] = useState(0);
  const [lockoutDuration, setLockoutDuration] = useState(0);

  // Forgot Password modal
  const [forgotPasswordVisible, setForgotPasswordVisible] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const modalAnim = useRef(new Animated.Value(0)).current;

  // Toast state
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState("error");
  const toastTimeout = useRef(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Loading screen pulse animation
  const pulseAnim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (loading) {
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
      pulseAnim.stopAnimation();
      pulseAnim.setValue(1);
    }
  }, [loading]);

  // Email validation
  useEffect(() => {
    if (email.length === 0) {
      setEmailError("");
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailError("Please enter a valid email address");
    } else {
      setEmailError("");
    }
  }, [email]);

  // Lockout countdown
  useEffect(() => {
    if (!lockoutEnd) return;
    const interval = setInterval(() => {
      const remaining = Math.ceil((lockoutEnd - Date.now()) / 1000);
      if (remaining <= 0) {
        setLockoutEnd(null);
        setLockoutSeconds(0);
        setFailedAttempts(0);
        clearInterval(interval);
      } else {
        setLockoutSeconds(remaining);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [lockoutEnd]);

  // Forgot Password modal animation
  useEffect(() => {
    if (forgotPasswordVisible) {
      Animated.spring(modalAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 50,
        friction: 7,
      }).start();
    } else {
      modalAnim.setValue(0);
    }
  }, [forgotPasswordVisible]);

  // Toast helper
  const showToast = (message, type = "error") => {
    if (toastTimeout.current) clearTimeout(toastTimeout.current);

    setToastMessage(message);
    setToastType(type);
    setToastVisible(true);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();

    toastTimeout.current = setTimeout(() => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        setToastVisible(false);
        setToastMessage("");
      });
    }, 5000);
  };

  const isFormValid = () =>
    email.length > 0 && password.length > 0 && emailError === "";

  const isLocked = !!lockoutEnd;

  // Login logic
  const handleLogin = async () => {
    if (isLocked) return;
    if (!isFormValid()) {
      showToast("Please enter a valid email and password");
      return;
    }

    setLoading(true);
    try {
      const result = await login(email, password);

      if (!result.success) {
        setLoading(false);

        const newAttempts = failedAttempts + 1;

        if (newAttempts >= MAX_ATTEMPTS) {
          const newLockoutCount = lockoutCount + 1;
          const duration =
            BASE_LOCKOUT_SECONDS * Math.pow(2, newLockoutCount - 1);

          setLockoutCount(newLockoutCount);
          setLockoutDuration(duration);
          setFailedAttempts(0);
          setLockoutEnd(Date.now() + duration * 1000);
          setLockoutSeconds(duration);

          showToast(
            `Too many failed attempts. Please wait ${formatDuration(duration)} before trying again.`,
          );
        } else {
          setFailedAttempts(newAttempts);
          showToast(
            `${result.message}\n\nAttempt ${newAttempts} of ${MAX_ATTEMPTS}.`,
          );
        }
      } else {
        setFailedAttempts(0);
        setLockoutEnd(null);
        setLockoutSeconds(0);
        setLockoutCount(0);
        setLockoutDuration(0);

        if (result.user && result.user.role === "admin") {
          await logout();
          showToast(
            "Admin accounts cannot log in to the mobile app. Please use the web admin panel.",
            "info",
          );
          setLoading(false);
          return;
        }
        navigation.replace("MainTabs", { screen: "Home" });
      }
    } catch (error) {
      setLoading(false);
      console.error("Login error:", error);
      showToast("Something went wrong. Please try again.");
    } finally {
      if (loading) setLoading(false);
    }
  };

  // Forgot password handler
  const handleForgotPassword = async () => {
    if (!resetEmail) {
      Alert.alert("Error", "Please enter your email address");
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(resetEmail)) {
      Alert.alert("Error", "Please enter a valid email address");
      return;
    }

    setResetLoading(true);
    try {
      const response = await api.post("/password/reset-request", {
        email: resetEmail,
      });
      if (response.data.success) {
        Alert.alert("Success!", response.data.message, [
          {
            text: "OK",
            onPress: () => {
              setForgotPasswordVisible(false);
              setResetEmail("");
            },
          },
        ]);
      } else {
        Alert.alert(
          "Error",
          response.data.message || "Failed to send reset email",
        );
      }
    } catch (error) {
      console.error("Forgot password error:", error);
      if (error.response?.status === 404) {
        Alert.alert("Error", "Email not found in our system");
      } else {
        Alert.alert("Error", "Failed to send reset email. Please try again.");
      }
    } finally {
      setResetLoading(false);
    }
  };

  const modalScale = modalAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.8, 1],
  });
  const modalOpacity = modalAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.container}>
          {/* TOP IMAGE */}
          <ImageBackground
            source={require("../../assets/bg.jpg")}
            style={styles.topSection}
            resizeMode="cover"
          >
            <BlurView intensity={30} style={StyleSheet.absoluteFill} />
            <LinearGradient
              colors={["rgba(0,0,0,0.3)", "rgba(0,0,0,0.6)"]}
              style={StyleSheet.absoluteFill}
            />
          </ImageBackground>

          {/* GLASSY SECTION */}
          <BlurView intensity={50} tint="dark" style={styles.bottomSection}>
            <Text style={styles.title}>Non-UniPay</Text>
            <Text style={styles.description}>
              School Fee Payment and Exam Clearance System
            </Text>

            <View style={styles.card}>
              {/* Email */}
              <View>
                <View
                  style={[
                    styles.inputContainer,
                    emailError ? styles.inputError : null,
                    isLocked && { opacity: 0.5 },
                  ]}
                >
                  <Ionicons name="person-outline" size={20} color="#666" />
                  <TextInput
                    placeholder="Email"
                    placeholderTextColor="#999"
                    style={styles.input}
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    editable={!isLocked}
                    maxLength={25}
                  />
                </View>
                {emailError ? (
                  <Text style={styles.errorText}>{emailError}</Text>
                ) : null}
              </View>

              {/* Password */}
              <View
                style={[styles.inputContainer, isLocked && { opacity: 0.5 }]}
              >
                <Ionicons name="lock-closed-outline" size={20} color="#666" />
                <TextInput
                  placeholder="Password"
                  placeholderTextColor="#999"
                  style={styles.input}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  editable={!isLocked}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  disabled={isLocked}
                >
                  <Ionicons
                    name={showPassword ? "eye-off-outline" : "eye-outline"}
                    size={22}
                    color="#666"
                  />
                </TouchableOpacity>
              </View>

              {/* Forgot Password */}
              <TouchableOpacity
                style={styles.forgotPasswordContainer}
                onPress={() => setForgotPasswordVisible(true)}
                disabled={isLocked}
              >
                <Text
                  style={[
                    styles.forgotPasswordText,
                    isLocked && { color: "#aaa" },
                  ]}
                >
                  Forgot Password?
                </Text>
              </TouchableOpacity>
            </View>

            {/* Attempt dots */}
            {failedAttempts > 0 && !isLocked && (
              <View style={styles.attemptRow}>
                {[1, 2, 3].map((i) => (
                  <View
                    key={i}
                    style={[
                      styles.attemptDot,
                      i <= failedAttempts && styles.attemptDotFilled,
                    ]}
                  />
                ))}
              </View>
            )}

            {/* Lockout warning */}
            {isLocked && (
              <View style={styles.lockoutBox}>
                <View style={styles.lockoutLeft}>
                  <Ionicons name="lock-closed" size={20} color="#e24b4a" />
                  <View style={{ marginLeft: 10 }}>
                    <Text style={styles.lockoutTitle}>
                      Account temporarily locked
                    </Text>
                    <Text style={styles.lockoutSub}>
                      {lockoutCount > 1
                        ? `Lockout #${lockoutCount} — wait time is increasing`
                        : "Too many failed attempts"}
                    </Text>
                  </View>
                </View>
                <Text style={styles.lockoutTimer}>
                  {formatDuration(lockoutSeconds)}
                </Text>
              </View>
            )}

            {/* Escalation hint */}
            {isLocked && lockoutCount > 1 && (
              <Text style={styles.lockoutHint}>
                Each lockout doubles the wait:{" "}
                {formatDuration(
                  BASE_LOCKOUT_SECONDS * Math.pow(2, lockoutCount - 2),
                )}{" "}
                → {formatDuration(lockoutDuration)}
              </Text>
            )}

            {/* Login button */}
            <TouchableOpacity
              style={[
                styles.loginButton,
                (!isFormValid() || isLocked) && styles.loginButtonDisabled,
              ]}
              onPress={handleLogin}
              disabled={loading || !isFormValid() || isLocked}
            >
              <Text style={styles.loginText}>
                {isLocked
                  ? `Locked — wait ${formatDuration(lockoutSeconds)}`
                  : "Login"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.signupButton}
              onPress={() => navigation.navigate("Register")}
            >
              <Text style={styles.signupText}>Sign Up</Text>
            </TouchableOpacity>
          </BlurView>

          <View style={styles.logoWrapper}>
            <Image
              source={require("../../assets/logo.png")}
              style={styles.logo}
            />
          </View>
        </View>
      </ScrollView>

      {/* FULL‑SCREEN LOADING OVERLAY (fixed ring size) */}
      <Modal visible={loading} transparent animationType="fade">
        <View style={styles.loadingOverlay}>
          <BlurView
            intensity={40}
            tint="dark"
            style={StyleSheet.absoluteFill}
          />
          <LinearGradient
            colors={["rgba(5,15,50,0.88)", "rgba(10,25,80,0.95)"]}
            style={StyleSheet.absoluteFill}
          />
          <Animated.View
            style={[
              styles.loadingLogoRing,
              { transform: [{ scale: pulseAnim }] },
            ]}
          >
            <Image
              source={require("../../assets/logo.png")}
              style={styles.loadingLogo}
              resizeMode="contain"
            />
          </Animated.View>
          <ActivityIndicator
            size="large"
            color="#f4b400"
            style={{ marginTop: 32 }}
          />
          <Text style={styles.loadingText}>Signing you in…</Text>
          <Text style={styles.loadingSubText}>Please wait</Text>
        </View>
      </Modal>

      {/* FORGOT PASSWORD MODAL */}
      <Modal
        visible={forgotPasswordVisible}
        transparent
        animationType="none"
        onRequestClose={() => setForgotPasswordVisible(false)}
      >
        <Animated.View style={[styles.modalOverlay, { opacity: modalOpacity }]}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
          >
            <Animated.View
              style={[
                styles.modalContent,
                { transform: [{ scale: modalScale }] },
              ]}
            >
              <LinearGradient
                colors={["#fff", "#f9f9ff"]}
                style={styles.modalGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={styles.modalHeader}>
                  <View style={styles.modalIconWrapper}>
                    <Ionicons
                      name="lock-open-outline"
                      size={32}
                      color="#0f3c91"
                    />
                  </View>
                  <TouchableOpacity
                    onPress={() => setForgotPasswordVisible(false)}
                    style={styles.closeButton}
                  >
                    <Ionicons name="close-circle" size={32} color="#999" />
                  </TouchableOpacity>
                </View>

                <Text style={styles.modalTitle}>Reset Password</Text>
                <Text style={styles.modalDescription}>
                  Enter your email address and we'll send you a link to reset
                  your password.
                </Text>

                <View style={styles.modalInputContainer}>
                  <Ionicons name="mail-outline" size={22} color="#0f3c91" />
                  <TextInput
                    placeholder="Email address"
                    placeholderTextColor="#aaa"
                    style={styles.modalInput}
                    value={resetEmail}
                    onChangeText={setResetEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    maxLength={25}
                  />
                </View>

                <TouchableOpacity
                  style={styles.sendButton}
                  onPress={handleForgotPassword}
                  disabled={resetLoading}
                >
                  {resetLoading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="send" size={20} color="#fff" />
                      <Text style={styles.sendButtonText}>Send Reset Link</Text>
                    </>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => {
                    setForgotPasswordVisible(false);
                    setResetEmail("");
                  }}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
              </LinearGradient>
            </Animated.View>
          </KeyboardAvoidingView>
        </Animated.View>
      </Modal>

      {/* TOAST NOTIFICATION */}
      {toastVisible && (
        <Animated.View
          style={[
            styles.toastContainer,
            { opacity: fadeAnim },
            toastType === "error" ? styles.toastError : styles.toastInfo,
          ]}
        >
          <Ionicons
            name={toastType === "error" ? "alert-circle" : "information-circle"}
            size={22}
            color="#fff"
          />
          <Text style={styles.toastText}>{toastMessage}</Text>
        </Animated.View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topSection: { flex: 0.45, overflow: "hidden" },
  bottomSection: {
    position: "absolute",
    bottom: 0,
    width: "100%",
    height: "62%",
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    padding: 25,
    paddingTop: 80,
    backgroundColor: "#ffffffec",
  },
  logoWrapper: {
    position: "absolute",
    top: "30%",
    alignSelf: "center",
    zIndex: 10,
  },
  logo: {
    width: 130,
    height: 130,
    borderRadius: 65,
    borderWidth: 4,
    borderColor: "#fff",
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#0f3c91",
    textAlign: "center",
    marginBottom: 5,
  },
  description: {
    fontSize: 13,
    color: "#000000",
    textAlign: "center",
    marginBottom: 20,
  },
  card: {
    backgroundColor: "rgba(255,255,255,0.9)",
    borderRadius: 20,
    padding: 20,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f2f2f2",
    borderRadius: 25,
    paddingHorizontal: 15,
    marginBottom: 10,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 10,
    fontSize: 15,
    color: "#000",
  },
  inputError: {
    borderWidth: 1,
    borderColor: "#f44336",
  },
  errorText: {
    color: "#f44336",
    fontSize: 12,
    marginLeft: 15,
    marginBottom: 10,
  },
  forgotPasswordContainer: {
    alignItems: "flex-end",
    marginTop: 5,
    marginBottom: 5,
  },
  forgotPasswordText: {
    color: "#0f3c91",
    fontSize: 13,
    fontWeight: "600",
  },

  // Attempt dots
  attemptRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 14,
    marginBottom: 2,
  },
  attemptDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#ddd",
  },
  attemptDotFilled: {
    backgroundColor: "#e24b4a",
  },

  // Lockout box
  lockoutBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fef2f2",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#fecaca",
    padding: 14,
    marginTop: 14,
  },
  lockoutLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  lockoutTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#e24b4a",
  },
  lockoutSub: {
    fontSize: 11,
    color: "#f87171",
    marginTop: 2,
  },
  lockoutTimer: {
    fontSize: 20,
    fontWeight: "700",
    color: "#e24b4a",
    minWidth: 50,
    textAlign: "right",
  },
  lockoutHint: {
    fontSize: 11,
    color: "#f87171",
    textAlign: "center",
    marginTop: 6,
    fontStyle: "italic",
  },

  // Buttons
  loginButton: {
    backgroundColor: "#0f3c91",
    padding: 15,
    borderRadius: 25,
    alignItems: "center",
    marginTop: 20,
  },
  loginButtonDisabled: {
    backgroundColor: "#7297dc",
  },
  loginText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  signupButton: {
    marginTop: 15,
    borderWidth: 1,
    borderColor: "rgb(244, 180, 0)",
    padding: 15,
    borderRadius: 25,
    alignItems: "center",
    backgroundColor: "rgb(244, 180, 20)",
  },
  signupText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },

  // Full‑screen loading overlay (fixed ring)
  loadingOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingLogoRing: {
    width: 130,
    height: 130,
    borderRadius: 65,
    borderWidth: 3,
    borderColor: "rgba(244,180,0,0.65)",
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "transparent",
    shadowColor: "#f4b400",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.55,
    shadowRadius: 22,
    elevation: 14,
  },
  loadingLogo: {
    width: "100%",
    height: "100%",
  },
  loadingText: {
    marginTop: 20,
    fontSize: 18,
    fontWeight: "700",
    color: "#fff",
    letterSpacing: 0.3,
  },
  loadingSubText: {
    marginTop: 5,
    fontSize: 13,
    color: "rgba(255,255,255,0.4)",
  },

  // Modal (forgot password)
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.65)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    width: "100%",
    maxWidth: 350,
    borderRadius: 30,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 15 },
    shadowOpacity: 0.25,
    shadowRadius: 25,
    elevation: 15,
  },
  modalGradient: { padding: 25, borderRadius: 30 },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  modalIconWrapper: {
    backgroundColor: "rgba(15, 60, 145, 0.1)",
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
  },
  closeButton: { padding: 5 },
  modalTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#0f3c91",
    marginBottom: 12,
  },
  modalDescription: {
    fontSize: 14,
    color: "#555",
    lineHeight: 20,
    marginBottom: 25,
  },
  modalInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8f9fc",
    borderRadius: 20,
    paddingHorizontal: 18,
    marginBottom: 25,
    borderWidth: 1,
    borderColor: "#e0e7ff",
  },
  modalInput: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 12,
    fontSize: 16,
    color: "#333",
  },
  sendButton: {
    backgroundColor: "#0f3c91",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
    borderRadius: 20,
    marginBottom: 12,
    shadowColor: "#0f3c91",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  sendButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    marginLeft: 10,
  },
  cancelButton: { padding: 12, alignItems: "center" },
  cancelButtonText: { color: "#999", fontSize: 15, fontWeight: "600" },

  // Toast
  toastContainer: {
    position: "absolute",
    top: Platform.OS === "ios" ? 50 : 30,
    left: 20,
    right: 20,
    backgroundColor: "#333",
    borderRadius: 25,
    paddingVertical: 12,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 1000,
  },
  toastError: {
    backgroundColor: "#e24b4a",
  },
  toastInfo: {
    backgroundColor: "#0f3c91",
  },
  toastText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "500",
    marginLeft: 10,
    flex: 1,
    textAlign: "center",
  },
});
