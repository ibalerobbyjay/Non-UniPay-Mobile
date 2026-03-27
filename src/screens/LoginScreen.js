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

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login, logout } = useContext(AuthContext);

  // Validation state
  const [emailError, setEmailError] = useState("");

  // Forgot Password States
  const [forgotPasswordVisible, setForgotPasswordVisible] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const modalAnim = useRef(new Animated.Value(0)).current;

  // Validate email format
  useEffect(() => {
    if (email.length === 0) {
      setEmailError("");
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailError("Please enter a valid email address");
    } else {
      setEmailError("");
    }
  }, [email]);

  // Form validity
  const isFormValid = () => {
    return email.length > 0 && password.length > 0 && emailError === "";
  };

  // Modal animations
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

  const handleLogin = async () => {
    if (!isFormValid()) {
      Alert.alert("Error", "Please enter a valid email and password");
      return;
    }

    setLoading(true);
    try {
      const result = await login(email, password);

      if (!result.success) {
        Alert.alert("Login Failed", result.message);
      } else {
        if (result.user && result.user.role === "admin") {
          await logout();
          Alert.alert(
            "Access Denied",
            "Admin accounts cannot log in to the mobile app. Please use the web admin panel.",
          );
          return;
        }
        navigation.replace("MainTabs", { screen: "Home" });
      }
    } catch (error) {
      Alert.alert("Error", "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  // Handle Forgot Password
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

          {/* GLASSY OVERLAPPING SECTION */}
          <BlurView intensity={50} tint="dark" style={styles.bottomSection}>
            <Text style={styles.title}>Non-UniPay</Text>
            <Text style={styles.description}>
              School Fee Payment and Exam Clearance System
            </Text>

            <View style={styles.card}>
              {/* Email with validation */}
              <View>
                <View
                  style={[
                    styles.inputContainer,
                    emailError ? styles.inputError : null,
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
                  />
                </View>
                {emailError ? (
                  <Text style={styles.errorText}>{emailError}</Text>
                ) : null}
              </View>

              {/* Password */}
              <View style={styles.inputContainer}>
                <Ionicons name="lock-closed-outline" size={20} color="#666" />
                <TextInput
                  placeholder="Password"
                  placeholderTextColor="#999"
                  style={styles.input}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons
                    name={showPassword ? "eye-off-outline" : "eye-outline"}
                    size={22}
                    color="#666"
                  />
                </TouchableOpacity>
              </View>

              {/* Forgot Password Link */}
              <TouchableOpacity
                style={styles.forgotPasswordContainer}
                onPress={() => setForgotPasswordVisible(true)}
              >
                <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[
                styles.loginButton,
                !isFormValid() && styles.loginButtonDisabled,
              ]}
              onPress={handleLogin}
              disabled={loading || !isFormValid()}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.loginText}>Login</Text>
              )}
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

      {/* FORGOT PASSWORD MODAL - IMPROVED */}
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
                {
                  transform: [{ scale: modalScale }],
                },
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
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topSection: {
    flex: 0.45,
    overflow: "hidden",
  },
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
    color: "#000", // FIX: ensures text (including dots) is visible
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
  // Modal styles - Improved
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
  modalGradient: {
    padding: 25,
    borderRadius: 30,
  },
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
  closeButton: {
    padding: 5,
  },
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
  cancelButton: {
    padding: 12,
    alignItems: "center",
  },
  cancelButtonText: {
    color: "#999",
    fontSize: 15,
    fontWeight: "600",
  },
});
