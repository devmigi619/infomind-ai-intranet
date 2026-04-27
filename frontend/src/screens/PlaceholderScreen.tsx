import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Construction } from 'lucide-react-native';

interface PlaceholderScreenProps {
  title: string;
  phase?: string;
}

export function PlaceholderScreen({
  title,
  phase = 'Phase 2/3에서 구현 예정',
}: PlaceholderScreenProps) {
  return (
    <View style={styles.container}>
      <View style={styles.iconWrap}>
        <Construction size={36} color="rgba(10,36,99,0.5)" />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{phase}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    padding: 24,
    gap: 8,
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: 'rgba(10,36,99,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '500',
    color: '#000000',
    fontFamily: Platform.select({ web: "'Noto Sans KR', sans-serif", default: undefined }),
  },
  subtitle: {
    fontSize: 13,
    color: 'rgba(0,0,0,0.5)',
    fontFamily: Platform.select({ web: "'Noto Sans KR', sans-serif", default: undefined }),
  },
});
