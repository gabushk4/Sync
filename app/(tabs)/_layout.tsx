import Icons from "@react-native-vector-icons/ionicons";
import { Tabs } from 'expo-router';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { ColorValue, View } from 'react-native';

import { CustomTabBar } from '@/components/customTabBar';
import { useColorScheme } from '@/components/useColorScheme';
import { useFont } from '@/contextes/contexteFont';
import { useNotifications } from '@/contextes/contexteNotifications';
import { usePalette } from '@/contextes/contextePalette';

// You can explore the built-in icon families and icons on the web at https://icons.expo.fyi/
function TabBarIcon(props: {
  name: React.ComponentProps<typeof Icons>['name'];
  color: ColorValue;
}) {
  return <Icons size={24} style={{ marginBottom: -4, }} {...props} />;
}

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const { t } = useTranslation();
  const { colors } = usePalette()
  const { fonts } = useFont()
  const {notifications, nonLues} = useNotifications()
  const demandesAmisEnAttente = notifications.filter((notification) =>
    notification.type === 'demande_ami'
    && notification.statut_metier === 'en_attente'
  ).length

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
          title: t('common:tabs.home'),
          headerTitle:t('common:tabs.home'),
          tabBarIcon: ({ color }) => <TabBarIcon name={'grid-outline'} color={color} />,          
        }}
      />
      <Tabs.Screen
        name="feed"
        options={{
          href:'/(tabs)/feed',
          title: t('common:tabs.feed'),
          headerTitle:t('common:tabs.feedTitle'),
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
          title: t('common:tabs.inbox'),
          headerTitle:t('common:tabs.inboxTitle'),
          tabBarIcon: ({ color }) => <TabBarIcon name="chatbox-ellipses-outline" color={color} />,          
          tabBarBadge: demandesAmisEnAttente > 0 ? demandesAmisEnAttente : undefined,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          href:'/(tabs)/profile',
          title: t('common:tabs.profile'),
          headerTitle:t('common:tabs.profileTitle'),
          tabBarIcon: ({ color }) => <TabBarIcon name="person-circle-outline" color={color} />,
        }}
      />
    </Tabs>
  );
}
