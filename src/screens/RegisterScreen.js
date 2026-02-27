import { useContext, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    KeyboardAvoidingView,
  Platform,
  Modal,
  FlatList,
} from "react-native";
import { AuthContext } from "../contexts/AuthContext";


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
  });
  const [loading, setLoading] = useState(false);
  const { register } = useContext(AuthContext);

  const [courseModalVisible, setCourseModalVisible] = useState(false);
const [yearModalVisible, setYearModalVisible] = useState(false);

const courses = ["BSIT", "BSBA", "BSED", "BSCRIM"];
const yearLevels = ["1", "2", "3", "4", "5"];

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
  Alert.alert("Success", result.message);
  navigation.navigate("Login");
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
    style={styles.container}
    contentContainerStyle={{ flexGrow: 1 }}
    keyboardShouldPersistTaps="handled"
  >
      <View style={styles.content}>
        <Text style={styles.title}>Create Account</Text>

        <TextInput
          style={styles.input}
          placeholder="Full Name"
          value={formData.name}
          onChangeText={(text) => setFormData({ ...formData, name: text })}
        />

        <TextInput
          style={styles.input}
          placeholder="Email"
          value={formData.email}
          onChangeText={(text) => setFormData({ ...formData, email: text })}
          autoCapitalize="none"
          keyboardType="email-address"
        />

        <TextInput
          style={styles.input}
          placeholder="Student Number"
          value={formData.student_no}
          onChangeText={(text) =>
            setFormData({ ...formData, student_no: text })
          }
        />

        <TouchableOpacity
  style={styles.input}
  onPress={() => setCourseModalVisible(true)}
>
  <Text style={{ color: formData.course ? "#000" : "#999" }}>
    {formData.course || "Select Course"}
  </Text>
</TouchableOpacity>

      <TouchableOpacity
  style={styles.input}
  onPress={() => setYearModalVisible(true)}
>
  <Text style={{ color: formData.year_level ? "#000" : "#999" }}>
    {formData.year_level
      ? `Year ${formData.year_level}`
      : "Select Year Level"}
  </Text>
</TouchableOpacity>

        <TextInput
          style={styles.input}
          placeholder="Contact Number"
          value={formData.contact}
          onChangeText={(text) => setFormData({ ...formData, contact: text })}
          keyboardType="phone-pad"
        />

        <TextInput
          style={styles.input}
          placeholder="Password"
          value={formData.password}
          onChangeText={(text) => setFormData({ ...formData, password: text })}
          secureTextEntry
        />

        <TextInput
          style={styles.input}
          placeholder="Confirm Password"
          value={formData.password_confirmation}
          onChangeText={(text) =>
            setFormData({ ...formData, password_confirmation: text })
          }
          secureTextEntry
        />

        <TouchableOpacity
          style={styles.button}
          onPress={handleRegister}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Register</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.linkButton}
        >
          <Text style={styles.linkText}>Already have an account? Login</Text>
        </TouchableOpacity>
      </View>

      <Modal visible={courseModalVisible} transparent animationType="slide">
  <View style={styles.modalContainer}>
    <View style={styles.modalContent}>
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
            <Text>{item}</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  </View>
</Modal>
<Modal visible={yearModalVisible} transparent animationType="slide">
  <View style={styles.modalContainer}>
    <View style={styles.modalContent}>
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
            <Text>{`Year ${item}`}</Text>
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
    backgroundColor: "#f5f5f5",
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 30,
    marginTop: 40,
  },
  input: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    fontSize: 16,
  },
  button: {
    backgroundColor: "#667eea",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 10,
  },
  buttonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  linkButton: {
    marginTop: 15,
    alignItems: "center",
    marginBottom: 40,
  },
  linkText: {
    color: "#667eea",
    fontSize: 14,
  },
  modalContainer: {
  flex: 1,
  justifyContent: "flex-end",
  backgroundColor: "rgba(0,0,0,0.5)",
},
modalContent: {
  backgroundColor: "#fff",
  padding: 20,
  borderTopLeftRadius: 20,
  borderTopRightRadius: 20,
  maxHeight: "50%",
},
modalItem: {
  padding: 15,
  borderBottomWidth: 1,
  borderBottomColor: "#eee",
},
});
