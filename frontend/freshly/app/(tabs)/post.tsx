import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, KeyboardAvoidingView, Platform, Image, Modal, Pressable, FlatList } from 'react-native';
import { useStore } from '../../store/index';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import { Calendar, MapPin, Package, Type, Scale, Check, Camera } from 'lucide-react-native';
import { CURRENCIES, getCurrencySymbol } from '../../utils/currencies';
import { useColorScheme } from 'nativewind';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import InputField from '../../components/ui/InputField';
import Button from '../../components/ui/Button';
import { StatusPopup } from '../../components/ui/States';

type PostStatus = {
  type: 'success' | 'error' | 'info';
  title: string;
  description?: string;
  onConfirm?: () => void;
};

type ApiErrorLike = {
  response?: {
    data?: {
      error?: string;
    };
  };
  message?: string;
};

const PRESET_IMAGES = [
  { id: 'veg', url: 'https://images.unsplash.com/photo-1566385101042-1a0aa0c1268c?w=800', label: 'Vegetables' },
  { id: 'fruit', url: 'https://images.unsplash.com/photo-1619566636858-adf3ef46400b?w=800', label: 'Fruits' },
  { id: 'bakery', url: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800', label: 'Bakery' },
  { id: 'meals', url: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800', label: 'Meals' },
  { id: 'dairy', url: 'https://images.unsplash.com/photo-1628088062854-d1870b4553da?w=800', label: 'Dairy' },
  { id: 'other', url: 'https://images.unsplash.com/photo-1506617420156-8e4536971650?w=800', label: 'Other' },
];

export default function PostItem() {
  const { createItem, isLoading } = useStore();
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const insets = useSafeAreaInsets();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState('pcs');
  const [originalPrice, setOriginalPrice] = useState('');
  const [discountedPrice, setDiscountedPrice] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [showCurrencyModal, setShowCurrencyModal] = useState(false);
  const [currencyQuery, setCurrencyQuery] = useState('');
  const [expiryDate, setExpiryDate] = useState(new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0]); // Default 2 days
  const [imageUrl, setImageUrl] = useState(PRESET_IMAGES[0].url);
  const [category, setCategory] = useState('Vegetables');
  const [isCustomImage, setIsCustomImage] = useState(false);
  const [status, setStatus] = useState<PostStatus | null>(null);

  const quickExpiry = [1, 2, 3, 5];
  const quickDiscounts = [25, 50, 75];

  const CATEGORIES = ['Vegetables', 'Fruits', 'Bakery', 'Meals', 'Dairy', 'Other'];

  const pickImage = async () => {
    Alert.alert('Select Image', 'Choose an option', [
      {
        text: 'Camera',
        onPress: async () => {
          const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
          if (permissionResult.granted === false) {
            Alert.alert('Permission to access camera is required!');
            return;
          }
          const result = await ImagePicker.launchCameraAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.5,
            base64: true,
          });
          if (!result.canceled) {
            setImageUrl(`data:image/jpeg;base64,${result.assets[0].base64}`);
            setIsCustomImage(true);
          }
        },
      },
      {
        text: 'Gallery',
        onPress: async () => {
          const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.5,
            base64: true,
          });
          if (!result.canceled) {
            setImageUrl(`data:image/jpeg;base64,${result.assets[0].base64}`);
            setIsCustomImage(true);
          }
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };
  const handleSubmit = async () => {
    if (!title || !quantity) {
      setStatus({ type: 'error', title: 'Missing info', description: 'Add a title and quantity to post your item.' });
      return;
    }

    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') {
        setStatus({ type: 'error', title: 'Location needed', description: 'Enable location to share with nearby users.' });
        return;
      }

      let location: Location.LocationObject;
      try {
        const fallbackKnown = await Location.getLastKnownPositionAsync({});
        if (fallbackKnown) {
          location = fallbackKnown;
        } else {
          location = await Promise.race([
            Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
            new Promise<Location.LocationObject>((_, reject) => setTimeout(() => reject(new Error('Timeout')), 10000)),
          ]);
        }
      } catch (err) {
        console.log('Location fetch failed or timed out', err);
        location = {
          coords: {
            latitude: 40.7128,
            longitude: -74.0060,
            altitude: 0,
            accuracy: 0,
            altitudeAccuracy: 0,
            heading: 0,
            speed: 0
          },
          timestamp: Date.now()
        };
      }

      let address = 'Unknown Location';
      try {
        const [place] = await Location.reverseGeocodeAsync({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude
        });
        if (place) {
          const addressParts = [
            place.name !== place.street ? place.name : null,
            place.street,
            place.city || place.subregion,
            place.region,
            place.country
          ].filter(Boolean);
          address = addressParts.join(', ') || 'Unknown Location';
        }
      } catch (e) {
        console.log('Geocoding failed', e);
        address = `Lat: ${location.coords.latitude.toFixed(4)}, Long: ${location.coords.longitude.toFixed(4)}`;
      }

      await createItem({
        title,
        description,
        quantity: parseInt(quantity),
        unit,
        expiryDate: new Date(expiryDate).toISOString(),
        imageUrl,
        category,
        originalPrice: originalPrice ? parseFloat(originalPrice) : undefined,
        discountedPrice: discountedPrice ? parseFloat(discountedPrice) : undefined,
        priceCurrency: currency,
        location: {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          address
        }
      });

      setStatus({
        type: 'success',
        title: 'Item posted',
        description: 'Your item is live. We’ll show it to nearby users.',
        onConfirm: () => router.push('/(tabs)/home'),
      });

      setTitle('');
      setDescription('');
      setQuantity('');
      setOriginalPrice('');
      setDiscountedPrice('');
      setCurrency('USD');
    } catch (error: unknown) {
      console.error('Create Item Error:', error);
      const typedError = error as ApiErrorLike;
      const serverMessage = typedError.response?.data?.error || typedError.message;
      setStatus({ type: 'error', title: 'Post failed', description: serverMessage || 'Please try again.' });
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top + 8 : 0}
      className="flex-1 bg-white dark:bg-gray-900"
    >
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 180 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
      >
        <LinearGradient colors={['#0ea5e9', '#22c55e']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} className="px-6 pt-14 pb-10 rounded-b-3xl">
          <Text className="text-3xl font-extrabold text-white mb-2 leading-tight">Share Food</Text>
          <Text className="text-white/90 text-base leading-6">Keep good food in circulation. Add a clear title, photo, and pickup window.</Text>
        </LinearGradient>

        <View className="px-6 mt-6 space-y-6">
            {/* Image Preview */}
            <View className="w-full h-48 bg-gray-50 dark:bg-gray-900 rounded-2xl overflow-hidden shadow-sm border border-gray-200 dark:border-gray-700 relative">
                <Image source={{ uri: imageUrl }} className="w-full h-full" resizeMode="cover" />
                <View className="absolute bottom-0 w-full bg-black/40 p-2">
                    <Text className="text-white text-center font-medium">
                      {isCustomImage ? 'Custom Image Selected' : 'Selected Image'}
                    </Text>
                </View>
                <TouchableOpacity 
                  onPress={pickImage}
                  className="absolute top-2 right-2 bg-black/50 p-2 rounded-full"
                >
                  <Camera size={20} color="white" />
                </TouchableOpacity>
            </View>

            {/* Image Selection */}
            <View>
                <View className="flex-row justify-between items-center mb-3">

          <StatusPopup
            visible={!!status}
            type={status?.type || 'success'}
            title={status?.title || ''}
            description={status?.description}
            primaryLabel={status?.type === 'success' ? 'Great' : 'Dismiss'}
            onPrimary={() => {
              status?.onConfirm?.();
              setStatus(null);
            }}
            secondaryLabel={status?.type === 'success' ? undefined : 'Retry'}
            onSecondary={() => setStatus(null)}
          />
                  <Text className="text-gray-700 dark:text-gray-300 font-bold ml-1">Choose Image</Text>
                  <TouchableOpacity onPress={pickImage} className="flex-row items-center">
                    <Camera size={16} color="#22c55e" />
                    <Text className="text-green-600 dark:text-green-400 font-bold ml-1">Take Photo</Text>
                  </TouchableOpacity>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row pb-2">
                    {PRESET_IMAGES.map((img) => (
                        <TouchableOpacity 
                            key={img.id} 
                            onPress={() => {
                              setImageUrl(img.url);
                              setIsCustomImage(false);
                            }}
                            className={`relative rounded-xl overflow-hidden w-20 h-20 mr-3 border-2 ${imageUrl === img.url && !isCustomImage ? 'border-green-500' : 'border-transparent'}`}
                        >
                            <Image source={{ uri: img.url }} className="w-full h-full" resizeMode="cover" />
                            {imageUrl === img.url && !isCustomImage && (
                                <View className="absolute inset-0 bg-green-500/20 items-center justify-center">
                                    <View className="bg-green-500 rounded-full p-1">
                                        <Check size={12} color="white" />
                                    </View>
                                </View>
                            )}
                            <View className="absolute bottom-0 w-full bg-black/50 p-0.5">
                                <Text className="text-white text-[10px] text-center font-medium" numberOfLines={1}>{img.label}</Text>
                            </View>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            {/* Category */}
            <View>
              <Text className="text-gray-700 dark:text-gray-300 font-bold mb-2 ml-1">Category</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {CATEGORIES.map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    onPress={() => setCategory(cat)}
                    className={`mr-3 px-5 py-3 rounded-xl border ${
                      category === cat 
                        ? 'bg-green-600 border-green-600' 
                        : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                    }`}
                  >
                    <Text 
                      className={`font-bold ${
                        category === cat 
                          ? 'text-white' 
                          : 'text-gray-600 dark:text-gray-300'
                      }`}
                    >
                      {cat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Title */}
            <InputField
              label="Title"
              icon={<Type size={20} color="#6b7280" />}
              value={title}
              onChangeText={setTitle}
              placeholder="e.g., Fresh Sourdough Bread"
              helperText="Be specific (e.g., “4 croissants”)"
            />

            {/* Description */}
            <View>
              <View className="flex-row items-center justify-between mb-2">
                <Text className="text-gray-700 dark:text-gray-300 font-bold ml-1">Description</Text>
                <View className="flex-row">
                  {['Fresh', 'Veg', 'Halal'].map((tag) => (
                    <Text key={tag} className="px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-[11px] text-gray-600 dark:text-gray-300 ml-1">{tag}</Text>
                  ))}
                </View>
              </View>
              <InputField
                multiline
                icon={<Type size={20} color="#6b7280" />}
                value={description}
                onChangeText={setDescription}
                placeholder="Add details about condition, pickup instructions..."
                containerClassName="min-h-[120px]"
              />
            </View>

            {/* Quantity & Unit Row */}
            <View className="flex-row space-x-4">
                <View className="flex-1 mr-2">
                <InputField
                  label="Quantity"
                  icon={<Package size={20} color="#6b7280" />}
                  value={quantity}
                  onChangeText={setQuantity}
                  placeholder="0"
                  keyboardType="numeric"
                />
                </View>
                <View className="flex-1 ml-2">
                    <Text className="text-gray-700 dark:text-gray-300 font-bold mb-2 ml-1">Unit</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-ml-1">
                      {['pcs', 'kg', 'bunch', 'box'].map((u) => (
                        <TouchableOpacity
                          key={u}
                          onPress={() => setUnit(u)}
                          className={`mr-2 px-4 py-3 rounded-xl border ${
                            unit === u
                              ? 'bg-green-600 border-green-600'
                              : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                          }`}
                        >
                          <Text className={`font-bold ${unit === u ? 'text-white' : 'text-gray-700 dark:text-gray-200'}`}>{u}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                </View>
            </View>

            {/* Price & Discount Row */}
            <View className="flex-row space-x-4">
                <View className="flex-1 mr-2">
                    <InputField
                      label="Original Price"
                      icon={<Scale size={20} color="#6b7280" />}
                      value={originalPrice}
                      onChangeText={setOriginalPrice}
                      placeholder="0.00"
                      keyboardType="numeric"
                      rightElement={
                        <TouchableOpacity
                          onPress={() => setShowCurrencyModal(true)}
                          className="px-2 py-1 rounded-md bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600"
                        >
                          <Text className="font-bold text-gray-800 dark:text-gray-100">{getCurrencySymbol(currency)} {currency}</Text>
                        </TouchableOpacity>
                      }
                    />
                </View>
                <View className="flex-1 ml-2">
                    <InputField
                      label="Discounted Price"
                      icon={<Scale size={20} color="#6b7280" />}
                      value={discountedPrice}
                      onChangeText={setDiscountedPrice}
                      placeholder="0.00"
                      keyboardType="numeric"
                      rightElement={
                        <TouchableOpacity
                          onPress={() => setShowCurrencyModal(true)}
                          className="px-2 py-1 rounded-md bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600"
                        >
                          <Text className="font-bold text-gray-800 dark:text-gray-100">{getCurrencySymbol(currency)} {currency}</Text>
                        </TouchableOpacity>
                      }
                    />
                </View>
            </View>

            {/* Quick discount chips */}
            <View>
              <Text className="text-gray-700 dark:text-gray-300 font-bold mb-2 ml-1">Quick discounts</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-ml-1">
                {quickDiscounts.map((pct) => (
                  <TouchableOpacity
                    key={pct}
                    onPress={() => {
                      if (!originalPrice) return;
                      const base = parseFloat(originalPrice);
                      if (Number.isNaN(base)) return;
                      const discounted = base * (1 - pct / 100);
                      setDiscountedPrice(discounted.toFixed(2));
                    }}
                    className="mr-2 px-4 py-3 rounded-xl border bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                  >
                    <Text className="font-bold text-gray-700 dark:text-gray-200">-{pct}%</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <Text className="text-xs text-gray-500 dark:text-gray-400 mt-1">Tap a percentage to auto-fill discounted price.</Text>
            </View>

            {/* Expiry Date */}
            <View>
              <InputField
                label="Best Before"
                icon={<Calendar size={20} color="#6b7280" />}
                value={expiryDate}
                onChangeText={setExpiryDate}
                placeholder="YYYY-MM-DD"
              />
                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-2 -ml-1">
                  {quickExpiry.map((days) => {
                    const target = new Date(Date.now() + 86400000 * days).toISOString().split('T')[0];
                    return (
                      <TouchableOpacity
                        key={days}
                        onPress={() => setExpiryDate(target)}
                        className={`mr-2 px-4 py-3 rounded-xl border ${
                          expiryDate === target
                            ? 'bg-green-600 border-green-600'
                            : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                        }`}
                      >
                        <Text className={`font-bold ${expiryDate === target ? 'text-white' : 'text-gray-700 dark:text-gray-200'}`}>{days}d</Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
            </View>
            
            {/* Location Hint */}
            <View className="flex-row items-center bg-blue-50 dark:bg-blue-900/30 p-4 rounded-xl">
                <MapPin size={20} color="#3b82f6" />
                <Text className="ml-3 text-blue-700 dark:text-blue-300 font-medium flex-1">
                    Your location will be added automatically when you post.
                </Text>
            </View>
        </View>
      </ScrollView>

      {showCurrencyModal && (
        <Modal transparent animationType="slide" visible={showCurrencyModal} onRequestClose={() => setShowCurrencyModal(false)}>
          <Pressable
            className="flex-1"
            style={{ backgroundColor: colorScheme === 'dark' ? 'rgba(0,0,0,0.7)' : 'rgba(0,0,0,0.35)' }}
            onPress={() => setShowCurrencyModal(false)}
          >
            <View className={`absolute bottom-0 left-0 right-0 rounded-t-3xl p-4 max-h-96 ${colorScheme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}>
              <View className="flex-row items-center justify-between mb-3">
                <Text className={`${colorScheme === 'dark' ? 'text-white' : 'text-gray-900'} text-lg font-bold`}>Select Currency</Text>
                <TouchableOpacity onPress={() => setShowCurrencyModal(false)} className="px-3 py-1 rounded-md">
                  <Text className={`${colorScheme === 'dark' ? 'text-gray-200' : 'text-gray-600'}`}>Close</Text>
                </TouchableOpacity>
              </View>

              <View className="mb-3">
                <TextInput
                  value={currencyQuery}
                  onChangeText={setCurrencyQuery}
                  placeholder="Search currency code or name"
                  placeholderTextColor={colorScheme === 'dark' ? '#9ca3af' : '#6b7280'}
                  className={`${colorScheme === 'dark' ? 'bg-gray-700 text-gray-100' : 'bg-gray-100 text-gray-900'} rounded-md px-3 py-2 border ${colorScheme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              <FlatList
                data={CURRENCIES.filter(c => {
                  const q = currencyQuery.trim().toLowerCase();
                  if (!q) return true;
                  return c.code.toLowerCase().includes(q) || c.name.toLowerCase().includes(q) || (c.symbol && c.symbol.toLowerCase().includes(q));
                })}
                keyExtractor={(item) => item.code}
                style={{ maxHeight: 420 }}
                renderItem={({ item: c }) => (
                  <TouchableOpacity
                    onPress={() => { setCurrency(c.code); setShowCurrencyModal(false); setCurrencyQuery(''); }}
                    className={`py-3 flex-row justify-between items-center ${colorScheme === 'dark' ? 'border-b border-gray-700' : 'border-b border-gray-100'}`}
                    activeOpacity={0.7}
                  >
                    <View>
                      <Text className={`${colorScheme === 'dark' ? 'text-gray-100' : 'text-gray-900'} text-base`}>{c.symbol} {c.code} — {c.name}</Text>
                      <Text className={`${colorScheme === 'dark' ? 'text-gray-400' : 'text-gray-500'} text-xs mt-0.5`}>{c.code}</Text>
                    </View>
                    {c.code === currency ? (
                      <View className="bg-green-600 rounded-full p-2">
                        <Text className="text-white text-xs">✓</Text>
                      </View>
                    ) : (
                      <View className={`${colorScheme === 'dark' ? 'bg-gray-700' : 'bg-transparent'} rounded-full p-2`} />
                    )}
                  </TouchableOpacity>
                )}
              />
            </View>
          </Pressable>
        </Modal>
      )}

      <View className="p-6 pb-32 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-lg">
        <Button
          label={isLoading ? 'Posting...' : 'Share Item'}
          onPress={handleSubmit}
          disabled={isLoading}
          loading={isLoading}
        />
      </View>
    </KeyboardAvoidingView>
  );
}