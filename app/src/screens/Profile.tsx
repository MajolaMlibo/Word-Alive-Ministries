import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Switch,
  TouchableOpacity,
  ScrollView,
  Image, 
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../services/supabase";
import { useAccessibility } from "../theme/AccessibilityContext";
import { spacing, radii, TextScaleKey } from "../theme/theme";
import { uploadAvatar, registerNotifications } from "../services/profileService";
import { useNavigation } from "@react-navigation/native";


const TEXT_OPTIONS: { key: TextScaleKey; label: string; size: number }[] = [
  { key: "standard", label: "A", size: 16 },
  { key: "large", label: "A", size: 22 },
  { key: "extraLarge", label: "A", size: 28 },
];

export default function ProfileScreen() {
const navigation = useNavigation<any>();

const {
  colors,
  fonts,
  highContrast,
  setHighContrast,
  textScaleKey,
  setTextScaleKey,
} = useAccessibility();

const styles = makeStyles(colors, fonts);
const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    loadProfile();
  }, []);

  const handleAvatar = async () => {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return;

  const url = await uploadAvatar(user.id);

  if (url) {
    setProfile({
      ...profile,
      avatar_url: url,
    });
  }
};

async function loadProfile() {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  setUser(user);

  if (!user) return;

  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  setProfile(data);
}

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

        <TouchableOpacity onPress={handleAvatar}>
          {profile?.avatar_url ? (
            <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
          ) : (
            <View style={styles.avatar}>
              <Ionicons name="camera" size={28} color="#FFF" />
            </View>
          )}
        </TouchableOpacity>

        <Text style={styles.name}>{profile?.name || "Member"}</Text>
        <Text style={styles.member}>Word Alive Ministries</Text>
      </View>

      {/* STATS */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Ionicons name="flame" size={22} color="#F9A825" />
          <Text style={styles.statNumber}>{profile?.current_streak || 0}</Text>
          <Text style={styles.statLabel}>Day Streak</Text>
        </View>

        <View style={styles.statCard}>
          <Ionicons name="book" size={22} color={colors.primary} />
          <Text style={styles.statNumber}>{profile?.current_streak || 0}</Text>
          <Text style={styles.statLabel}>Completed</Text>
        </View>
      </View>

      {/* SETTINGS */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Display Settings</Text>

        <View style={styles.settingRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.settingLabel}>High Contrast</Text>
            <Text style={styles.settingHint}>
              Improve readability across the app
            </Text>
          </View>

          <Switch value={highContrast} onValueChange={setHighContrast} />
        </View>

        <View style={styles.divider} />

        <Text style={styles.settingLabel}>Text Size</Text>

        <View style={styles.textRow}>
          {TEXT_OPTIONS.map((item) => (
            <TouchableOpacity
              key={item.key}
              style={[
                styles.textBtn,
                textScaleKey === item.key && styles.textBtnActive,
              ]}
              onPress={() => setTextScaleKey(item.key)}
            >
              <Text
                style={[
                  {
                    fontSize: item.size,
                    fontWeight: "700",
                    color: textScaleKey === item.key ? "#FFF" : colors.primary,
                  },
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* ACHIEVEMENT */}
      <View style={styles.achievement}>
        <Ionicons name="trophy" size={28} color="#FDD835" />
        <Text style={styles.achievementTitle}>Keep Going!</Text>
        <Text style={styles.achievementText}>
          Every completed reading strengthens your daily walk with God.
        </Text>
      </View>

<TouchableOpacity
  style={styles.logout}
  onPress={() => supabase.auth.signOut()}
>
  <Ionicons name="log-out-outline" size={20} color="#FFF" />
  <Text style={styles.logoutText}>Sign Out</Text>
</TouchableOpacity>

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

    section: {
      backgroundColor: colors.surface,
      borderRadius: 20,
      padding: spacing.lg,
      marginBottom: spacing.lg,
    },

    sectionTitle: {
      color: colors.primary,
      fontWeight: "700",
      fontSize: fonts.subtitle,
      marginBottom: spacing.md,
    },

    settingRow: {
      flexDirection: "row",
      alignItems: "center",
    },

    settingLabel: {
      fontSize: fonts.body,
      fontWeight: "600",
      color: colors.text,
    },

    settingHint: {
      color: colors.textMuted,
      marginTop: 2,
      fontSize: fonts.caption,
    },

    divider: {
      height: 1,
      backgroundColor: colors.borderSoft,
      marginVertical: spacing.lg,
    },

    textRow: {
      flexDirection: "row",
      marginTop: spacing.sm,
    },

    textBtn: {
      flex: 1,
      borderWidth: 1,
      borderColor: colors.borderSoft,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 12,
      marginRight: spacing.sm,
    },

    textBtnActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },

    achievement: {
      backgroundColor: "#0E5C38",
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

    logout: {
      backgroundColor: "#C62828",
      borderRadius: 16,
      paddingVertical: 15,
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
      margin: 10,
    },

    logoutText: {
      color: "#FFF",
      fontWeight: "700",
      fontSize: fonts.body,
      marginLeft: spacing.sm,
    },

    login: {
      backgroundColor: "#0b530b",
      borderRadius: 16,
      paddingVertical: 15,
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
      margin: 10,
    },

    loginText: {
      color: "#FFF",
      fontWeight: "700",
      fontSize: fonts.body,
      marginLeft: spacing.sm,
    },
  });
}
