import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { supabase } from '../services/supabase';

export default function HomeScreen() {
  const [reading, setReading] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTodayReading();
  }, []);

  const fetchTodayReading = async () => {
    try {
      const { data, error } = await supabase
        .from('daily_readings')
        .select('*')
        .eq('scheduled_date', '2026-08-27') 
        .single();

      if (error) throw error;
      setReading(data);
    } catch (error) {
      console.error('Error fetching reading:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#004d00" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.greeting}>Good morning, Qiniso</Text>
      <Text style={styles.subGreeting}>Welcome to Word Alive Ministries</Text>

      {/* Today's Scripture Card */}
      <View style={styles.card}>
        <Text style={styles.dateBadge}>{reading?.scheduled_date}</Text>
        <Text style={styles.title}>{reading?.scripture_ref}</Text>
        <Text style={styles.snippet}>"{reading?.content}"</Text>
        
        <TouchableOpacity style={styles.button}>
          <Text style={styles.buttonText}>READ TODAY'S SCRIPTURE </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#Fdfcf0' }, // Cream background
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  greeting: { fontSize: 24, fontWeight: 'bold', color: '#000' },
  subGreeting: { fontSize: 16, color: '#555', marginBottom: 20 },
  card: { 
    backgroundColor: '#FFF', 
    padding: 20, 
    borderRadius: 15, 
    borderWidth: 2, 
    borderColor: '#004d00', // Ministry Green
    alignItems: 'center'
  },
  dateBadge: { alignSelf: 'flex-end', backgroundColor: '#b8860b', color: '#FFF', padding: 5, borderRadius: 5, fontSize: 12, fontWeight: 'bold' },
  title: { fontSize: 28, fontWeight: 'bold', color: '#004d00', marginTop: 10 },
  snippet: { fontStyle: 'italic', textAlign: 'center', marginVertical: 15, color: '#333' },
  button: { backgroundColor: '#e6c200', padding: 12, borderRadius: 8, width: '100%', alignItems: 'center' },
  buttonText: { fontWeight: 'bold', color: '#000' }
});