import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, KeyboardAvoidingView, Platform, Alert, ScrollView, ActivityIndicator, useColorScheme } from 'react-native';
import { useSignUp, useUser } from '@clerk/clerk-expo';
import { useRouter } from 'expo-router';
import { Mail, Lock, Key, User, ArrowRight, Store, Users } from 'lucide-react-native';
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
  const { isLoaded: userLoaded, isSignedIn } = useUser();
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
      router.replace('/(tabs)/home');
    }
  }, [isLoaded, userLoaded, isSignedIn, router]);

  if (!isLoaded || !userLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: isDark ? '#07141d' : '#f4f8f6' }}>
        <ActivityIndicator size="large" color="#14b8a6" />
      </View>
    );
  }

  const requestLocationPermission = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Needed', 'Location access is needed to find nearby food items.');
    }
  };

  const onSignUpPress = async () => {
    if (!signUp) {
      Alert.alert('Sign up unavailable', 'Authentication service is still loading. Please try again.');
      return;
    }
    if (!email || !userPassword || !firstName || !lastName) {
      Alert.alert('Missing Fields', 'Please fill all fields.');
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
      const completeSignUp = await signUp.attemptEmailAddressVerification({ code });
      if (completeSignUp.status === 'complete') {
        await setActive({ session: completeSignUp.createdSessionId });
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
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top + 8 : 0}
      style={{ flex: 1, backgroundColor: isDark ? '#07141d' : '#f4f8f6' }}
    >
      <LinearGradient colors={isDark ? ['#07141d', '#0d2225', '#11342e'] : ['#f3fff9', '#daf7eb', '#ddf2ff']} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 22 }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'none'}
        >
          <View style={{ marginBottom: 22 }}>
            <View style={{ width: 72, height: 72, borderRadius: 24, backgroundColor: isDark ? 'rgba(45,212,191,0.12)' : 'rgba(20,184,166,0.12)', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
              <Users size={30} color={isDark ? '#5eead4' : '#0f766e'} />
            </View>
            <Text style={{ color: isDark ? '#99f6e4' : '#0f766e', fontSize: 12, fontWeight: '800', letterSpacing: 2.5 }}>JOIN FRESHLY</Text>
            <Text style={{ fontSize: 34, fontWeight: '900', color: isDark ? '#f8fafc' : '#0f172a', marginTop: 8, lineHeight: 40 }}>
              {verifyMode ? 'Verify your email.' : 'Create an account that feels ready to use.'}
            </Text>
            <Text style={{ color: isDark ? '#b6c4d3' : '#516072', marginTop: 12, fontSize: 16, lineHeight: 24 }}>
              {verifyMode ? 'Enter the latest code from your inbox to activate your account.' : 'Set up your identity once, then start sharing or claiming nearby food in a cleaner experience.'}
            </Text>
          </View>

          <View
            style={{
              backgroundColor: isDark ? 'rgba(8,20,29,0.82)' : 'rgba(255,255,255,0.9)',
              borderRadius: 30,
              borderWidth: 1,
              borderColor: isDark ? 'rgba(148,163,184,0.14)' : 'rgba(15,23,42,0.08)',
              padding: 20,
              shadowColor: '#08111d',
              shadowOpacity: 0.16,
              shadowRadius: 24,
              shadowOffset: { width: 0, height: 14 },
              elevation: 8,
            }}
          >
            {!verifyMode ? (
              <>
                <InputField label="First Name" placeholder="First name" value={firstName} onChangeText={setFirstName} icon={<User size={20} color="#7a8a9d" />} />
                <InputField label="Last Name" placeholder="Last name" value={lastName} onChangeText={setLastName} icon={<User size={20} color="#7a8a9d" />} />
                <InputField label="Email" placeholder="Email" value={email} onChangeText={setEmail} keyboardType="email-address" icon={<Mail size={20} color="#7a8a9d" />} />
                <InputField label="Password" placeholder="Password" value={userPassword} onChangeText={setUserPassword} secureTextEntry icon={<Lock size={20} color="#7a8a9d" />} onSubmitEditing={onSignUpPress} returnKeyType="go" />

                <Text style={{ marginBottom: 10, fontWeight: '800', color: isDark ? '#dce9f4' : '#324253', fontSize: 12, letterSpacing: 1.2, textTransform: 'uppercase' }}>
                  Choose Role
                </Text>
                <View style={{ flexDirection: 'row', gap: 10, marginBottom: 18 }}>
                  {[
                    { key: 'CUSTOMER', label: 'Customer', icon: Users, activeColor: '#0f766e' },
                    { key: 'SHOPKEEPER', label: 'Shopkeeper', icon: Store, activeColor: '#0284c7' },
                  ].map((item) => {
                    const Icon = item.icon;
                    const active = role === item.key;
                    return (
                      <TouchableOpacity
                        key={item.key}
                        onPress={() => setRole(item.key)}
                        style={{
                          flex: 1,
                          padding: 14,
                          borderRadius: 22,
                          backgroundColor: active ? item.activeColor : (isDark ? 'rgba(255,255,255,0.04)' : '#f4faf7'),
                          borderWidth: 1,
                          borderColor: active ? item.activeColor : (isDark ? 'rgba(148,163,184,0.12)' : '#e2ece8'),
                          alignItems: 'center',
                        }}
                      >
                        <Icon size={18} color={active ? '#ffffff' : (isDark ? '#dce9f4' : '#324253')} />
                        <Text style={{ color: active ? '#ffffff' : (isDark ? '#dce9f4' : '#324253'), fontWeight: '800', marginTop: 8 }}>
                          {item.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <Button label={loading ? 'Creating Account...' : 'Sign Up'} onPress={onSignUpPress} disabled={loading} iconRight={<ArrowRight size={18} color="#ffffff" />} />
              </>
            ) : (
              <>
                <InputField label="Verification Code" placeholder="Enter verification code" value={code} onChangeText={setCode} keyboardType="number-pad" icon={<Key size={20} color="#7a8a9d" />} onSubmitEditing={onPressVerify} returnKeyType="done" />
                <Button label={loading ? 'Verifying...' : 'Verify Email'} onPress={onPressVerify} disabled={loading} />
              </>
            )}

            <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 22 }}>
              <Text style={{ color: isDark ? '#b6c4d3' : '#516072' }}>Already have an account?</Text>
              <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
                <Text style={{ color: '#0f766e', marginLeft: 6, fontWeight: '800' }}>Login</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
}
