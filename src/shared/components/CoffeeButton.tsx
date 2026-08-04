import { ErrorCode, useIAP } from 'expo-iap';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import {
  COFFEE_FALLBACK_PRICE,
  COFFEE_PRODUCT_ID,
  IAP_PRODUCT_IDS,
  SUPPORTER_PRODUCT_ID,
} from '@/shared/constants/iap';
import { useTheme } from '@/shared/constants/theme';
import { useT } from '@/shared/i18n/useT';
import { useSupporterStore } from '@/shared/store/supporterStore';

/**
 * "Buy me a coffee" — a hybrid tip backed by StoreKit / Google Play Billing
 * (identical to ludo-game). First coffee → the non-consumable supporter unlock
 * (perks forever, restorable). Every coffee after → the consumable tip.
 *
 * Native only: a `.web.tsx` sibling renders nothing so the web bundle never
 * pulls in the native module.
 */
export function CoffeeButton() {
  const theme = useTheme();
  const t = useT();
  const router = useRouter();
  const isSupporter = useSupporterStore((s) => s.isSupporter);
  const coffeeCount = useSupporterStore((s) => s.coffeeCount);
  const markSupporter = useSupporterStore((s) => s.markSupporter);
  const addCoffee = useSupporterStore((s) => s.addCoffee);
  const [purchasing, setPurchasing] = useState(false);

  const { connected, products, fetchProducts, requestPurchase, finishTransaction } =
    useIAP({
      onPurchaseSuccess: async (purchase) => {
        const isConsumable = purchase.productId === COFFEE_PRODUCT_ID;
        try {
          await finishTransaction({ purchase, isConsumable });
        } finally {
          setPurchasing(false);
          if (isConsumable) addCoffee();
          else markSupporter();
          router.push('/thanks');
        }
      },
      onPurchaseError: (error) => {
        setPurchasing(false);
        if (error.code !== ErrorCode.UserCancelled) {
          Alert.alert(t('coffee_error_title'), error.message);
        }
      },
    });

  useEffect(() => {
    if (connected) {
      void fetchProducts({ skus: IAP_PRODUCT_IDS, type: 'in-app' });
    }
  }, [connected, fetchProducts]);

  const targetId = isSupporter ? COFFEE_PRODUCT_ID : SUPPORTER_PRODUCT_ID;
  const product = products.find((p) => p.id === targetId);

  const onPurchase = useCallback(() => {
    if (!product || purchasing) return;
    setPurchasing(true);
    void requestPurchase({
      request: {
        apple: { sku: product.id },
        google: { skus: [product.id] },
      },
      type: 'in-app',
    }).catch(() => {
      setPurchasing(false);
    });
  }, [product, purchasing, requestPurchase]);

  const price = product?.displayPrice ?? COFFEE_FALLBACK_PRICE;
  const disabled = !product || purchasing;

  return (
    <Pressable
      style={[styles.card, { backgroundColor: theme.card, opacity: disabled ? 0.6 : 1 }]}
      onPress={onPurchase}
      disabled={disabled}
    >
      <View style={styles.rowText}>
        <Text style={[styles.rowLabel, { color: theme.textPrimary }]}>
          {isSupporter ? t('buy_coffee_again') : t('buy_coffee')}
        </Text>
        <Text style={[styles.rowHint, { color: theme.textSecondary }]}>
          {coffeeCount > 0
            ? t('buy_coffee_again_hint', { n: coffeeCount })
            : t('buy_coffee_hint')}
        </Text>
      </View>
      {purchasing ? (
        <ActivityIndicator color={theme.textSecondary} />
      ) : (
        <Text style={styles.price}>{price}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    alignSelf: 'stretch',
  },
  rowText: { flex: 1, gap: 2, paddingRight: 12 },
  rowLabel: { fontSize: 17, fontWeight: '700' },
  rowHint: { fontSize: 13 },
  price: { fontSize: 16, fontWeight: '800', color: '#1E88E5' },
});
