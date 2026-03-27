import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, KeyboardAvoidingView, Platform, Keyboard, ScrollView, ActivityIndicator, Alert, useColorScheme } from 'react-native';
import { useSignIn, useUser } from '@clerk/clerk-expo';
import { useRouter } from 'expo-router';
import { Mail, Lock, ArrowRight, Key } from 'lucide-react-native';
import InputField from '../../components/ui/InputField';
import Button from '../../components/ui/Button';
import * as Location from 'expo-location';
import { LinearGradient } from 'expo-linear-gradient';

const getClerkErrorMessage = (err: unknown, fallback: string): string => {
  const maybeErr = err as { errors?: { message?: string }[]; message?: string };
  return maybeErr?.errors?.[0]?.message || maybeErr?.message || fallback;
};

export default function Login() {
  const { signIn, setActive, isLoaded } = useSignIn();
  const { isLoaded: userLoaded, isSignedIn, user } = useUser();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const [email, setEmail] = useState('');
  const [userPassword, setUserPassword] = useState('');
  const [verifyMode, setVerifyMode] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [loading, setLoading] = useState(false); 

  useEffect(() => {
    if (!userLoaded) return;

    if (isSignedIn && user) {
      router.replace("/(tabs)/home");
    }
  }, [userLoaded, isSignedIn, user, router]);

  useEffect(() => {
    const show = Keyboard.addListener("keyboardDidShow", (e) => {
      if (Platform.OS === "android") setKeyboardHeight(e.endCoordinates.height);
    });
    const hide = Keyboard.addListener("keyboardDidHide", () => setKeyboardHeight(0));

    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  const requestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Required",
          "Location helps us suggest nearby storage conditions."
        );
      }
    } catch (error) {
      console.log("Permission error:", error);
    }
  };

  const onSignInPress = async () => {
    if (!signIn || !setActive) {
      Alert.alert('Login unavailable', 'Authentication service is still loading. Please try again.');
      return;
    }

    if (!email || !userPassword) {
      Alert.alert("Missing Fields", "Please enter email and password.");
      return;
    }

    setLoading(true);
    try {
      const result = await signIn.create({ identifier: email, password: userPassword });

      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        router.replace("/(tabs)/home");

        await requestLocationPermission();
      } else if (result.status === "needs_first_factor") {
        setVerifyMode(true);
      }
    } catch (err: unknown) {
      Alert.alert("Login Failed", getClerkErrorMessage(err, "Something went wrong"));
    } finally {
      setLoading(false);
    }
  };

  const handleVerification = async () => {
    if (!signIn || !setActive) {
      Alert.alert('Verification unavailable', 'Authentication service is still loading. Please try again.');
      return;
    }

    if (!verificationCode) return Alert.alert("Missing Code", "Enter the verification code.");

    setLoading(true);
    try {
      const result = await signIn.attemptFirstFactor({
        strategy: "email_code",
        code: verificationCode,
      });

      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        router.replace("/(tabs)/home");

        await requestLocationPermission();
      }
    } catch (err: unknown) {
      Alert.alert("Invalid Code", getClerkErrorMessage(err, "Please try again."));
    } finally {
      setLoading(false);
    }
  };

  const onResendPress = async () => {
    if (!isLoaded || !signIn) return;
    setLoading(true);
    try {
      const emailFactor = signIn.supportedFirstFactors?.find((f) => f.strategy === "email_code");
      if (!emailFactor) throw new Error("Email factor not found");

      const factor = emailFactor as { strategy: 'email_code'; emailAddressId: string };
      await signIn.prepareFirstFactor({ strategy: "email_code", emailAddressId: factor.emailAddressId });
      Alert.alert("Code Resent", "A new verification code has been sent to your email.");
    } catch (err) {
      console.log("Resend error:", err);
      Alert.alert("Error", "Failed to resend code.");
    } finally {
      setLoading(false);
    }
  };

  if (!isLoaded || !userLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#16a34a" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={{ flex: 1, backgroundColor: isDark ? '#0b1220' : '#f8fafc', paddingBottom: keyboardHeight }}
    >
      <LinearGradient
        colors={isDark ? ['#0b1220', '#052e2b'] : ['#e6fffb', '#dbeafe']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingVertical: 36 }}>
          <View style={{ paddingHorizontal: 24 }}>
            <View style={{ alignItems: 'center', marginBottom: 26 }}>
              <View style={{ width: 66, height: 66, borderRadius: 33, backgroundColor: isDark ? 'rgba(20,184,166,0.2)' : '#ccfbf1', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
                <Text style={{ fontSize: 30 }}>🍃</Text>
              </View>
              <Text style={{ fontSize: 34, fontWeight: '900', color: isDark ? '#f8fafc' : '#0f172a' }}>
                Freshly
              </Text>
              <Text style={{ color: isDark ? '#cbd5e1' : '#475569', marginTop: 6, textAlign: 'center' }}>
                Welcome back. Let&apos;s rescue great food.
              </Text>
            </View>

            <View
              style={{
                backgroundColor: isDark ? 'rgba(15,23,42,0.9)' : 'rgba(255,255,255,0.94)',
                borderRadius: 24,
                borderWidth: 1,
                borderColor: isDark ? 'rgba(148,163,184,0.18)' : 'rgba(15,23,42,0.08)',
                padding: 18,
                shadowColor: '#0f172a',
                shadowOpacity: 0.12,
                shadowRadius: 18,
                shadowOffset: { width: 0, height: 12 },
                elevation: 7,
              }}
            >
              <Text style={{ fontSize: 22, fontWeight: '800', marginBottom: 14, color: isDark ? '#f8fafc' : '#0f172a' }}>
                {verifyMode ? 'Verify account' : 'Login'}
              </Text>

              {!verifyMode ? (
                <>
                  <InputField label="Email" value={email} onChangeText={setEmail} placeholder="example@mail.com" icon={<Mail size={20} color="#64748b" />} />
                  <InputField label="Password" value={userPassword} onChangeText={setUserPassword} placeholder="Enter password" secureTextEntry icon={<Lock size={20} color="#64748b" />} />
                  <Button label="Login" onPress={onSignInPress} loading={loading} iconRight={<ArrowRight size={18} color="white" />} />
                </>
              ) : (
                <>
                  <InputField label="Verification Code" value={verificationCode} onChangeText={setVerificationCode} placeholder="Enter email code" keyboardType="number-pad" icon={<Key size={20} color="#64748b" />} helperText="Check your email inbox for the latest code." />
                  <Button label="Verify Account" onPress={handleVerification} loading={loading} />
                  <TouchableOpacity onPress={() => setVerifyMode(false)} style={{ marginTop: 15, alignItems: 'center' }}>
                    <Text style={{ color: isDark ? '#cbd5e1' : '#475569', fontWeight: '600' }}>Back to Login</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={onResendPress} style={{ marginTop: 10, alignItems: 'center' }}>
                    <Text style={{ color: '#0f766e', fontWeight: '700' }}>Resend Code</Text>
                  </TouchableOpacity>
                </>
              )}

              <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 20 }}>
                <Text style={{ color: isDark ? '#cbd5e1' : '#334155' }}>New user?</Text>
                <TouchableOpacity onPress={() => router.push('/(auth)/signup')}>
                  <Text style={{ color: '#0f766e', fontWeight: '700', marginLeft: 5 }}>Create account</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </ScrollView>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
}