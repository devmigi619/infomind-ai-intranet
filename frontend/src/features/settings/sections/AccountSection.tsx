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
import { useResponsive } from '../../../shared/hooks/useResponsive';

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
  const { isMobile } = useResponsive();

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
      <View style={[styles.fieldRow, isMobile && styles.fieldRowMobile]}>
        <View style={isMobile ? styles.labelHintRowMobile : undefined}>
          <Text style={[styles.fieldLabel, isMobile && styles.fieldLabelMobile, { color: theme.text.body }]}>이름</Text>
          {isMobile && (
            <Text style={[styles.fieldHint, { color: theme.text.subtle }]}>관리자에게 문의</Text>
          )}
        </View>
        <Text style={[styles.fieldValue, isMobile && styles.fieldValueMobile, { color: theme.text.primary }]}>{user?.name ?? '관리자'}</Text>
        {!isMobile && (
          <Text style={[styles.fieldHint, { color: theme.text.subtle }]}>관리자에게 문의</Text>
        )}
      </View>

      {/* Read-only: department */}
      <View style={[styles.fieldRow, isMobile && styles.fieldRowMobile]}>
        <View style={isMobile ? styles.labelHintRowMobile : undefined}>
          <Text style={[styles.fieldLabel, isMobile && styles.fieldLabelMobile, { color: theme.text.body }]}>부서</Text>
          {isMobile && (
            <Text style={[styles.fieldHint, { color: theme.text.subtle }]}>관리자에게 문의</Text>
          )}
        </View>
        <Text style={[styles.fieldValue, isMobile && styles.fieldValueMobile, { color: theme.text.primary }]}>{user?.department ?? 'IT'}</Text>
        {!isMobile && (
          <Text style={[styles.fieldHint, { color: theme.text.subtle }]}>관리자에게 문의</Text>
        )}
      </View>

      {/* Read-only: position */}
      <View style={[styles.fieldRow, isMobile && styles.fieldRowMobile]}>
        <View style={isMobile ? styles.labelHintRowMobile : undefined}>
          <Text style={[styles.fieldLabel, isMobile && styles.fieldLabelMobile, { color: theme.text.body }]}>직급</Text>
          {isMobile && (
            <Text style={[styles.fieldHint, { color: theme.text.subtle }]}>관리자에게 문의</Text>
          )}
        </View>
        <Text style={[styles.fieldValue, isMobile && styles.fieldValueMobile, { color: theme.text.primary }]}>{user?.position ?? '관리자'}</Text>
        {!isMobile && (
          <Text style={[styles.fieldHint, { color: theme.text.subtle }]}>관리자에게 문의</Text>
        )}
      </View>

      <View style={[styles.divider, { backgroundColor: theme.border.subtle }]} />

      {/* Editable: email */}
      <View style={[styles.fieldRow, isMobile && styles.fieldRowMobile]}>
        <Text style={[styles.fieldLabel, isMobile && styles.fieldLabelMobile, { color: theme.text.body }]}>이메일</Text>
        <TextInput
          style={[
            styles.textInput,
            isMobile && styles.textInputMobile,
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
      <View style={[styles.fieldRow, isMobile && styles.fieldRowMobile]}>
        <Text style={[styles.fieldLabel, isMobile && styles.fieldLabelMobile, { color: theme.text.body }]}>연락처</Text>
        <TextInput
          style={[
            styles.textInput,
            isMobile && styles.textInputMobile,
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
      <View style={[styles.fieldRow, isMobile && styles.fieldRowMobile]}>
        <Text style={[styles.fieldLabel, isMobile && styles.fieldLabelMobile, { color: theme.text.body }]}>비밀번호</Text>
        <View style={isMobile ? styles.passwordRowMobile : styles.passwordRowInline}>
          <Text style={[styles.passwordDots, isMobile && styles.passwordDotsMobile, { color: theme.text.muted }]}>●●●●●●●●●</Text>
          <TouchableOpacity
            onPress={handlePasswordChange}
            activeOpacity={0.8}
            style={[styles.primaryButton, { backgroundColor: theme.brand.primary }]}
          >
            <Text style={[styles.primaryButtonText, { color: theme.text.onBrand }]}>변경하기</Text>
          </TouchableOpacity>
        </View>
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
  // 모바일: 라벨 위, 값/입력 아래
  fieldRowMobile: {
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: 6,
    paddingVertical: 12,
  },
  // 모바일 — 라벨 + 안내문구를 같은 줄에 (라벨 옆 작게)
  labelHintRowMobile: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  fieldLabel: {
    width: 108,
    fontSize: 14,
    fontWeight: '500',
    fontFamily: WEB_FONT,
    flexShrink: 0,
  },
  fieldLabelMobile: {
    width: 'auto' as unknown as number,
  },
  fieldValue: {
    flex: 1,
    fontSize: 14,
    fontFamily: WEB_FONT,
  },
  fieldValueMobile: {
    flex: 0,
    width: '100%' as unknown as number,
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
  textInputMobile: {
    flex: 0,
    width: '100%' as unknown as number,
  },
  passwordDots: {
    flex: 1,
    fontSize: 14,
    fontFamily: WEB_FONT,
    letterSpacing: 2,
  },
  passwordDotsMobile: {
    flex: 1,
  },
  // PC: 점+버튼이 라벨과 한 줄에 — passwordRowInline은 flex:1 row
  passwordRowInline: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  // 모바일: 점+버튼 가로 (라벨 아래)
  passwordRowMobile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
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
