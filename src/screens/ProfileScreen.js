import { Ionicons } from "@expo/vector-icons";
import { Picker } from "@react-native-picker/picker";
import * as ImagePicker from "expo-image-picker";
import { useContext, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
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

export default function ProfileScreen() {
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

  useEffect(() => {
    loadProfile();
  }, []);

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

      // 3-day profile info cooldown
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

      // 7-day profile picture cooldown
      if (response.data.last_picture_update) {
        const last = new Date(response.data.last_picture_update);
        const next = new Date(last);
        next.setDate(next.getDate() + 1);
        const now = new Date();
        if (now < next) {
          const daysLeft = Math.ceil((next - now) / (1000 * 60 * 60 * 24));
          setPictureCooldown(`Photo locked for ${daysLeft}  day.`);
        } else {
          setPictureCooldown(null);
        }
      }
    } catch (error) {
      console.error("Error loading profile:", error);
    }
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
        const firstError = Object.values(errors)[0][0];
        Alert.alert("Validation Error", firstError);
      } else {
        Alert.alert("Error", "Failed to update profile.");
      }
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async () => {
    // Block if on cooldown
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
        Alert.alert("Success", "Profile picture updated.");
        loadProfile();
      } else {
        Alert.alert("Error", response.data.message || "Upload failed");
      }
    } catch (error) {
      if (error.response?.status === 429) {
        Alert.alert("Too Soon", error.response.data.message);
      } else {
        console.error("Upload error:", error);
        Alert.alert("Error", "Failed to upload image.");
      }
    } finally {
      setUploading(false);
    }
  };

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      { text: "Logout", onPress: logout, style: "destructive" },
    ]);
  };

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
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
          {/* Lock or camera badge */}
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

        {/* Picture cooldown message */}
        {pictureCooldown && (
          <Text style={styles.pictureCooldownText}>{pictureCooldown}</Text>
        )}
      </View>

      <View style={styles.content}>
        <View style={styles.section}>
          {/* Section Header */}
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

          {/* Profile info cooldown warning */}
          {cooldownMessage && !editing && (
            <View style={styles.cooldownBanner}>
              <Ionicons name="time-outline" size={18} color="#b26a00" />
              <Text style={styles.cooldownText}>{cooldownMessage}</Text>
            </View>
          )}

          {editing ? (
            <View>
              {/* Email */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Email</Text>
                <TextInput
                  style={styles.input}
                  value={formData.email}
                  onChangeText={(text) =>
                    setFormData({ ...formData, email: text })
                  }
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              </View>

              {/* Contact */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Contact Number</Text>
                <TextInput
                  style={styles.input}
                  value={formData.contact}
                  onChangeText={(text) =>
                    setFormData({ ...formData, contact: text })
                  }
                  keyboardType="phone-pad"
                />
              </View>

              {/* Course */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Course</Text>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={formData.course}
                    onValueChange={(itemValue) =>
                      setFormData({ ...formData, course: itemValue })
                    }
                    style={styles.picker}
                  >
                    <Picker.Item label="Select Course" value="" />
                    {COURSES.map((course) => (
                      <Picker.Item key={course} label={course} value={course} />
                    ))}
                  </Picker>
                </View>
              </View>

              {/* Year Level */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Year Level</Text>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={formData.year_level}
                    onValueChange={(itemValue) =>
                      setFormData({ ...formData, year_level: itemValue })
                    }
                    style={styles.picker}
                  >
                    <Picker.Item label="Select Year" value="" />
                    {YEAR_LEVELS.map((year) => (
                      <Picker.Item
                        key={year}
                        label={`Year ${year}`}
                        value={year}
                      />
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
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Student No:</Text>
                <Text style={styles.infoValue}>{profile?.student_no}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Email:</Text>
                <Text style={styles.infoValue}>
                  {formData.email || user?.email}
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Course:</Text>
                <Text style={styles.infoValue}>{profile?.course}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Year Level:</Text>
                <Text style={styles.infoValue}>{profile?.year_level}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Contact:</Text>
                <Text style={styles.infoValue}>{profile?.contact}</Text>
              </View>
            </View>
          )}
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={24} color="#f44336" />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f0f2f5",
  },
  header: {
    backgroundColor: "#0f3c91",
    paddingTop: 60,
    paddingBottom: 30,
    alignItems: "center",
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
  },
  avatarContainer: {
    marginBottom: 15,
    position: "relative",
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: "rgb(244, 180, 20)",
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
  },
  name: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
  },
  email: {
    fontSize: 16,
    color: "rgba(255,255,255,0.9)",
    marginTop: 5,
  },
  pictureCooldownText: {
    fontSize: 12,
    color: "rgba(255,255,255,0.6)",
    marginTop: 6,
    fontStyle: "italic",
  },
  content: {
    padding: 20,
  },
  section: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0f3c91",
  },
  cooldownBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(244,180,20,0.1)",
    borderRadius: 10,
    padding: 10,
    marginBottom: 15,
    gap: 8,
  },
  cooldownText: {
    color: "#b26a00",
    fontSize: 13,
    flex: 1,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  infoLabel: {
    fontSize: 16,
    color: "#64748b",
  },
  infoValue: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1e293b",
  },
  inputGroup: {
    marginBottom: 15,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
    color: "#64748b",
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
  picker: {
    height: 50,
    width: "100%",
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
  },
  button: {
    flex: 1,
    padding: 16,
    borderRadius: 30,
    alignItems: "center",
    marginHorizontal: 5,
  },
  cancelButton: {
    backgroundColor: "#f1f5f9",
  },
  saveButton: {
    backgroundColor: "#0f3c91",
  },
  cancelButtonText: {
    color: "#475569",
    fontWeight: "600",
  },
  saveButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
  logoutButton: {
    backgroundColor: "#fff",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: "#f44336",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  logoutText: {
    color: "#f44336",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 10,
  },
});
