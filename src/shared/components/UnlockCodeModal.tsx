import * as Crypto from 'expo-crypto';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { AD_FREE_CODE_SHA256 } from '@/shared/constants/ads';
import { useTheme } from '@/shared/constants/theme';
import { useT } from '@/shared/i18n/useT';
import { useAdFreeStore } from '@/shared/store/adFreeStore';

interface UnlockCodeModalProps {
  visible: boolean;
  onClose: () => void;
}

type Status = 'idle' | 'checking' | 'error' | 'done';

/**
 * Hidden "remove ads" gate, opened by secretly tapping the logo. Verifies the
 * entered code against a shipped SHA-256 digest (the plaintext is never in the
 * bundle) and, on success, unlocks ad-free mode.
 */
export function UnlockCodeModal({ visible, onClose }: UnlockCodeModalProps) {
  const theme = useTheme();
  const t = useT();
  const unlock = useAdFreeStore((s) => s.unlock);
  const alreadyAdFree = useAdFreeStore((s) => s.adFree);

  const [code, setCode] = useState('');
  const [status, setStatus] = useState<Status>('idle');

  const submit = async () => {
    if (status === 'checking') return;
    setStatus('checking');
    const digest = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      code.trim().toLowerCase(),
    );
    if (digest === AD_FREE_CODE_SHA256) {
      unlock();
      setStatus('done');
    } else {
      setStatus('error');
    }
  };

  const close = () => {
    setCode('');
    setStatus('idle');
    onClose();
  };

  const succeeded = alreadyAdFree || status === 'done';

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
      <Pressable style={styles.backdrop} onPress={close}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <Pressable style={[styles.card, { backgroundColor: theme.card }]} onPress={() => {}}>
            <Text style={[styles.title, { color: theme.textPrimary }]}>
              {t('unlock_title')}
            </Text>

            {succeeded ? (
              <>
                <Text style={[styles.body, { color: theme.textSecondary }]}>
                  {t('unlock_done')}
                </Text>
                <Pressable style={styles.primary} onPress={close}>
                  <Text style={styles.primaryText}>{t('close')}</Text>
                </Pressable>
              </>
            ) : (
              <>
                <Text style={[styles.body, { color: theme.textSecondary }]}>
                  {t('unlock_body')}
                </Text>
                <TextInput
                  value={code}
                  onChangeText={(v) => {
                    setCode(v);
                    if (status === 'error') setStatus('idle');
                  }}
                  placeholder={t('unlock_placeholder')}
                  placeholderTextColor={theme.textSecondary}
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={[
                    styles.input,
                    {
                      color: theme.textPrimary,
                      borderColor: status === 'error' ? '#E53935' : '#1E88E5',
                    },
                  ]}
                  onSubmitEditing={submit}
                  returnKeyType="done"
                />
                {status === 'error' && <Text style={styles.error}>{t('unlock_wrong')}</Text>}
                <View style={styles.row}>
                  <Pressable style={styles.secondary} onPress={close}>
                    <Text style={[styles.secondaryText, { color: theme.textSecondary }]}>
                      {t('cancel')}
                    </Text>
                  </Pressable>
                  <Pressable style={[styles.primary, styles.primaryFlex]} onPress={submit}>
                    <Text style={styles.primaryText}>{t('unlock_submit')}</Text>
                  </Pressable>
                </View>
              </>
            )}
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  card: { width: 300, borderRadius: 18, padding: 20, gap: 12 },
  title: { fontSize: 18, fontWeight: '800' },
  body: { fontSize: 15, lineHeight: 21 },
  input: {
    fontSize: 17,
    fontWeight: '600',
    borderWidth: 2,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  error: { color: '#E53935', fontSize: 14, fontWeight: '700' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 2 },
  secondary: { paddingVertical: 12, paddingHorizontal: 18 },
  secondaryText: { fontSize: 15, fontWeight: '700' },
  primary: {
    backgroundColor: '#1E88E5',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryFlex: { flex: 1 },
  primaryText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});
