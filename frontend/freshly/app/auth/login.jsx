import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, KeyboardAvoidingView, Platform, Keyboard, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { useSignIn, useUser } from '@clerk/clerk-expo';
import { useRouter } from 'expo-router';
import { Mail, Lock, ArrowRight, Key } from 'lucide-react-native';
import InputField from '../../components/ui/InputField';
import Button from '../../components/ui/Button';
import * as Location from 'expo-location';
import { useColorScheme } from 'react-native';
import * as Crypto from 'expo-crypto';

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
      const role = user?.unsafeMetadata?.role;
      if (role === "SHOPKEEPER") {
        router.replace("/protected/shopkeeper/dashboard");
      } else {
        router.replace("/protected/customer/home");
      }
    }
  }, [userLoaded, isSignedIn, user]);

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
    if (!email || !userPassword) {
      Alert.alert("Missing Fields", "Please enter email and password.");
      return;
    }

    setLoading(true);
    try {
      const result = await signIn.create({ identifier: email, password: userPassword });

      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        const role = result?.createdUser?.unsafeMetadata?.role;

        if (role === "SHOPKEEPER") router.replace("/protected/shopkeeper/dashboard");
        else router.replace("/protected/customer/home");

        await requestLocationPermission();
      } else if (result.status === "needs_first_factor") {
        setVerifyMode(true);
      }
    } catch (err) {
      Alert.alert("Login Failed", err?.errors?.[0]?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleVerification = async () => {
    if (!verificationCode) return Alert.alert("Missing Code", "Enter the verification code.");

    setLoading(true);
    try {
      const result = await signIn.attemptFirstFactor({
        strategy: "email_code",
        code: verificationCode,
      });

      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        const role = result?.createdUser?.unsafeMetadata?.role;

        if (role === "SHOPKEEPER") router.replace("/protected/shopkeeper/dashboard");
        else router.replace("/protected/customer/home");

        await requestLocationPermission();
      }
    } catch (err) {
      Alert.alert("Invalid Code", "Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const onResendPress = async () => {
    if (!isLoaded || !signIn) return;
    setLoading(true);
    try {
      const emailFactor = signIn.supportedFirstFactors?.find(f => f.strategy === "email_code");
      if (!emailFactor) throw new Error("Email factor not found");

      await signIn.prepareFirstFactor({ strategy: "email_code", emailAddressId: emailFactor.emailAddressId });
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
      style={{ flex: 1, backgroundColor: isDark ? "#111827" : "#fff", paddingBottom: keyboardHeight }}
    >
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }}>
        <View style={{ paddingHorizontal: 30 }}>
          <View style={{ alignItems: "center", marginBottom: 40 }}>
            <Text style={{ fontSize: 34, fontWeight: "bold", color: isDark ? "#a5b4fc" : "#4f46e5" }}>
              ExpiryPredict
            </Text>
            <Text style={{ color: isDark ? "#9ca3af" : "#6b7280", marginTop: 6, textAlign: "center" }}>
              Smart Expiry Date Prediction System
            </Text>
          </View>

          {!verifyMode ? (
            <>
              <InputField label="Email" value={email} onChangeText={setEmail} placeholder="example@mail.com" icon={<Mail size={20} color="#6b7280" />} />
              <InputField label="Password" value={userPassword} onChangeText={setUserPassword} placeholder="Enter password" secureTextEntry icon={<Lock size={20} color="#6b7280" />} />
              <Button label="Login" onPress={onSignInPress} loading={loading} iconRight={<ArrowRight size={18} color="white" />} />
            </>
          ) : (
            <>
              <InputField label="Verification Code" value={verificationCode} onChangeText={setVerificationCode} placeholder="Enter email code" keyboardType="number-pad" icon={<Key size={20} color="#6b7280" />} />
              <Button label="Verify Account" onPress={handleVerification} loading={loading} />
              <TouchableOpacity onPress={() => setVerifyMode(false)} style={{ marginTop: 15, alignItems: "center" }}>
                <Text style={{ color: isDark ? "#9ca3af" : "#6b7280" }}>Back to Login</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={onResendPress} style={{ marginTop: 10, alignItems: "center" }}>
                <Text style={{ color: "#22c55e" }}>Resend Code</Text>
              </TouchableOpacity>
            </>
          )}

          <View style={{ flexDirection: "row", justifyContent: "center", marginTop: 30 }}>
            <Text style={{ color: isDark ? "#9ca3af" : "#374151" }}>New user?</Text>
            <TouchableOpacity onPress={() => router.push("/auth/signup")}>
              <Text style={{ color: "#22c55e", fontWeight: "600", marginLeft: 5 }}>Register</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}