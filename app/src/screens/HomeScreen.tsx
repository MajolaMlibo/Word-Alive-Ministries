import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, ScrollView } from 'react-native';
import { fetchScripture } from '../services/bibleService';
import { supabase } from '../services/supabase';
import { Ionicons } from '@expo/vector-icons';

export default function HomeScreen() {
  const [reading, setReading] = useState<any>(null);
  const [scripture, setScripture] = useState<any>(null);
  const [nextStudy, setNextStudy] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const getFormattedDate = () => {
        const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' };
        return new Date().toLocaleDateString('en-GB', options); // Outputs format like "7 September 2026"
      };

useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      // 1. Fetch Today's Scripture
      const { data: readingData } = await supabase
        .from('daily_readings')
        .select('*')
        .eq('scheduled_date', '2026-08-27')
        .single();
      setReading(readingData);

      // 2. Fetch Next Bible Study
      const { data: studyData } = await supabase
        .from('bible_studies')
        .select('*')
        .limit(1)
        .single();
      setNextStudy(studyData);

    } catch (error) {
      console.error('Failed to load dashboard data:', error);
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

      {/* Today's Scripture Card (Compact Snippet View) */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="book-outline" size={20} color="#004d00" />
          <Text style={styles.cardHeaderText}>TODAY'S SCRIPTURE</Text>
          <Text style={styles.dateBadge}>{getFormattedDate()}</Text>
        </View>

        <Text style={styles.title}>{reading?.scripture_ref || 'Romans 8:1-17'}</Text>
        <Text style={styles.snippet}>"{reading?.content}"</Text>
        
        <TouchableOpacity style={styles.button}>
          <Ionicons name="book" size={18} color="#000" style={{ marginRight: 8 }} />
          <Text style={styles.buttonText}>READ TODAY'S SCRIPTURE </Text>
        </TouchableOpacity>
      </View>

      {/* Next Bible Study Widget */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="calendar-outline" size={20} color="#004d00" />
          <Text style={styles.cardHeaderText}>NEXT BIBLE STUDY</Text>
        </View>

        <Text style={styles.title}>{nextStudy?.study_name || 'Align & Prosper Bible Study'}</Text>
        <Text style={styles.subText}>Chapter: {nextStudy?.chapter || 'Romans 8'}</Text>
        <Text style={styles.subText}>Thursday, 28 August | 19:00 - 20:00</Text>
        
        <TouchableOpacity style={styles.secondaryButton}>
          <Text style={styles.secondaryButtonText}>VIEW CALENDAR </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#Fdfcf0' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#Fdfcf0' },
  greeting: { fontSize: 24, fontWeight: 'bold', color: '#000' },
  subGreeting: { fontSize: 16, color: '#555', marginBottom: 20 },
  card: { 
    backgroundColor: '#FFF', 
    padding: 20, 
    borderRadius: 15, 
    borderWidth: 2, 
    borderColor: '#004d00',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', width: '100%', marginBottom: 10 },
  cardHeaderText: { fontWeight: 'bold', color: '#004d00', marginLeft: 8, fontSize: 14, flex: 1 },
  dateBadge: { backgroundColor: '#b8860b', color: '#FFF', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 5, fontSize: 11, fontWeight: 'bold' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#004d00', marginTop: 5 },
  snippet: { fontStyle: 'italic', textAlign: 'center', marginVertical: 12, color: '#333', lineHeight: 20 },
  subText: { fontSize: 14, color: '#555', marginVertical: 3, alignSelf: 'flex-start' },
  button: { 
    backgroundColor: '#e6c200', 
    padding: 12, 
    borderRadius: 8, 
    width: '100%', 
    alignItems: 'center', 
    flexDirection: 'row', 
    justifyContent: 'center',
    marginTop: 10 
  },
  buttonText: { fontWeight: 'bold', color: '#000' },
  secondaryButton: { 
    backgroundColor: '#f5deb3', 
    padding: 10, 
    borderRadius: 8, 
    width: '100%', 
    alignItems: 'center', 
    marginTop: 15 
  },
  secondaryButtonText: { fontWeight: 'bold', color: '#004d00' }
});