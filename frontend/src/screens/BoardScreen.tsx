import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Platform,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { postsApi } from '../api/posts';

interface Post {
  id: number;
  title: string;
  category: string;
  authorName: string;
  viewCount: number;
  createdAt: string;
  content: string;
}

const TABS = [
  { key: '', label: '전체' },
  { key: 'NOTICE', label: '공지' },
  { key: 'FREE', label: '자유' },
  { key: 'QNA', label: 'QNA' },
];

const CATEGORIES = ['NOTICE', 'FREE', 'QNA'];

const CATEGORY_COLORS: Record<string, string> = {
  NOTICE: '#0A2463',
  FREE: '#10B981',
  QNA: '#F59E0B',
};

export function BoardScreen() {
  const [activeCategory, setActiveCategory] = useState('');
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);

  // Write form state
  const [isWriting, setIsWriting] = useState(false);
  const [writeTitle, setWriteTitle] = useState('');
  const [writeContent, setWriteContent] = useState('');
  const [writeCategory, setWriteCategory] = useState('FREE');
  const [isSaving, setIsSaving] = useState(false);

  const loadPosts = () => {
    setIsLoading(true);
    setError(null);
    postsApi.getList(0, activeCategory)
      .then((res) => {
        setPosts(res.data?.data?.content ?? []);
      })
      .catch(() => {
        setError('게시글을 불러오지 못했습니다.');
        setPosts([]);
      })
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    loadPosts();
  }, [activeCategory]);

  const handleSave = async () => {
    if (!writeTitle || !writeContent) {
      Alert.alert('입력 오류', '제목과 내용을 입력해주세요.');
      return;
    }
    setIsSaving(true);
    try {
      await postsApi.create({ title: writeTitle, content: writeContent, category: writeCategory });
      setWriteTitle('');
      setWriteContent('');
      setWriteCategory('FREE');
      setIsWriting(false);
      loadPosts();
    } catch {
      Alert.alert('저장 실패', '서버에 저장하지 못했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  if (selectedPost) {
    return (
      <View style={styles.container}>
        <TouchableOpacity style={styles.backButton} onPress={() => setSelectedPost(null)} activeOpacity={0.7}>
          <Text style={styles.backText}>← 목록으로</Text>
        </TouchableOpacity>
        <ScrollView style={styles.detail} contentContainerStyle={styles.detailContent}>
          <View style={styles.detailHeader}>
            <View style={[styles.badge, { backgroundColor: CATEGORY_COLORS[selectedPost.category] ?? '#666' }]}>
              <Text style={styles.badgeText}>{selectedPost.category}</Text>
            </View>
            <Text style={styles.detailTitle}>{selectedPost.title}</Text>
            <Text style={styles.detailMeta}>
              {selectedPost.authorName} · {selectedPost.createdAt} · 조회 {selectedPost.viewCount}
            </Text>
          </View>
          <Text style={styles.detailBody}>{selectedPost.content}</Text>
        </ScrollView>
      </View>
    );
  }

  if (isWriting) {
    return (
      <View style={styles.container}>
        <TouchableOpacity style={styles.backButton} onPress={() => setIsWriting(false)} activeOpacity={0.7}>
          <Text style={styles.backText}>← 목록으로</Text>
        </TouchableOpacity>
        <ScrollView style={styles.form} contentContainerStyle={styles.formContent}>
          <View style={styles.field}>
            <Text style={styles.label}>제목 *</Text>
            <TextInput
              style={styles.input}
              value={writeTitle}
              onChangeText={setWriteTitle}
              placeholder="제목을 입력하세요"
              placeholderTextColor="rgba(0,0,0,0.3)"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>카테고리</Text>
            <View style={styles.categoryRow}>
              {CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.categoryButton,
                    writeCategory === cat && { backgroundColor: CATEGORY_COLORS[cat] ?? '#0A2463' },
                  ]}
                  onPress={() => setWriteCategory(cat)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.categoryText, writeCategory === cat && styles.categoryTextActive]}>
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>내용 *</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={writeContent}
              onChangeText={setWriteContent}
              placeholder="내용을 입력하세요"
              placeholderTextColor="rgba(0,0,0,0.3)"
              multiline
              numberOfLines={6}
              textAlignVertical="top"
            />
          </View>

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleSave}
              activeOpacity={0.8}
              disabled={isSaving}
            >
              {isSaving ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <Text style={styles.saveText}>저장</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setIsWriting(false)}
              activeOpacity={0.8}
            >
              <Text style={styles.cancelText}>취소</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Category tabs + write button */}
      <View style={styles.tabRow}>
        <View style={styles.tabList}>
          {TABS.map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tab, activeCategory === tab.key && styles.tabActive]}
              onPress={() => setActiveCategory(tab.key)}
              activeOpacity={0.7}
            >
              <Text style={[styles.tabText, activeCategory === tab.key && styles.tabTextActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity onPress={() => setIsWriting(true)} activeOpacity={0.7} style={styles.writeButton}>
          <Text style={styles.writeButtonText}>작성</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.center}><ActivityIndicator color="#0A2463" /></View>
      ) : error ? (
        <View style={styles.center}><Text style={styles.errorText}>{error}</Text></View>
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.item}
              onPress={() => setSelectedPost(item)}
              activeOpacity={0.7}
            >
              <View style={styles.itemTop}>
                <Text style={styles.itemTitle} numberOfLines={1}>{item.title}</Text>
                <View style={[styles.badge, { backgroundColor: CATEGORY_COLORS[item.category] ?? '#666' }]}>
                  <Text style={styles.badgeText}>{item.category}</Text>
                </View>
              </View>
              <View style={styles.itemBottom}>
                <Text style={styles.itemMeta}>{item.authorName} · {item.createdAt}</Text>
                <Text style={styles.itemViews}>👁 {item.viewCount}</Text>
              </View>
            </TouchableOpacity>
          )}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          contentContainerStyle={styles.list}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  tabRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.08)',
    paddingHorizontal: 16,
  },
  tabList: {
    flex: 1,
    flexDirection: 'row',
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#0A2463',
  },
  tabText: {
    fontSize: 14,
    color: 'rgba(0,0,0,0.45)',
    fontFamily: Platform.select({ web: "'Noto Sans KR', sans-serif", default: undefined }),
  },
  tabTextActive: {
    color: '#0A2463',
    fontWeight: '600',
  },
  writeButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  writeButtonText: {
    fontSize: 14,
    color: '#0A2463',
    fontWeight: '600',
    fontFamily: Platform.select({ web: "'Noto Sans KR', sans-serif", default: undefined }),
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    fontSize: 14,
    color: '#EF4444',
    fontFamily: Platform.select({ web: "'Noto Sans KR', sans-serif", default: undefined }),
  },
  list: {
    paddingVertical: 8,
  },
  item: {
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  itemTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 4,
  },
  itemTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: '#000000',
    fontFamily: Platform.select({ web: "'Noto Sans KR', sans-serif", default: undefined }),
  },
  itemBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemMeta: {
    fontSize: 12,
    color: 'rgba(0,0,0,0.45)',
    fontFamily: Platform.select({ web: "'Noto Sans KR', sans-serif", default: undefined }),
  },
  itemViews: {
    fontSize: 12,
    color: 'rgba(0,0,0,0.35)',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    flexShrink: 0,
  },
  badgeText: {
    fontSize: 10,
    color: '#ffffff',
    fontWeight: '600',
  },
  separator: {
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.05)',
    marginHorizontal: 20,
  },
  backButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.08)',
  },
  backText: {
    fontSize: 14,
    color: '#0A2463',
    fontFamily: Platform.select({ web: "'Noto Sans KR', sans-serif", default: undefined }),
  },
  detail: {
    flex: 1,
  },
  detailContent: {
    padding: 20,
  },
  detailHeader: {
    marginBottom: 20,
    gap: 8,
  },
  detailTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    fontFamily: Platform.select({ web: "'Noto Sans KR', sans-serif", default: undefined }),
  },
  detailMeta: {
    fontSize: 13,
    color: 'rgba(0,0,0,0.45)',
    fontFamily: Platform.select({ web: "'Noto Sans KR', sans-serif", default: undefined }),
  },
  detailBody: {
    fontSize: 15,
    color: '#000000',
    lineHeight: 24,
    fontFamily: Platform.select({ web: "'Noto Sans KR', sans-serif", default: undefined }),
  },
  // Form styles
  form: {
    flex: 1,
  },
  formContent: {
    padding: 20,
    gap: 16,
  },
  field: {
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(0,0,0,0.65)',
    fontFamily: Platform.select({ web: "'Noto Sans KR', sans-serif", default: undefined }),
  },
  input: {
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.12)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#000000',
    backgroundColor: '#ffffff',
    fontFamily: Platform.select({ web: "'Noto Sans KR', sans-serif", default: undefined }),
  },
  textArea: {
    minHeight: 120,
    paddingTop: 10,
  },
  categoryRow: {
    flexDirection: 'row',
    gap: 8,
  },
  categoryButton: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.12)',
  },
  categoryText: {
    fontSize: 13,
    color: 'rgba(0,0,0,0.55)',
    fontFamily: Platform.select({ web: "'Noto Sans KR', sans-serif", default: undefined }),
  },
  categoryTextActive: {
    color: '#ffffff',
    fontWeight: '600',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  saveButton: {
    flex: 1,
    height: 48,
    backgroundColor: '#0A2463',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveText: {
    fontSize: 15,
    color: '#ffffff',
    fontWeight: '500',
    fontFamily: Platform.select({ web: "'Noto Sans KR', sans-serif", default: undefined }),
  },
  cancelButton: {
    flex: 1,
    height: 48,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.12)',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: {
    fontSize: 15,
    color: 'rgba(0,0,0,0.55)',
    fontWeight: '500',
    fontFamily: Platform.select({ web: "'Noto Sans KR', sans-serif", default: undefined }),
  },
});
