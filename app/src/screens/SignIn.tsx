import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { supabase } from '../services/supabase';
import { useAccessibility } from '../theme/AccessibilityContext';
import { AppColors } from '../theme/theme';

type AuthMode = 'signIn' | 'signUp';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const AUTH_CALLBACK_URL = 'wordalive-ministries://auth/callback';

export default function SignIn() {
  const { colors } = useAccessibility();
  const styles = makeStyles(colors);
  const [mode, setMode] = useState<AuthMode>('signIn');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isCreatingAccount = mode === 'signUp';

  function switchMode() {
    setMode(isCreatingAccount ? 'signIn' : 'signUp');
    setPassword('');
    setConfirmPassword('');
  }

  async function submit() {
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedName = fullName.trim();

    if (!EMAIL_PATTERN.test(normalizedEmail)) {
      Alert.alert('Enter a valid email address');
      return;
    }

    if (password.length < 8) {
      Alert.alert('Use a password with at least 8 characters');
      return;
    }

    if (isCreatingAccount && normalizedName.length < 2) {
      Alert.alert('Enter your full name');
      return;
    }

    if (isCreatingAccount && password !== confirmPassword) {
      Alert.alert('Passwords do not match');
      return;
    }

    setIsSubmitting(true);

    try {
      if (isCreatingAccount) {
        const { data, error } = await supabase.auth.signUp({
          email: normalizedEmail,
          password,
          options: {
            data: { full_name: normalizedName },
            emailRedirectTo: AUTH_CALLBACK_URL,
          },
        });

        if (error) {
          Alert.alert('Unable to create account', error.message);
          return;
        }

        setPassword('');
        setConfirmPassword('');

        if (data.session) {
          Alert.alert('Account created', 'Welcome to Word Alive Ministries.');
        } else {
          Alert.alert(
            'Confirm your email',
            'We sent a confirmation link to your email address. Open it, then return to the app and sign in.'
          );
          setMode('signIn');
        }

        return;
      }

      const { error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });

      if (error) {
        Alert.alert('Unable to sign in', error.message);
      }
    } catch {
      Alert.alert(
        'Unable to connect',
        'Check your internet connection and try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.hero}>
          <Ionicons name="book" size={56} color={colors.accent} />
          <Text style={styles.title}>Word Alive</Text>
          <Text style={styles.subtitle}>Ministries</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.heading}>
            {isCreatingAccount ? 'Create your account' : 'Welcome to Word Alive'}
          </Text>
          <Text style={styles.text}>
            {isCreatingAccount
              ? 'Create an account to save your progress and receive church updates.'
              : 'Sign in to continue your journey with Word Alive Ministries.'}
          </Text>

          {isCreatingAccount ? (
            <TextInput
              accessibilityLabel="Full name"
              autoCapitalize="words"
              autoComplete="name"
              onChangeText={setFullName}
              placeholder="Full name"
              placeholderTextColor={colors.textMuted}
              returnKeyType="next"
              style={styles.input}
              textContentType="name"
              value={fullName}
            />
          ) : null}

          <TextInput
            accessibilityLabel="Email address"
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            onChangeText={(value) => setEmail(value.toLowerCase())}
            placeholder="Email address"
            placeholderTextColor={colors.textMuted}
            returnKeyType="next"
            style={styles.input}
            textContentType="emailAddress"
            value={email}
          />

          <TextInput
            accessibilityLabel="Password"
            autoCapitalize="none"
            autoComplete={isCreatingAccount ? 'new-password' : 'password'}
            onChangeText={setPassword}
            onSubmitEditing={isCreatingAccount ? undefined : submit}
            placeholder="Password"
            placeholderTextColor={colors.textMuted}
            returnKeyType={isCreatingAccount ? 'next' : 'done'}
            secureTextEntry
            style={styles.input}
            textContentType={isCreatingAccount ? 'newPassword' : 'password'}
            value={password}
          />

          {isCreatingAccount ? (
            <TextInput
              accessibilityLabel="Confirm password"
              autoCapitalize="none"
              autoComplete="new-password"
              onChangeText={setConfirmPassword}
              onSubmitEditing={submit}
              placeholder="Confirm password"
              placeholderTextColor={colors.textMuted}
              returnKeyType="done"
              secureTextEntry
              style={styles.input}
              textContentType="newPassword"
              value={confirmPassword}
            />
          ) : null}

          <TouchableOpacity
            accessibilityRole="button"
            disabled={isSubmitting}
            onPress={submit}
            style={[styles.primary, isSubmitting && styles.disabledButton]}
          >
            <Ionicons
              name={isCreatingAccount ? 'person-add-outline' : 'log-in-outline'}
              size={20}
              color="#FFFFFF"
            />
            <Text style={styles.primaryText}>
              {isSubmitting
                ? isCreatingAccount
                  ? 'Creating account...'
                  : 'Signing in...'
                : isCreatingAccount
                  ? 'Create account'
                  : 'Sign in'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            accessibilityRole="button"
            disabled={isSubmitting}
            onPress={switchMode}
            style={styles.modeSwitch}
          >
            <Text style={styles.modeSwitchText}>
              {isCreatingAccount
                ? 'Already have an account? Sign in'
                : 'New to Word Alive? Create an account'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function makeStyles(colors: AppColors) {
  return StyleSheet.create({
    container: {
      backgroundColor: colors.primary,
      flex: 1,
    },
    content: {
      flexGrow: 1,
      justifyContent: 'center',
      padding: 24,
    },
    hero: {
      alignItems: 'center',
      marginBottom: 36,
    },
    title: {
      color: '#FFFFFF',
      fontSize: 34,
      fontWeight: '700',
      marginTop: 10,
    },
    subtitle: {
      color: '#DDF4E6',
      fontSize: 18,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 22,
      padding: 24,
    },
    heading: {
      color: colors.primary,
      fontSize: 24,
      fontWeight: '700',
      textAlign: 'center',
    },
    text: {
      color: colors.textMuted,
      marginVertical: 14,
      textAlign: 'center',
    },
    input: {
      backgroundColor: colors.background,
      borderColor: colors.borderSoft,
      borderRadius: 12,
      borderWidth: 1,
      color: colors.text,
      marginBottom: 14,
      padding: 14,
    },
    primary: {
      alignItems: 'center',
      backgroundColor: colors.primary,
      borderRadius: 12,
      flexDirection: 'row',
      justifyContent: 'center',
      padding: 16,
    },
    disabledButton: {
      opacity: 0.6,
    },
    primaryText: {
      color: '#FFFFFF',
      fontWeight: '700',
      marginLeft: 8,
    },
    modeSwitch: {
      alignItems: 'center',
      marginTop: 20,
      padding: 8,
    },
    modeSwitchText: {
      color: colors.primary,
      fontWeight: '600',
      textAlign: 'center',
    },
  });
}
