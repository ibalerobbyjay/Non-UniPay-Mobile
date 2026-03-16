import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
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
  return (
    <ThemeProvider>
      <AuthProvider>
        <NavigationContainer linking={linking}>
          <AppNavigator />
        </NavigationContainer>
      </AuthProvider>
    </ThemeProvider>
  );
}
