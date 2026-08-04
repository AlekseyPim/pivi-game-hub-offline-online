import { Alert, Clipboard } from 'react-native';

/**
 * Copy text to the clipboard and confirm with a lightweight alert.
 *
 * Uses React Native's built-in (core) Clipboard rather than `expo-clipboard` so
 * it works over OTA updates and on web (react-native-web ships a Clipboard),
 * without needing a fresh native build. Mirrors the sibling ludo-game.
 */
export function copyToClipboard(text: string, confirmMessage: string): void {
  Clipboard.setString(text);
  Alert.alert(confirmMessage);
}
