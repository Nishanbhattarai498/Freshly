import React, { useMemo, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, KeyboardAvoidingView, Platform, Image, Modal, Pressable, FlatList } from 'react-native';
import { useStore } from '../../store/index';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import { Calendar, MapPin, Package, Type, Scale, Check, Camera, Sparkles, ArrowUpRight, BadgeDollarSign, Clock3 } from 'lucide-react-native';
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

type ChipProps = {
  label: string;
  selected?: boolean;
  onPress: () => void;
};

type SectionCardProps = {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
};

const PRESET_IMAGES = [
  { id: 'veg', url: 'https://images.unsplash.com/photo-1566385101042-1a0aa0c1268c?w=800', label: 'Vegetables' },
  { id: 'fruit', url: 'https://images.unsplash.com/photo-1619566636858-adf3ef46400b?w=800', label: 'Fruits' },
  { id: 'bakery', url: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800', label: 'Bakery' },
  { id: 'meals', url: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800', label: 'Meals' },
  { id: 'dairy', url: 'https://images.unsplash.com/photo-1628088062854-d1870b4553da?w=800', label: 'Dairy' },
  { id: 'other', url: 'https://images.unsplash.com/photo-1506617420156-8e4536971650?w=800', label: 'Other' },
];

const CATEGORIES = ['Vegetables', 'Fruits', 'Bakery', 'Meals', 'Dairy', 'Other'];
const UNITS = ['pcs', 'kg', 'bunch', 'box'];
const QUICK_EXPIRY = [1, 2, 3, 5];
const QUICK_DISCOUNTS = [25, 50, 75];
const QUICK_TAGS = ['Fresh today', 'Pickup ASAP', 'Best for families'];

const Chip = ({ label, selected = false, onPress }: ChipProps) => (
  <TouchableOpacity
    onPress={onPress}
    activeOpacity={0.9}
    className={`mr-2 mb-2 px-4 py-3 rounded-2xl border ${
      selected
        ? 'bg-emerald-600 border-emerald-600'
        : 'bg-white dark:bg-[#0b1822] border-gray-200 dark:border-white/10'
    }`}
  >
    <Text className={`font-bold text-sm ${selected ? 'text-white' : 'text-gray-700 dark:text-gray-200'}`}>{label}</Text>
  </TouchableOpacity>
);

const SectionCard = ({ title, subtitle, children }: SectionCardProps) => (
  <View className="rounded-[28px] bg-white dark:bg-[#0b1822] border border-gray-200 dark:border-white/10 px-4 py-5 shadow-sm">
    <Text className="text-lg font-extrabold text-gray-900 dark:text-white">{title}</Text>
    {subtitle ? <Text className="text-sm text-gray-500 dark:text-gray-400 mt-1 mb-4">{subtitle}</Text> : <View className="mb-4" />}
    {children}
  </View>
);

export default function PostItem() {
  const { createItem, isLoading } = useStore();
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
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
  const [expiryDate, setExpiryDate] = useState(new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0]);
  const [imageUrl, setImageUrl] = useState(PRESET_IMAGES[0].url);
  const [category, setCategory] = useState('Vegetables');
  const [isCustomImage, setIsCustomImage] = useState(false);
  const [status, setStatus] = useState<PostStatus | null>(null);

  const filteredCurrencies = useMemo(() => {
    const q = currencyQuery.trim().toLowerCase();
    return CURRENCIES.filter((c) => {
      if (!q) return true;
      return c.code.toLowerCase().includes(q) || c.name.toLowerCase().includes(q) || (c.symbol && c.symbol.toLowerCase().includes(q));
    });
  }, [currencyQuery]);

  const pickImage = async () => {
    Alert.alert('Select Image', 'Choose an option', [
      {
        text: 'Camera',
        onPress: async () => {
          const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
          if (!permissionResult.granted) {
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
            longitude: -74.006,
            altitude: 0,
            accuracy: 0,
            altitudeAccuracy: 0,
            heading: 0,
            speed: 0,
          },
          timestamp: Date.now(),
        };
      }

      let address = 'Unknown Location';
      try {
        const [place] = await Location.reverseGeocodeAsync({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });
        if (place) {
          const addressParts = [
            place.name !== place.street ? place.name : null,
            place.street,
            place.city || place.subregion,
            place.region,
            place.country,
          ].filter(Boolean);
          address = addressParts.join(', ') || 'Unknown Location';
        }
      } catch (error) {
        console.log('Geocoding failed', error);
        address = `Lat: ${location.coords.latitude.toFixed(4)}, Long: ${location.coords.longitude.toFixed(4)}`;
      }

      await createItem({
        title,
        description,
        quantity: parseInt(quantity, 10),
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
          address,
        },
      });

      setStatus({
        type: 'success',
        title: 'Item posted',
        description: 'Your listing is live and ready for nearby users.',
        onConfirm: () => router.push('/(tabs)/home'),
      });

      setTitle('');
      setDescription('');
      setQuantity('');
      setOriginalPrice('');
      setDiscountedPrice('');
      setCurrency('USD');
      setExpiryDate(new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0]);
      setImageUrl(PRESET_IMAGES[0].url);
      setCategory('Vegetables');
      setUnit('pcs');
      setIsCustomImage(false);
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
      className="flex-1 bg-[#f4f8f6] dark:bg-[#06131f]"
    >
      <StatusPopup
        visible={!!status}
        type={status?.type || 'success'}
        title={status?.title || ''}
        description={status?.description}
        primaryLabel={status?.type === 'success' ? 'View feed' : 'Dismiss'}
        onPrimary={() => {
          status?.onConfirm?.();
          setStatus(null);
        }}
        secondaryLabel={status?.type === 'success' ? undefined : 'Retry'}
        onSecondary={() => setStatus(null)}
      />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: Math.max(insets.bottom + 260, 280) }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
      >
        <LinearGradient
          colors={isDark ? ['#07141d', '#103127', '#11384a'] : ['#ffffff', '#e6fbef', '#dcefff']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          className="px-6 pt-14 pb-10 rounded-b-[34px]"
        >
          <View className="flex-row items-start justify-between">
            <View className="flex-1 pr-4">
              <Text className="text-xs font-semibold uppercase tracking-[3px] text-emerald-700 dark:text-emerald-300">New Listing</Text>
              <Text className="text-[32px] font-black text-gray-900 dark:text-white mt-2 leading-10">Create a post that looks worth claiming.</Text>
              <Text className="text-gray-600 dark:text-gray-300 text-base leading-6 mt-3">
                Better cover image, clearer details, stronger pricing, and a cleaner publishing flow.
              </Text>
            </View>
            <View className="w-14 h-14 rounded-[20px] bg-white/70 dark:bg-white/10 items-center justify-center border border-white/40 dark:border-white/10">
              <Sparkles size={22} color={isDark ? '#99f6e4' : '#0f766e'} />
            </View>
          </View>

          <View className="flex-row mt-6">
            <View className="flex-1 rounded-[22px] bg-white/70 dark:bg-white/10 px-4 py-3 mr-2 border border-white/40 dark:border-white/10">
              <Text className="text-xs font-semibold uppercase tracking-[1.5px] text-gray-500 dark:text-gray-400">Category</Text>
              <Text className="text-base font-bold text-gray-900 dark:text-white mt-1">{category}</Text>
            </View>
            <View className="flex-1 rounded-[22px] bg-white/70 dark:bg-white/10 px-4 py-3 ml-2 border border-white/40 dark:border-white/10">
              <Text className="text-xs font-semibold uppercase tracking-[1.5px] text-gray-500 dark:text-gray-400">Best Before</Text>
              <Text className="text-base font-bold text-gray-900 dark:text-white mt-1">{expiryDate}</Text>
            </View>
          </View>
        </LinearGradient>

        <View className="px-5 -mt-7">
          <View className="rounded-[30px] overflow-hidden border border-white/50 dark:border-white/10 bg-white dark:bg-[#0b1822] shadow-xl">
            <View className="relative h-64 bg-slate-100 dark:bg-slate-800">
              <Image source={{ uri: imageUrl }} className="w-full h-full" resizeMode="cover" />
              <LinearGradient colors={['transparent', 'rgba(2,6,23,0.7)']} className="absolute inset-0" />

              <View className="absolute left-4 right-4 top-4 flex-row items-center justify-between">
                <View className="px-3 py-2 rounded-full bg-black/45">
                  <Text className="text-white text-xs font-bold uppercase tracking-[1.5px]">
                    {isCustomImage ? 'Custom Photo' : 'Preset Cover'}
                  </Text>
                </View>
                <TouchableOpacity onPress={pickImage} className="w-12 h-12 rounded-full bg-black/45 items-center justify-center">
                  <Camera size={20} color="#ffffff" />
                </TouchableOpacity>
              </View>

              <View className="absolute left-4 right-4 bottom-4">
                <Text className="text-white text-2xl font-black" numberOfLines={1}>
                  {title || 'Your listing preview'}
                </Text>
                <Text className="text-white/85 mt-1" numberOfLines={2}>
                  {description || 'Add a short, useful description so people know what they are claiming.'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        <View className="px-5 mt-5">
          <SectionCard title="Choose a cover" subtitle="Pick something that makes the listing feel fresh and trustworthy.">
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-sm font-semibold text-gray-500 dark:text-gray-400">Preset image library</Text>
              <TouchableOpacity onPress={pickImage} className="px-4 py-2 rounded-full bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800/40">
                <Text className="text-emerald-700 dark:text-emerald-300 font-bold text-sm">Use camera or gallery</Text>
              </TouchableOpacity>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {PRESET_IMAGES.map((img) => {
                const active = imageUrl === img.url && !isCustomImage;
                return (
                  <TouchableOpacity
                    key={img.id}
                    onPress={() => {
                      setImageUrl(img.url);
                      setIsCustomImage(false);
                    }}
                    activeOpacity={0.9}
                    className={`mr-3 w-24 rounded-[22px] overflow-hidden border ${active ? 'border-emerald-500' : 'border-gray-200 dark:border-white/10'}`}
                  >
                    <View className="h-24">
                      <Image source={{ uri: img.url }} className="w-full h-full" resizeMode="cover" />
                    </View>
                    <View className={`px-2 py-2 ${active ? 'bg-emerald-600' : 'bg-white dark:bg-[#102232]'}`}>
                      <Text className={`text-xs font-bold text-center ${active ? 'text-white' : 'text-gray-700 dark:text-gray-200'}`}>{img.label}</Text>
                    </View>
                    {active ? (
                      <View className="absolute top-2 right-2 w-6 h-6 rounded-full bg-emerald-500 items-center justify-center">
                        <Check size={14} color="#ffffff" />
                      </View>
                    ) : null}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </SectionCard>
        </View>

        <View className="px-5 mt-4">
          <SectionCard title="What are you sharing?" subtitle="Lead with the essentials first so the listing reads clearly.">
            <Text className="text-xs font-semibold uppercase tracking-[1.5px] text-gray-500 dark:text-gray-400 mb-2">Category</Text>
            <View className="flex-row flex-wrap">
              {CATEGORIES.map((cat) => (
                <Chip key={cat} label={cat} selected={category === cat} onPress={() => setCategory(cat)} />
              ))}
            </View>

            <InputField
              label="Title"
              icon={<Type size={20} color="#7a8a9d" />}
              value={title}
              onChangeText={setTitle}
              placeholder="4 sourdough loaves, fresh this morning"
              helperText="Specific titles get better attention."
            />

            <View className="mb-4">
              <View className="flex-row items-center justify-between mb-2">
                <Text className="text-xs font-semibold uppercase tracking-[1.5px] text-gray-500 dark:text-gray-400">Helpful tone</Text>
                <View className="flex-row">
                  {QUICK_TAGS.map((tag) => (
                    <View key={tag} className="px-2 py-1 rounded-full bg-gray-100 dark:bg-[#102232] ml-2">
                      <Text className="text-[10px] font-semibold text-gray-600 dark:text-gray-300">{tag}</Text>
                    </View>
                  ))}
                </View>
              </View>
              <InputField
                label="Description"
                multiline
                icon={<Type size={20} color="#7a8a9d" />}
                value={description}
                onChangeText={setDescription}
                placeholder="Condition, pickup instructions, portion size, or who it’s best for..."
                containerStyle={{ marginBottom: 0 }}
              />
            </View>
          </SectionCard>
        </View>

        <View className="px-5 mt-4">
          <SectionCard title="Quantity and timing" subtitle="Help people decide quickly with quantity, unit, and freshness window.">
            <View className="flex-row">
              <View className="flex-1 mr-2">
                <InputField
                  label="Quantity"
                  icon={<Package size={20} color="#7a8a9d" />}
                  value={quantity}
                  onChangeText={setQuantity}
                  placeholder="0"
                  keyboardType="numeric"
                />
              </View>
              <View className="flex-1 ml-2">
                <Text className="text-xs font-semibold uppercase tracking-[1.5px] text-gray-500 dark:text-gray-400 mb-2">Unit</Text>
                <View className="flex-row flex-wrap">
                  {UNITS.map((u) => (
                    <Chip key={u} label={u} selected={unit === u} onPress={() => setUnit(u)} />
                  ))}
                </View>
              </View>
            </View>

            <InputField
              label="Best Before"
              icon={<Calendar size={20} color="#7a8a9d" />}
              value={expiryDate}
              onChangeText={setExpiryDate}
              placeholder="YYYY-MM-DD"
            />

            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-xs font-semibold uppercase tracking-[1.5px] text-gray-500 dark:text-gray-400">Quick expiry</Text>
              <View className="flex-row items-center">
                <Clock3 size={14} color={isDark ? '#94a3b8' : '#64748b'} />
                <Text className="text-xs text-gray-500 dark:text-gray-400 ml-1">Tap to auto-fill</Text>
              </View>
            </View>
            <View className="flex-row flex-wrap">
              {QUICK_EXPIRY.map((days) => {
                const target = new Date(Date.now() + 86400000 * days).toISOString().split('T')[0];
                return (
                  <Chip key={days} label={`${days} day${days > 1 ? 's' : ''}`} selected={expiryDate === target} onPress={() => setExpiryDate(target)} />
                );
              })}
            </View>
          </SectionCard>
        </View>

        <View className="px-5 mt-4">
          <SectionCard title="Pricing" subtitle="Free is great, but you can also show the original value and a discounted pickup price.">
            <View className="flex-row">
              <View className="flex-1 mr-2">
                <InputField
                  label="Original Price"
                  icon={<BadgeDollarSign size={20} color="#7a8a9d" />}
                  value={originalPrice}
                  onChangeText={setOriginalPrice}
                  placeholder="0.00"
                  keyboardType="numeric"
                  rightElement={
                    <TouchableOpacity
                      onPress={() => setShowCurrencyModal(true)}
                      className="px-3 py-2 rounded-xl bg-gray-100 dark:bg-[#102232] border border-gray-200 dark:border-white/10"
                    >
                      <Text className="font-bold text-gray-800 dark:text-gray-100 text-xs">{getCurrencySymbol(currency)} {currency}</Text>
                    </TouchableOpacity>
                  }
                />
              </View>
              <View className="flex-1 ml-2">
                <InputField
                  label="Discounted Price"
                  icon={<Scale size={20} color="#7a8a9d" />}
                  value={discountedPrice}
                  onChangeText={setDiscountedPrice}
                  placeholder="0.00"
                  keyboardType="numeric"
                  rightElement={
                    <TouchableOpacity
                      onPress={() => setShowCurrencyModal(true)}
                      className="px-3 py-2 rounded-xl bg-gray-100 dark:bg-[#102232] border border-gray-200 dark:border-white/10"
                    >
                      <Text className="font-bold text-gray-800 dark:text-gray-100 text-xs">{getCurrencySymbol(currency)} {currency}</Text>
                    </TouchableOpacity>
                  }
                />
              </View>
            </View>

            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-xs font-semibold uppercase tracking-[1.5px] text-gray-500 dark:text-gray-400">Quick discounts</Text>
              <Text className="text-xs text-gray-500 dark:text-gray-400">Instant price helper</Text>
            </View>
            <View className="flex-row flex-wrap">
              {QUICK_DISCOUNTS.map((pct) => (
                <Chip
                  key={pct}
                  label={`-${pct}%`}
                  onPress={() => {
                    if (!originalPrice) return;
                    const base = parseFloat(originalPrice);
                    if (Number.isNaN(base)) return;
                    const discounted = base * (1 - pct / 100);
                    setDiscountedPrice(discounted.toFixed(2));
                  }}
                />
              ))}
            </View>
          </SectionCard>
        </View>

        <View className="px-5 mt-4">
          <View className="rounded-[28px] bg-blue-50 dark:bg-[#102232] border border-blue-100 dark:border-white/10 px-4 py-4 flex-row items-start">
            <View className="w-10 h-10 rounded-2xl bg-blue-100 dark:bg-blue-500/10 items-center justify-center mr-3">
              <MapPin size={18} color="#2563eb" />
            </View>
            <View className="flex-1">
              <Text className="text-base font-bold text-blue-900 dark:text-blue-200">Location is added automatically</Text>
              <Text className="text-sm text-blue-700 dark:text-blue-300 mt-1 leading-5">
                We’ll attach your current pickup area when you publish, so nearby users can discover it without extra setup.
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {showCurrencyModal ? (
        <Modal transparent animationType="slide" visible={showCurrencyModal} onRequestClose={() => setShowCurrencyModal(false)}>
          <Pressable
            className="flex-1"
            style={{ backgroundColor: isDark ? 'rgba(0,0,0,0.7)' : 'rgba(0,0,0,0.35)' }}
            onPress={() => setShowCurrencyModal(false)}
          >
            <View className={`absolute bottom-0 left-0 right-0 rounded-t-[30px] p-4 max-h-[82%] ${isDark ? 'bg-[#0b1822]' : 'bg-white'}`}>
              <View className="flex-row items-center justify-between mb-3">
                <Text className="text-lg font-extrabold text-gray-900 dark:text-white">Select currency</Text>
                <TouchableOpacity onPress={() => setShowCurrencyModal(false)} className="px-3 py-1 rounded-full bg-gray-100 dark:bg-[#102232]">
                  <Text className="text-gray-700 dark:text-gray-200 font-semibold">Close</Text>
                </TouchableOpacity>
              </View>

              <TextInput
                value={currencyQuery}
                onChangeText={setCurrencyQuery}
                placeholder="Search currency code or name"
                placeholderTextColor={isDark ? '#9ca3af' : '#6b7280'}
                className={`${isDark ? 'bg-[#102232] text-gray-100 border-white/10' : 'bg-gray-100 text-gray-900 border-gray-200'} rounded-2xl px-4 py-3 border mb-3`}
                autoCapitalize="none"
                autoCorrect={false}
              />

              <FlatList
                data={filteredCurrencies}
                keyExtractor={(item) => item.code}
                renderItem={({ item: c }) => (
                  <TouchableOpacity
                    onPress={() => {
                      setCurrency(c.code);
                      setShowCurrencyModal(false);
                      setCurrencyQuery('');
                    }}
                    className={`py-4 flex-row justify-between items-center border-b ${isDark ? 'border-white/10' : 'border-gray-100'}`}
                    activeOpacity={0.7}
                  >
                    <View className="flex-1 pr-3">
                      <Text className="text-base font-semibold text-gray-900 dark:text-gray-100">
                        {c.symbol} {c.code} - {c.name}
                      </Text>
                    </View>
                    {c.code === currency ? (
                      <View className="w-8 h-8 rounded-full bg-emerald-600 items-center justify-center">
                        <Check size={16} color="#ffffff" />
                      </View>
                    ) : null}
                  </TouchableOpacity>
                )}
              />
            </View>
          </Pressable>
        </Modal>
      ) : null}

      <View
        className="border-t border-gray-100 dark:border-white/10 bg-white/95 dark:bg-[#06131f]"
        style={{
          paddingHorizontal: 20,
          paddingTop: 14,
          paddingBottom: Math.max(insets.bottom + 96, 116),
        }}
      >
        <View className="flex-row items-center justify-between mb-3">
          <View>
            <Text className="text-xs font-semibold uppercase tracking-[1.5px] text-gray-500 dark:text-gray-400">Ready to publish</Text>
            <Text className="text-base font-bold text-gray-900 dark:text-white mt-1">Make this listing live for nearby users</Text>
          </View>
          <View className="w-11 h-11 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 items-center justify-center">
            <ArrowUpRight size={18} color="#059669" />
          </View>
        </View>

        <Button
          label={isLoading ? 'Posting...' : 'Publish Listing'}
          onPress={handleSubmit}
          disabled={isLoading}
          loading={isLoading}
        />
      </View>
    </KeyboardAvoidingView>
  );
}
