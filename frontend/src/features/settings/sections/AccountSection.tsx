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
import { colors } from '../../../shared/constants/colors';

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

  const handlePasswordChange = () => {
    if (Platform.OS === 'web') {
      window.alert('비밀번호 변경은 추후 구현됩니다.');
    } else {
      Alert.alert('안내', '비밀번호 변경은 추후 구현됩니다.');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>계정</Text>

      {/* Profile photo row */}
      <View style={styles.row}>
        <View style={styles.avatarCircle}>
          <User size={32} color={colors.text.muted} />
        </View>
        <TouchableOpacity activeOpacity={0.7} style={styles.photoButton}>
          <Text style={styles.photoButtonText}>사진 변경</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.divider} />

      {/* Read-only: name */}
      <View style={styles.fieldRow}>
        <Text style={styles.fieldLabel}>이름</Text>
        <Text style={styles.fieldValue}>{user?.name ?? '관리자'}</Text>
        <Text style={styles.fieldHint}>관리자에게 문의</Text>
      </View>

      {/* Read-only: department */}
      <View style={styles.fieldRow}>
        <Text style={styles.fieldLabel}>부서</Text>
        <Text style={styles.fieldValue}>{user?.department ?? 'IT'}</Text>
        <Text style={styles.fieldHint}>관리자에게 문의</Text>
      </View>

      {/* Read-only: position */}
      <View style={styles.fieldRow}>
        <Text style={styles.fieldLabel}>직급</Text>
        <Text style={styles.fieldValue}>{user?.position ?? '관리자'}</Text>
        <Text style={styles.fieldHint}>관리자에게 문의</Text>
      </View>

      <View style={styles.divider} />

      {/* Editable: email */}
      <View style={styles.fieldRow}>
        <Text style={styles.fieldLabel}>이메일</Text>
        <TextInput
          style={styles.textInput}
          value={email}
          onChangeText={setEmail}
          placeholder="이메일을 입력하세요"
          placeholderTextColor={colors.text.subtle}
          keyboardType="email-address"
          autoCapitalize="none"
        />
      </View>

      {/* Editable: phone */}
      <View style={styles.fieldRow}>
        <Text style={styles.fieldLabel}>연락처</Text>
        <TextInput
          style={styles.textInput}
          value={phone}
          onChangeText={setPhone}
          placeholder="010-0000-0000"
          placeholderTextColor={colors.text.subtle}
          keyboardType="phone-pad"
        />
      </View>

      <View style={styles.divider} />

      {/* Password change row */}
      <View style={styles.fieldRow}>
        <Text style={styles.fieldLabel}>비밀번호</Text>
        <Text style={styles.passwordDots}>●●●●●●●●●</Text>
        <TouchableOpacity
          onPress={handlePasswordChange}
          activeOpacity={0.8}
          style={styles.primaryButton}
        >
          <Text style={styles.primaryButtonText}>변경하기</Text>
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
    color: colors.text.primary,
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
    backgroundColor: colors.background.surfaceMute,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  photoButtonText: {
    fontSize: 14,
    color: colors.brand.primary,
    fontWeight: '500',
    fontFamily: WEB_FONT,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border.light,
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
    color: colors.text.body,
    fontWeight: '500',
    fontFamily: WEB_FONT,
    flexShrink: 0,
  },
  fieldValue: {
    flex: 1,
    fontSize: 14,
    color: colors.text.primary,
    fontFamily: WEB_FONT,
  },
  fieldHint: {
    fontSize: 11,
    color: colors.text.soft,
    fontFamily: WEB_FONT,
    flexShrink: 0,
  },
  textInput: {
    flex: 1,
    height: 36,
    borderWidth: 1,
    borderColor: colors.border.strong,
    borderRadius: 8,
    paddingHorizontal: 10,
    fontSize: 14,
    color: colors.text.primary,
    backgroundColor: colors.background.surface,
    fontFamily: WEB_FONT,
  },
  passwordDots: {
    flex: 1,
    fontSize: 14,
    color: colors.text.muted,
    fontFamily: WEB_FONT,
    letterSpacing: 2,
  },
  primaryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: colors.brand.primary,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  primaryButtonText: {
    fontSize: 13,
    color: colors.text.onBrand,
    fontWeight: '500',
    fontFamily: WEB_FONT,
  },
});
