import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { useContext, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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

  const [courseModalVisible, setCourseModalVisible] = useState(false);
  const [yearModalVisible, setYearModalVisible] = useState(false);

  const courses = ["BSIT", "BEED", "BSED", "BSCRIM", "BSOA", "BSPOLSCI"];
  const yearLevels = ["1", "2", "3", "4"];

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

  const handleRegister = async () => {
    if (Object.values(formData).some((val) => !val)) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    if (formData.password !== formData.password_confirmation) {
      Alert.alert("Error", "Passwords do not match");
      return;
    }

    setLoading(true);
    const result = await register({
      ...formData,
      year_level: parseInt(formData.year_level),
    });
    setLoading(false);

    if (result.success) {
      Alert.alert(
        "Success",
        "Registration successful! Please wait for approval.",
        [{ text: "OK", onPress: () => navigation.navigate("Login") }],
      );
    } else {
      Alert.alert("Registration Failed", result.message);
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

              {/* Email */}
              <View style={styles.inputContainer}>
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

              {/* Student Number */}
              <View style={styles.inputContainer}>
                <Ionicons name="card-outline" size={20} color="#666" />
                <TextInput
                  placeholder="Student Number"
                  placeholderTextColor="#999"
                  style={styles.input}
                  value={formData.student_no}
                  onChangeText={(text) =>
                    setFormData({ ...formData, student_no: text })
                  }
                />
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

              {/* Contact */}
              <View style={styles.inputContainer}>
                <Ionicons name="call-outline" size={20} color="#666" />
                <TextInput
                  placeholder="Contact Number"
                  placeholderTextColor="#999"
                  style={styles.input}
                  value={formData.contact}
                  onChangeText={(text) =>
                    setFormData({ ...formData, contact: text })
                  }
                  keyboardType="phone-pad"
                />
              </View>

              {/* Semester (read-only, auto-filled) */}
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

              {/* School Year (read-only, auto-filled) */}
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
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons
                    name={showPassword ? "eye-off-outline" : "eye-outline"}
                    size={22}
                    color="#666"
                  />
                </TouchableOpacity>
              </View>

              {/* Confirm Password */}
              <View style={styles.inputContainer}>
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
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons
                    name={
                      showConfirmPassword ? "eye-off-outline" : "eye-outline"
                    }
                    size={22}
                    color="#666"
                  />
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              style={styles.registerButton}
              onPress={handleRegister}
              disabled={loading}
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

        {/* Course Modal */}
        <Modal visible={courseModalVisible} transparent animationType="slide">
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
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
            <View style={styles.modalContent}>
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
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    minHeight: 1000,
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
  },
  registerButton: {
    backgroundColor: "#0f3c91",
    padding: 15,
    borderRadius: 25,
    alignItems: "center",
    marginTop: 10,
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
  modalContent: {
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
});
