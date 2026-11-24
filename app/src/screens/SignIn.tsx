import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  type TextInputInstance,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { getRememberedEmail, forgetRememberedEmail } from '../services/rememberedAccount';
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
  const [firstName, setFirstName] = useState('');
  const [surname, setSurname] = useState('');
  const [email, setEmail] = useState('');
  const [rememberedEmail, setRememberedEmail] = useState('');
  const emailTouched = useRef(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const surnameInputRef = useRef<TextInputInstance>(null);
  const emailInputRef = useRef<TextInputInstance>(null);
  const passwordInputRef = useRef<TextInputInstance>(null);
  const confirmPasswordInputRef = useRef<TextInputInstance>(null);

  const isCreatingAccount = mode === 'signUp';

  useEffect(() => {
    let active = true;
    void getRememberedEmail().then(saved => {
      if (!active || !saved) return;
      setRememberedEmail(saved);
      if (!emailTouched.current) setEmail(saved);
    });
    return () => { active = false; };
  }, []);

  async function forgetAccount() {
    if (!(await forgetRememberedEmail())) {
      Alert.alert('Unable to forget this account', 'Please try again.');
      return;
    }
    emailTouched.current = true;
    setRememberedEmail('');
    setEmail('');
    setPassword('');
  }

  function switchMode() {
    emailTouched.current = true;
    setEmail(isCreatingAccount ? rememberedEmail : '');
    setMode(isCreatingAccount ? 'signIn' : 'signUp');
    setPassword('');
    setConfirmPassword('');
  }

  function showAccountInstructions() {
    Alert.alert(
      'Check your email',
      'If a new account can be created with this email address, we sent a confirmation link. If you already have an account, sign in or reset your password.',
      [
        {
          text: 'Sign in',
          onPress: () => setMode('signIn'),
        },
        { text: 'Close', style: 'cancel' },
      ]
    );
  }

  async function requestPasswordReset() {
    if (isSubmitting) return;

    const normalizedEmail = email.trim().toLowerCase();

    if (!EMAIL_PATTERN.test(normalizedEmail)) {
      Alert.alert('Enter your email address first');
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
        redirectTo: AUTH_CALLBACK_URL,
      });

      if (error) {
        Alert.alert('Unable to request a password reset', error.message);
        return;
      }

      Alert.alert(
        'Check your email',
        'If an account uses this email address, we sent password-reset instructions. Open the link on this device to choose a new password.'
      );
    } catch {
      Alert.alert('Unable to connect', 'Check your internet connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function submit() {
    if (isSubmitting) return;

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedFirstName = firstName.trim();
    const normalizedSurname = surname.trim();

    if (!EMAIL_PATTERN.test(normalizedEmail)) {
      Alert.alert('Enter a valid email address');
      return;
    }

    if (password.length < 8) {
      Alert.alert('Use a password with at least 8 characters');
      return;
    }

    if (isCreatingAccount && normalizedFirstName.length < 2) {
      Alert.alert('Enter your first name');
      return;
    }

    if (isCreatingAccount && normalizedSurname.length < 2) {
      Alert.alert('Enter your surname');
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
            data: {
              first_name: normalizedFirstName,
              surname: normalizedSurname,
              full_name: `${normalizedFirstName} ${normalizedSurname}`,
            },
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
          showAccountInstructions();
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
              accessibilityLabel="First name"
              autoCapitalize="words"
              autoComplete="name-given"
              onChangeText={setFirstName}
              onSubmitEditing={() => surnameInputRef.current?.focus()}
              placeholder="First name"
              placeholderTextColor={colors.textMuted}
              returnKeyType="next"
              style={styles.input}
              textContentType="givenName"
              value={firstName}
            />
          ) : null}

          {isCreatingAccount ? (
            <TextInput
              accessibilityLabel="Surname"
              autoCapitalize="words"
              autoComplete="name-family"
              onChangeText={setSurname}
              onSubmitEditing={() => emailInputRef.current?.focus()}
              placeholder="Surname"
              placeholderTextColor={colors.textMuted}
              ref={surnameInputRef}
              returnKeyType="next"
              style={styles.input}
              textContentType="familyName"
              value={surname}
            />
          ) : null}

          <TextInput
            accessibilityLabel="Email address"
            autoCapitalize="none"
            autoComplete={isCreatingAccount ? 'email' : 'username'}
            keyboardType="email-address"
            onChangeText={(value) => { emailTouched.current = true; setEmail(value.toLowerCase()); }}
            onSubmitEditing={() => passwordInputRef.current?.focus()}
            placeholder="Email address"
            placeholderTextColor={colors.textMuted}
            ref={emailInputRef}
            returnKeyType="next"
            style={styles.input}
            textContentType={isCreatingAccount ? 'emailAddress' : 'username'}
            value={email}
          />

          {!isCreatingAccount && rememberedEmail !== '' && rememberedEmail === email && (
            <TouchableOpacity accessibilityRole="button" onPress={forgetAccount} disabled={isSubmitting}>
              <Text style={styles.passwordResetText}>Forget this account on this device</Text>
            </TouchableOpacity>
          )}

          <TextInput
            accessibilityLabel="Password"
            autoCapitalize="none"
            autoComplete={isCreatingAccount ? 'new-password' : 'password'}
            onChangeText={setPassword}
            onSubmitEditing={
              isCreatingAccount
                ? () => confirmPasswordInputRef.current?.focus()
                : submit
            }
            placeholder="Password"
            placeholderTextColor={colors.textMuted}
            ref={passwordInputRef}
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
              ref={confirmPasswordInputRef}
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

          {!isCreatingAccount ? (
            <TouchableOpacity
              accessibilityRole="button"
              disabled={isSubmitting}
              onPress={() => void requestPasswordReset()}
              style={styles.passwordReset}
            >
              <Text style={styles.passwordResetText}>Forgot password?</Text>
            </TouchableOpacity>
          ) : null}

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
    passwordReset: {
      alignItems: 'center',
      marginTop: 14,
      padding: 6,
    },
    passwordResetText: {
      color: colors.primary,
      fontWeight: '600',
    },
    modeSwitchText: {
      color: colors.primary,
      fontWeight: '600',
      textAlign: 'center',
    },
  });
}
