import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, KeyboardAvoidingView, Platform, Keyboard, Alert, ScrollView, ActivityIndicator, useColorScheme } from 'react-native';
import { useSignUp, useUser } from '@clerk/clerk-expo';
import { useRouter } from 'expo-router';
import { Mail, Lock, Key, User } from 'lucide-react-native';
import * as Location from 'expo-location';
import InputField from '../../components/ui/InputField';
import Button from '../../components/ui/Button';

export default function SignUp() {
  const { isLoaded, signUp, setActive } = useSignUp();
  const { isLoaded: userLoaded, isSignedIn, user } = useUser();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [userPassword, setUserPassword] = useState('');
  const [role, setRole] = useState('CUSTOMER');
  const [verifyMode, setVerifyMode] = useState(false);
  const [code, setCode] = useState('');
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isLoaded && userLoaded && isSignedIn) {
      router.replace("/(tabs)/home");
    }
  }, [isLoaded, userLoaded, isSignedIn, user, router]);

  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', (e) => {
      if (Platform.OS === 'android') {
        setKeyboardHeight(e.endCoordinates.height);
      }
    });

    const hide = Keyboard.addListener('keyboardDidHide', () =>
      setKeyboardHeight(0)
    );

    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  if (!isLoaded || !userLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#16a34a" />
      </View>
    );
  }

  
  const requestLocationPermission = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission Needed',
        'Location access is needed to find nearby food items.'
      );
    }
  };

  const onSignUpPress = async () => {
    if (!email || !userPassword || !firstName || !lastName) {
      Alert.alert("Missing Fields", "Please fill all fields.");
      return;
    }
    setLoading(true);

    try {
      await signUp.create({
        emailAddress: email,
        password: userPassword,
        firstName,
        lastName,
        unsafeMetadata: { role },
      });

      await signUp.prepareEmailAddressVerification({
        strategy: 'email_code',
      });

      setVerifyMode(true);
      Alert.alert('Verification Email Sent', 'Check your email for the code.');
    } catch (err) {
      console.error(err);
      Alert.alert('Sign Up Failed', err?.errors?.[0]?.message || 'Try again');
    } finally {
      setLoading(false);
    }
  };

  const onPressVerify = async () => {
    setLoading(true);

    try {
      const completeSignUp =
        await signUp.attemptEmailAddressVerification({ code });

      if (completeSignUp.status === "complete") {
        await setActive({
          session: completeSignUp.createdSessionId,
        });
      }

      await requestLocationPermission();
    } catch (err) {
      console.error(err);
      Alert.alert('Verification Failed', 'Please check the code and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{
        flex: 1,
        backgroundColor: isDark ? "#111827" : "#ffffff",
        paddingBottom: Platform.OS === "android" ? keyboardHeight : 0,
      }}
    >
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: "center",
          padding: 24,
        }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Logo Section */}
        <View style={{ alignItems: "center", marginBottom: 30 }}>
          <View
            style={{
              width: 80,
              height: 80,
              borderRadius: 40,
              backgroundColor: isDark ? "#065f46" : "#d1fae5",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 10,
            }}
          >
            <Text style={{ fontSize: 36 }}>🌱</Text>
          </View>

          <Text
            style={{
              fontSize: 28,
              fontWeight: "bold",
              color: isDark ? "white" : "black",
            }}
          >
            ExpiryPredict
          </Text>

          <Text
            style={{
              color: isDark ? "#9ca3af" : "#6b7280",
              marginTop: 5,
            }}
          >
            Smart Expiry Date Prediction System
          </Text>
        </View>

        {/* Title */}
        <Text
          style={{
            fontSize: 24,
            fontWeight: "bold",
            marginBottom: 20,
            color: isDark ? "white" : "black",
          }}
        >
          {verifyMode ? "Verify Email" : "Create Account"}
        </Text>

        {!verifyMode ? (
          <>
            <InputField
              placeholder="First Name"
              value={firstName}
              onChangeText={setFirstName}
              icon={<User size={20} color="#6b7280" />}
            />

            <InputField
              placeholder="Last Name"
              value={lastName}
              onChangeText={setLastName}
              icon={<User size={20} color="#6b7280" />}
            />

            <InputField
              placeholder="Email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              icon={<Mail size={20} color="#6b7280" />}
            />

            <InputField
              placeholder="Password"
              value={userPassword}
              onChangeText={setUserPassword}
              secureTextEntry
              icon={<Lock size={20} color="#6b7280" />}
            />

            {/* Role Selection */}
            <View style={{ marginVertical: 20 }}>
              <Text
                style={{
                  marginBottom: 10,
                  fontWeight: "600",
                  color: isDark ? "white" : "black",
                }}
              >
                Select Role
              </Text>

              <View style={{ flexDirection: "row", gap: 10 }}>
                <TouchableOpacity
                  style={{
                    flex: 1,
                    padding: 12,
                    borderRadius: 8,
                    backgroundColor:
                      role === "CUSTOMER"
                        ? "#6366f1"
                        : isDark
                          ? "#374151"
                          : "#e5e7eb",
                    alignItems: "center",
                  }}
                  onPress={() => setRole("CUSTOMER")}
                >
                  <Text style={{ color: role === "CUSTOMER" ? "white" : "#111" }}>
                    Customer
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={{
                    flex: 1,
                    padding: 12,
                    borderRadius: 8,
                    backgroundColor:
                      role === "SHOPKEEPER"
                        ? "#16a34a"
                        : isDark
                          ? "#374151"
                          : "#e5e7eb",
                    alignItems: "center",
                  }}
                  onPress={() => setRole("SHOPKEEPER")}
                >
                  <Text style={{ color: role === "SHOPKEEPER" ? "white" : "#111" }}>
                    Shopkeeper
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <Button
              label={loading ? "Creating Account..." : "Sign Up"}
              onPress={onSignUpPress}
              disabled={loading}
            />
          </>
        ) : (
          <>
            <InputField
              placeholder="Enter Verification Code"
              value={code}
              onChangeText={setCode}
              keyboardType="number-pad"
              icon={<Key size={20} color="#6b7280" />}
            />

            <Button
              label={loading ? "Verifying..." : "Verify Email"}
              onPress={onPressVerify}
              disabled={loading}
            />
          </>
        )}

        {/* Login Link */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "center",
            marginTop: 25,
          }}
        >
          <Text style={{ color: isDark ? "#9ca3af" : "#6b7280" }}>
            Already have an account?
          </Text>

          <TouchableOpacity onPress={() => router.push("/auth/login")}>
            <Text
              style={{
                color: "#16a34a",
                marginLeft: 5,
                fontWeight: "600",
              }}
            >
              Login
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}