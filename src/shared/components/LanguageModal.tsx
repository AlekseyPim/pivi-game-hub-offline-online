import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { ACCENT } from '@/shared/constants/colors';
import { useTheme } from '@/shared/constants/theme';
import { useT } from '@/shared/i18n/useT';
import {
  LANGUAGES,
  LANGUAGE_FLAGS,
  LANGUAGE_LABELS,
} from '@/shared/i18n/translations';
import { useSettingsStore } from '@/shared/store/settingsStore';

/**
 * A flag button that opens a modal list of every supported language (same UX as
 * the sibling ludo-game). Tapping a language sets it and closes the sheet.
 */
export function LanguageButton() {
  const theme = useTheme();
  const t = useT();
  const language = useSettingsStore((s) => s.language);
  const setLanguage = useSettingsStore((s) => s.setLanguage);
  const [open, setOpen] = useState(false);

  return (
    <>
      <Pressable
        style={[styles.flagButton, { borderColor: theme.textSecondary }]}
        onPress={() => setOpen(true)}
        hitSlop={6}
      >
        <Text style={styles.flag}>{LANGUAGE_FLAGS[language]}</Text>
      </Pressable>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <View style={[styles.card, { backgroundColor: theme.card }]}>
            <Text style={[styles.title, { color: theme.textPrimary }]}>
              {t('language')}
            </Text>
            {LANGUAGES.map((lang) => {
              const active = language === lang;
              return (
                <Pressable
                  key={lang}
                  style={[
                    styles.option,
                    { borderColor: active ? ACCENT : 'transparent' },
                  ]}
                  onPress={() => {
                    setLanguage(lang);
                    setOpen(false);
                  }}
                >
                  <Text style={styles.optionFlag}>{LANGUAGE_FLAGS[lang]}</Text>
                  <Text style={[styles.optionText, { color: theme.textPrimary }]}>
                    {LANGUAGE_LABELS[lang]}
                  </Text>
                  {active ? <Text style={styles.check}>✓</Text> : null}
                </Pressable>
              );
            })}
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  flagButton: {
    width: 48,
    height: 48,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flag: { fontSize: 24 },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  card: {
    width: '100%',
    maxWidth: 320,
    borderRadius: 18,
    padding: 18,
    gap: 8,
  },
  title: { fontSize: 18, fontWeight: '800', marginBottom: 4 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 2,
  },
  optionFlag: { fontSize: 24 },
  optionText: { flex: 1, fontSize: 17, fontWeight: '700' },
  check: { fontSize: 18, fontWeight: '900', color: ACCENT },
});
