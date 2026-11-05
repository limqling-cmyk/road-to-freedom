import React from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StoreProvider, useStore } from './src/store';
import { C } from './src/ui';
import { setPendingDir, TAB_ORDER } from './src/gestures';
import OverviewScreen from './src/screens/OverviewScreen';
import PlanScreen from './src/screens/PlanScreen';
import RecordsScreen from './src/screens/RecordsScreen';
import AssetsScreen from './src/screens/AssetsScreen';
import HistoryScreen from './src/screens/HistoryScreen';

const Tab = createBottomTabNavigator();

const ICONS = { Overview: '◉', Plan: '%', Records: '≡', History: '▤', Assets: '◆' };

function Tabs() {
  const { state } = useStore();
  const insets = useSafeAreaInsets();
  if (!state) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.bg }}>
        <ActivityIndicator color={C.brand} />
      </View>
    );
  }
  return (
    <NavigationContainer>
      <Tab.Navigator
        // tapping a tab also slides the page in from the matching side
        screenListeners={({ navigation, route }) => ({
          tabPress: () => {
            const st = navigation.getState();
            const cur = st.routes[st.index]?.name;
            setPendingDir(Math.sign(TAB_ORDER.indexOf(route.name) - TAB_ORDER.indexOf(cur)));
          },
        })}
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarActiveTintColor: C.brand,
          tabBarInactiveTintColor: '#9AA09D',
          // tall enough that labels sit fully above the iPhone home bar
          tabBarStyle: { backgroundColor: '#fff', borderTopColor: C.line, height: 54 + Math.round(insets.bottom * 0.5), paddingTop: 6, paddingBottom: Math.round(insets.bottom * 0.5) },
          tabBarItemStyle: { paddingBottom: 4 },
          tabBarIconStyle: { height: 22 },
          tabBarLabelStyle: { fontSize: 11, fontWeight: '600', lineHeight: 14 },
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 16, lineHeight: 20, fontWeight: '800' }}>{ICONS[route.name]}</Text>,
        })}
      >
        <Tab.Screen name="Overview" component={OverviewScreen} />
        <Tab.Screen name="Plan" component={PlanScreen} />
        <Tab.Screen name="Records" component={RecordsScreen} />
        <Tab.Screen name="History" component={HistoryScreen} />
        <Tab.Screen name="Assets" component={AssetsScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <StoreProvider>
        <StatusBar style="light" />
        <Tabs />
      </StoreProvider>
    </SafeAreaProvider>
  );
}
