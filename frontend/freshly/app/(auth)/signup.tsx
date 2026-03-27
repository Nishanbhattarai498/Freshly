import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, KeyboardAvoidingView, Platform, Alert, ScrollView, ActivityIndicator, useColorScheme } from 'react-native';
import { useSignUp, useUser } from '@clerk/clerk-expo';
import { useRouter } from 'expo-router';
import { Mail, Lock, Key, User } from 'lucide-react-native';
import * as Location from 'expo-location';
import InputField from '../../components/ui/InputField';
import Button from '../../components/ui/Button';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const getClerkErrorMessage = (err: unknown, fallback: string): string => {
  const maybeErr = err as { errors?: { message?: string }[]; message?: string };
  return maybeErr?.errors?.[0]?.message || maybeErr?.message || fallback;
};

export default function SignUp() {
  const { isLoaded, signUp, setActive } = useSignUp();
  const { isLoaded: userLoaded, isSignedIn, user } = useUser();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const insets = useSafeAreaInsets();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [userPassword, setUserPassword] = useState('');
  const [role, setRole] = useState('CUSTOMER');
  const [verifyMode, setVerifyMode] = useState(false);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isLoaded && userLoaded && isSignedIn) {
      router.replace("/(tabs)/home");
    }
  }, [isLoaded, userLoaded, isSignedIn, user, router]);

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
    if (!signUp) {
      Alert.alert('Sign up unavailable', 'Authentication service is still loading. Please try again.');
      return;
    }

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
    } catch (err: unknown) {
      console.error(err);
      Alert.alert('Sign Up Failed', getClerkErrorMessage(err, 'Try again'));
    } finally {
      setLoading(false);
    }
  };

  const onPressVerify = async () => {
    if (!signUp || !setActive) {
      Alert.alert('Verification unavailable', 'Authentication service is still loading. Please try again.');
      return;
    }

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
      keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top + 8 : 0}
      style={{
        flex: 1,
        backgroundColor: isDark ? '#0b1220' : '#f8fafc',
      }}
    >
      <LinearGradient
        colors={isDark ? ['#0b1220', '#052e2b'] : ['#e6fffb', '#dbeafe']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: 'center',
            padding: 24,
          }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
        >
        {/* Logo Section */}
        <View style={{ alignItems: 'center', marginBottom: 22 }}>
          <View
            style={{
              width: 72,
              height: 72,
              borderRadius: 36,
              backgroundColor: isDark ? 'rgba(20,184,166,0.2)' : '#ccfbf1',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 10,
            }}
          >
            <Text style={{ fontSize: 32 }}>🍃</Text>
          </View>

          <Text
            style={{
              fontSize: 30,
              fontWeight: '900',
              color: isDark ? '#f8fafc' : '#0f172a',
            }}
          >
            Freshly
          </Text>

          <Text
            style={{
              color: isDark ? '#cbd5e1' : '#475569',
              marginTop: 5,
            }}
          >
            Join the food-saving community.
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
          <Text
            style={{
              fontSize: 24,
              fontWeight: '800',
              marginBottom: 16,
              color: isDark ? '#f8fafc' : '#0f172a',
            }}
          >
            {verifyMode ? 'Verify Email' : 'Create Account'}
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
              onSubmitEditing={onSignUpPress}
              returnKeyType="go"
            />

            {/* Role Selection */}
            <View style={{ marginVertical: 20 }}>
              <Text
                style={{
                  marginBottom: 10,
                  fontWeight: '700',
                  color: isDark ? '#f1f5f9' : '#0f172a',
                }}
              >
                Select Role
              </Text>

              <View style={{ flexDirection: "row", gap: 10 }}>
                <TouchableOpacity
                  style={{
                    flex: 1,
                    padding: 12,
                    borderRadius: 12,
                    backgroundColor:
                      role === "CUSTOMER"
                        ? '#0f766e'
                        : isDark
                          ? '#334155'
                          : '#e2e8f0',
                    alignItems: 'center',
                  }}
                  onPress={() => setRole("CUSTOMER")}
                >
                  <Text style={{ color: role === "CUSTOMER" ? 'white' : (isDark ? '#e2e8f0' : '#111827'), fontWeight: '700' }}>
                    Customer
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={{
                    flex: 1,
                    padding: 12,
                    borderRadius: 12,
                    backgroundColor:
                      role === "SHOPKEEPER"
                        ? '#0ea5e9'
                        : isDark
                          ? '#334155'
                          : '#e2e8f0',
                    alignItems: 'center',
                  }}
                  onPress={() => setRole("SHOPKEEPER")}
                >
                  <Text style={{ color: role === "SHOPKEEPER" ? 'white' : (isDark ? '#e2e8f0' : '#111827'), fontWeight: '700' }}>
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
              onSubmitEditing={onPressVerify}
              returnKeyType="done"
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
            marginTop: 22,
          }}
        >
          <Text style={{ color: isDark ? '#cbd5e1' : '#475569' }}>
            Already have an account?
          </Text>

          <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
            <Text
              style={{
                color: '#0f766e',
                marginLeft: 5,
                fontWeight: '700',
              }}
            >
              Login
            </Text>
          </TouchableOpacity>
        </View>
        </View>
      </ScrollView>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
}