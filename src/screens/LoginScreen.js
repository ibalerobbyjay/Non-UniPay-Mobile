import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { useContext, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login, logout } = useContext(AuthContext); // 👈 get logout

  // Forgot Password States
  const [forgotPasswordVisible, setForgotPasswordVisible] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetLoading, setResetLoading] = useState(false);

  const handleLogin = async () => {
    if (!username || !password) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    setLoading(true);
    try {
      const result = await login(username, password);

      if (!result.success) {
        Alert.alert("Login Failed", result.message);
      } else {
        // 🚨 Check if the user is an admin
        if (result.user && result.user.role === "admin") {
          // Immediately log out to clear any stored token
          await logout();
          Alert.alert(
            "Access Denied",
            "Admin accounts cannot log in to the mobile app. Please use the web admin panel.",
          );
          return; // Stop navigation
        }

        // Proceed to main app
        navigation.replace("MainTabs", { screen: "Home" });
      }
    } catch (error) {
      Alert.alert("Error", "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  // ✅ Handle Forgot Password
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
        Alert.alert("Success! ", response.data.message, [
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
          {/* ===== TOP IMAGE ===== */}
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

          {/* ===== GLASSY OVERLAPPING SECTION ===== */}
          <BlurView intensity={50} tint="dark" style={styles.bottomSection}>
            <Text style={styles.title}>Non-UniPay</Text>
            <Text style={styles.description}>
              School Fee Payment and Exam Clearance System
            </Text>

            <View style={styles.card}>
              <View style={styles.inputContainer}>
                <Ionicons name="person-outline" size={20} color="#666" />
                <TextInput
                  placeholder="Email"
                  placeholderTextColor="#999"
                  style={styles.input}
                  value={username}
                  onChangeText={setUsername}
                  autoCapitalize="none"
                />
              </View>

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
              style={styles.loginButton}
              onPress={handleLogin}
              disabled={loading}
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

      {/* ===== FORGOT PASSWORD MODAL ===== */}
      <Modal
        visible={forgotPasswordVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setForgotPasswordVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
          >
            <View style={styles.modalContent}>
              {/* Header */}
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Reset Password</Text>
                <TouchableOpacity
                  onPress={() => setForgotPasswordVisible(false)}
                  style={styles.closeButton}
                >
                  <Ionicons name="close" size={28} color="#666" />
                </TouchableOpacity>
              </View>

              {/* Description */}
              <Text style={styles.modalDescription}>
                Enter your email address and we'll send you instructions to
                reset your password.
              </Text>

              {/* Email Input */}
              <View style={styles.modalInputContainer}>
                <Ionicons name="mail-outline" size={22} color="#666" />
                <TextInput
                  placeholder="Enter your email"
                  placeholderTextColor="#999"
                  style={styles.modalInput}
                  value={resetEmail}
                  onChangeText={setResetEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              {/* Send Button */}
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

              {/* Cancel Button */}
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setForgotPasswordVisible(false);
                  setResetEmail("");
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
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

  // ===== MODAL STYLES =====
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },

  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 55,
    padding: 25,
    width: "100%",
    maxWidth: 350,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },

  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },

  modalTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#0f3c91",
  },

  closeButton: {
    padding: 5,
  },

  modalDescription: {
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
    marginBottom: 20,
  },

  modalInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f2f2f2",
    borderRadius: 15,
    paddingHorizontal: 15,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },

  modalInput: {
    flex: 1,
    paddingVertical: 15,
    paddingHorizontal: 10,
    fontSize: 15,
  },

  sendButton: {
    backgroundColor: "#0f3c91",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
    borderRadius: 15,
    marginBottom: 10,
  },

  sendButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    marginLeft: 8,
  },

  cancelButton: {
    padding: 14,
    alignItems: "center",
  },

  cancelButtonText: {
    color: "#666",
    fontSize: 15,
    fontWeight: "600",
  },
});
