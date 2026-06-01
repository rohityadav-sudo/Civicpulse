import React from 'react';
import { ScrollView, Text, TouchableOpacity, StyleSheet, View } from 'react-native';
import { LANGUAGES, useLanguageStore } from '../store/languageStore';
import { useT } from '../utils/i18n';
import { colors } from '../utils/theme';

export default function LanguagePicker({ onChange }) {
  const { t, language } = useT();
  const setLanguage = useLanguageStore((state) => state.setLanguage);

  const choose = async (code) => {
    await setLanguage(code);
    onChange?.(code);
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{t('language')}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {LANGUAGES.map((item) => (
          <TouchableOpacity
            key={item.code}
            style={[styles.chip, language === item.code && styles.chipActive]}
            onPress={() => choose(item.code)}
          >
            <Text style={[styles.chipText, language === item.code && styles.chipTextActive]}>{item.nativeName}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: '100%', marginBottom: 14 },
  label: { color: colors.text3, fontSize: 11, fontWeight: '800', textTransform: 'uppercase', marginBottom: 8 },
  row: { gap: 8, paddingRight: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface2 },
  chipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  chipText: { color: colors.text2, fontSize: 12, fontWeight: '800' },
  chipTextActive: { color: '#fff' },
});
