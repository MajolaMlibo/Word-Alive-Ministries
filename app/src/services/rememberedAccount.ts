import AsyncStorage from '@react-native-async-storage/async-storage';

const emailKey = 'word-alive:last-sign-in-email';

export async function rememberSignInEmail(email: string) {
  try {
    await AsyncStorage.setItem(emailKey, email.trim().toLowerCase());
  } catch {
    // The session can still be used when the device cannot save the email.
  }
}

export async function getRememberedEmail() {
  try {
    return await AsyncStorage.getItem(emailKey);
  } catch {
    return null;
  }
}

export async function forgetRememberedEmail() {
  try {
    await AsyncStorage.removeItem(emailKey);
    return true;
  } catch {
    return false;
  }
}
