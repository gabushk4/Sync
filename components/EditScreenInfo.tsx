import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View, useColorScheme } from 'react-native';

import { ExternalLink } from './ExternalLink';

import Colors from '@/constants/Colors';

export default function EditScreenInfo({ path }: { path: string }) {
  const { t } = useTranslation();
  const theme = useColorScheme() === 'dark' ? 'dark' : 'light';
  return (
    <View style={{ backgroundColor: Colors[theme].background }}>
      <View style={[styles.getStartedContainer, { backgroundColor: Colors[theme].background }]}>
        <Text
          style={[{ color: theme === 'dark' ? "rgba(255,255,255,0.8)" : "rgba(0,0,0,0.8)" }, styles.getStartedText]}>
          {t('common:demo.openCode')}
        </Text>

        <View
          style={[styles.codeHighlightContainer, styles.homeScreenFilename, { backgroundColor: theme === 'dark' ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)" }]}>
          <Text style={[{ color: Colors[theme].text }, { fontFamily: 'SpaceMono' }]}>{path}</Text>
        </View>

        <Text
          style={[{ color: theme === 'dark' ? "rgba(255,255,255,0.8)" : "rgba(0,0,0,0.8)" }, styles.getStartedText]}>
          {t('common:demo.changeText')}
        </Text>
      </View>

      <View style={[styles.helpContainer, { backgroundColor: Colors[theme].background }]}>
        <ExternalLink
          style={styles.helpLink}
          href="https://docs.expo.io/get-started/create-a-new-app/#opening-the-app-on-your-phonetablet">
          <Text style={[styles.helpLinkText, { color: theme === 'dark' ? Colors.dark.text : Colors.light.tint }]}>
            {t('common:demo.reloadHelp')}
          </Text>
        </ExternalLink>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  getStartedContainer: {
    alignItems: 'center',
    marginHorizontal: 50,
  },
  homeScreenFilename: {
    marginVertical: 7,
  },
  codeHighlightContainer: {
    borderRadius: 3,
    paddingHorizontal: 4,
  },
  getStartedText: {
    fontSize: 17,
    lineHeight: 24,
    textAlign: 'center',
  },
  helpContainer: {
    marginTop: 15,
    marginHorizontal: 20,
    alignItems: 'center',
  },
  helpLink: {
    paddingVertical: 15,
  },
  helpLinkText: {
    textAlign: 'center',
  },
});
