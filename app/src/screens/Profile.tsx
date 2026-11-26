import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { deviceSubscription, pushSupported, setDeviceSubscription } from "../services/ministryAlerts";
import { AccountDeletion } from '../components/AccountDeletion';
import { supabase } from "../services/supabase";
import { useAccessibility } from "../theme/AccessibilityContext";
import { spacing } from "../theme/theme";
import {
  getAvatarSignedUrl,
  uploadAvatar,
} from "../services/profileService";
import { refreshDailyReadingStreak } from "../services/dailyReadingService";
import { Profile } from "../services/database";


export default function ProfileScreen() {
const {
  colors,
  fonts,
} = useAccessibility();

const styles = makeStyles(colors, fonts);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [alerts, setAlerts] = useState(false);
  const [savingAlerts, setSavingAlerts] = useState(false);
  useEffect(() => {
    let active = true;
    if (profile && pushSupported) void deviceSubscription(profile.id).then(value => {
      if (active) setAlerts(value);
    }).catch(() => {});
    return () => { active = false; };
  }, [profile?.id]);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [completedCount, setCompletedCount] = useState(0);
  const [avatarSaving, setAvatarSaving] = useState(false);

  const loadProfile = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const { error: streakError } = await refreshDailyReadingStreak();

    if (streakError) {
      console.warn('Unable to refresh the Profile reading streak.', streakError.message);
    }

    const [profileResult, completionResult] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
      supabase
        .from("reading_completions")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id),
    ]);

    if (profileResult.error) {
      console.warn('Unable to load profile.', profileResult.error.message);
    }

    if (completionResult.error) {
      console.warn(
        'Unable to load completed-reading count.',
        completionResult.error.message
      );
    }

    const profileData = (profileResult.data as Profile | null) ?? null;
    setProfile(profileData);
    setCompletedCount(completionResult.count ?? 0);

    if (profileData?.avatar_path) {
      try {
        setAvatarUrl(await getAvatarSignedUrl(profileData.avatar_path));
      } catch (error) {
        console.warn('Unable to load profile photo.', error);
        setAvatarUrl(null);
      }
    } else {
      setAvatarUrl(null);
    }
  }, []);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  const handleAvatar = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      Alert.alert('Sign in required', 'Please sign in before changing your photo.');
      return;
    }

    setAvatarSaving(true);

    try {
      const avatar = await uploadAvatar(user.id);

      if (avatar) {
        setProfile((currentProfile) =>
          currentProfile
            ? { ...currentProfile, avatar_path: avatar.path }
            : currentProfile
        );
        setAvatarUrl(avatar.signedUrl);
      }
    } catch (error) {
      console.warn('Unable to update profile photo.', error);
      Alert.alert(
        'Unable to update profile photo',
        'Please check your connection and try again.'
      );
    } finally {
      setAvatarSaving(false);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: spacing.xl }}
      showsVerticalScrollIndicator={false}
    >
      {/* HERO */}
      <View style={styles.hero}>
        {/* <View style={styles.avatar}>
          <Ionicons name="person" size={42} color="#FFF" />
        </View> */}

        <TouchableOpacity
          accessibilityLabel="Change profile photo"
          disabled={avatarSaving}
          onPress={handleAvatar}
        >
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.avatar} />
          ) : (
            <View style={styles.avatar}>
              {avatarSaving ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Ionicons name="camera" size={28} color="#FFF" />
              )}
            </View>
          )}
        </TouchableOpacity>

        <Text style={styles.name}>{profile?.name || "Member"}</Text>
        <Text style={styles.member}>Word Alive Ministries</Text>
      </View>

      {/* STATS */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Ionicons name="flame" size={22} color={colors.accent} />
          <Text style={styles.statNumber}>{profile?.current_streak || 0}</Text>
          <Text style={styles.statLabel}>Day Streak</Text>
        </View>

        <View style={styles.statCard}>
          <Ionicons name="book" size={22} color={colors.primary} />
          <Text style={styles.statNumber}>{completedCount}</Text>
          <Text style={styles.statLabel}>Completed</Text>
        </View>
      </View>

      {/* ACHIEVEMENT */}
      <View style={styles.achievement}>
        <Ionicons name="trophy" size={28} color={colors.accent} />
        <Text style={styles.achievementTitle}>Numbers 6:24 · KJV</Text>
        <Text style={styles.achievementText}>
          The LORD bless thee, and keep thee:
        </Text>
      </View>

      {profile && pushSupported && <TouchableOpacity style={styles.achievement} disabled={savingAlerts}
        accessibilityRole="switch" accessibilityState={{ checked: alerts, disabled: savingAlerts }}
        onPress={async () => {
          setSavingAlerts(true);
          try { await setDeviceSubscription(profile.id, !alerts); setAlerts(!alerts); }
          catch (error) { Alert.alert('Unable to change ministry alerts', error instanceof Error ? error.message : 'Please try again.'); }
          finally { setSavingAlerts(false); }
        }}>
        <Text style={styles.achievementTitle}>Ministry alerts · {alerts ? 'On' : 'Off'}</Text>
        <Text style={styles.achievementText}>Live sermons and selected church notices on this device.</Text>
      </TouchableOpacity>}
      {profile && <AccountDeletion key={profile.id} userId={profile.id} />}
    </ScrollView>
  );
}

function makeStyles(colors: any, fonts: any) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
      padding: spacing.lg,
    },

    hero: {
      backgroundColor: colors.primary,
      borderRadius: 24,
      alignItems: "center",
      padding: spacing.xl,
      marginBottom: spacing.lg,
    },

    avatar: {
      width: 84,
      height: 84,
      borderRadius: 42,
      backgroundColor: "rgba(255,255,255,0.18)",
      justifyContent: "center",
      alignItems: "center",
      marginBottom: spacing.md,
    },

    name: {
      color: "#FFF",
      fontSize: fonts.title,
      fontWeight: "700",
    },

    member: {
      color: "#DDF4E6",
      marginTop: 4,
    },

    statsRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: spacing.lg,
    },

    statCard: {
      width: "48%",
      backgroundColor: colors.surface,
      borderRadius: 18,
      padding: spacing.lg,
      alignItems: "center",
    },

    statNumber: {
      fontSize: fonts.display,
      fontWeight: "700",
      color: colors.text,
      marginTop: spacing.xs,
    },

    statLabel: {
      color: colors.textMuted,
      marginTop: 4,
    },

    achievement: {
      backgroundColor: colors.primary,
      borderRadius: 20,
      padding: spacing.lg,
      alignItems: "center",
      marginBottom: spacing.lg,
    },

    achievementTitle: {
      color: "#FFF",
      fontWeight: "700",
      fontSize: fonts.subtitle,
      marginTop: spacing.sm,
    },

    achievementText: {
      color: "#E8F5E9",
      textAlign: "center",
      lineHeight: fonts.body * 1.5,
      marginTop: spacing.xs,
    },

  });
}
