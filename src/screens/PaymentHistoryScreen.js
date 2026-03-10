import { Ionicons } from "@expo/vector-icons";
import * as FileSystem from "expo-file-system/legacy";
import { LinearGradient } from "expo-linear-gradient";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import api from "../services/api";

const ReceiptModal = ({ visible, onClose, receiptData }) => {
  const [downloading, setDownloading] = useState(false);

  if (!receiptData) return null;

  const getStatusColor = (status) => {
    const statusKey = (status || "").toLowerCase();
    const colors = {
      paid: "#4caf50",
      pending: "rgb(244, 180, 20)",
      failed: "#f44336",
      default: "#666",
    };
    return colors[statusKey] || colors.default;
  };

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
              font-family: Arial, sans-serif;
              background: #f0f2f5;
              display: flex;
              justify-content: center;
              align-items: center;
              min-height: 100vh;
              padding: 20px;
            }
            .receipt {
              background: white;
              border-radius: 16px;
              max-width: 400px;
              width: 100%;
              overflow: hidden;
              box-shadow: 0 10px 30px rgba(0,0,0,0.1);
            }
            .header {
              background: linear-gradient(135deg, #0f3c91, #1a4da8);
              color: white;
              padding: 30px 20px;
              text-align: center;
            }
            .header h1 { font-size: 22px; font-weight: bold; margin-bottom: 5px; }
            .header p { font-size: 13px; opacity: 0.8; }
            .badge {
              display: inline-block;
              margin-top: 12px;
              padding: 6px 18px;
              border-radius: 20px;
              font-size: 13px;
              font-weight: bold;
              background: ${receiptData.status.toLowerCase() === "paid" ? "rgba(76,175,80,0.2)" : "rgba(244,180,20,0.2)"};
              color: ${receiptData.status.toLowerCase() === "paid" ? "#4caf50" : "rgb(244,180,20)"};
              border: 1px solid ${receiptData.status.toLowerCase() === "paid" ? "#4caf50" : "rgb(244,180,20)"};
            }
            .body { padding: 24px 20px; }
            .row {
              display: flex;
              justify-content: space-between;
              align-items: center;
              padding: 14px 0;
              border-bottom: 1px solid #f0f0f0;
            }
            .row:last-child { border-bottom: none; }
            .label { font-size: 14px; color: #64748b; }
            .value { font-size: 14px; font-weight: 600; color: #1e293b; text-align: right; max-width: 60%; }
            .amount { font-size: 20px; color: #0f3c91; font-weight: bold; }
            .section-title {
              font-size: 13px;
              font-weight: 700;
              color: #0f3c91;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              padding: 14px 0 6px;
              border-bottom: 2px solid #e2e8f0;
              margin-bottom: 4px;
            }
            .fee-row .label { color: #94a3b8; font-size: 13px; }
            .fee-row .value { color: #64748b; font-size: 13px; }
            .total-row { border-top: 2px solid #0f3c91 !important; margin-top: 4px; }
            .total-label { font-weight: 700 !important; color: #0f3c91 !important; font-size: 15px !important; }
            .footer {
              background: #f8fafc;
              padding: 16px 20px;
              text-align: center;
              font-size: 12px;
              color: #94a3b8;
              border-top: 1px solid #e2e8f0;
            }
          </style>
        </head>
        <body>
          <div class="receipt">
            <div class="header">
              <h1>Non-UniPay</h1>
              <p>Official Payment Receipt</p>
              <div class="badge">${receiptData.status.toUpperCase()}</div>
            </div>
            <div class="body">
              <div class="row">
                <span class="label">Reference No.</span>
                <span class="value">${receiptData.reference_no}</span>
              </div>
              <div class="row">
                <span class="label">Date & Time</span>
                <span class="value">${receiptData.date}</span>
              </div>
              <div class="row">
                <span class="label">Payment Method</span>
                <span class="value">${receiptData.method}</span>
              </div>
              <div class="row">
                <span class="label">Semester</span>
                <span class="value">${receiptData.semester}</span>
              </div>

              ${
                receiptData.fees && receiptData.fees.length > 0
                  ? `
                <div class="section-title">Fee Breakdown</div>
                ${receiptData.fees
                  .map(
                    (fee) => `
                  <div class="row fee-row">
                    <span class="label">${fee.name || fee.fee_name || "Fee"}</span>
                    <span class="value">₱${parseFloat(fee.amount).toLocaleString()}</span>
                  </div>
                `,
                  )
                  .join("")}
              `
                  : ""
              }

              <div class="row total-row">
                <span class="label total-label">Total Amount</span>
                <span class="value amount">₱${parseFloat(receiptData.amount).toLocaleString()}</span>
              </div>
            </div>
            <div class="footer">
              Thank you for your payment! • Non-UniPay System • ${new Date().getFullYear()}
            </div>
          </div>
        </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({ html, base64: false });
      const fileName = `receipt_${receiptData.reference_no}.pdf`;
      const newUri = `${FileSystem.documentDirectory}${fileName}`;
      await FileSystem.moveAsync({ from: uri, to: newUri });

      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(newUri, {
          mimeType: "application/pdf",
          dialogTitle: "Save or Share Receipt",
          UTI: "com.adobe.pdf",
        });
      } else {
        Alert.alert("Saved", `Receipt saved to:\n${newUri}`);
      }
    } catch (error) {
      console.error("Download error:", error);
      Alert.alert("Error", "Failed to generate receipt PDF.");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <LinearGradient
            colors={["#0f3c91", "#1a4da8"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.modalHeader}
          >
            <View style={styles.modalHeaderLeft}>
              <Ionicons name="receipt-outline" size={28} color="#fff" />
              <Text style={styles.modalTitle}>Payment Receipt</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.modalClose}>
              <Ionicons name="close" size={28} color="#fff" />
            </TouchableOpacity>
          </LinearGradient>

          <ScrollView style={styles.modalBody}>
            <View style={styles.receiptCard}>
              <View style={styles.receiptRow}>
                <Text style={styles.receiptLabel}>Reference No.:</Text>
                <Text style={styles.receiptValue}>
                  {receiptData.reference_no}
                </Text>
              </View>
              <View style={styles.receiptRow}>
                <Text style={styles.receiptLabel}>Date & Time:</Text>
                <Text style={styles.receiptValue}>{receiptData.date}</Text>
              </View>
              <View style={styles.receiptRow}>
                <Text style={styles.receiptLabel}>Payment Method:</Text>
                <Text style={styles.receiptValue}>{receiptData.method}</Text>
              </View>
              <View style={styles.receiptRow}>
                <Text style={styles.receiptLabel}>Semester:</Text>
                <Text style={styles.receiptValue}>{receiptData.semester}</Text>
              </View>
              <View style={styles.receiptRow}>
                <Text style={styles.receiptLabel}>Amount:</Text>
                <Text style={[styles.receiptValue, styles.receiptAmount]}>
                  ₱{parseFloat(receiptData.amount).toLocaleString()}
                </Text>
              </View>
              <View style={styles.receiptRow}>
                <Text style={styles.receiptLabel}>Status:</Text>
                <View
                  style={[
                    styles.receiptStatusBadge,
                    { backgroundColor: getStatusColor(receiptData.status) },
                  ]}
                >
                  <Text style={styles.receiptStatusText}>
                    {receiptData.status.toUpperCase()}
                  </Text>
                </View>
              </View>

              {/* Fee Breakdown */}
              {receiptData.fees && receiptData.fees.length > 0 && (
                <>
                  <View style={styles.breakdownHeader}>
                    <Text style={styles.breakdownTitle}>Fee Breakdown</Text>
                  </View>
                  {receiptData.fees.map((fee, index) => (
                    <View key={index} style={styles.receiptRow}>
                      <Text style={styles.breakdownLabel}>
                        {fee.name || fee.fee_name || "Fee"}
                      </Text>
                      <Text style={styles.breakdownValue}>
                        ₱{parseFloat(fee.amount).toLocaleString()}
                      </Text>
                    </View>
                  ))}
                </>
              )}
            </View>

            {/* Download Button */}
            <TouchableOpacity
              style={[styles.downloadBtn, downloading && { opacity: 0.7 }]}
              onPress={handleDownload}
              disabled={downloading}
            >
              {downloading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Ionicons name="download-outline" size={20} color="#fff" />
                  <Text style={styles.downloadBtnText}>Download Receipt</Text>
                </>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

export default function PaymentHistoryScreen() {
  const [payments, setPayments] = useState([]);
  const [totalPaid, setTotalPaid] = useState(0);
  const [totalPending, setTotalPending] = useState(0);
  const [paidCount, setPaidCount] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [receiptVisible, setReceiptVisible] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState(null);

  useEffect(() => {
    loadPayments();
  }, []);

  const loadPayments = async () => {
    try {
      const response = await api.get("/payments/history");
      const paymentsData = response.data.payments || [];
      setPayments(paymentsData);

      let paidSum = 0;
      let pendingSum = 0;
      let paid = 0;
      let pending = 0;

      paymentsData.forEach((p) => {
        const amount = parseFloat(p.total_amount) || 0;
        const status = (p.status || "").toLowerCase();
        if (status === "paid") {
          paidSum += amount;
          paid++;
        } else if (status === "pending") {
          pendingSum += amount;
          pending++;
        }
      });

      setTotalPaid(paidSum);
      setTotalPending(pendingSum);
      setPaidCount(paid);
      setPendingCount(pending);
    } catch (error) {
      console.error("Error loading payments:", error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadPayments();
    setRefreshing(false);
  };

  const handleViewReceipt = (payment) => {
    const referenceNo =
      payment.reference_no ||
      payment.transaction?.reference_no ||
      `NUP-${payment.id}`;

    const semester =
      payment.fees && payment.fees.length > 0
        ? payment.fees[0].semester
        : "N/A";

    const receipt = {
      reference_no: referenceNo,
      date: new Date(payment.payment_date || payment.created_at).toLocaleString(
        "en-US",
        {
          year: "numeric",
          month: "long",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        },
      ),
      method:
        payment.payment_method ||
        payment.transaction?.payment_method ||
        "GCash",
      amount: parseFloat(payment.total_amount),
      status: payment.status,
      semester,
      fees: payment.fees || [], // ✅ include fees
    };
    setSelectedReceipt(receipt);
    setReceiptVisible(true);
  };

  const StatusBadge = ({ status }) => {
    const statusKey = (status || "").toLowerCase();
    const colors = {
      paid: "#4caf50",
      pending: "rgb(244, 180, 20)",
      failed: "#f44336",
      default: "#666",
    };
    const icons = {
      paid: "checkmark-circle",
      pending: "time",
      failed: "close-circle",
      default: "help-circle",
    };
    const color = colors[statusKey] || colors.default;

    const getBackgroundColor = (color) => {
      if (color.startsWith("#")) {
        const r = parseInt(color.slice(1, 3), 16);
        const g = parseInt(color.slice(3, 5), 16);
        const b = parseInt(color.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, 0.2)`;
      } else if (color.startsWith("rgb(")) {
        const rgb = color.match(/\d+/g);
        if (rgb && rgb.length >= 3) {
          return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0.2)`;
        }
      }
      return color + "33";
    };

    return (
      <View
        style={[
          styles.statusBadge,
          { backgroundColor: getBackgroundColor(color) },
        ]}
      >
        <Ionicons
          name={icons[statusKey] || icons.default}
          size={20}
          color={color}
        />
        <Text style={[styles.statusText, { color }]}>
          {status.toUpperCase()}
        </Text>
      </View>
    );
  };

  const renderPayment = ({ item }) => {
    const displayReference =
      item.reference_no || item.transaction?.reference_no || `NUP-${item.id}`;

    return (
      <View style={styles.paymentCard}>
        <View style={styles.paymentHeader}>
          <StatusBadge status={item.status} />
          <Text style={styles.paymentAmount}>
            ₱{parseFloat(item.total_amount).toLocaleString()}
          </Text>
        </View>

        <View style={styles.paymentDetails}>
          <View style={styles.detailRow}>
            <Ionicons name="receipt-outline" size={16} color="#666" />
            <Text style={styles.detailText}>{displayReference}</Text>
          </View>
          <View style={styles.detailRow}>
            <Ionicons name="calendar-outline" size={16} color="#666" />
            <Text style={styles.detailText}>
              {new Date(item.created_at).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </Text>
          </View>
          {item.payment_date && (
            <View style={styles.detailRow}>
              <Ionicons name="time-outline" size={16} color="#666" />
              <Text style={styles.detailText}>
                Paid: {new Date(item.payment_date).toLocaleString()}
              </Text>
            </View>
          )}

          <TouchableOpacity
            style={styles.viewReceiptBtn}
            onPress={() => handleViewReceipt(item)}
          >
            <Ionicons name="eye-outline" size={18} color="#0f3c91" />
            <Text style={styles.viewReceiptText}>View Receipt</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0f3c91" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={["#0f3c91", "#1a4da8"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.summaryCard}
      >
        <View style={styles.summaryRow}>
          <View style={styles.summaryColumn}>
            <Text style={styles.summaryLabel}>Total Paid</Text>
            <Text style={styles.summaryAmount}>
              ₱{totalPaid.toLocaleString()}
            </Text>
            <Text style={styles.summarySubtext}>
              {paidCount} transaction{paidCount !== 1 ? "s" : ""}
            </Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryColumn}>
            <Text style={styles.summaryLabel}>Pending</Text>
            <Text
              style={[styles.summaryAmount, { color: "rgb(244, 180, 20)" }]}
            >
              ₱{totalPending.toLocaleString()}
            </Text>
            <Text style={styles.summarySubtext}>
              {pendingCount} transaction{pendingCount !== 1 ? "s" : ""}
            </Text>
          </View>
        </View>
      </LinearGradient>

      <FlatList
        data={payments}
        keyExtractor={(item, index) => item.id?.toString() || index.toString()}
        renderItem={renderPayment}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#0f3c91"
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="receipt-outline" size={80} color="#ccc" />
            <Text style={styles.emptyText}>No payment history</Text>
          </View>
        }
      />

      <ReceiptModal
        visible={receiptVisible}
        onClose={() => {
          setReceiptVisible(false);
          setSelectedReceipt(null);
        }}
        receiptData={selectedReceipt}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f0f2f5" },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  summaryCard: {
    paddingVertical: 20,
    paddingHorizontal: 16,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
  },
  summaryColumn: { flex: 1, alignItems: "center" },
  summaryDivider: {
    width: 1,
    height: "80%",
    backgroundColor: "rgba(255,255,255,0.3)",
    marginHorizontal: 10,
  },
  summaryLabel: {
    fontSize: 14,
    color: "rgba(255,255,255,0.9)",
    fontWeight: "500",
    marginBottom: 4,
  },
  summaryAmount: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 2,
  },
  summarySubtext: { fontSize: 12, color: "rgba(255,255,255,0.7)" },
  listContainer: { padding: 16, paddingTop: 8 },
  paymentCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 3,
    borderWidth: 1,
    borderColor: "#f0f0f0",
  },
  paymentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  statusText: { fontSize: 12, fontWeight: "bold", marginLeft: 5 },
  paymentAmount: { fontSize: 20, fontWeight: "bold", color: "#0f3c91" },
  paymentDetails: {
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
    paddingTop: 12,
  },
  detailRow: { flexDirection: "row", alignItems: "center", marginTop: 6 },
  detailText: { fontSize: 14, color: "#64748b", marginLeft: 8 },
  viewReceiptBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(244, 180, 20, 0.15)",
    paddingVertical: 10,
    marginTop: 12,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: "rgb(244, 180, 20)",
  },
  viewReceiptText: {
    color: "#0f3c91",
    fontWeight: "700",
    marginLeft: 8,
    fontSize: 15,
  },
  emptyContainer: { alignItems: "center", marginTop: 100 },
  emptyText: { fontSize: 18, color: "#999", marginTop: 20 },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: "90%",
    maxWidth: 380,
    maxHeight: "85%",
    backgroundColor: "#fff",
    borderRadius: 30,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 15,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 18,
  },
  modalHeaderLeft: { flexDirection: "row", alignItems: "center" },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#fff",
    marginLeft: 10,
  },
  modalClose: { padding: 5 },
  modalBody: { padding: 24 },
  receiptCard: {
    backgroundColor: "#f8fafc",
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  receiptRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e9ecef",
  },
  receiptLabel: { fontSize: 15, color: "#64748b", fontWeight: "500" },
  receiptValue: { fontSize: 15, fontWeight: "600", color: "#1e293b" },
  receiptAmount: { fontSize: 18, color: "#0f3c91" },
  receiptStatusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
  },
  receiptStatusText: { color: "#fff", fontWeight: "700", fontSize: 12 },
  breakdownHeader: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  breakdownTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0f3c91",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  breakdownLabel: { fontSize: 14, color: "#94a3b8" },
  breakdownValue: { fontSize: 14, fontWeight: "600", color: "#64748b" },
  downloadBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0f3c91",
    paddingVertical: 14,
    borderRadius: 30,
    marginTop: 16,
    marginBottom: 8,
    gap: 8,
  },
  downloadBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
});
