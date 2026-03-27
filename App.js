import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { useEffect, useRef } from "react";
import { Linking } from "react-native";
import { AuthProvider } from "./src/contexts/AuthContext";
import { ThemeProvider } from "./src/contexts/ThemeContext";
import AppNavigator from "./src/navigation/AppNavigator";

const Stack = createStackNavigator();

const linking = {
  prefixes: ["nonunipay://"],
  config: {
    screens: {
      Home: "home",
      Fees: "fees",
      Clearance: "clearance",
      Profile: "profile",
      Payment: "payment",
      PaymentHistory: "payment-history",
    },
  },
};

export default function App() {
  const navigationRef = useRef(null);

  useEffect(() => {
    // Handle deep links while the app is running
    const subscription = Linking.addEventListener("url", ({ url }) => {
      if (url === "nonunipay://payment-success") {
        // Navigate to Home with success flag
        navigationRef.current?.navigate("Home", { paymentSuccess: true });
      }
    });

    // Check if app was opened via deep link
    Linking.getInitialURL().then((url) => {
      if (url === "nonunipay://payment-success") {
        navigationRef.current?.navigate("Home", { paymentSuccess: true });
      }
    });

    return () => subscription.remove();
  }, []);

  return (
    <ThemeProvider>
      <AuthProvider>
        <NavigationContainer ref={navigationRef} linking={linking}>
          <AppNavigator />
        </NavigationContainer>
      </AuthProvider>
    </ThemeProvider>
  );
}
