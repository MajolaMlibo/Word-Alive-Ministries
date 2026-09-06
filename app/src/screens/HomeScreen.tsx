import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, ScrollView } from 'react-native';
import { fetchScripture } from '../services/bibleService';
import { supabase } from '../services/supabase';

export default function HomeScreen() {
  const [reading, setReading] = useState<any>(null);
  const [scripture, setScripture] = useState<any>(null);
  const [loading, setLoading] = useState(true);

useEffect(() => {
    loadTodayScripture();
  }, []);

  const loadTodayScripture = async () => {
    try {
      // Fetching Romans 8:1-17 live via our API service with caching
      const data = await fetchScripture('Romans 8:1-17');
      setScripture(data);
    } catch (error) {
      console.error('Failed to load scripture on home screen:', error);
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
    <ScrollView style={styles.container}>
      <Text style={styles.greeting}>Good morning, Qiniso</Text>
      <Text style={styles.subGreeting}>Welcome to Word Alive Ministries</Text>

      {/* Today's Scripture Card */}
      <View style={styles.card}>
        <Text style={styles.dateBadge}>27 August 2026</Text>
        <Text style={styles.title}>{scripture?.reference || 'Romans 8:1-17'}</Text>
        <Text style={styles.snippet}>"{scripture?.text}"</Text>
        
        <TouchableOpacity style={styles.button}>
          <Text style={styles.buttonText}>READ TODAY'S SCRIPTURE </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
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