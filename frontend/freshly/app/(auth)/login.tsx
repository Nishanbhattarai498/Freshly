import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Platform, ActivityIndicator, Alert, useColorScheme } from 'react-native';
import { useSignIn, useUser } from '@clerk/clerk-expo';
import { useRouter } from 'expo-router';
import { Mail, Lock, ArrowRight, Key, Sparkles, ShieldCheck } from 'lucide-react-native';
import InputField from '../../components/ui/InputField';
import Button from '../../components/ui/Button';
import * as Location from 'expo-location';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const getClerkErrorMessage = (err: unknown, fallback: string): string => {
  const maybeErr = err as { errors?: { message?: string }[]; message?: string };
  return maybeErr?.errors?.[0]?.message || maybeErr?.message || fallback;
};

const getStatusMessage = (status?: string) => {
  switch (status) {
    case 'needs_first_factor':
      return 'Your account needs an email verification code before sign-in can finish.';
    case 'needs_second_factor':
      return 'Your account requires another verification step that this app does not support yet.';
    case 'needs_new_password':
      return 'Clerk is asking for a new password before sign-in can continue.';
    case 'complete':
      return 'Login complete.';
    default:
      return 'Authentication needs an extra step before sign-in can continue.';
  }
};

export default function Login() {
  const { signIn, setActive, isLoaded } = useSignIn();
  const { isLoaded: userLoaded, isSignedIn, user } = useUser();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const insets = useSafeAreaInsets();

  const [email, setEmail] = useState('');
  const [userPassword, setUserPassword] = useState('');
  const [verifyMode, setVerifyMode] = useState(false);
  const [secondFactorMode, setSecondFactorMode] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [secondFactorCode, setSecondFactorCode] = useState('');
  const [secondFactorStrategy, setSecondFactorStrategy] = useState<'totp' | 'backup_code' | 'email_code' | 'phone_code'>('totp');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!userLoaded) return;
    if (isSignedIn && user) {
      router.replace('/(tabs)/home');
    }
  }, [userLoaded, isSignedIn, user, router]);

  const requestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Location helps us suggest nearby storage conditions.');
      }
    } catch (error) {
      console.log('Permission error:', error);
    }
  };

  const onSignInPress = async () => {
    if (!signIn || !setActive) {
      Alert.alert('Login unavailable', 'Authentication service is still loading. Please try again.');
      return;
    }
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedPassword = userPassword.trim();

    if (!normalizedEmail || !normalizedPassword) {
      Alert.alert('Missing Fields', 'Please enter email and password.');
      return;
    }

    setLoading(true);
    try {
      const result = await signIn.create({ identifier: normalizedEmail, password: normalizedPassword });

      if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId });
        router.replace('/(tabs)/home');
        await requestLocationPermission();
      } else if (result.status === 'needs_first_factor') {
        setSecondFactorMode(false);
        const emailFactor = result.supportedFirstFactors?.find((factor) => factor.strategy === 'email_code');

        if (emailFactor && 'emailAddressId' in emailFactor && emailFactor.emailAddressId) {
          await signIn.prepareFirstFactor({
            strategy: 'email_code',
            emailAddressId: emailFactor.emailAddressId,
          });
        }
        setVerifyMode(true);
        Alert.alert('Verification needed', 'We sent a login code to your email. Enter it to finish signing in.');
      } else if (result.status === 'needs_second_factor') {
        setVerifyMode(false);
        setSecondFactorCode('');
        const preferredFactor =
          result.supportedSecondFactors?.find((factor) => factor.strategy === 'totp') ||
          result.supportedSecondFactors?.find((factor) => factor.strategy === 'email_code') ||
          result.supportedSecondFactors?.find((factor) => factor.strategy === 'phone_code') ||
          result.supportedSecondFactors?.find((factor) => factor.strategy === 'backup_code');

        const strategy = (preferredFactor?.strategy || 'totp') as 'totp' | 'backup_code' | 'email_code' | 'phone_code';
        setSecondFactorStrategy(strategy);

        if (strategy === 'email_code' && preferredFactor && 'emailAddressId' in preferredFactor && preferredFactor.emailAddressId) {
          await signIn.prepareSecondFactor({ strategy: 'email_code', emailAddressId: preferredFactor.emailAddressId });
        }

        if (strategy === 'phone_code' && preferredFactor && 'phoneNumberId' in preferredFactor && preferredFactor.phoneNumberId) {
          await signIn.prepareSecondFactor({ strategy: 'phone_code', phoneNumberId: preferredFactor.phoneNumberId });
        }

        setSecondFactorMode(true);
        Alert.alert(
          'Second verification needed',
          strategy === 'totp'
            ? 'Enter the 6-digit code from your authenticator app to finish signing in.'
            : strategy === 'backup_code'
              ? 'Enter one of your backup codes to finish signing in.'
              : 'We sent a second verification code. Enter it to finish signing in.'
        );
      } else {
        Alert.alert('Login step required', getStatusMessage(result.status ?? undefined));
      }
    } catch (err: unknown) {
      Alert.alert('Login Failed', getClerkErrorMessage(err, 'Something went wrong'));
    } finally {
      setLoading(false);
    }
  };

  const handleVerification = async () => {
    if (!signIn || !setActive) {
      Alert.alert('Verification unavailable', 'Authentication service is still loading. Please try again.');
      return;
    }
    if (!verificationCode) {
      Alert.alert('Missing Code', 'Enter the verification code.');
      return;
    }

    setLoading(true);
    try {
      const result = await signIn.attemptFirstFactor({
        strategy: 'email_code',
        code: verificationCode,
      });

      if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId });
        router.replace('/(tabs)/home');
        await requestLocationPermission();
      }
    } catch (err: unknown) {
      Alert.alert('Invalid Code', getClerkErrorMessage(err, 'Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  const handleSecondFactorVerification = async () => {
    if (!signIn || !setActive) {
      Alert.alert('Verification unavailable', 'Authentication service is still loading. Please try again.');
      return;
    }

    if (!secondFactorCode.trim()) {
      Alert.alert('Missing Code', 'Enter your second verification code.');
      return;
    }

    setLoading(true);
    try {
      const result = await signIn.attemptSecondFactor({
        strategy: secondFactorStrategy,
        code: secondFactorCode.trim(),
      });

      if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId });
        router.replace('/(tabs)/home');
        await requestLocationPermission();
      } else {
        Alert.alert('Verification step required', getStatusMessage(result.status ?? undefined));
      }
    } catch (err: unknown) {
      Alert.alert('Verification Failed', getClerkErrorMessage(err, 'Please try your verification code again.'));
    } finally {
      setLoading(false);
    }
  };

  const onResendPress = async () => {
    if (!isLoaded || !signIn) return;
    setLoading(true);
    try {
      const emailFactor = signIn.supportedFirstFactors?.find((f) => f.strategy === 'email_code');
      if (!emailFactor) throw new Error('Email factor not found');

      const factor = emailFactor as { strategy: 'email_code'; emailAddressId: string };
      await signIn.prepareFirstFactor({ strategy: 'email_code', emailAddressId: factor.emailAddressId });
      Alert.alert('Code Resent', 'A new verification code has been sent to your email.');
    } catch (err) {
      console.log('Resend error:', err);
      Alert.alert('Error', getClerkErrorMessage(err, 'Failed to resend code.'));
    } finally {
      setLoading(false);
    }
  };

  const onResendSecondFactorPress = async () => {
    if (!isLoaded || !signIn) return;
    if (secondFactorStrategy !== 'email_code' && secondFactorStrategy !== 'phone_code') return;

    setLoading(true);
    try {
      const factor = signIn.supportedSecondFactors?.find((entry) => entry.strategy === secondFactorStrategy);

      if (!factor) {
        throw new Error('Second factor not found');
      }

      if (secondFactorStrategy === 'email_code' && 'emailAddressId' in factor && factor.emailAddressId) {
        await signIn.prepareSecondFactor({ strategy: 'email_code', emailAddressId: factor.emailAddressId });
      } else if (secondFactorStrategy === 'phone_code' && 'phoneNumberId' in factor && factor.phoneNumberId) {
        await signIn.prepareSecondFactor({ strategy: 'phone_code', phoneNumberId: factor.phoneNumberId });
      } else {
        throw new Error('Second factor destination is unavailable');
      }

      Alert.alert('Code Resent', 'A new second-factor code has been sent.');
    } catch (err: unknown) {
      Alert.alert('Resend Failed', getClerkErrorMessage(err, 'Failed to resend code.'));
    } finally {
      setLoading(false);
    }
  };

  if (!isLoaded || !userLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: isDark ? '#07141d' : '#f4f8f6' }}>
        <ActivityIndicator size="large" color="#14b8a6" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: isDark ? '#07141d' : '#f4f8f6' }}>
      <LinearGradient colors={isDark ? ['#07141d', '#0d2225', '#11342e'] : ['#f3fff9', '#daf7eb', '#ddf2ff']} style={{ flex: 1 }}>
        <View
          style={{
            flex: 1,
            paddingTop: Math.max(insets.top + 24, 32),
            paddingBottom: Math.max(insets.bottom + 28, 28),
            paddingHorizontal: 22,
            justifyContent: 'center',
          }}
        >
          <View style={{ marginBottom: 22 }}>
            <View style={{ width: 70, height: 70, borderRadius: 24, backgroundColor: isDark ? 'rgba(45,212,191,0.12)' : 'rgba(20,184,166,0.12)', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
              <Sparkles size={30} color={isDark ? '#5eead4' : '#0f766e'} />
            </View>
            <Text style={{ color: isDark ? '#99f6e4' : '#0f766e', fontSize: 12, fontWeight: '800', letterSpacing: 2.5 }}>WELCOME BACK</Text>
            <Text style={{ fontSize: 34, fontWeight: '900', color: isDark ? '#f8fafc' : '#0f172a', marginTop: 8, lineHeight: 40 }}>
              {verifyMode ? 'Finish signing in.' : secondFactorMode ? 'Complete your secure sign-in.' : 'Login to your food-saving network.'}
            </Text>
            <Text style={{ color: isDark ? '#b6c4d3' : '#516072', marginTop: 12, fontSize: 16, lineHeight: 24 }}>
              {verifyMode
                ? 'We sent a code to your inbox. Enter it below to continue.'
                : secondFactorMode
                  ? secondFactorStrategy === 'totp'
                    ? 'Open your authenticator app and enter the latest 6-digit code.'
                    : secondFactorStrategy === 'backup_code'
                      ? 'Use one of your saved backup codes to complete sign-in.'
                      : 'Enter the second verification code we just sent you.'
                  : 'Pick up where you left off, browse nearby items, and keep the conversation moving.'}
            </Text>
          </View>

          <View
            style={{
              borderRadius: 30,
              padding: 20,
              backgroundColor: isDark ? 'rgba(8,20,29,0.82)' : 'rgba(255,255,255,0.9)',
              borderWidth: 1,
              borderColor: isDark ? 'rgba(148,163,184,0.14)' : 'rgba(15,23,42,0.08)',
              shadowColor: '#08111d',
              shadowOpacity: 0.16,
              shadowRadius: 24,
              shadowOffset: { width: 0, height: 14 },
              elevation: 8,
            }}
          >
            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 18 }}>
              {[
                { icon: ShieldCheck, text: 'Trusted auth' },
                { icon: Sparkles, text: 'Clean flow' },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <View key={item.text} style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#f4faf7', borderWidth: 1, borderColor: isDark ? 'rgba(148,163,184,0.1)' : '#e2ece8' }}>
                    <Icon size={14} color={isDark ? '#99f6e4' : '#0f766e'} />
                    <Text style={{ marginLeft: 8, color: isDark ? '#dce9f4' : '#324253', fontWeight: '700', fontSize: 12 }}>{item.text}</Text>
                  </View>
                );
              })}
            </View>

            {!verifyMode && !secondFactorMode ? (
              <>
                <InputField label="Email" value={email} onChangeText={setEmail} placeholder="example@mail.com" icon={<Mail size={20} color="#7a8a9d" />} />
                <InputField label="Password" value={userPassword} onChangeText={setUserPassword} placeholder="Enter password" secureTextEntry icon={<Lock size={20} color="#7a8a9d" />} onSubmitEditing={onSignInPress} returnKeyType="go" />
                <Button label="Login" onPress={onSignInPress} loading={loading} iconRight={<ArrowRight size={18} color="#ffffff" />} />
              </>
            ) : verifyMode ? (
              <>
                <InputField label="Verification Code" value={verificationCode} onChangeText={setVerificationCode} placeholder="Enter email code" keyboardType="number-pad" icon={<Key size={20} color="#7a8a9d" />} helperText="Check your email inbox for the latest code." onSubmitEditing={handleVerification} returnKeyType="done" />
                <Button label="Verify Account" onPress={handleVerification} loading={loading} />
                <TouchableOpacity onPress={() => setVerifyMode(false)} style={{ marginTop: 15, alignItems: 'center' }}>
                  <Text style={{ color: isDark ? '#dce9f4' : '#475569', fontWeight: '700' }}>Back to login</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={onResendPress} style={{ marginTop: 10, alignItems: 'center' }}>
                  <Text style={{ color: '#0f766e', fontWeight: '800' }}>Resend code</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <InputField
                  label={secondFactorStrategy === 'backup_code' ? 'Backup Code' : 'Second-Factor Code'}
                  value={secondFactorCode}
                  onChangeText={setSecondFactorCode}
                  placeholder={secondFactorStrategy === 'backup_code' ? 'Enter backup code' : 'Enter verification code'}
                  keyboardType={secondFactorStrategy === 'backup_code' ? 'default' : 'number-pad'}
                  icon={<Key size={20} color="#7a8a9d" />}
                  helperText={
                    secondFactorStrategy === 'totp'
                      ? 'Use the code from Google Authenticator, Authy, or another authenticator app.'
                      : secondFactorStrategy === 'backup_code'
                        ? 'Backup codes are usually one-time recovery codes from your account security settings.'
                        : 'Use the latest code we sent for your second verification step.'
                  }
                  onSubmitEditing={handleSecondFactorVerification}
                  returnKeyType="done"
                />
                <Button
                  label={secondFactorStrategy === 'backup_code' ? 'Use Backup Code' : 'Verify & Login'}
                  onPress={handleSecondFactorVerification}
                  loading={loading}
                />
                {secondFactorStrategy === 'totp' ? (
                  <TouchableOpacity onPress={() => setSecondFactorStrategy('backup_code')} style={{ marginTop: 15, alignItems: 'center' }}>
                    <Text style={{ color: '#0f766e', fontWeight: '800' }}>Use backup code instead</Text>
                  </TouchableOpacity>
                ) : null}
                {(secondFactorStrategy === 'email_code' || secondFactorStrategy === 'phone_code') ? (
                  <TouchableOpacity onPress={onResendSecondFactorPress} style={{ marginTop: 12, alignItems: 'center' }}>
                    <Text style={{ color: '#0f766e', fontWeight: '800' }}>Resend second-factor code</Text>
                  </TouchableOpacity>
                ) : null}
                <TouchableOpacity
                  onPress={() => {
                    setSecondFactorMode(false);
                    setSecondFactorCode('');
                  }}
                  style={{ marginTop: 14, alignItems: 'center' }}
                >
                  <Text style={{ color: isDark ? '#dce9f4' : '#475569', fontWeight: '700' }}>Back to login</Text>
                </TouchableOpacity>
              </>
            )}

            <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 20 }}>
              <Text style={{ color: isDark ? '#b6c4d3' : '#516072' }}>New here?</Text>
              <TouchableOpacity onPress={() => router.push('/(auth)/signup')}>
                <Text style={{ color: '#0f766e', fontWeight: '800', marginLeft: 6 }}>Create account</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </LinearGradient>
    </View>
  );
}
