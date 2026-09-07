import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../services/supabase';

export default function DailyReadingScreen() {
  const [reading, setReading] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReading();
  }, []);

  async function loadReading() {
    const today = new Date().toISOString().split('T')[0];

    const { data } = await supabase
      .from('daily_readings')
      .select('*')
      .eq('scheduled_date', today)
      .single();

    setReading(data);
    setLoading(false);
  }

  async function markComplete() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user || !reading) return;

    const { error } = await supabase.from('user_progress').insert({
      user_id: user.id,
      reading_id: reading.id,
      completed_at: new Date().toISOString(),
    });

    if (error) {
      Alert.alert('Already Completed', error.message);
      return;
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('current_streak')
      .eq('id', user.id)
      .single();

    await supabase
      .from('profiles')
      .update({
        current_streak: (profile?.current_streak || 0) + 1,
      })
      .eq('id', user.id);

    Alert.alert('God bless you!', 'Reading completed successfully.');
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#004d00" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="book" size={26} color="#004d00" />
        <Text style={styles.heading}>Daily Reading</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.reference}>{reading?.scripture_ref}</Text>

        <Text style={styles.scripture}>{reading?.content}</Text>

        <TouchableOpacity style={styles.button} onPress={markComplete}>
          <Ionicons name="checkmark-circle" size={20} color="#000" />
          <Text style={styles.buttonText}> MARK AS COMPLETE</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#Fdfcf0',
    padding: 20,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  heading: {
    fontSize: 24,
    fontWeight: '700',
    marginLeft: 10,
    color: '#004d00',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
  },
  reference: {
    fontSize: 22,
    fontWeight: '700',
    color: '#004d00',
    marginBottom: 15,
  },
  scripture: {
    fontSize: 17,
    lineHeight: 30,
    color: '#333',
  },
  button: {
    backgroundColor: '#e6c200',
    marginTop: 30,
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  buttonText: {
    fontWeight: '700',
    color: '#000',
  },
});