import React, { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import {
  Alert,
  Linking,
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
import { getVisibleMinistryLinks } from '../services/ministryLinkService';
import { MinistryLink } from '../services/database';

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

function channelIcon(label: string): keyof typeof Ionicons.glyphMap {
  switch (label.toLowerCase()) {
    case 'tiktok':
      return 'logo-tiktok';
    case 'youtube':
      return 'logo-youtube';
    case 'whatsapp channel':
    case 'whatsapp':
      return 'logo-whatsapp';
    case 'spotify':
      return 'headset-outline';
    default:
      return 'link-outline';
  }
}

export default function MoreScreen() {
  const navigation = useNavigation<any>();
  const { colors, fonts } = useAccessibility();
  const styles = makeStyles(colors, fonts);
  const [page, setPage] = useState<MorePage>('menu');
  const [isAdmin, setIsAdmin] = useState(false);
  const [links, setLinks] = useState<MinistryLink[]>([]);
  const [linksError, setLinksError] = useState(false);

  const loadMinistryLinks = useCallback(async () => {
    const { links: loadedLinks, error } = await getVisibleMinistryLinks();

    if (error) {
      console.warn('Unable to load ministry links.', error.message);
      setLinks([]);
      setLinksError(true);
      return;
    }

    setLinks(loadedLinks);
    setLinksError(false);
  }, []);

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

  useEffect(() => {
    if (page === 'menu') {
      void loadMinistryLinks();
    }
  }, [loadMinistryLinks, page]);

  const openMinistryLink = useCallback(async (link: MinistryLink) => {
    try {
      await Linking.openURL(link.url);
    } catch (error) {
      console.warn('Unable to open ministry link.', error);
      Alert.alert(
        'Unable to open link',
        'Please check your connection and try again.'
      );
    }
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

      {links.length ? (
        <View style={styles.connectSection}>
          <View style={styles.connectHeader}>
            <Ionicons color={colors.primary} name="share-social-outline" size={21} />
            <Text style={styles.connectTitle}>Connect with us</Text>
          </View>
          <Text style={styles.connectHint}>
            Follow Word Alive Ministries on our official channels.
          </Text>
          <View style={styles.connectCard}>
            {links.map((link, index) => (
              <TouchableOpacity
                accessibilityHint="Opens an external channel"
                accessibilityLabel={`Open ${link.label}`}
                accessibilityRole="link"
                key={link.id}
                onPress={() => void openMinistryLink(link)}
                style={[
                  styles.connectRow,
                  index < links.length - 1 && styles.connectRowBorder,
                ]}
              >
                <View style={styles.connectIcon}>
                  <Ionicons
                    color={colors.primary}
                    name={channelIcon(link.label)}
                    size={22}
                  />
                </View>
                <Text style={styles.connectLabel}>{link.label}</Text>
                <Ionicons
                  color={colors.primary}
                  name="open-outline"
                  size={20}
                />
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ) : null}

      {linksError ? (
        <TouchableOpacity
          accessibilityLabel="Retry loading ministry links"
          accessibilityRole="button"
          onPress={() => void loadMinistryLinks()}
          style={styles.linkRetry}
        >
          <Ionicons color={colors.primary} name="reload-outline" size={19} />
          <Text style={styles.linkRetryText}>Unable to load ministry links. Try again.</Text>
        </TouchableOpacity>
      ) : null}
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
    connectSection: {
      marginTop: spacing.lg,
    },
    connectHeader: {
      alignItems: 'center',
      flexDirection: 'row',
    },
    connectTitle: {
      color: colors.text,
      fontSize: fonts.subtitle,
      fontWeight: '700',
      marginLeft: spacing.xs,
    },
    connectHint: {
      color: colors.textMuted,
      fontSize: fonts.caption,
      lineHeight: fonts.caption * 1.45,
      marginTop: 3,
    },
    connectCard: {
      backgroundColor: colors.surface,
      borderRadius: 20,
      marginTop: spacing.sm,
      overflow: 'hidden',
    },
    connectRow: {
      alignItems: 'center',
      flexDirection: 'row',
      padding: spacing.md,
    },
    connectRowBorder: {
      borderBottomColor: colors.borderSoft,
      borderBottomWidth: 1,
    },
    connectIcon: {
      alignItems: 'center',
      backgroundColor: colors.primaryMuted,
      borderRadius: 20,
      height: 40,
      justifyContent: 'center',
      marginRight: spacing.sm,
      width: 40,
    },
    connectLabel: {
      color: colors.text,
      flex: 1,
      fontSize: fonts.body,
      fontWeight: '700',
    },
    linkRetry: {
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'center',
      marginTop: spacing.lg,
      padding: spacing.sm,
    },
    linkRetryText: {
      color: colors.primary,
      fontSize: fonts.caption,
      fontWeight: '700',
      marginLeft: spacing.xs,
    },
  });
}
