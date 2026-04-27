import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { MessageSquare } from 'lucide-react-native';

export function RightPanelAI() {
  return (
    <View style={styles.container}>
      <View style={styles.iconWrap}>
        <MessageSquare size={28} color="rgba(10,36,99,0.6)" />
      </View>
      <Text style={styles.title}>AI에게 물어보세요</Text>
      <Text style={styles.subtitle}>
        대화하면 관련 문서와 업무를{'\n'}여기에 정리해드립니다.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: 'rgba(10,36,99,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 14,
    color: 'rgba(0,0,0,0.7)',
    marginBottom: 8,
    fontFamily: Platform.select({
      web: "'Noto Sans KR', sans-serif",
      default: undefined,
    }),
  },
  subtitle: {
    fontSize: 12,
    color: 'rgba(0,0,0,0.45)',
    lineHeight: 18,
    textAlign: 'center',
    fontFamily: Platform.select({
      web: "'Noto Sans KR', sans-serif",
      default: undefined,
    }),
  },
});
