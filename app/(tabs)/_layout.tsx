import React from 'react';
import Icons from "@react-native-vector-icons/ionicons";
import { Link, Tabs } from 'expo-router';
import { Image, Pressable, View, Text, StyleSheet, ColorValue } from 'react-native';

import { usePalette } from '@/contextes/contextePalette'
import { useColorScheme } from '@/components/useColorScheme';
import { useClientOnlyValue } from '@/components/useClientOnlyValue';
import BetaTag from '@/components/betaTag';
import { CustomTabBar } from '@/components/customTabBar';
import { useFont } from '@/contextes/contexteFont';
import RequestStatus from '@/components/requestStatus';
import { useNotifications } from '@/contextes/contexteNotifications';

// You can explore the built-in icon families and icons on the web at https://icons.expo.fyi/
function TabBarIcon(props: {
  name: React.ComponentProps<typeof Icons>['name'];
  color: ColorValue;
}) {
  return <Icons size={24} style={{ marginBottom: -4, }} {...props} />;
}

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const { colors } = usePalette()
  const { fonts } = useFont()
  const {notifications, nonLues} = useNotifications()

  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        tabBarActiveTintColor: colors.secondary,
        // Disable the static render of the header on web
        // to prevent a hydration error in React Navigation v6.
        headerShown: false,
        tabBarLabelStyle: { fontFamily: fonts.title },
        tabBarBadgeStyle: { backgroundColor: colors.error, left: 20, color: colors.text },
       
      }}
    >
      <Tabs.Screen
        name="home"        
        options={{
          href:"/(tabs)/home",
          title: 'sync',
          headerTitle:'sync',
          tabBarIcon: ({ color }) => <TabBarIcon name={'grid-outline'} color={color} />,          
        }}
      />
      <Tabs.Screen
        name="feed"
        options={{
          href:'/(tabs)/feed',
          title: 'fil',
          headerTitle:'actualités',
          tabBarIcon: ({ color }) => <TabBarIcon name="list-outline" color={color} />,
          tabBarBadge: notifications.length > 0 ? nonLues > 0 ? nonLues : '' : undefined  
        }}
      />
      {/* Blank Space Filler */}
      <Tabs.Screen
        name="placeholder"
        options={{
          tabBarIconStyle:{width:10},
          tabBarIcon: () => <View style={{ width: 10 }} />,
          tabBarButton: () => <></>
        }}
      />

      <Tabs.Screen
        name="inbox"        
        options={{
          href:'/(tabs)/inbox',
          title: 'messages',
          headerTitle:'conversations',
          tabBarIcon: ({ color }) => <TabBarIcon name="chatbox-ellipses-outline" color={color} />,          
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          href:'/(tabs)/profile',
          title: 'profil',
          headerTitle:'profile',
          tabBarIcon: ({ color }) => <TabBarIcon name="person-circle-outline" color={color} />,
        }}
      />
    </Tabs>
  );
}
