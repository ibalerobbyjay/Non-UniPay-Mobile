import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { useContext, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  FlatList,
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

export default function RegisterScreen({ navigation }) {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    password_confirmation: "",
    student_no: "",
    course: "",
    year_level: "",
    contact: "",
    semester: "",
    school_year: "",
  });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { register } = useContext(AuthContext);

  // Validation states
  const [emailError, setEmailError] = useState("");
  const [studentNoError, setStudentNoError] = useState("");
  const [contactError, setContactError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordStrength, setPasswordStrength] = useState(0); // 0-4
  const [passwordMatch, setPasswordMatch] = useState(true);

  // Modal states
  const [courseModalVisible, setCourseModalVisible] = useState(false);
  const [yearModalVisible, setYearModalVisible] = useState(false);

  // Custom alert modal state
  const [alertModalVisible, setAlertModalVisible] = useState(false);
  const [alertTitle, setAlertTitle] = useState("");
  const [alertMessage, setAlertMessage] = useState("");
  const [alertSuccess, setAlertSuccess] = useState(false); // true for success, false for error
  const modalAnim = useRef(new Animated.Value(0)).current;

  // Loading overlay animation
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const courses = ["BSIT", "BEED", "BSED", "BSCRIM", "BSOA", "BSPOLSCI"];
  const yearLevels = ["1", "2", "3", "4"];

  // Load school year and semester on mount
  useEffect(() => {
    api
      .get("/school-years")
      .then((res) => {
        const years = res.data.school_years || [];
        const current = years.find((y) => y.is_current == 1) || null;
        if (current) {
          setFormData((prev) => ({ ...prev, school_year: current.name }));
        }

        const currentSemester = res.data.current_semester || null;
        if (currentSemester) {
          setFormData((prev) => ({ ...prev, semester: currentSemester.name }));
        }
      })
      .catch((err) => console.error("Failed to load school years:", err));
  }, []);

  // Validate email
  useEffect(() => {
    const email = formData.email;
    if (email.length === 0) {
      setEmailError("");
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailError("Please enter a valid email address");
    } else {
      setEmailError("");
    }
  }, [formData.email]);

  // Validate student number (format: XX-XXXXXX)
  useEffect(() => {
    const studentNo = formData.student_no;
    if (studentNo.length === 0) {
      setStudentNoError("");
    } else if (!/^\d{2}-\d{6}$/.test(studentNo)) {
      setStudentNoError("Student number must be in format XX-XXXXXX");
    } else {
      setStudentNoError("");
    }
  }, [formData.student_no]);

  // Validate contact number (exactly 11 digits starting with 09)
  useEffect(() => {
    const contact = formData.contact;
    if (contact.length === 0) {
      setContactError("");
    } else if (!/^09\d{9}$/.test(contact) || contact.length !== 11) {
      setContactError("Contact must be 11 digits starting with 09");
    } else {
      setContactError("");
    }
  }, [formData.contact]);

  // Validate password & confirm
  useEffect(() => {
    const pw = formData.password;
    let strength = 0;
    if (pw.length >= 8) strength++;
    if (/[a-z]/.test(pw)) strength++;
    if (/[A-Z]/.test(pw)) strength++;
    if (/[0-9]/.test(pw)) strength++;
    if (/[^a-zA-Z0-9]/.test(pw)) strength++;
    setPasswordStrength(Math.min(strength, 4));

    if (pw.length === 0) {
      setPasswordError("");
    } else if (pw.length < 8) {
      setPasswordError("Password must be at least 8 characters");
    } else if (strength < 3) {
      setPasswordError(
        "Add uppercase, number, or symbol for stronger password",
      );
    } else {
      setPasswordError("");
    }

    if (formData.password_confirmation.length > 0) {
      setPasswordMatch(pw === formData.password_confirmation);
    } else {
      setPasswordMatch(true);
    }
  }, [formData.password, formData.password_confirmation]);

  // Animation for alert modal
  useEffect(() => {
    if (alertModalVisible) {
      Animated.spring(modalAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 50,
        friction: 7,
      }).start();
    } else {
      modalAnim.setValue(0);
    }
  }, [alertModalVisible]);

  // Loading overlay pulse animation
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

  // Check if form is valid for submission
  const isFormValid = () => {
    return (
      Object.values(formData).every((val) => val.trim() !== "") &&
      emailError === "" &&
      studentNoError === "" &&
      contactError === "" &&
      passwordError === "" &&
      passwordMatch &&
      formData.password_confirmation.length > 0
    );
  };

  const showAlert = (title, message, isSuccess = false) => {
    setAlertTitle(title);
    setAlertMessage(message);
    setAlertSuccess(isSuccess);
    setAlertModalVisible(true);
  };

  const handleRegister = async () => {
    if (!isFormValid()) {
      showAlert("Error", "Please correct the errors before submitting", false);
      return;
    }

    setLoading(true);
    const result = await register({
      ...formData,
      year_level: parseInt(formData.year_level),
    });
    setLoading(false);

    if (result.success) {
      showAlert(
        "Success",
        "Registration successful! Please wait for approval.",
        true,
      );
    } else {
      showAlert("Registration Failed", result.message, false);
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
        showsVerticalScrollIndicator={false}
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
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.description}>Join Non-UniPay System</Text>

            <View style={styles.card}>
              {/* Name */}
              <View style={styles.inputContainer}>
                <Ionicons name="person-outline" size={20} color="#666" />
                <TextInput
                  placeholder="Full Name"
                  placeholderTextColor="#999"
                  style={styles.input}
                  value={formData.name}
                  onChangeText={(text) =>
                    setFormData({ ...formData, name: text })
                  }
                />
              </View>

              {/* Email with validation */}
              <View>
                <View
                  style={[
                    styles.inputContainer,
                    emailError ? styles.inputError : null,
                  ]}
                >
                  <Ionicons name="mail-outline" size={20} color="#666" />
                  <TextInput
                    placeholder="Email"
                    placeholderTextColor="#999"
                    style={styles.input}
                    value={formData.email}
                    onChangeText={(text) =>
                      setFormData({ ...formData, email: text })
                    }
                    autoCapitalize="none"
                    keyboardType="email-address"
                  />
                </View>
                {emailError ? (
                  <Text style={styles.errorText}>{emailError}</Text>
                ) : null}
              </View>

              {/* Student Number with validation */}
              <View>
                <View
                  style={[
                    styles.inputContainer,
                    studentNoError ? styles.inputError : null,
                  ]}
                >
                  <Ionicons name="card-outline" size={20} color="#666" />
                  <TextInput
                    placeholder="Student Number (XX-XXXXXX)"
                    placeholderTextColor="#999"
                    style={styles.input}
                    value={formData.student_no}
                    keyboardType="numeric" // shows numeric keypad
                    onChangeText={(text) => {
                      // Allow only digits and hyphen (max one hyphen)
                      let filtered = text.replace(/[^0-9-]/g, "");
                      // Optional: prevent multiple hyphens
                      const hyphenCount = (filtered.match(/-/g) || []).length;
                      if (hyphenCount > 1) {
                        filtered = filtered.slice(0, -1);
                      }
                      setFormData({ ...formData, student_no: filtered });
                    }}
                  />
                </View>
                {studentNoError ? (
                  <Text style={styles.errorText}>{studentNoError}</Text>
                ) : null}
              </View>

              {/* Course Picker */}
              <TouchableOpacity
                style={styles.inputContainer}
                onPress={() => setCourseModalVisible(true)}
              >
                <Ionicons name="book-outline" size={20} color="#666" />
                <Text
                  style={[
                    styles.input,
                    { color: formData.course ? "#000" : "#999" },
                  ]}
                >
                  {formData.course || "Select Course"}
                </Text>
                <Ionicons name="chevron-down" size={20} color="#999" />
              </TouchableOpacity>

              {/* Year Level Picker */}
              <TouchableOpacity
                style={styles.inputContainer}
                onPress={() => setYearModalVisible(true)}
              >
                <Ionicons name="school-outline" size={20} color="#666" />
                <Text
                  style={[
                    styles.input,
                    { color: formData.year_level ? "#000" : "#999" },
                  ]}
                >
                  {formData.year_level
                    ? `Year ${formData.year_level}`
                    : "Select Year Level"}
                </Text>
                <Ionicons name="chevron-down" size={20} color="#999" />
              </TouchableOpacity>

              {/* Contact Number with validation */}
              <View>
                <View
                  style={[
                    styles.inputContainer,
                    contactError ? styles.inputError : null,
                  ]}
                >
                  <Ionicons name="call-outline" size={20} color="#666" />
                  <TextInput
                    placeholder="Contact Number (09XXXXXXXXX)"
                    placeholderTextColor="#999"
                    style={styles.input}
                    value={formData.contact}
                    onChangeText={(text) =>
                      setFormData({ ...formData, contact: text })
                    }
                    keyboardType="phone-pad"
                    maxLength={11}
                  />
                </View>
                {contactError ? (
                  <Text style={styles.errorText}>{contactError}</Text>
                ) : null}
              </View>

              {/* Semester (read-only) */}
              <View style={[styles.inputContainer, { opacity: 0.7 }]}>
                <Ionicons name="calendar-outline" size={20} color="#666" />
                <Text
                  style={[
                    styles.input,
                    { color: formData.semester ? "#000" : "#999" },
                  ]}
                >
                  {formData.semester || "Loading semester..."}
                </Text>
                <Ionicons name="lock-closed-outline" size={16} color="#bbb" />
              </View>

              {/* School Year (read-only) */}
              <View style={[styles.inputContainer, { opacity: 0.7 }]}>
                <Ionicons name="time-outline" size={20} color="#666" />
                <Text
                  style={[
                    styles.input,
                    { color: formData.school_year ? "#000" : "#999" },
                  ]}
                >
                  {formData.school_year || "Loading school year..."}
                </Text>
                <Ionicons name="lock-closed-outline" size={16} color="#bbb" />
              </View>

              {/* Password */}
              <View style={styles.inputContainer}>
                <Ionicons name="lock-closed-outline" size={20} color="#666" />
                <TextInput
                  placeholder="Password"
                  placeholderTextColor="#999"
                  style={styles.input}
                  value={formData.password}
                  onChangeText={(text) =>
                    setFormData({ ...formData, password: text })
                  }
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                >
                  <Ionicons
                    name={showPassword ? "eye-off-outline" : "eye-outline"}
                    size={22}
                    color="#666"
                  />
                </TouchableOpacity>
              </View>

              {/* Password strength indicator */}
              {formData.password.length > 0 && (
                <>
                  <View style={styles.strengthBarContainer}>
                    {[1, 2, 3, 4].map((level) => (
                      <View
                        key={level}
                        style={[
                          styles.strengthBar,
                          {
                            backgroundColor:
                              passwordStrength >= level
                                ? level === 1
                                  ? "#f44"
                                  : level === 2
                                    ? "#f90"
                                    : level === 3
                                      ? "#fc3"
                                      : "#0c6"
                                : "#ddd",
                          },
                        ]}
                      />
                    ))}
                  </View>
                  <Text style={styles.strengthText}>
                    {passwordStrength <= 1
                      ? "Weak"
                      : passwordStrength === 2
                        ? "Fair"
                        : passwordStrength === 3
                          ? "Good"
                          : "Strong"}
                  </Text>
                  {passwordError ? (
                    <Text style={styles.errorText}>{passwordError}</Text>
                  ) : null}
                </>
              )}

              {/* Confirm Password */}
              <View>
                <View
                  style={[
                    styles.inputContainer,
                    !passwordMatch && formData.password_confirmation.length > 0
                      ? styles.inputError
                      : null,
                  ]}
                >
                  <Ionicons name="lock-closed-outline" size={20} color="#666" />
                  <TextInput
                    placeholder="Confirm Password"
                    placeholderTextColor="#999"
                    style={styles.input}
                    value={formData.password_confirmation}
                    onChangeText={(text) =>
                      setFormData({ ...formData, password_confirmation: text })
                    }
                    secureTextEntry={!showConfirmPassword}
                  />
                  <TouchableOpacity
                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    <Ionicons
                      name={
                        showConfirmPassword ? "eye-off-outline" : "eye-outline"
                      }
                      size={22}
                      color="#666"
                    />
                  </TouchableOpacity>
                  {formData.password_confirmation.length > 0 &&
                    (passwordMatch ? (
                      <Ionicons
                        name="checkmark-circle"
                        size={24}
                        color="#4caf50"
                      />
                    ) : (
                      <Ionicons name="close-circle" size={24} color="#f44336" />
                    ))}
                </View>
                {!passwordMatch &&
                  formData.password_confirmation.length > 0 && (
                    <Text
                      style={[
                        styles.errorText,
                        { marginTop: -5, marginBottom: 10 },
                      ]}
                    >
                      Passwords do not match
                    </Text>
                  )}
              </View>
            </View>

            <TouchableOpacity
              style={[
                styles.registerButton,
                !isFormValid() && styles.registerButtonDisabled,
              ]}
              onPress={handleRegister}
              disabled={loading || !isFormValid()}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.registerText}>Register</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.loginButton}
              onPress={() => navigation.goBack()}
            >
              <Text style={styles.loginText}>
                Already have an account? Login
              </Text>
            </TouchableOpacity>
          </BlurView>

          {/* Logo */}
          <View style={styles.logoWrapper}>
            <Image
              source={require("../../assets/logo.png")}
              style={styles.logo}
            />
          </View>
        </View>
      </ScrollView>

      {/* FULL‑SCREEN LOADING OVERLAY */}
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
            />
          </Animated.View>
          <ActivityIndicator
            size="large"
            color="#f4b400"
            style={{ marginTop: 32 }}
          />
          <Text style={styles.loadingText}>Creating account…</Text>
          <Text style={styles.loadingSubText}>Please wait</Text>
        </View>
      </Modal>

      {/* CUSTOM ALERT MODAL with centered icon */}
      <Modal
        visible={alertModalVisible}
        transparent
        animationType="none"
        onRequestClose={() => setAlertModalVisible(false)}
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
                {/* Centered icon */}
                <View style={styles.centeredIconWrapper}>
                  <View style={styles.modalIconWrapper}>
                    <Ionicons
                      name={alertSuccess ? "checkmark-circle" : "alert-circle"}
                      size={40}
                      color={alertSuccess ? "#4caf50" : "#e24b4a"}
                    />
                  </View>
                </View>

                <Text
                  style={[
                    styles.modalTitle,
                    {
                      color: alertSuccess ? "#4caf50" : "#e24b4a",
                      textAlign: "center",
                    },
                  ]}
                >
                  {alertTitle}
                </Text>
                <Text
                  style={[styles.modalDescription, { textAlign: "center" }]}
                >
                  {alertMessage}
                </Text>

                <TouchableOpacity
                  style={[
                    styles.sendButton,
                    { backgroundColor: alertSuccess ? "#4caf50" : "#e24b4a" },
                  ]}
                  onPress={() => {
                    setAlertModalVisible(false);
                    if (alertSuccess) {
                      navigation.navigate("Login");
                    }
                  }}
                >
                  <Text style={styles.sendButtonText}>OK</Text>
                </TouchableOpacity>
              </LinearGradient>
            </Animated.View>
          </KeyboardAvoidingView>
        </Animated.View>
      </Modal>

      {/* Course Modal */}
      <Modal visible={courseModalVisible} transparent animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalContentBottomSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Course</Text>
              <TouchableOpacity onPress={() => setCourseModalVisible(false)}>
                <Ionicons name="close" size={28} color="#666" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={courses}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.modalItem}
                  onPress={() => {
                    setFormData({ ...formData, course: item });
                    setCourseModalVisible(false);
                  }}
                >
                  <Text style={styles.modalItemText}>{item}</Text>
                  {formData.course === item && (
                    <Ionicons name="checkmark" size={24} color="#0f3c91" />
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

      {/* Year Level Modal */}
      <Modal visible={yearModalVisible} transparent animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalContentBottomSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Year Level</Text>
              <TouchableOpacity onPress={() => setYearModalVisible(false)}>
                <Ionicons name="close" size={28} color="#666" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={yearLevels}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.modalItem}
                  onPress={() => {
                    setFormData({ ...formData, year_level: item });
                    setYearModalVisible(false);
                  }}
                >
                  <Text style={styles.modalItemText}>{`Year ${item}`}</Text>
                  {formData.year_level === item && (
                    <Ionicons name="checkmark" size={24} color="#0f3c91" />
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    minHeight: 1050,
  },
  topSection: {
    height: 220,
    overflow: "hidden",
  },
  bottomSection: {
    position: "absolute",
    top: 160,
    width: "100%",
    minHeight: 900,
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    padding: 25,
    paddingTop: 80,
    backgroundColor: "#ffffffec",
  },
  logoWrapper: {
    position: "absolute",
    top: 100,
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
    color: "#fff",
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
    marginBottom: 15,
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
  strengthBarContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 5,
    marginBottom: 5,
    marginHorizontal: 15,
  },
  strengthBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    marginHorizontal: 2,
  },
  strengthText: {
    fontSize: 12,
    color: "#666",
    marginLeft: 15,
    marginBottom: 5,
  },
  registerButton: {
    backgroundColor: "#0f3c91",
    padding: 15,
    borderRadius: 25,
    alignItems: "center",
    marginTop: 10,
  },
  registerButtonDisabled: {
    backgroundColor: "#7297dc",
  },
  registerText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  loginButton: {
    marginTop: 15,
    padding: 15,
    borderRadius: 25,
    alignItems: "center",
    backgroundColor: "transparent",
  },
  loginText: {
    color: "#0f3c91",
    fontSize: 14,
    fontWeight: "600",
  },
  modalContainer: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalContentBottomSheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    paddingBottom: 30,
    maxHeight: "60%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
  },
  modalItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 18,
    borderBottomWidth: 1,
    borderBottomColor: "#f5f5f5",
  },
  modalItemText: {
    fontSize: 16,
    color: "#333",
  },

  // Loading overlay styles
  loadingOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingLogoRing: {
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

  // Custom alert modal styles
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
  modalIconWrapper: {
    backgroundColor: "rgba(15, 60, 145, 0.1)",
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  closeButton: { padding: 5 },
  modalDescription: {
    fontSize: 14,
    color: "#555",
    lineHeight: 20,
    marginBottom: 25,
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
  modalTitle: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 12,
    // textAlign: "center" (added inline)
  },
  modalDescription: {
    fontSize: 14,
    color: "#555",
    lineHeight: 20,
    marginBottom: 25,
    // textAlign: "center" (added inline)
  },
  centeredIconWrapper: {
    alignItems: "center",
    marginBottom: 20,
  },
  absoluteCloseButton: {
    position: "absolute",
    top: 20,
    right: 20,
    zIndex: 10,
  },
});
