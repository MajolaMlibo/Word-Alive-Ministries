import React, { useRef, useState } from 'react';
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

import { supabase } from '../services/supabase';
import { useAccessibility } from '../theme/AccessibilityContext';
import { AppColors } from '../theme/theme';

type ResetPasswordProps = {
  onCancel: () => Promise<void>;
  onComplete: () => void;
};

export default function ResetPassword({ onCancel, onComplete }: ResetPasswordProps) {
  const { colors } = useAccessibility();
  const styles = makeStyles(colors);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const confirmPasswordInputRef = useRef<TextInputInstance>(null);

  async function submit() {
    if (isSubmitting) return;

    if (password.length < 8) {
      Alert.alert('Use a password with at least 8 characters');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Passwords do not match');
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase.auth.updateUser({ password });

      if (error) {
        Alert.alert('Unable to update password', error.message);
        return;
      }

      setPassword('');
      setConfirmPassword('');
      Alert.alert('Password updated', 'Your new password is ready to use.');
      onComplete();
    } catch {
      Alert.alert('Unable to connect', 'Check your internet connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.hero}>
          <Ionicons name="key-outline" size={56} color={colors.accent} />
          <Text style={styles.title}>Choose a new password</Text>
          <Text style={styles.subtitle}>Use at least 8 characters.</Text>
        </View>

        <View style={styles.card}>
          <TextInput
            accessibilityLabel="New password"
            autoCapitalize="none"
            autoComplete="new-password"
            onChangeText={setPassword}
            onSubmitEditing={() => confirmPasswordInputRef.current?.focus()}
            placeholder="New password"
            placeholderTextColor={colors.textMuted}
            returnKeyType="next"
            secureTextEntry
            style={styles.input}
            textContentType="newPassword"
            value={password}
          />

          <TextInput
            accessibilityLabel="Confirm new password"
            autoCapitalize="none"
            autoComplete="new-password"
            onChangeText={setConfirmPassword}
            onSubmitEditing={submit}
            placeholder="Confirm new password"
            placeholderTextColor={colors.textMuted}
            ref={confirmPasswordInputRef}
            returnKeyType="done"
            secureTextEntry
            style={styles.input}
            textContentType="newPassword"
            value={confirmPassword}
          />

          <TouchableOpacity
            accessibilityRole="button"
            disabled={isSubmitting}
            onPress={submit}
            style={[styles.primary, isSubmitting && styles.disabledButton]}
          >
            <Ionicons name="save-outline" size={20} color="#FFFFFF" />
            <Text style={styles.primaryText}>
              {isSubmitting ? 'Updating password...' : 'Update password'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            accessibilityRole="button"
            disabled={isSubmitting}
            onPress={() => void onCancel()}
            style={styles.cancelButton}
          >
            <Text style={styles.cancelText}>Cancel and return to sign in</Text>
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
      fontSize: 30,
      fontWeight: '700',
      marginTop: 10,
      textAlign: 'center',
    },
    subtitle: {
      color: '#DDF4E6',
      fontSize: 18,
      marginTop: 8,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 22,
      padding: 24,
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
    cancelButton: {
      alignItems: 'center',
      marginTop: 20,
      padding: 8,
    },
    cancelText: {
      color: colors.primary,
      fontWeight: '600',
      textAlign: 'center',
    },
  });
}
