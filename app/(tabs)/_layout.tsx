import { Tabs } from 'expo-router';
import { CalendarDaysIcon, DumbbellIcon, SettingsIcon, TrendingUpIcon } from 'lucide-react-native';
import { useUniwind } from 'uniwind';

export default function TabLayout() {
  const { theme } = useUniwind();
  const isDark = theme === 'dark';

  const bg = isDark ? '#0a0a0a' : '#ffffff';
  const border = isDark ? '#1a1a1a' : '#f5f5f5';
  const active = isDark ? '#ffffff' : '#0a0a0a';
  const inactive = isDark ? '#525252' : '#a3a3a3';

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: bg,
          borderTopColor: border,
          borderTopWidth: 1,
          height: 82,
          paddingTop: 10,
          paddingBottom: 26,
        },
        tabBarActiveTintColor: active,
        tabBarInactiveTintColor: inactive,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          letterSpacing: 0.2,
        },
      }}>
      <Tabs.Screen
        name="workouts"
        options={{
          title: 'Exercises',
          tabBarIcon: ({ color }) => <DumbbellIcon size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: 'Track',
          tabBarIcon: ({ color }) => <CalendarDaysIcon size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="stats"
        options={{
          title: 'Stats',
          tabBarIcon: ({ color }) => <TrendingUpIcon size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color }) => <SettingsIcon size={22} color={color} />,
        }}
      />
    </Tabs>
  );
}
