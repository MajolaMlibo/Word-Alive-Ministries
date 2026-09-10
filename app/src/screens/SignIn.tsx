import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { supabase } from "../services/supabase";

WebBrowser.maybeCompleteAuthSession();
const redirectTo = Linking.createURL("auth/callback");


export default function SignIn() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const redirectTo = Linking.createURL("/");

  const signInWithEmail = async () => {
    if (!email) {
      Alert.alert("Enter your email");
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: redirectTo,
      },
    });

    setLoading(false);

    if (error) {
      Alert.alert("Error", error.message);
    } else {
      Alert.alert("Check your email", "We've sent you a secure sign-in link.");
    }
  };

  const signInWithGoogle = async () => {
  const redirectTo = Linking.createURL("auth/callback");

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo,
      skipBrowserRedirect: true,
    },
  });

  if (error) {
    Alert.alert("Error", error.message);
    return;
  }

  if (data?.url) {
    await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  }
};

  const signInWithApple = async () => {
  const redirectTo = Linking.createURL("auth/callback");

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "apple",
    options: {
      redirectTo,
      skipBrowserRedirect: true,
    },
  });

  if (error) return Alert.alert("Error", error.message);

  if (data?.url) {
    await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  }
};

  return (
    <View style={styles.container}>
      <View style={styles.hero}>
        <Ionicons name="book" size={56} color="#FDD835" />
        <Text style={styles.title}>Word Alive</Text>
        <Text style={styles.subtitle}>Ministries</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.heading}>Welcome</Text>
        <Text style={styles.text}>
          Sign in securely with your email or continue with Google.
        </Text>

        <TextInput
          placeholder="Email address"
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
          style={styles.input}
        />

        <TouchableOpacity
          style={styles.primary}
          onPress={signInWithEmail}
          disabled={loading}
        >
          <Ionicons name="mail-outline" size={20} color="#FFF" />
          <Text style={styles.primaryText}>
            {loading ? "Sending..." : "Email me a sign-in link"}
          </Text>
        </TouchableOpacity>

        <View style={styles.dividerRow}>
          <View style={styles.line} />
          <Text style={styles.or}>OR</Text>
          <View style={styles.line} />
        </View>

        <TouchableOpacity style={styles.oauth} onPress={signInWithGoogle}>
          <Ionicons name="logo-google" size={22} color="#DB4437" />
          <Text style={styles.oauthText}>Continue with Google</Text>
        </TouchableOpacity>

        {Platform.OS === "ios" && (
          <TouchableOpacity style={styles.oauth} onPress={signInWithApple}>
            <Ionicons name="logo-apple" size={22} color="#000" />
            <Text style={styles.oauthText}>Continue with Apple</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#044b04",
    justifyContent: "center",
    padding: 24,
  },
  hero: {
    alignItems: "center",
    marginBottom: 36,
  },
  title: {
    color: "#FFF",
    fontSize: 34,
    fontWeight: "700",
    marginTop: 10,
  },
  subtitle: {
    color: "#DDF4E6",
    fontSize: 18,
  },
  card: {
    backgroundColor: "#FFF",
    borderRadius: 22,
    padding: 24,
  },
  heading: {
    fontSize: 24,
    fontWeight: "700",
    color: "#044b04",
    textAlign: "center",
  },
  text: {
    textAlign: "center",
    color: "#666",
    marginVertical: 14,
  },
  input: {
    borderWidth: 1,
    borderColor: "#DDD",
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
  },
  primary: {
    backgroundColor: "#044b04",
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  primaryText: {
    color: "#FFF",
    fontWeight: "700",
    marginLeft: 8,
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 20,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: "#DDD",
  },
  or: {
    marginHorizontal: 10,
    color: "#888",
  },
  oauth: {
    borderWidth: 1,
    borderColor: "#DDD",
    borderRadius: 12,
    padding: 15,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  oauthText: {
    fontWeight: "600",
    marginLeft: 10,
  },
});
