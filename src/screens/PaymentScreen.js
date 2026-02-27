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
  const [checkingStatus, setCheckingStatus] = useState(false);

  useEffect(() => {
    console.log("📌 PaymentScreen mounted");
    loadTotalFees();
  }, []);

  // =============================
  // LOAD TOTAL FEES
  // =============================
  const loadTotalFees = async () => {
    try {
      console.log("📡 Fetching total fees...");
      const response = await api.get("/fees/breakdown");

const breakdown = response.data.breakdown;

const totalDue = breakdown?.grand_total || 0;
const totalPaid = breakdown?.total_paid || 0;
const remainingBalance =
  breakdown?.remaining_balance ?? Math.max(totalDue - totalPaid, 0);

setTotalFees(remainingBalance);

// auto-fill input with remaining balance
setAmount(remainingBalance > 0 ? remainingBalance.toString() : "");
    } catch (error) {
      console.error("❌ Error loading fees:", {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
      });

      Alert.alert("Error", "Failed to load total fees");
    }
  };

  // =============================
  // VALIDATE & CONFIRM PAYMENT
  // =============================
  const handlePayment = () => {
    console.log("🧾 Handle payment clicked. Amount:", amount);

    if (!amount || parseFloat(amount) <= 0) {
      Alert.alert("Error", "Please enter a valid amount");
      return;
    }

    if (totalFees === 0) {
  Alert.alert("Fully Paid", "You have no remaining balance.");
  return;
}

if (parseFloat(amount) > totalFees) {
  Alert.alert("Error", "Amount exceeds remaining balance.");
  return;
}

    if (parseFloat(amount) < 100) {
      Alert.alert("Error", "Minimum payment amount is ₱100");
      return;
    }

    Alert.alert(
      "Confirm Payment",
      `Pay ₱${parseFloat(amount).toLocaleString()} via GCash?`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Proceed", onPress: processPayment },
      ],
    );
  };

  // =============================
  // INITIATE PAYMENT
  // =============================
  const processPayment = async () => {
    setLoading(true);

    try {
      const numericAmount = parseFloat(amount);

      if (numericAmount > 100000) {
        Alert.alert("Error", "Amount exceeds PayMongo maximum of ₱100,000");
        setLoading(false);
        return;
      }

      const response = await api.post("/payments/initiate", {
        amount: numericAmount, // ensure it's a number
      });

      console.log("✅ Payment initiate response:", response.data);

      if (response.data.success) {
        const { payment_url, reference_no, payment_id } = response.data;

        // Open GCash page
        const supported = await Linking.canOpenURL(payment_url);
        if (supported) {
          await Linking.openURL(payment_url);
          startStatusCheck(payment_id);
        } else {
          Alert.alert("Error", "Cannot open GCash payment page");
        }
      } else {
        Alert.alert(
          "Error",
          response.data.message || "Payment initiation failed",
        );
      }
    } catch (error) {
      console.error(
        "❌ Payment error FULL:",
        error.response?.data || error.message,
      );
      Alert.alert(
        "Payment Failed",
        error.response?.data?.message ||
          "An error occurred while processing your payment",
      );
    } finally {
      setLoading(false);
    }
  };

  // =============================
  // STATUS CHECK
  // =============================
  const startStatusCheck = (paymentId) => {
    setCheckingStatus(true);

    const interval = setInterval(async () => {
      try {
        const res = await api.get(`/payments/status/${paymentId}`);
        console.log("⏳ Checking payment status:", res.data.status);

        const status = res.data.status;
if (status === "paid") {
  clearInterval(interval);
  setCheckingStatus(false);

  Alert.alert(
    "Payment Successful! 🎉",
    "Your payment has been processed.",
    [
      {
        text: "OK",
        onPress: () => {
          navigation.navigate("Home", { paymentSuccess: true });
        },
      },
    ],
  );
}else if (status === "failed") {
          clearInterval(interval);
          setCheckingStatus(false);
          Alert.alert(
            "Payment Failed ❌",
            "Your payment was not completed. Please try again.",
          );
        }
        // If pending or processing, keep polling every 5s
      } catch (err) {
        console.error("Status check error:", err);
        clearInterval(interval);
        setCheckingStatus(false);
      }
    }, 5000); // poll every 5 seconds
  };

  // =============================
  // PAY FULL AMOUNT
  // =============================
  const setFullAmount = () => {
    console.log("💯 Pay full amount clicked:", totalFees);
    setAmount(totalFees.toString());
  };

  // =============================
  // UI
  // =============================
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Ionicons name="card" size={80} color="#667eea" />
        </View>

        <Text style={styles.title}>Pay School Fees</Text>
       <Text style={styles.subtitle}>
  {totalFees === 0
    ? "You are Fully Paid ✅"
    : `Remaining Balance: ₱${totalFees.toLocaleString()}`}
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

        <TouchableOpacity
          style={[
            styles.payButton,
            (loading || checkingStatus) && styles.payButtonDisabled,
          ]}
          onPress={handlePayment}
          disabled={loading || checkingStatus}
        >
          {loading || checkingStatus ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="wallet" size={24} color="#fff" />
              <Text style={styles.payButtonText}>Pay with GCash</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

// =============================
// STYLES
// =============================
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5" },
  content: { flex: 1, padding: 20 },
  iconContainer: { alignItems: "center", marginTop: 40 },
  title: { fontSize: 24, fontWeight: "bold", textAlign: "center" },
  subtitle: { textAlign: "center", marginTop: 10, color: "#666" },
  inputContainer: { marginTop: 30 },
  label: { fontSize: 16, fontWeight: "600", marginBottom: 10 },
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
  input: { flex: 1, fontSize: 24, fontWeight: "bold" },
  fullAmountButton: { alignSelf: "flex-end", marginTop: 10 },
  fullAmountText: { color: "#667eea", fontWeight: "600" },
  payButton: {
    backgroundColor: "#667eea",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    padding: 18,
    borderRadius: 10,
    marginTop: 30,
  },
  payButtonDisabled: { opacity: 0.6 },
  payButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
    marginLeft: 10,
  },
});
