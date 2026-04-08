import { Ionicons } from "@expo/vector-icons";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createStackNavigator } from "@react-navigation/stack";
import { LinearGradient } from "expo-linear-gradient";
import { useContext, useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Image,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
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
   Branded Splash / Loading Screen
───────────────────────────────────────────── */
function SplashScreen() {
  const logoScale = useRef(new Animated.Value(0.7)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const titleY = useRef(new Animated.Value(16)).current;
  const dotOpacity = [
    useRef(new Animated.Value(0.2)).current,
    useRef(new Animated.Value(0.2)).current,
    useRef(new Animated.Value(0.2)).current,
  ];

  useEffect(() => {
    Animated.parallel([
      Animated.spring(logoScale, {
        toValue: 1,
        tension: 55,
        friction: 9,
        useNativeDriver: true,
        delay: 100,
      }),
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
        delay: 100,
      }),
      Animated.timing(titleOpacity, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
        delay: 500,
      }),
      Animated.spring(titleY, {
        toValue: 0,
        tension: 60,
        friction: 10,
        useNativeDriver: true,
        delay: 500,
      }),
    ]).start();

    const animateDots = () => {
      const seq = dotOpacity.map((dot, i) =>
        Animated.sequence([
          Animated.delay(i * 180),
          Animated.timing(dot, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(dot, {
            toValue: 0.2,
            duration: 300,
            useNativeDriver: true,
          }),
        ]),
      );
      Animated.loop(Animated.stagger(180, seq)).start();
    };
    const dotTimer = setTimeout(animateDots, 800);
    return () => clearTimeout(dotTimer);
  }, []);

  return (
    <View style={splash.container}>
      <LinearGradient
        colors={["#04122e", "#091d50", "#0a2060"]}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFill}
      />
      <Animated.View
        style={[
          splash.logoWrap,
          { transform: [{ scale: logoScale }], opacity: logoOpacity },
        ]}
      >
        <Image
          source={require("../../assets/logo.png")}
          style={splash.logo}
          resizeMode="cover"
        />
      </Animated.View>
      <Animated.View
        style={[
          splash.textBlock,
          { opacity: titleOpacity, transform: [{ translateY: titleY }] },
        ]}
      >
        <Animated.Text style={splash.appName}>Non-UniPay</Animated.Text>
        <Animated.Text style={splash.tagline}>
          School Fee Payment & Exam Clearance
        </Animated.Text>
      </Animated.View>
      <View style={splash.dotsRow}>
        {dotOpacity.map((anim, i) => (
          <Animated.View key={i} style={[splash.dot, { opacity: anim }]} />
        ))}
      </View>
    </View>
  );
}

/* ─────────────────────────────────────────────
   Animated UniBot Button
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
   Tab Navigator
───────────────────────────────────────────── */
function TabNavigator({ screenshotMode, setScreenshotMode }) {
  const { colors, isDark } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          if (route.name === "Home")
            iconName = focused ? "home" : "home-outline";
          else if (route.name === "Fees")
            iconName = focused ? "cash" : "cash-outline";
          else if (route.name === "Clearance")
            iconName = focused
              ? "checkmark-circle"
              : "checkmark-circle-outline";
          else if (route.name === "Profile")
            iconName = focused ? "person" : "person-outline";

          const scale = focused ? 1.15 : 1;
          return (
            <Animated.View style={{ transform: [{ scale }] }}>
              <Ionicons name={iconName} size={size} color={color} />
            </Animated.View>
          );
        },
        tabBarActiveTintColor: colors.brand,
        tabBarInactiveTintColor: colors.textMuted,
        // ← Key change: hide tab bar when screenshotMode is on
        tabBarStyle: screenshotMode
          ? { display: "none" }
          : {
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
        tabBarLabelStyle: { fontSize: 12, fontWeight: "600" },
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
      <Tab.Screen name="Clearance">
        {/* Use render prop to inject setScreenshotMode into ClearanceScreen */}
        {(props) => (
          <ClearanceScreen {...props} setScreenshotMode={setScreenshotMode} />
        )}
      </Tab.Screen>
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

/* ─────────────────────────────────────────────
   Root Navigator
───────────────────────────────────────────── */
export default function AppNavigator() {
  const { user, loading } = useContext(AuthContext);
  const { colors } = useTheme();

  // ← Shared screenshot mode state lifted up here
  const [screenshotMode, setScreenshotMode] = useState(false);

  const splashOpacity = useRef(new Animated.Value(1)).current;
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    if (!loading) {
      setTimeout(() => {
        Animated.timing(splashOpacity, {
          toValue: 0,
          duration: 500,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }).start(() => setShowSplash(false));
      }, 600);
    }
  }, [loading]);

  if (showSplash) {
    return (
      <Animated.View
        style={[StyleSheet.absoluteFill, { opacity: splashOpacity }]}
      >
        <SplashScreen />
      </Animated.View>
    );
  }

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.textPrimary,
        cardStyle: { backgroundColor: colors.background },
        gestureEnabled: true,
        gestureDirection: "horizontal",
        transitionSpec: {
          open: {
            animation: "spring",
            config: {
              stiffness: 220,
              damping: 26,
              mass: 0.9,
              overshootClamping: false,
            },
          },
          close: {
            animation: "timing",
            config: { duration: 220, easing: Easing.out(Easing.ease) },
          },
        },
        cardStyleInterpolator: ({ current, next, layouts }) => {
          return {
            cardStyle: {
              transform: [
                {
                  translateX: current.progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [layouts.screen.width * 0.35, 0],
                  }),
                },
              ],
              opacity: current.progress.interpolate({
                inputRange: [0, 0.5, 1],
                outputRange: [0, 0.7, 1],
              }),
            },
            overlayStyle: {
              opacity: current.progress.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 0.25],
              }),
            },
          };
        },
      }}
    >
      {user ? (
        <>
          <Stack.Screen name="MainTabs" options={{ headerShown: false }}>
            {/* Pass screenshotMode + setter down into TabNavigator */}
            {() => (
              <TabNavigator
                screenshotMode={screenshotMode}
                setScreenshotMode={setScreenshotMode}
              />
            )}
          </Stack.Screen>
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

/* ─────────────────────────────────────────────
   Styles
───────────────────────────────────────────── */
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

const splash = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  logoWrap: {
    width: 130,
    height: 130,
    borderRadius: 65,
    borderWidth: 4,
    borderColor: "#f4b400",
    overflow: "hidden",
    backgroundColor: "transparent",
    shadowColor: "transparent",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  logo: {
    width: "100%",
    height: "100%",
  },
  textBlock: {
    marginTop: 28,
    alignItems: "center",
  },
  appName: {
    fontSize: 28,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: 0.5,
  },
  tagline: {
    marginTop: 6,
    fontSize: 12,
    color: "rgba(255,255,255,0.4)",
    letterSpacing: 0.3,
    textAlign: "center",
  },
  dotsRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 48,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#f4b400",
  },
});
