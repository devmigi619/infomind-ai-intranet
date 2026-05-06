import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Eye, EyeOff } from 'lucide-react-native';
import { useTheme } from '../../../shared/hooks/useTheme';

interface LoginScreenProps {
  onLogin: (username: string, password: string) => Promise<void>;
}

export function LoginScreen({ onLogin }: LoginScreenProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const theme = useTheme();

  const handleLogin = async () => {
    if (!username || !password) {
      setError('아이디와 비밀번호를 입력해주세요.');
      return;
    }
    setError('');
    setIsLoading(true);
    try {
      await onLogin(username, password);
    } catch {
      setError('아이디 또는 비밀번호가 올바르지 않습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: theme.bg.app }]}>
      <View style={styles.container}>
        <Text style={[styles.brand, { color: theme.text.primary }]}>Infomind</Text>
        <Text style={[styles.subtitle, { color: theme.text.subtle }]}>AI 업무포탈</Text>

        <TextInput
          style={[
            styles.input,
            {
              borderColor: theme.border.strong,
              color: theme.text.primary,
              backgroundColor: theme.bg.surface,
            },
          ]}
          value={username}
          onChangeText={setUsername}
          placeholder="아이디"
          placeholderTextColor={theme.text.subtle}
          autoCapitalize="none"
          autoCorrect={false}
          editable={!isLoading}
        />

        {/* 비밀번호 입력 + 표시 토글 */}
        <View style={styles.passwordWrap}>
          <TextInput
            style={[
              styles.passwordInput,
              {
                borderColor: theme.border.strong,
                color: theme.text.primary,
                backgroundColor: theme.bg.surface,
              },
            ]}
            value={password}
            onChangeText={setPassword}
            placeholder="비밀번호"
            placeholderTextColor={theme.text.subtle}
            secureTextEntry={!showPassword}
            editable={!isLoading}
            onSubmitEditing={handleLogin}
            returnKeyType="done"
          />
          <TouchableOpacity
            onPress={() => setShowPassword((prev) => !prev)}
            style={styles.eyeButton}
            activeOpacity={0.6}
            accessibilityLabel={showPassword ? '비밀번호 숨기기' : '비밀번호 표시'}
            disabled={isLoading}
          >
            {showPassword ? (
              <EyeOff size={18} color={theme.text.muted} />
            ) : (
              <Eye size={18} color={theme.text.muted} />
            )}
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.button, { backgroundColor: theme.brand.primary }]}
          onPress={handleLogin}
          activeOpacity={0.8}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color={theme.text.onBrand} size="small" />
          ) : (
            <Text style={[styles.buttonText, { color: theme.text.onBrand }]}>로그인</Text>
          )}
        </TouchableOpacity>

        {/* 에러 영역 항상 점유 — layout shift 방지 */}
        <View style={styles.errorSlot}>
          {error ? <Text style={[styles.error, { color: theme.semantic.danger }]}>{error}</Text> : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  container: {
    width: '100%',
    maxWidth: 400,
    paddingHorizontal: 32,
    paddingVertical: 48,
  },
  brand: {
    fontSize: 28,
    letterSpacing: 28 * 0.1,
    fontWeight: '300',
    fontFamily: Platform.select({ web: "'Noto Sans KR', sans-serif", default: undefined }),
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 40,
    fontFamily: Platform.select({ web: "'Noto Sans KR', sans-serif", default: undefined }),
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 14,
    marginBottom: 12,
    fontFamily: Platform.select({ web: "'Noto Sans KR', sans-serif", default: undefined }),
  },
  passwordWrap: {
    position: 'relative',
    marginBottom: 12,
  },
  passwordInput: {
    height: 48,
    borderWidth: 1,
    borderRadius: 8,
    paddingLeft: 16,
    paddingRight: 44, // 우측 아이콘 공간 확보
    fontSize: 14,
    fontFamily: Platform.select({ web: "'Noto Sans KR', sans-serif", default: undefined }),
  },
  eyeButton: {
    position: 'absolute',
    right: 4,
    top: 0,
    bottom: 0,
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  button: {
    height: 48,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '500',
    fontFamily: Platform.select({ web: "'Noto Sans KR', sans-serif", default: undefined }),
  },
  errorSlot: {
    minHeight: 32, // 에러 메시지 유무와 무관하게 공간 점유 → layout shift 0
    justifyContent: 'center',
    marginTop: 12,
  },
  error: {
    fontSize: 13,
    textAlign: 'center',
    fontFamily: Platform.select({ web: "'Noto Sans KR', sans-serif", default: undefined }),
  },
});
