import { Ionicons } from "@expo/vector-icons";
import { Asset } from "expo-asset";
import { BlurView } from "expo-blur";
import * as FileSystem from "expo-file-system/legacy";
import { LinearGradient } from "expo-linear-gradient";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  FlatList,
  Image,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useTheme } from "../contexts/ThemeContext";
import api from "../services/api";

// ─── Loading Overlay (shared) ────────────────────────────────────────────────
function LoadingOverlay({ visible }) {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();

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
      fadeAnim.setValue(0);
      pulseAnim.stopAnimation();
      pulseAnim.setValue(1);
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <Animated.View style={[styles.loadingOverlay, { opacity: fadeAnim }]}>
        <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
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
        <Text style={styles.loadingText}>Loading payment history…</Text>
        <Text style={styles.loadingSubText}>Please wait</Text>
      </Animated.View>
    </Modal>
  );
}

// ─── Generic Alert Modal ─────────────────────────────────────────────────────
function AlertModal({ visible, title, message, onClose }) {
  const { colors } = useTheme();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalCard, { backgroundColor: colors.surface }]}>
          <Ionicons
            name="information-circle-outline"
            size={48}
            color={colors.brand}
          />
          <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
            {title}
          </Text>
          <Text style={[styles.modalMessage, { color: colors.textSecondary }]}>
            {message}
          </Text>
          <View style={styles.modalButtonRow}>
            <TouchableOpacity
              style={[
                styles.modalButton,
                styles.modalConfirmButton,
                { backgroundColor: colors.brand },
              ]}
              onPress={onClose}
            >
              <Text style={styles.modalConfirmButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── Receipt Modal (unchanged) ──────────────────────────────────────────────
const ReceiptModal = ({ visible, onClose, receiptData }) => {
  const { colors } = useTheme();
  const [downloading, setDownloading] = useState(false);
  const [alertModal, setAlertModal] = useState({
    visible: false,
    title: "",
    message: "",
  });
  if (!receiptData) return null;

  const getStatusColor = (status) => {
    const s = (status || "").toLowerCase();
    if (s === "paid") return "#4caf50";
    if (s === "pending") return "rgb(244,180,20)";
    if (s === "failed") return "#f44336";
    return "#666";
  };

  const handleDownload = async () => {
    setDownloading(true);
    try {
      let logoSrc = "";
      try {
        const asset = await Asset.fromModule(
          require("../../assets/logo.png"),
        ).downloadAsync();
        const logoBase64 = await FileSystem.readAsStringAsync(asset.localUri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        logoSrc = `data:image/png;base64,${logoBase64}`;
      } catch (e) {
        console.warn("Could not load logo:", e);
      }

      const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Arial, sans-serif; background: #f0f2f5; display: flex; justify-content: center; align-items: center; min-height: 100vh; padding: 20px; }
        .receipt { background: white; border-radius: 16px; max-width: 420px; width: 100%; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.15); position: relative; }
        .watermark { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 260px; height: 260px; border-radius: 50%; border: 8px solid rgba(15,60,145,0.06); display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; pointer-events: none; z-index: 0; }
        .watermark::before { content: ''; position: absolute; inset: 10px; border-radius: 50%; border: 3px dashed rgba(15,60,145,0.05); }
        .watermark img { width: 130px; height: 130px; object-fit: contain; opacity: 0.06; position: relative; z-index: 1; }
        .watermark-text { font-size: 11px; font-weight: 700; color: rgba(15,60,145,0.07); text-transform: uppercase; letter-spacing: 3px; margin-top: 4px; position: relative; z-index: 1; }
        .header { background: linear-gradient(135deg, #0f3c91, #1a4da8); color: white; padding: 28px 24px 20px; text-align: center; position: relative; z-index: 1; }
        .header-logo-row { display: flex; align-items: center; justify-content: center; gap: 12px; margin-bottom: 6px; }
        .logo-circle { width: 56px; height: 56px; background: white; border-radius: 50%; overflow: hidden; flex-shrink: 0; display: flex; align-items: center; justify-content: center; }
        .logo-circle img { width: 100%; height: 100%; object-fit: contain; padding: 4px; }
        .header-text h1 { font-size: 22px; font-weight: bold; letter-spacing: 1px; }
        .header-text p { font-size: 11px; opacity: 0.75; margin-top: 2px; }
        .badge { display: inline-block; margin-top: 14px; padding: 6px 20px; border-radius: 20px; font-size: 13px; font-weight: bold; background: ${receiptData.status.toLowerCase() === "paid" ? "rgba(76,175,80,0.2)" : "rgba(244,180,20,0.2)"}; color: ${receiptData.status.toLowerCase() === "paid" ? "#4caf50" : "rgb(244,180,20)"}; border: 1px solid ${receiptData.status.toLowerCase() === "paid" ? "#4caf50" : "rgb(244,180,20)"}; }
        .body { padding: 24px 20px; position: relative; z-index: 1; }
        .row { display: flex; justify-content: space-between; align-items: center; padding: 13px 0; border-bottom: 1px solid #f0f0f0; }
        .row:last-child { border-bottom: none; }
        .label { font-size: 13px; color: #64748b; }
        .value { font-size: 13px; font-weight: 600; color: #1e293b; text-align: right; max-width: 60%; }
        .amount { font-size: 20px; color: #0f3c91; font-weight: bold; }
        .section-title { font-size: 11px; font-weight: 700; color: #0f3c91; text-transform: uppercase; letter-spacing: 0.5px; padding: 14px 0 6px; border-bottom: 2px solid #e2e8f0; margin-bottom: 4px; }
        .fee-row .label { color: #94a3b8; font-size: 12px; }
        .fee-row .value { color: #64748b; font-size: 12px; }
        .total-row { border-top: 2px solid #0f3c91 !important; margin-top: 4px; }
        .total-label { font-weight: 700 !important; color: #0f3c91 !important; font-size: 14px !important; }
        .footer { background: #f8fafc; padding: 14px 20px; text-align: center; font-size: 10px; color: #94a3b8; border-top: 1px solid #e2e8f0; position: relative; z-index: 1; }
      </style></head><body>
        <div class="receipt">
          <div class="watermark">${logoSrc ? `<img src="${logoSrc}" alt="seal" />` : ""}<div class="watermark-text">Non-UniPay</div></div>
          <div class="header">
            <div class="header-logo-row"><div class="logo-circle">${logoSrc ? `<img src="${logoSrc}" alt="logo" />` : ""}</div><div class="header-text"><h1>Non-UniPay</h1><p>Official Payment Receipt</p></div></div>
            <div class="badge">${receiptData.status.toUpperCase()}</div>
          </div>
          <div class="body">
            <div class="row"><span class="label">Reference No.</span><span class="value">${receiptData.reference_no}</span></div>
            <div class="row"><span class="label">Date & Time</span><span class="value">${receiptData.date}</span></div>
            <div class="row"><span class="label">Payment Method</span><span class="value">${receiptData.method}</span></div>
            <div class="row"><span class="label">Semester</span><span class="value">${receiptData.semester}</span></div>
            ${receiptData.fees && receiptData.fees.length > 0 ? `<div class="section-title">Fee Breakdown</div>${receiptData.fees.map((fee) => `<div class="row fee-row"><span class="label">${fee.name || fee.fee_name || "Fee"}</span><span class="value">₱${parseFloat(fee.amount).toLocaleString()}</span></div>`).join("")}` : ""}
            <div class="row total-row"><span class="label total-label">Total Amount</span><span class="value amount">₱${parseFloat(receiptData.amount).toLocaleString()}</span></div>
          </div>
          <div class="footer">Thank you for your payment! • Non-UniPay System • ${new Date().getFullYear()}</div>
        </div>
      </body></html>`;

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
        setAlertModal({
          visible: true,
          title: "Saved",
          message: `Receipt saved to:\n${newUri}`,
        });
      }
    } catch (error) {
      console.error(error);
      setAlertModal({
        visible: true,
        title: "Error",
        message: "Failed to generate receipt PDF.",
      });
    } finally {
      setDownloading(false);
    }
  };

  return (
    <>
      <Modal
        visible={visible}
        animationType="slide"
        transparent
        onRequestClose={onClose}
      >
        <View
          style={[modalStyles.overlay, { backgroundColor: colors.overlay }]}
        >
          <View
            style={[modalStyles.content, { backgroundColor: colors.surface }]}
          >
            <LinearGradient
              colors={[colors.gradientStart, colors.gradientEnd]}
              style={modalStyles.header}
            >
              <Text style={modalStyles.headerTitle}>Payment Receipt</Text>
              <TouchableOpacity onPress={onClose}>
                <Ionicons name="close" size={28} color="#fff" />
              </TouchableOpacity>
            </LinearGradient>

            <ScrollView contentContainerStyle={modalStyles.scrollContent}>
              <View
                style={[
                  modalStyles.receiptCard,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Image
                  source={require("../../assets/logo.png")}
                  style={modalStyles.logo}
                />
                <Text
                  style={[modalStyles.receiptTitle, { color: colors.brand }]}
                >
                  Non-UniPay
                </Text>
                <Text
                  style={[
                    modalStyles.receiptSub,
                    { color: colors.textSecondary },
                  ]}
                >
                  Official Payment Receipt
                </Text>
                <View
                  style={[
                    modalStyles.divider,
                    { backgroundColor: colors.border },
                  ]}
                />
                {[
                  ["Reference No", receiptData.reference_no],
                  ["Date", receiptData.date],
                  ["Payment Method", receiptData.method],
                  ["Semester", receiptData.semester],
                ].map(([label, value]) => (
                  <View key={label} style={modalStyles.row}>
                    <Text
                      style={[
                        modalStyles.label,
                        { color: colors.textSecondary },
                      ]}
                    >
                      {label}
                    </Text>
                    <Text
                      style={[modalStyles.value, { color: colors.textPrimary }]}
                    >
                      {value}
                    </Text>
                  </View>
                ))}
                <View
                  style={[
                    modalStyles.divider,
                    { backgroundColor: colors.border },
                  ]}
                />
                {receiptData.fees && receiptData.fees.length > 0 && (
                  <>
                    <Text
                      style={[
                        modalStyles.breakdownTitle,
                        { color: colors.brand },
                      ]}
                    >
                      Fee Breakdown
                    </Text>
                    {receiptData.fees.map((fee, index) => (
                      <View key={index} style={modalStyles.row}>
                        <Text
                          style={[
                            modalStyles.label,
                            { color: colors.textSecondary },
                          ]}
                        >
                          {fee.name || fee.fee_name}
                        </Text>
                        <Text
                          style={[
                            modalStyles.value,
                            { color: colors.textPrimary },
                          ]}
                        >
                          ₱{parseFloat(fee.amount).toLocaleString()}
                        </Text>
                      </View>
                    ))}
                  </>
                )}
                <View
                  style={[
                    modalStyles.divider,
                    { backgroundColor: colors.border },
                  ]}
                />
                <View style={modalStyles.row}>
                  <Text
                    style={[modalStyles.totalLabel, { color: colors.brand }]}
                  >
                    Total
                  </Text>
                  <Text
                    style={[modalStyles.totalAmount, { color: colors.brand }]}
                  >
                    ₱{parseFloat(receiptData.amount).toLocaleString()}
                  </Text>
                </View>
                <View
                  style={[
                    modalStyles.statusBadge,
                    { backgroundColor: getStatusColor(receiptData.status) },
                  ]}
                >
                  <Text style={modalStyles.statusText}>
                    {receiptData.status.toUpperCase()}
                  </Text>
                </View>
              </View>
            </ScrollView>

            <TouchableOpacity
              style={[
                modalStyles.downloadBtn,
                {
                  backgroundColor: colors.brand,
                  marginHorizontal: 20,
                  marginVertical: 14,
                },
              ]}
              onPress={handleDownload}
              disabled={downloading}
            >
              {downloading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="download-outline" size={20} color="#fff" />
                  <Text style={modalStyles.downloadText}>Download Receipt</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <AlertModal
        visible={alertModal.visible}
        title={alertModal.title}
        message={alertModal.message}
        onClose={() =>
          setAlertModal({ visible: false, title: "", message: "" })
        }
      />
    </>
  );
};

// ─── Main Screen ───────────────────────────────────────────────────────────────
export default function PaymentHistoryScreen({ navigation }) {
  const { colors } = useTheme();
  useEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  const [groupedPayments, setGroupedPayments] = useState([]);
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
      let paidSum = 0,
        pendingSum = 0,
        paid = 0,
        pending = 0;
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
      const groups = {};
      paymentsData.forEach((p) => {
        let label = "Unknown Semester";
        if (p.fees && p.fees.length > 0) {
          const fee = p.fees[0];
          const semName = fee.semester?.name || fee.semester || "Unknown";
          const syName = fee.school_year?.name || fee.school_year || "";
          label = syName ? `${semName} — ${syName}` : semName;
        }
        if (!groups[label]) groups[label] = [];
        groups[label].push(p);
      });
      setGroupedPayments(
        Object.entries(groups).map(([semester, items]) => ({
          semester,
          items,
        })),
      );
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
    let semesterLabel = "N/A";
    if (payment.fees && payment.fees.length > 0) {
      const fee = payment.fees[0];
      const semName = fee.semester?.name || fee.semester || "Unknown";
      const syName = fee.school_year?.name || fee.school_year || "";
      semesterLabel = syName ? `${semName} — ${syName}` : semName;
    }
    setSelectedReceipt({
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
      semester: semesterLabel,
      fees: payment.fees || [],
    });
    setReceiptVisible(true);
  };

  const StatusBadge = ({ status }) => {
    const statusKey = (status || "").toLowerCase();
    const colorMap = {
      paid: "#4caf50",
      pending: "rgb(244, 180, 20)",
      failed: "#f44336",
      default: "#666",
    };
    const iconMap = {
      paid: "checkmark-circle",
      pending: "time",
      failed: "close-circle",
      default: "help-circle",
    };
    const color = colorMap[statusKey] || colorMap.default;
    const getBg = (c) => {
      if (c.startsWith("#")) {
        const r = parseInt(c.slice(1, 3), 16),
          g = parseInt(c.slice(3, 5), 16),
          b = parseInt(c.slice(5, 7), 16);
        return `rgba(${r},${g},${b},0.2)`;
      }
      if (c.startsWith("rgb(")) {
        const rgb = c.match(/\d+/g);
        if (rgb?.length >= 3) return `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0.2)`;
      }
      return c + "33";
    };
    return (
      <View style={[styles.statusBadge, { backgroundColor: getBg(color) }]}>
        <Ionicons
          name={iconMap[statusKey] || iconMap.default}
          size={20}
          color={color}
        />
        <Text style={[styles.statusText, { color }]}>
          {status.toUpperCase()}
        </Text>
      </View>
    );
  };

  const renderPayment = (item) => {
    const displayReference =
      item.reference_no || item.transaction?.reference_no || `NUP-${item.id}`;
    return (
      <View
        key={item.id}
        style={[
          styles.paymentCard,
          { backgroundColor: colors.surface, borderColor: colors.borderLight },
        ]}
      >
        <View style={styles.paymentHeader}>
          <StatusBadge status={item.status} />
          <Text style={[styles.paymentAmount, { color: colors.brand }]}>
            ₱{parseFloat(item.total_amount).toLocaleString()}
          </Text>
        </View>
        <View
          style={[
            styles.paymentDetails,
            { borderTopColor: colors.borderLight },
          ]}
        >
          <View style={styles.detailRow}>
            <Ionicons
              name="receipt-outline"
              size={16}
              color={colors.textSecondary}
            />
            <Text style={[styles.detailText, { color: colors.textSecondary }]}>
              {displayReference}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Ionicons
              name="calendar-outline"
              size={16}
              color={colors.textSecondary}
            />
            <Text style={[styles.detailText, { color: colors.textSecondary }]}>
              {new Date(item.created_at).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </Text>
          </View>
          {item.payment_date && (
            <View style={styles.detailRow}>
              <Ionicons
                name="time-outline"
                size={16}
                color={colors.textSecondary}
              />
              <Text
                style={[styles.detailText, { color: colors.textSecondary }]}
              >
                Paid: {new Date(item.payment_date).toLocaleString()}
              </Text>
            </View>
          )}
          <TouchableOpacity
            style={[
              styles.viewReceiptBtn,
              {
                backgroundColor: "rgba(244,180,20,0.15)",
                borderColor: "rgb(244,180,20)",
              },
            ]}
            onPress={() => handleViewReceipt(item)}
          >
            <Ionicons name="eye-outline" size={18} color={colors.brand} />
            <Text style={[styles.viewReceiptText, { color: colors.brand }]}>
              View Receipt
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderGroup = ({ item }) => (
    <View>
      <View
        style={[
          styles.semesterHeader,
          {
            backgroundColor: colors.surface,
            borderColor: colors.borderLight,
            borderLeftColor: colors.brand,
          },
        ]}
      >
        <Ionicons name="school-outline" size={16} color={colors.brand} />
        <Text style={[styles.semesterHeaderText, { color: colors.brand }]}>
          {item.semester}
        </Text>
      </View>
      {item.items.map((payment) => renderPayment(payment))}
    </View>
  );

  if (loading) {
    return <LoadingOverlay visible={loading} />;
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={[colors.gradientStart, colors.gradientEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Payment History</Text>
          <View style={{ width: 40 }} />
        </View>
      </LinearGradient>

      {/* Summary Cards */}
      <View style={styles.summaryContainer}>
        <View
          style={[
            styles.summaryCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.borderLight,
            },
          ]}
        >
          <View
            style={[
              styles.summaryIconContainer,
              { backgroundColor: colors.surfaceSecondary },
            ]}
          >
            <Ionicons name="checkmark-circle" size={24} color="#4caf50" />
          </View>
          <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
            Total Paid
          </Text>
          <Text style={[styles.summaryAmount, { color: colors.brand }]}>
            ₱{Math.round(totalPaid).toLocaleString()}
          </Text>
          <Text style={[styles.summarySubtext, { color: colors.textMuted }]}>
            {paidCount} transaction{paidCount !== 1 ? "s" : ""}
          </Text>
        </View>
        <View
          style={[
            styles.summaryCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.borderLight,
            },
          ]}
        >
          <View
            style={[
              styles.summaryIconContainer,
              { backgroundColor: colors.surfaceSecondary },
            ]}
          >
            <Ionicons name="time" size={24} color="rgb(244,180,20)" />
          </View>
          <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
            Pending
          </Text>
          <Text style={[styles.summaryAmount, { color: "rgb(244,180,20)" }]}>
            ₱{Math.round(totalPending).toLocaleString()}
          </Text>
          <Text style={[styles.summarySubtext, { color: colors.textMuted }]}>
            {pendingCount} transaction{pendingCount !== 1 ? "s" : ""}
          </Text>
        </View>
      </View>

      <FlatList
        data={groupedPayments}
        keyExtractor={(item) => item.semester}
        renderItem={renderGroup}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.brand}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons
              name="receipt-outline"
              size={80}
              color={colors.textMuted}
            />
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              No payment history
            </Text>
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

const modalStyles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "center", alignItems: "center" },
  content: {
    width: "90%",
    maxWidth: 380,
    maxHeight: "88%",
    borderRadius: 30,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 15,
    flexDirection: "column",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 18,
  },
  headerTitle: { fontSize: 20, fontWeight: "700", color: "#fff" },
  scrollContent: { padding: 20 },
  receiptCard: {
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    alignItems: "center",
  },
  logo: { width: 80, height: 80, marginBottom: 10 },
  receiptTitle: { fontSize: 22, fontWeight: "bold" },
  receiptSub: { fontSize: 12, marginBottom: 10 },
  divider: { width: "100%", height: 1, marginVertical: 15 },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    paddingVertical: 8,
  },
  label: { fontSize: 14 },
  value: {
    fontSize: 14,
    fontWeight: "600",
    textAlign: "right",
    maxWidth: "60%",
  },
  totalLabel: { fontSize: 16, fontWeight: "700" },
  totalAmount: { fontSize: 18, fontWeight: "bold" },
  statusBadge: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: "center",
    marginTop: 10,
  },
  statusText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  downloadBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 30,
    gap: 8,
  },
  downloadText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  breakdownTitle: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    alignSelf: "flex-start",
    marginBottom: 5,
  },
});

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  headerGradient: {
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 16,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    elevation: 8,
    shadowColor: "#0f3c91",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: { fontSize: 24, fontWeight: "bold", color: "#fff" },
  summaryContainer: {
    flexDirection: "row",
    marginTop: -20,
    marginHorizontal: 20,
    gap: 12,
  },
  summaryCard: {
    flex: 1,
    borderRadius: 20,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    alignItems: "center",
  },
  summaryIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  summaryLabel: { fontSize: 14, marginBottom: 4 },
  summaryAmount: { fontSize: 20, fontWeight: "bold", marginBottom: 2 },
  summarySubtext: { fontSize: 12 },
  listContainer: { padding: 16, paddingTop: 8 },
  semesterHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 8,
    marginTop: 8,
    gap: 8,
    borderLeftWidth: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 3,
    elevation: 1,
    borderWidth: 1,
  },
  semesterHeaderText: { fontSize: 14, fontWeight: "700" },
  paymentCard: {
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
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
  paymentAmount: { fontSize: 20, fontWeight: "bold" },
  paymentDetails: { borderTopWidth: 1, paddingTop: 12 },
  detailRow: { flexDirection: "row", alignItems: "center", marginTop: 6 },
  detailText: { fontSize: 14, marginLeft: 8, flex: 1 },
  viewReceiptBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    marginTop: 12,
    borderRadius: 30,
    borderWidth: 1,
  },
  viewReceiptText: { fontWeight: "700", marginLeft: 8, fontSize: 15 },
  emptyContainer: { alignItems: "center", marginTop: 100 },
  emptyText: { fontSize: 18, marginTop: 20 },

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

  // Modal styles (reused from NotificationsScreen)
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  modalCard: {
    width: "100%",
    borderRadius: 28,
    padding: 28,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 12,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "800",
    marginTop: 16,
    marginBottom: 8,
    textAlign: "center",
  },
  modalMessage: {
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 28,
  },
  modalButtonRow: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
  },
  modalCancelButton: {
    borderWidth: 1,
    backgroundColor: "transparent",
  },
  modalConfirmButton: {
    backgroundColor: "#0f3c91",
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  modalConfirmButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
});
