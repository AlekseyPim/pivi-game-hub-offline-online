/**
 * Web stub: in-app purchases are native-only, so the "Buy me a coffee" button is
 * hidden on web. Keeping this sibling means the web bundle never imports the
 * `expo-iap` native module.
 */
export function CoffeeButton() {
  return null;
}
