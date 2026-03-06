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
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { AuthContext } from "../contexts/AuthContext";

export default function LoginScreen({ navigation }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useContext(AuthContext);

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
        navigation.replace("MainTabs", { screen: "Home" });
      }
    } catch (error) {
      Alert.alert("Error", "Something went wrong.");
    } finally {
      setLoading(false);
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
                  placeholder="Username"
                  placeholderTextColor="#999"
                  style={styles.input}
                  value={username}
                  onChangeText={setUsername}
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
                  secureTextEntry
                />
              </View>
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
    </KeyboardAvoidingView>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  topSection: {
    flex: 0.45,

    overflow: "hidden", // removes white edges
  },
  bottomSection: {
    position: "absolute",
    bottom: 0,
    width: "100%",
    height: "62%", // overlaps top
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    padding: 25,
    paddingTop: 80,
    backgroundColor: "#ffffffec", // keep your original color
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
});
