import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../services/supabase';

export default function PrayerScreen() {
  const [prayer, setPrayer] = useState('');

  async function submitPrayer() {
    if (!prayer.trim()) {
      Alert.alert('Please write your prayer request.');
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error } = await supabase.from('prayer_requests').insert({
      user_id: user?.id,
      description: prayer,
      status: 'Pending',
      sent_at: new Date().toISOString(),
    });

    if (error) {
      Alert.alert('Error', error.message);
      return;
    }

    setPrayer('');
    Alert.alert(
      'Prayer Sent',
      'Your request has been submitted privately.'
    );
  }

  return (
    <View style={styles.container}>
      <Ionicons name="heart" size={40} color="#004d00" />

      <Text style={styles.title}>Prayer Requests</Text>

      <Text style={styles.subtitle}>
        Share your prayer confidentially with the ministry.
      </Text>

      <TextInput
        style={styles.input}
        multiline
        value={prayer}
        onChangeText={setPrayer}
        placeholder="Type your prayer here..."
        textAlignVertical="top"
      />

      <TouchableOpacity style={styles.button} onPress={submitPrayer}>
        <Text style={styles.buttonText}>SUBMIT PRAYER</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#Fdfcf0',
    padding: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#004d00',
    marginTop: 10,
  },
  subtitle: {
    textAlign: 'center',
    color: '#666',
    marginVertical: 15,
  },
  input: {
    width: '100%',
    height: 200,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  button: {
    backgroundColor: '#004d00',
    width: '100%',
    padding: 15,
    borderRadius: 10,
    marginTop: 20,
    alignItems: 'center',
  },
  buttonText: {
    color: '#Fdfcf0',
    fontWeight: '700',
  },
});