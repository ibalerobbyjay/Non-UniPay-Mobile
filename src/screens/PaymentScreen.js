import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Linking,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import api from "../services/api";

export default function PaymentScreen({ navigation }) {
  const [amount, setAmount] = useState("");
  const [totalFees, setTotalFees] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadTotalFees();
  }, []);

  const loadTotalFees = async () => {
    try {
      const response = await api.get("/fees/total");
      setTotalFees(response.data.total);
      setAmount(response.data.total.toString());
    } catch (error) {
      console.error("Error loading fees:", error);
    }
  };

  const handlePayment = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      Alert.alert("Error", "Please enter a valid amount");
      return;
    }

    Alert.alert(
      "Confirm Payment",
      `Pay ₱${parseFloat(amount).toLocaleString()} via GCash?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Proceed",
          onPress: processPayment,
        },
      ],
    );
  };

  const processPayment = async () => {
    setLoading(true);

    try {
      const response = await api.post("/payments/initiate", {
        amount: parseFloat(amount),
      });

      const { payment_url, reference_no } = response.data;

      Alert.alert(
        "Payment Initiated",
        `Reference: ${reference_no}\n\nYou will be redirected to GCash.`,
        [
          {
            text: "Continue",
            onPress: async () => {
              const supported = await Linking.canOpenURL(payment_url);
              if (supported) {
                await Linking.openURL(payment_url);
                navigation.goBack();
              } else {
                Alert.alert("Error", "Cannot open GCash payment page");
              }
            },
          },
        ],
      );
    } catch (error) {
      Alert.alert(
        "Payment Failed",
        error.response?.data?.message || "An error occurred",
      );
    } finally {
      setLoading(false);
    }
  };

  const setFullAmount = () => {
    setAmount(totalFees.toString());
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Ionicons name="card" size={80} color="#667eea" />
        </View>

        <Text style={styles.title}>Pay School Fees</Text>
        <Text style={styles.subtitle}>
          Total Fees: ₱{totalFees.toLocaleString()}
        </Text>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Amount to Pay</Text>
          <View style={styles.inputWrapper}>
            <Text style={styles.currencySymbol}>₱</Text>
            <TextInput
              style={styles.input}
              value={amount}
              onChangeText={setAmount}
              keyboardType="numeric"
              placeholder="0.00"
            />
          </View>

          <TouchableOpacity
            style={styles.fullAmountButton}
            onPress={setFullAmount}
          >
            <Text style={styles.fullAmountText}>Pay Full Amount</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.infoBox}>
          <Ionicons name="information-circle" size={20} color="#667eea" />
          <Text style={styles.infoText}>
            You will be redirected to GCash to complete the payment
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.payButton, loading && styles.payButtonDisabled]}
          onPress={handlePayment}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="logo-google" size={24} color="#fff" />
              <Text style={styles.payButtonText}>Pay with GCash</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  content: {
    flex: 1,
    padding: 20,
  },
  iconContainer: {
    alignItems: "center",
    marginTop: 40,
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginTop: 10,
  },
  inputContainer: {
    marginTop: 30,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 10,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#667eea",
    padding: 15,
  },
  currencySymbol: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#667eea",
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 24,
    fontWeight: "bold",
  },
  fullAmountButton: {
    alignSelf: "flex-end",
    marginTop: 10,
  },
  fullAmountText: {
    color: "#667eea",
    fontSize: 14,
    fontWeight: "600",
  },
  infoBox: {
    flexDirection: "row",
    backgroundColor: "#e3f2fd",
    padding: 15,
    borderRadius: 10,
    marginTop: 20,
  },
  infoText: {
    flex: 1,
    marginLeft: 10,
    fontSize: 14,
    color: "#667eea",
  },
  payButton: {
    backgroundColor: "#667eea",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    padding: 18,
    borderRadius: 10,
    marginTop: 30,
  },
  payButtonDisabled: {
    opacity: 0.6,
  },
  payButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
    marginLeft: 10,
  },
});
