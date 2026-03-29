import { Ionicons } from "@expo/vector-icons";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import {
  CardStyleInterpolators,
  createStackNavigator,
} from "@react-navigation/stack";
import { useContext, useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, TouchableOpacity } from "react-native";
import { AuthContext } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";

// Screens
import ChatbotScreen from "../screens/ChatbotScreen";
import ClearanceScreen from "../screens/ClearanceScreen";
import FeesScreen from "../screens/FeesScreen";
import HomeScreen from "../screens/HomeScreen";
import LoginScreen from "../screens/LoginScreen";
import NotificationsScreen from "../screens/NotificationsScreen";
import PaymentHistoryScreen from "../screens/PaymentHistoryScreen";
import PaymentScreen from "../screens/PaymentScreen";
import ProfileScreen from "../screens/ProfileScreen";
import RegisterScreen from "../screens/RegisterScreen";

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

/* ─────────────────────────────────────────────
   🔥 Animated UniBot Button (UNCHANGED)
───────────────────────────────────────────── */
function UniBotTabButton({ onPress, accessibilityState }) {
  const { colors } = useTheme();
  const focused = accessibilityState?.selected;

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pulseOpacity = useRef(new Animated.Value(0.6)).current;
  const spinAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.55,
            duration: 900,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 700,
            easing: Easing.in(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(pulseOpacity, {
            toValue: 0,
            duration: 900,
            useNativeDriver: true,
          }),
          Animated.timing(pulseOpacity, {
            toValue: 0.6,
            duration: 0,
            useNativeDriver: true,
          }),
        ]),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  useEffect(() => {
    if (focused) {
      Animated.sequence([
        Animated.spring(scaleAnim, {
          toValue: 1.15,
          useNativeDriver: true,
          bounciness: 12,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          bounciness: 8,
        }),
      ]).start();

      spinAnim.setValue(0);
      Animated.timing(spinAnim, {
        toValue: 1,
        duration: 500,
        easing: Easing.out(Easing.back(1.5)),
        useNativeDriver: true,
      }).start();
    }
  }, [focused]);

  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={styles.uniBotWrapper}
    >
      <Animated.View
        style={[
          styles.pulseRing,
          {
            borderColor: colors.brand,
            transform: [{ scale: pulseAnim }],
            opacity: pulseOpacity,
          },
        ]}
      />

      <Animated.View
        style={[
          styles.uniBotButton,
          {
            backgroundColor: focused ? colors.brand : "rgb(244,180,20)",
            transform: [{ scale: scaleAnim }],
            shadowColor: focused ? colors.brand : "rgb(244,180,20)",
          },
        ]}
      >
        <Animated.View style={{ transform: [{ rotate: spin }] }}>
          <Ionicons
            name="chatbubble-ellipses"
            size={28}
            color={focused ? "#fff" : "#0f3c91"}
          />
        </Animated.View>
      </Animated.View>
    </TouchableOpacity>
  );
}

/* ─────────────────────────────────────────────
   🔥 Tab Navigator (WITH ANIMATION)
───────────────────────────────────────────── */
function TabNavigator() {
  const { colors, isDark } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === "Home") {
            iconName = focused ? "home" : "home-outline";
          } else if (route.name === "Fees") {
            iconName = focused ? "cash" : "cash-outline";
          } else if (route.name === "Clearance") {
            iconName = focused
              ? "checkmark-circle"
              : "checkmark-circle-outline";
          } else if (route.name === "Profile") {
            iconName = focused ? "person" : "person-outline";
          }

          // 🔥 ANIMATION (scale)
          const scale = focused ? 1.15 : 1;

          return (
            <Animated.View style={{ transform: [{ scale }] }}>
              <Ionicons name={iconName} size={size} color={color} />
            </Animated.View>
          );
        },

        tabBarActiveTintColor: colors.brand,
        tabBarInactiveTintColor: colors.textMuted,

        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          elevation: 8,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: isDark ? 0.3 : 0.06,
          shadowRadius: 8,
          height: 62,
        },

        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "600",
        },

        headerShown: false,
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Fees" component={FeesScreen} />

      <Tab.Screen
        name="Chatbot"
        component={ChatbotScreen}
        options={{
          tabBarLabel: "UniBot",
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: "700",
            color: "rgb(244,180,20)",
            marginTop: 2,
          },
          tabBarButton: (props) => <UniBotTabButton {...props} />,
        }}
      />

      <Tab.Screen name="Clearance" component={ClearanceScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

/* ─────────────────────────────────────────────
   🔥 Root Navigator (WITH TRANSITION)
───────────────────────────────────────────── */
export default function AppNavigator() {
  const { user } = useContext(AuthContext);
  const { colors } = useTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.textPrimary,
        cardStyle: { backgroundColor: colors.background },

        // 🔥 TRANSITION
        gestureEnabled: true,
        gestureDirection: "horizontal",

        transitionSpec: {
          open: {
            animation: "timing",
            config: { duration: 300 },
          },
          close: {
            animation: "timing",
            config: { duration: 250 },
          },
        },

        cardStyleInterpolator: CardStyleInterpolators.forHorizontalIOS,
      }}
    >
      {user ? (
        <>
          <Stack.Screen
            name="MainTabs"
            component={TabNavigator}
            options={{ headerShown: false }}
          />

          <Stack.Screen
            name="Payment"
            component={PaymentScreen}
            options={{ headerShown: false }}
          />

          <Stack.Screen
            name="PaymentHistory"
            component={PaymentHistoryScreen}
            options={{ headerShown: false }}
          />

          <Stack.Screen
            name="Notifications"
            component={NotificationsScreen}
            options={{ headerShown: false }}
          />
        </>
      ) : (
        <>
          <Stack.Screen
            name="Login"
            component={LoginScreen}
            options={{ headerShown: false }}
          />

          <Stack.Screen
            name="Register"
            component={RegisterScreen}
            options={{ headerShown: false }}
          />
        </>
      )}
    </Stack.Navigator>
  );
}

/* ───────────────────────────────────────────── */
const styles = StyleSheet.create({
  uniBotWrapper: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    top: -18,
  },
  pulseRing: {
    position: "absolute",
    width: 58,
    height: 58,
    borderRadius: 29,
    borderWidth: 2,
  },
  uniBotButton: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: "center",
    justifyContent: "center",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 10,
  },
});
