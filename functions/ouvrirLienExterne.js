import { Alert, Linking } from 'react-native';

export function ouvrirLienExterne(url) {
  const ouvrir = () => Linking.openURL(url);
  Alert.alert(
    "redirection",
    "tu seras redirigé à l'extérieur de Sync",
    [
      { text: "rester ici", style: "cancel" },
      { text: "ok", onPress: ouvrir }
    ]
  );
}