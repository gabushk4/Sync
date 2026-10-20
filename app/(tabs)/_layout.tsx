import Icons from "@react-native-vector-icons/ionicons";
import { Tabs } from 'expo-router';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { ColorValue, View } from 'react-native';

import { CustomTabBar } from '@/components/customTabBar';
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
        // "sync" tab pressed while already in the home tab, over the timeline (e.g. on
        // the calendar page): go back to the existing timeline, like the calendar's
        // back arrow, so it keeps its state (already on the calendar's selected day).
        // The tab used to be a link (`href` option) that opened the home route again:
        // a fresh timeline, back on today, pushed over the calendar. Without `href`,
        // the tab only switches tabs, and this listener pops the home stack.
        // Philip — user story 5 (month calendar).
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            const etatOnglets = navigation.getState()
            const ongletHome = etatOnglets.routes[etatOnglets.index]
            const pileHome = ongletHome?.name === 'home' ? ongletHome.state : undefined
            if (!pileHome?.key || (pileHome.index ?? 0) === 0) return
            e.preventDefault()
            navigation.dispatch({ type: 'POP_TO_TOP', target: pileHome.key })
          },
        })}
        options={{
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
