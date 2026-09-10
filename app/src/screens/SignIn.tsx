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

export default function SignIn() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [LastName, setLastName] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);

  async function handleAuth() {
    if (!email || !password) {
      Alert.alert('Missing fields', 'Please enter your email and password.');
      return;
    }

    setLoading(true);

    if (isLogin) {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) Alert.alert('Login failed', error.message);
    } else {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        Alert.alert('Sign up failed', error.message);
      } else if (data.user) {
        await supabase.from('profiles').insert({
          id: data.user.id,
          name,
          current_streak: 0,
          is_admin: false,
          high_contrast: false,
          text_size: 'standard',
        });

        Alert.alert(
          'Account created',
          'Please verify your email before signing in.'
        );
      }
    }

    setLoading(false);
  }

  return (
    <View style={styles.container}>
      <View style={styles.hero}>
        <Ionicons name="book" size={54} color="#FDD835" />
        <Text style={styles.title}>Word Alive</Text>
        <Text style={styles.subtitle}>Ministries</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.heading}>
          {isLogin ? 'Welcome Back' : 'Create Account'}
        </Text>

        {!isLogin && (
          <TextInput
            placeholder="First Name"
            value={name}
            onChangeText={setName}
            style={styles.input}
          />
        )}

        <TextInput
            placeholder="Last Name"
            value={LastName}
            onChangeText={setLastName}
            style={styles.input}
          />

        <TextInput
          placeholder="Email"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
          style={styles.input}
        />

        <TextInput
          placeholder="Password"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          style={styles.input}
        />

        <TouchableOpacity
          style={styles.button}
          onPress={handleAuth}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading
              ? 'Please wait...'
              : isLogin
              ? 'Sign In'
              : 'Create Account'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => setIsLogin(!isLogin)}>
          <Text style={styles.switch}>
            {isLogin
              ? "Don't have an account? Sign Up"
              : 'Already have an account? Sign In'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#044b04',
    justifyContent: 'center',
    padding: 24,
  },
  hero: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    color: '#FFF',
    fontSize: 34,
    fontWeight: '700',
    marginTop: 8,
  },
  subtitle: {
    color: '#DDF4E6',
    fontSize: 18,
  },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 22,
    padding: 24,
  },
  heading: {
    fontSize: 24,
    fontWeight: '700',
    color: '#044b04',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
  },
  button: {
    backgroundColor: '#044b04',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 6,
  },
  buttonText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 16,
  },
  switch: {
    color: '#044b04',
    textAlign: 'center',
    marginTop: 18,
    fontWeight: '600',
  },
});