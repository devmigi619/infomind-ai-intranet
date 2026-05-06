import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Platform } from 'react-native';
import { useUiStore, type SettingsCategory } from '../../../store/uiStore';
import { useCurrentUser } from '../../auth/api';
import { AccountSection } from '../sections/AccountSection';
import { NotificationSection } from '../sections/NotificationSection';
import { CustomizeSection } from '../sections/CustomizeSection';
import { DisplaySection } from '../sections/DisplaySection';
import { useTheme } from '../../../shared/hooks/useTheme';

const WEB_FONT = Platform.select({ web: "'Noto Sans KR', sans-serif", default: undefined });

const CATEGORIES: { key: SettingsCategory; label: string }[] = [
  { key: 'account', label: '계정' },
  { key: 'notification', label: '알림' },
  { key: 'customize', label: '맞춤설정' },
  { key: 'display', label: '화면' },
];

export function SettingsScreen() {
  const { settingsCategory, setSettingsCategory } = useUiStore();
  const { data: user } = useCurrentUser();
  const theme = useTheme();

  const renderContent = () => {
    switch (settingsCategory) {
      case 'account':
        return (
          <AccountSection
            user={
              user
                ? {
                    name: user.name,
                    department: user.department,
                    position: user.position,
                  }
                : null
            }
          />
        );
      case 'notification':
        return <NotificationSection />;
      case 'customize':
        return <CustomizeSection />;
      case 'display':
        return <DisplaySection />;
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: theme.bg.surface }]}>
      {/* Left sidebar */}
      <View
        style={[
          styles.sidebar,
          {
            backgroundColor: theme.bg.surfaceAlt,
            borderRightColor: theme.border.subtle,
          },
        ]}
      >
        <Text style={[styles.pageTitle, { color: theme.text.primary }]}>설정</Text>

        <View style={styles.menuList}>
          {CATEGORIES.map(({ key, label }) => {
            const isActive = settingsCategory === key;
            return (
              <TouchableOpacity
                key={key}
                onPress={() => setSettingsCategory(key)}
                activeOpacity={0.7}
                style={[
                  styles.menuItem,
                  isActive && {
                    borderLeftColor: theme.brand.primary,
                    backgroundColor: theme.brand.primaryTint,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.menuItemText,
                    { color: theme.text.body },
                    isActive && { color: theme.brand.primary, fontWeight: '500' },
                  ]}
                >
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={[styles.versionText, { color: theme.text.subtle }]}>v0.0.1</Text>
      </View>

      {/* Right content area */}
      <ScrollView
        style={[styles.contentArea, { backgroundColor: theme.bg.surface }]}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {renderContent()}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    flexDirection: 'row',
  },
  sidebar: {
    width: 220,
    borderRightWidth: 1,
    paddingTop: 28,
    paddingBottom: 16,
    flexDirection: 'column',
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: '500',
    paddingHorizontal: 20,
    marginBottom: 16,
    fontFamily: WEB_FONT,
  },
  menuList: {
    flex: 1,
  },
  menuItem: {
    paddingHorizontal: 20,
    paddingVertical: 11,
    borderLeftWidth: 3,
    borderLeftColor: 'transparent',
  },
  menuItemText: {
    fontSize: 14,
    fontFamily: WEB_FONT,
  },
  versionText: {
    fontSize: 12,
    paddingHorizontal: 20,
    paddingTop: 8,
    fontFamily: WEB_FONT,
  },
  contentArea: {
    flex: 1,
  },
  contentContainer: {
    padding: 32,
  },
});
