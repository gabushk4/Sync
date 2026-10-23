/**
 * Écran technique : absorbe le deep link de retour du consentement Google.
 *
 * Le redirect OAuth arrive dans l'app via le scheme défini dans app.json
 * (`sync://oauth2redirect`). Sur Android, expo-web-browser n'a pas
 * d'implémentation native de `openAuthSessionAsync` : le retour est donc
 * livré par un deep link système, que **expo-router traite aussi comme une
 * route**. Sans cette route, l'app afficherait l'écran « route introuvable »
 * juste après le consentement.
 *
 * Le code d'autorisation n'est pas lu ici : c'est expo-web-browser qui l'a
 * déjà récupéré (via `Linking.addEventListener('url')`) pour résoudre la
 * promesse de `promptAsync`.
 *
 * @returns {JSX.Element} Écran vide.
 */
export default function OAuthRedirectScreen() {
    return null;
}
