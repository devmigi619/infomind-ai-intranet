import AsyncStorage from '@react-native-async-storage/async-storage';

const AI_URL = process.env.EXPO_PUBLIC_AI_URL ?? 'http://localhost:8000';

/**
 * 자비스패널 세션 드래프트 정리 (FastAPI).
 *
 * 드래프트가 채팅 밖 경로로 소비됐을 때(예: '폼에서 이어 작성' 후 폼 직접 제출)
 * 서버 세션 스토어를 동기화한다 — 2채널은 한 화자.
 * 보조 동작이므로 실패해도 본 흐름(폼 제출)을 막지 않는다.
 */
export async function clearAiContextSession(sessionId: string): Promise<void> {
  try {
    const token = await AsyncStorage.getItem('token');
    await fetch(`${AI_URL}/ai/context/clear`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ session_id: sessionId }),
    });
  } catch {
    // 무시 — 다음 leave 턴의 스냅샷에서 어긋남이 드러나면 실행 시점 검증이 받친다
  }
}
