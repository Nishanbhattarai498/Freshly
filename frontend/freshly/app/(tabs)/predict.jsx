import React, { useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { FlaskConical } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import { api } from '../../services/api';

export default function PredictScreen() {
  const { colorScheme } = useColorScheme();
  const [name, setName] = useState('Orange');
  const [temp, setTemp] = useState('23');
  const [humidity, setHumidity] = useState('95');
  const [light, setLight] = useState('8');
  const [co2, setCo2] = useState('350');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const isDark = colorScheme === 'dark';

  const parseNumber = (value) => {
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

    setLoading(true);
    setError('');

    try {
      const response = await api.post('/ml/predict', payload);
      setResult(response.data);
    } catch (e) {
      setError(e?.response?.data?.error || e?.message || 'Prediction failed');
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
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 120 }}>
        <View className="flex-row items-center mt-10 mb-4">
          <FlaskConical size={20} color={isDark ? '#a7f3d0' : '#065f46'} />
          <Text className="ml-2 text-xl font-bold text-gray-900 dark:text-white">Food Condition Predictor</Text>
        </View>

        <Text className="text-gray-600 dark:text-gray-300 mb-5">
          Uses trained ML model with all features: name, temperature, humidity, light, and CO2.
        </Text>

        <InputField label="Food name" value={name} onChangeText={setName} placeholder="Orange" />
        <InputField label="Temperature" value={temp} onChangeText={setTemp} placeholder="23" keyboardType="numeric" />
        <InputField label="Humidity (%)" value={humidity} onChangeText={setHumidity} placeholder="95" keyboardType="numeric" />
        <InputField label="Light" value={light} onChangeText={setLight} placeholder="8" keyboardType="numeric" />
        <InputField label="CO2" value={co2} onChangeText={setCo2} placeholder="350" keyboardType="numeric" />

        <TouchableOpacity
          onPress={handlePredict}
          className="rounded-xl mt-3 px-4 py-4 items-center"
          style={{ backgroundColor: '#065f46' }}
        >
          {loading ? <ActivityIndicator color="#fff" /> : <Text className="text-white font-bold">Predict Condition</Text>}
        </TouchableOpacity>

        {error ? (
          <View className="mt-4 p-3 rounded-xl" style={{ backgroundColor: '#fef2f2' }}>
            <Text style={{ color: '#b91c1c', fontWeight: '600' }}>{error}</Text>
          </View>
        ) : null}

        {result ? (
          <View className="mt-5 p-4 rounded-2xl border border-emerald-200 bg-emerald-50 dark:bg-emerald-900/20 dark:border-emerald-700">
            <Text className="text-xs uppercase tracking-[1.5px] text-emerald-800 dark:text-emerald-200">Model Output</Text>
            <Text className="text-3xl font-black mt-1 text-emerald-900 dark:text-emerald-100">{result.prediction}</Text>
            {confidenceText ? (
              <Text className="mt-2 text-sm text-emerald-900 dark:text-emerald-200">Confidence: {confidenceText}</Text>
            ) : null}
            {result?.probability ? (
              <Text className="mt-1 text-sm text-emerald-900 dark:text-emerald-200">
                P(good): {(Number(result.probability.good || 0) * 100).toFixed(1)}% | P(bad): {(Number(result.probability.bad || 0) * 100).toFixed(1)}%
              </Text>
            ) : null}
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

function InputField({ label, ...props }) {
  return (
    <View className="mb-3">
      <Text className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">{label}</Text>
      <TextInput
        {...props}
        className="rounded-xl border border-gray-300 dark:border-gray-700 px-3 py-3 text-base text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-900"
        placeholderTextColor="#9ca3af"
      />
    </View>
  );
}
