import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../services/supabase';

export default function ProfileScreen() {
  const [profile, setProfile] = useState<any>(null);
  const [contrast, setContrast] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user?.id)
      .single();

    setProfile(data);
    setContrast(data?.high_contrast || false);
  }

  async function toggleContrast(value: boolean) {
    setContrast(value);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    await supabase
      .from('profiles')
      .update({ high_contrast: value })
      .eq('id', user?.id);
  }

  return (
    <View style={styles.container}>
      <Ionicons name="person-circle" size={90} color="#004d00" />

      <Text style={styles.name}>{profile?.name || 'Member'}</Text>

      <View style={styles.card}>
        <Text style={styles.label}>Reading Streak</Text>
        <Text style={styles.streak}>
          🔥 {profile?.current_streak || 0} Days
        </Text>
      </View>

      <View style={styles.setting}>
        <Text>High Contrast</Text>
        <Switch value={contrast} onValueChange={toggleContrast} />
      </View>

      <TouchableOpacity
        style={styles.logout}
        onPress={() => supabase.auth.signOut()}
      >
        <Text style={styles.logoutText}>SIGN OUT</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#Fdfcf0',
    alignItems: 'center',
    padding: 25,
  },
  name: {
    fontSize: 24,
    fontWeight: '700',
    color: '#004d00',
    marginBottom: 25,
  },
  card: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
  },
  label: {
    color: '#666',
  },
  streak: {
    fontSize: 28,
    fontWeight: '700',
    color: '#004d00',
    marginTop: 5,
  },
  setting: {
    width: '100%',
    marginTop: 25,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logout: {
    marginTop: 40,
    backgroundColor: '#b22222',
    padding: 14,
    width: '100%',
    borderRadius: 10,
    alignItems: 'center',
  },
  logoutText: {
    color: '#fff',
    fontWeight: '700',
  },
});