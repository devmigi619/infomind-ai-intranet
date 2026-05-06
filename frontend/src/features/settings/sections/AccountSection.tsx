import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Alert,
} from 'react-native';
import { User } from 'lucide-react-native';
import { useTheme } from '../../../shared/hooks/useTheme';

interface AccountSectionProps {
  user: {
    name?: string;
    department?: string;
    position?: string;
    email?: string;
  } | null;
}

const WEB_FONT = Platform.select({ web: "'Noto Sans KR', sans-serif", default: undefined });

export function AccountSection({ user }: AccountSectionProps) {
  const [email, setEmail] = useState(user?.email ?? '');
  const [phone, setPhone] = useState('');
  const theme = useTheme();

  const handlePasswordChange = () => {
    if (Platform.OS === 'web') {
      window.alert('비밀번호 변경은 추후 구현됩니다.');
    } else {
      Alert.alert('안내', '비밀번호 변경은 추후 구현됩니다.');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>계정</Text>

      {/* Profile photo row */}
      <View style={styles.row}>
        <View style={[styles.avatarCircle, { backgroundColor: theme.bg.surfaceMute }]}>
          <User size={32} color={theme.text.muted} />
        </View>
        <TouchableOpacity activeOpacity={0.7} style={styles.photoButton}>
          <Text style={[styles.photoButtonText, { color: theme.brand.primary }]}>사진 변경</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.divider, { backgroundColor: theme.border.subtle }]} />

      {/* Read-only: name */}
      <View style={styles.fieldRow}>
        <Text style={[styles.fieldLabel, { color: theme.text.body }]}>이름</Text>
        <Text style={[styles.fieldValue, { color: theme.text.primary }]}>{user?.name ?? '관리자'}</Text>
        <Text style={[styles.fieldHint, { color: theme.text.subtle }]}>관리자에게 문의</Text>
      </View>

      {/* Read-only: department */}
      <View style={styles.fieldRow}>
        <Text style={[styles.fieldLabel, { color: theme.text.body }]}>부서</Text>
        <Text style={[styles.fieldValue, { color: theme.text.primary }]}>{user?.department ?? 'IT'}</Text>
        <Text style={[styles.fieldHint, { color: theme.text.subtle }]}>관리자에게 문의</Text>
      </View>

      {/* Read-only: position */}
      <View style={styles.fieldRow}>
        <Text style={[styles.fieldLabel, { color: theme.text.body }]}>직급</Text>
        <Text style={[styles.fieldValue, { color: theme.text.primary }]}>{user?.position ?? '관리자'}</Text>
        <Text style={[styles.fieldHint, { color: theme.text.subtle }]}>관리자에게 문의</Text>
      </View>

      <View style={[styles.divider, { backgroundColor: theme.border.subtle }]} />

      {/* Editable: email */}
      <View style={styles.fieldRow}>
        <Text style={[styles.fieldLabel, { color: theme.text.body }]}>이메일</Text>
        <TextInput
          style={[
            styles.textInput,
            {
              borderColor: theme.border.strong,
              color: theme.text.primary,
              backgroundColor: theme.bg.surface,
            },
          ]}
          value={email}
          onChangeText={setEmail}
          placeholder="이메일을 입력하세요"
          placeholderTextColor={theme.text.subtle}
          keyboardType="email-address"
          autoCapitalize="none"
        />
      </View>

      {/* Editable: phone */}
      <View style={styles.fieldRow}>
        <Text style={[styles.fieldLabel, { color: theme.text.body }]}>연락처</Text>
        <TextInput
          style={[
            styles.textInput,
            {
              borderColor: theme.border.strong,
              color: theme.text.primary,
              backgroundColor: theme.bg.surface,
            },
          ]}
          value={phone}
          onChangeText={setPhone}
          placeholder="010-0000-0000"
          placeholderTextColor={theme.text.subtle}
          keyboardType="phone-pad"
        />
      </View>

      <View style={[styles.divider, { backgroundColor: theme.border.subtle }]} />

      {/* Password change row */}
      <View style={styles.fieldRow}>
        <Text style={[styles.fieldLabel, { color: theme.text.body }]}>비밀번호</Text>
        <Text style={[styles.passwordDots, { color: theme.text.muted }]}>●●●●●●●●●</Text>
        <TouchableOpacity
          onPress={handlePasswordChange}
          activeOpacity={0.8}
          style={[styles.primaryButton, { backgroundColor: theme.brand.primary }]}
        >
          <Text style={[styles.primaryButtonText, { color: theme.text.onBrand }]}>변경하기</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 4,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '500',
    marginBottom: 24,
    fontFamily: WEB_FONT,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 12,
  },
  avatarCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  photoButtonText: {
    fontSize: 14,
    fontWeight: '500',
    fontFamily: WEB_FONT,
  },
  divider: {
    height: 1,
    marginVertical: 8,
  },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 12,
  },
  fieldLabel: {
    width: 108,
    fontSize: 14,
    fontWeight: '500',
    fontFamily: WEB_FONT,
    flexShrink: 0,
  },
  fieldValue: {
    flex: 1,
    fontSize: 14,
    fontFamily: WEB_FONT,
  },
  fieldHint: {
    fontSize: 11,
    fontFamily: WEB_FONT,
    flexShrink: 0,
  },
  textInput: {
    flex: 1,
    height: 36,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    fontSize: 14,
    fontFamily: WEB_FONT,
  },
  passwordDots: {
    flex: 1,
    fontSize: 14,
    fontFamily: WEB_FONT,
    letterSpacing: 2,
  },
  primaryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  primaryButtonText: {
    fontSize: 13,
    fontWeight: '500',
    fontFamily: WEB_FONT,
  },
});
