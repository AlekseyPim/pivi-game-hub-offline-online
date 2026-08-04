import { getAvailablePurchases, useIAP } from 'expo-iap';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { SUPPORTER_PRODUCT_ID } from '@/shared/constants/iap';
import { useTheme } from '@/shared/constants/theme';
import { useT } from '@/shared/i18n/useT';
import { useSupporterStore } from '@/shared/store/supporterStore';

/**
 * "Restore purchases" row for Settings. Re-grants the non-consumable supporter
 * unlock after a reinstall / on a new device by querying the store.
 *
 * Native only: a `.web.tsx` sibling renders nothing.
 */
export function RestorePurchasesButton() {
  const theme = useTheme();
  const t = useT();
  const markSupporter = useSupporterStore((s) => s.markSupporter);
  const [restoring, setRestoring] = useState(false);
  // Mounting the hook keeps a store connection alive so the query below works.
  useIAP();

  const onRestore = useCallback(async () => {
    if (restoring) return;
    setRestoring(true);
    try {
      const purchases = await getAvailablePurchases();
      const owned = purchases.some((p) => p.productId === SUPPORTER_PRODUCT_ID);
      if (owned) markSupporter();
      Alert.alert(t('restore_title'), owned ? t('restore_done') : t('restore_none'));
    } catch {
      Alert.alert(t('restore_title'), t('restore_error'));
    } finally {
      setRestoring(false);
    }
  }, [restoring, markSupporter, t]);

  return (
    <Pressable
      style={[styles.card, { backgroundColor: theme.card }]}
      onPress={onRestore}
      disabled={restoring}
    >
      <View style={styles.rowText}>
        <Text style={[styles.rowLabel, { color: theme.textPrimary }]}>
          {t('restore_purchases')}
        </Text>
        <Text style={[styles.rowHint, { color: theme.textSecondary }]}>
          {t('restore_hint')}
        </Text>
      </View>
      {restoring ? (
        <ActivityIndicator color={theme.textSecondary} />
      ) : (
        <Text style={[styles.chevron, { color: theme.textSecondary }]}>›</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowText: { flex: 1, gap: 2, paddingRight: 12 },
  rowLabel: { fontSize: 17, fontWeight: '700' },
  rowHint: { fontSize: 13 },
  chevron: { fontSize: 28, fontWeight: '700' },
});
