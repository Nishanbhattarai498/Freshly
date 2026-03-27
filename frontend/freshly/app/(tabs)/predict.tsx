import React, { useMemo, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { FlaskConical, Sparkles } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import { api } from '../../services/api';
import { LinearGradient } from 'expo-linear-gradient';
import InputField from '../../components/ui/InputField';
import Button from '../../components/ui/Button';

type PredictionResponse = {
  prediction: 'Good' | 'Bad';
  prediction_code: 0 | 1;
  probability?: {
    bad: number;
    good: number;
  } | null;
};

type PredictPayload = {
  name: string;
  temp: number;
  humidity: number;
  light: number;
  co2: number;
};

const getErrorMessage = (e: unknown, fallback: string) => {
  const err = e as { response?: { data?: { error?: string } }; message?: string };
  return err?.response?.data?.error || err?.message || fallback;
};

export default function PredictScreen() {
  const { colorScheme } = useColorScheme();
  const [name, setName] = useState('Orange');
  const [temp, setTemp] = useState('23');
  const [humidity, setHumidity] = useState('95');
  const [light, setLight] = useState('8');
  const [co2, setCo2] = useState('350');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PredictionResponse | null>(null);
  const [error, setError] = useState('');

  const isDark = colorScheme === 'dark';

  const parseNumber = (value: string): number | null => {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  };

  const handlePredict = async () => {
    const payload = {
      name: name.trim(),
      temp: parseNumber(temp),
      humidity: parseNumber(humidity),
      light: parseNumber(light),
      co2: parseNumber(co2),
    };

    if (!payload.name || payload.temp === null || payload.humidity === null || payload.light === null || payload.co2 === null) {
      setError('Please enter valid values for all fields.');
      setResult(null);
      return;
    }

    const validPayload: PredictPayload = {
      name: payload.name,
      temp: payload.temp,
      humidity: payload.humidity,
      light: payload.light,
      co2: payload.co2,
    };

    setLoading(true);
    setError('');

    try {
      const response = await api.post<PredictionResponse>('/ml/predict', validPayload);
      setResult(response.data);
    } catch (e) {
      setError(getErrorMessage(e, 'Prediction failed'));
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  const confidenceText = useMemo(() => {
    if (!result?.probability) return null;
    const bad = Number(result.probability.bad || 0);
    const good = Number(result.probability.good || 0);
    const maxVal = Math.max(bad, good);
    return `${(maxVal * 100).toFixed(1)}%`;
  }, [result]);

  return (
    <View className="flex-1 bg-white dark:bg-gray-950">
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        <LinearGradient
          colors={isDark ? ['#0b1220', '#052e2b'] : ['#ccfbf1', '#dbeafe']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          className="px-6 pt-14 pb-9 rounded-b-3xl"
        >
          <View className="flex-row items-center">
            <View className="w-11 h-11 rounded-2xl bg-white/30 items-center justify-center mr-3">
              <FlaskConical size={20} color={isDark ? '#d1fae5' : '#065f46'} />
            </View>
            <View>
              <Text className="text-2xl font-extrabold text-gray-900 dark:text-white">Freshness Predictor</Text>
              <Text className="text-sm text-gray-700 dark:text-gray-200">AI estimate using sensor-style inputs</Text>
            </View>
          </View>
        </LinearGradient>

        <View className="px-6 mt-6">
          <View className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 p-5 shadow-sm">
            <InputField label="Food name" value={name} onChangeText={setName} placeholder="Orange" helperText="Use the same naming style as your training data." />
            <InputField label="Temperature" value={temp} onChangeText={setTemp} placeholder="23" keyboardType="numeric" />
            <InputField label="Humidity (%)" value={humidity} onChangeText={setHumidity} placeholder="95" keyboardType="numeric" />
            <InputField label="Light" value={light} onChangeText={setLight} placeholder="8" keyboardType="numeric" />
            <InputField label="CO2" value={co2} onChangeText={setCo2} placeholder="350" keyboardType="numeric" />

            <Button
              label={loading ? 'Predicting...' : 'Predict Condition'}
              onPress={handlePredict}
              loading={loading}
              iconRight={!loading ? <Sparkles size={16} color="#ffffff" /> : undefined}
            />
          </View>

          {error ? (
            <View className="mt-4 p-4 rounded-2xl border border-rose-200 bg-rose-50 dark:bg-rose-900/20 dark:border-rose-700">
              <Text style={{ color: '#b91c1c', fontWeight: '700' }}>{error}</Text>
            </View>
          ) : null}

          {result ? (
            <View className="mt-5 p-5 rounded-3xl border border-emerald-200 bg-emerald-50 dark:bg-emerald-900/20 dark:border-emerald-700">
              <Text className="text-xs uppercase tracking-[1.8px] text-emerald-800 dark:text-emerald-200 font-bold">Model Output</Text>
              <Text className="text-4xl font-black mt-1 text-emerald-900 dark:text-emerald-100">{result.prediction}</Text>
              {confidenceText ? (
                <Text className="mt-2 text-base text-emerald-900 dark:text-emerald-200 font-semibold">Confidence: {confidenceText}</Text>
              ) : null}
              {result?.probability ? (
                <Text className="mt-1 text-sm text-emerald-900 dark:text-emerald-200">
                  P(good): {(Number(result.probability.good || 0) * 100).toFixed(1)}% | P(bad): {(Number(result.probability.bad || 0) * 100).toFixed(1)}%
                </Text>
              ) : null}
            </View>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}
