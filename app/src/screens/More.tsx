import React, { useEffect, useLayoutEffect, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAccessibility } from '../theme/AccessibilityContext';
import { spacing } from '../theme/theme';
import ProfileScreen from './Profile';
import PrayerScreen from './Prayer';
import AdminScreen from './Admin';
import { getCurrentUserRole, isAdminRole } from '../services/roleService';

type MoreDestination = 'Profile' | 'Prayer' | 'Admin';
type MorePage = 'menu' | MoreDestination;

const MORE_ITEMS: {
  destination: MoreDestination;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
}[] = [
  {
    destination: 'Profile',
    icon: 'person-outline',
    title: 'Profile and settings',
    description: 'Manage your profile photo and reading preferences.',
  },
  {
    destination: 'Prayer',
    icon: 'heart-outline',
    title: 'Prayer requests',
    description: 'Share a prayer request privately with the ministry team.',
  },
];

const ADMIN_ITEM: (typeof MORE_ITEMS)[number] = {
  destination: 'Admin',
  icon: 'shield-checkmark-outline',
  title: 'Admin',
  description: 'Manage ministry content and prayer-request handling.',
};

export default function MoreScreen() {
  const navigation = useNavigation<any>();
  const { colors, fonts } = useAccessibility();
  const styles = makeStyles(colors, fonts);
  const [page, setPage] = useState<MorePage>('menu');
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    async function loadAdminAccess() {
      const { role, error } = await getCurrentUserRole();

      if (error) {
        console.warn('Unable to load admin access.', error.message);
      }

      setIsAdmin(isAdminRole(role));
    }

    void loadAdminAccess();
  }, []);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerLeft:
        page === 'menu'
          ? undefined
          : () => (
              <TouchableOpacity
                accessibilityLabel="Back to More"
                onPress={() => setPage('menu')}
                style={styles.headerBackButton}
              >
                <Ionicons color="#FDFCF0" name="chevron-back" size={28} />
              </TouchableOpacity>
            ),
      title:
        page === 'Profile'
          ? 'Profile'
          : page === 'Prayer'
            ? 'Prayer requests'
            : page === 'Admin'
              ? 'Admin'
            : 'More',
    });
  }, [navigation, page, styles.headerBackButton]);

  if (page === 'Profile') {
    return <ProfileScreen />;
  }

  if (page === 'Prayer') {
    return <PrayerScreen />;
  }

  if (page === 'Admin') {
    return <AdminScreen />;
  }

  const menuItems = isAdmin ? [...MORE_ITEMS, ADMIN_ITEM] : MORE_ITEMS;

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      style={styles.container}
    >
      {menuItems.map((item) => (
        <TouchableOpacity
          accessibilityHint={item.description}
          accessibilityLabel={item.title}
          accessibilityRole="button"
          key={item.destination}
          onPress={() => setPage(item.destination)}
          style={styles.item}
        >
          <View style={styles.iconCircle}>
            <Ionicons color={colors.primary} name={item.icon} size={24} />
          </View>
          <View style={styles.itemText}>
            <Text style={styles.itemTitle}>{item.title}</Text>
            <Text style={styles.itemDescription}>{item.description}</Text>
          </View>
          <Ionicons
            color={colors.primary}
            name="chevron-forward"
            size={22}
          />
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

function makeStyles(colors: any, fonts: any) {
  return StyleSheet.create({
    container: {
      backgroundColor: colors.background,
      flex: 1,
    },
    content: {
      padding: spacing.lg,
      paddingBottom: spacing.xl,
    },
    headerBackButton: {
      marginLeft: 8,
      padding: 4,
    },
    item: {
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: 20,
      flexDirection: 'row',
      marginBottom: spacing.md,
      padding: spacing.md,
    },
    iconCircle: {
      alignItems: 'center',
      backgroundColor: colors.primaryMuted,
      borderRadius: 24,
      height: 48,
      justifyContent: 'center',
      marginRight: spacing.sm,
      width: 48,
    },
    itemText: {
      flex: 1,
      paddingRight: spacing.sm,
    },
    itemTitle: {
      color: colors.text,
      fontSize: fonts.body,
      fontWeight: '700',
    },
    itemDescription: {
      color: colors.textMuted,
      fontSize: fonts.caption,
      lineHeight: fonts.caption * 1.45,
      marginTop: 3,
    },
  });
}
