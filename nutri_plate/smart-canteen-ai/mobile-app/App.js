import React from 'react';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';

import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';
import HomeScreen from './screens/HomeScreen';
import FoodDetail from './screens/FoodDetail';
import CameraScreen from './screens/CameraScreen';
import StaffDashboard from './screens/StaffDashboard';
import MealPlannerScreen from './screens/MealPlannerScreen';
import HealthGoalsScreen from './screens/HealthGoalsScreen';
import OrderAheadScreen from './screens/OrderAheadScreen';
import RatingsScreen from './screens/RatingsScreen';
import LandingScreen from './screens/LandingScreen';

const Stack = createNativeStackNavigator();

function AuthStack() {
    return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
        </Stack.Navigator>
    );
}

function StudentStack() {
    const { colors } = useTheme();
    return (
        <Stack.Navigator
            screenOptions={{
                headerStyle: { backgroundColor: colors.navBg },
                headerTintColor: colors.text,
                headerTitleStyle: { fontWeight: '600' },
                headerShadowVisible: false,
            }}
        >
            <Stack.Screen name="StudentHome" component={LandingScreen} options={{ headerShown: false }} />
            <Stack.Screen name="Home" component={HomeScreen} options={{ title: 'Menu' }} />
            <Stack.Screen name="FoodDetail" component={FoodDetail} options={{ title: 'Food Details' }} />
            <Stack.Screen name="Camera" component={CameraScreen} options={{ title: 'Scan Food' }} />
            <Stack.Screen name="MealPlanner" component={MealPlannerScreen} options={{ title: 'Meal Planner' }} />
            <Stack.Screen name="HealthGoals" component={HealthGoalsScreen} options={{ title: 'Health Goals' }} />
            <Stack.Screen name="OrderAhead" component={OrderAheadScreen} options={{ title: 'Order Ahead' }} />
            <Stack.Screen name="Ratings" component={RatingsScreen} options={{ title: 'Ratings' }} />
        </Stack.Navigator>
    );
}

function StaffStack() {
    const { colors } = useTheme();
    return (
        <Stack.Navigator
            screenOptions={{
                headerStyle: { backgroundColor: colors.navBg },
                headerTintColor: colors.text,
                headerTitleStyle: { fontWeight: '600' },
                headerShadowVisible: false,
            }}
        >
            <Stack.Screen name="StaffHome" component={LandingScreen} options={{ headerShown: false }} />
            <Stack.Screen name="Staff" component={StaffDashboard} options={{ title: 'Dashboard' }} />
            <Stack.Screen name="Camera" component={CameraScreen} options={{ title: 'Scan Food' }} />
            <Stack.Screen name="Ratings" component={RatingsScreen} options={{ title: 'Feedback' }} />
            <Stack.Screen name="FoodDetail" component={FoodDetail} options={{ title: 'Food Details' }} />
        </Stack.Navigator>
    );
}

function AppNavigator() {
    const { isDark, colors } = useTheme();
    const { isLoggedIn, user } = useAuth();

    const navTheme = {
        ...(isDark ? DarkTheme : DefaultTheme),
        colors: {
            ...(isDark ? DarkTheme : DefaultTheme).colors,
            background: colors.bg,
            card: colors.navBg,
            text: colors.text,
            border: colors.border,
            primary: colors.accent,
        },
    };

    return (
        <NavigationContainer theme={navTheme}>
            {!isLoggedIn ? (
                <AuthStack />
            ) : user?.role === 'staff' ? (
                <StaffStack />
            ) : (
                <StudentStack />
            )}
        </NavigationContainer>
    );
}

export default function App() {
    return (
        <ThemeProvider>
            <AuthProvider>
                <AppNavigator />
            </AuthProvider>
        </ThemeProvider>
    );
}
