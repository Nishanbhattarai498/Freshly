import React, { useEffect, useMemo } from 'react';
import { View, Text, FlatList, Image, TouchableOpacity, RefreshControl, StatusBar, ScrollView, Alert } from 'react-native';
import { useStore } from '../../store';
import { useRouter } from 'expo-router';
import { MapPin, Clock, Search, Bell, Calendar, Sparkles, ChevronRight, ArrowUpRight } from 'lucide-react-native';
import { formatDistanceToNow, format } from 'date-fns';
import { useColorScheme } from 'nativewind';
import { getCurrencySymbol } from '../utils/currencies';
import * as Location from 'expo-location';
import { LinearGradient } from 'expo-linear-gradient';

export default function Home() {
  const { items, isLoading, fetchItems } = useStore();
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const [userAddress, setUserAddress] = React.useState(null);
  const [selectedCategory, setSelectedCategory] = React.useState('All');

  const CATEGORIES = ['All', 'Vegetables', 'Fruits', 'Bakery', 'Meals', 'Dairy', 'Other'];

  useEffect(() => {
    let didCancel = false;

    const ensureLocationPermission = async () => {
      try {
        const current = await Location.getForegroundPermissionsAsync();
        const statusToUse = current.status === 'granted'
          ? 'granted'
          : (await Location.requestForegroundPermissionsAsync()).status;

        if (statusToUse !== 'granted') {
          Alert.alert(
            'Allow location access',
            'Turn on location to see nearby food items. You can also enable it later in Settings.'
          );
          return;
        }

        let location = await Location.getLastKnownPositionAsync({});
        if (!location) {
          location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        }

        if (location) {
          const [place] = await Location.reverseGeocodeAsync({
            latitude: location.coords.latitude,
            longitude: location.coords.longitude
          });
          if (!didCancel && place) {
            const addressParts = [
              place.city || place.subregion,
              place.region,
              place.country
            ].filter(Boolean);
            setUserAddress(addressParts.join(', '));
          }
        }
      } catch (error) {
        console.log('Error fetching user location', error);
      }
    };

    ensureLocationPermission();
    return () => {
      didCancel = true;
    };
  }, []);

  useEffect(() => {
    fetchItems(selectedCategory);
  }, [fetchItems, selectedCategory]);

  const formatLocation = useMemo(
    () => (address) => {
      if (!address) return 'Location not specified';
      const parts = address.split(',').map((p) => p.trim()).filter(Boolean);
      if (parts.length === 0) return 'Location not specified';
      const lastThree = parts.slice(-3);
      return lastThree.join(' · ');
    },
    []
  );

  const getStatusTheme = (status) => {
    switch (status) {
      case 'CLAIMED':
        return {
          bg: 'bg-amber-50 dark:bg-amber-900/50',
          border: 'border-amber-100 dark:border-amber-800',
          text: 'text-amber-700 dark:text-amber-200'
        };
      case 'EXPIRED':
        return {
          bg: 'bg-rose-50 dark:bg-rose-900/50',
          border: 'border-rose-100 dark:border-rose-800',
          text: 'text-rose-700 dark:text-rose-200'
        };
      default:
        return {
          bg: 'bg-emerald-50 dark:bg-emerald-900/50',
          border: 'border-emerald-100 dark:border-emerald-800',
          text: 'text-emerald-700 dark:text-emerald-200'
        };
    }
  };

  const PriceTag = ({ item }) => {
    if (item.discountedPrice !== null && item.discountedPrice !== undefined) {
      if (item.discountedPrice === 0) {
        return <Text className="text-emerald-50 text-sm font-bold bg-black/60 px-3 py-1 rounded-full">Free</Text>;
      }
      return (
        <View className="flex-row items-center bg-black/60 px-3 py-1 rounded-full">
          <Text className="text-emerald-100 font-bold mr-1">{getCurrencySymbol(item.priceCurrency)}{item.discountedPrice}</Text>
          {item.originalPrice && (
            <Text className="text-white/70 text-xs line-through">{getCurrencySymbol(item.priceCurrency)}{item.originalPrice}</Text>
          )}
        </View>
      );
    }

    if (item.originalPrice) {
      return <Text className="text-emerald-50 text-sm font-bold bg-black/60 px-3 py-1 rounded-full">{getCurrencySymbol(item.priceCurrency)}{item.originalPrice}</Text>;
    }

    return <Text className="text-emerald-50 text-sm font-bold bg-black/60 px-3 py-1 rounded-full">Free</Text>;
  };

  const CardMeta = ({ item, isDark }) => (
    <View className="flex-row items-center justify-between mt-3">
      <View className="flex-row items-center">
        <Image
          source={{ uri: item.user.avatarUrl || 'https://via.placeholder.com/40' }}
          className="w-9 h-9 rounded-full mr-2"
          style={{ borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(15,23,42,0.08)' }}
        />
        <View>
          <Text
            className="font-semibold"
            style={{ color: isDark ? '#f8fafc' : '#0f172a' }}
            numberOfLines={1}
          >
            {item.user.displayName}
          </Text>
          <Text
            className="text-[11px]"
            style={{ color: isDark ? 'rgba(248,250,252,0.8)' : '#4b5563' }}
          >
            {formatDistanceToNow(new Date(item.expiryDate), { addSuffix: true })}
          </Text>
        </View>
      </View>
      <View
        className="flex-row items-center px-2 py-1 rounded-full"
        style={{
          backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#ecfdf3',
          borderWidth: 1,
          borderColor: isDark ? 'rgba(255,255,255,0.16)' : '#d1fae5',
        }}
      >
        <Clock size={12} color={isDark ? '#e2e8f0' : '#047857'} />
        <Text className="text-[11px] ml-1" style={{ color: isDark ? '#e2e8f0' : '#065f46' }}>
          Pickup soon
        </Text>
      </View>
    </View>
  );

  const StatBadge = ({ children }) => (
    <View className="bg-emerald-600/90 px-3 py-1 rounded-full border border-emerald-500/70 shadow-sm">
      <Text className="text-white text-xs font-semibold leading-none">{children}</Text>
    </View>
  );

  const renderItem = ({ item }) => {
    const theme = getStatusTheme(item.status);
    return (
    <TouchableOpacity
      className="mb-6 rounded-3xl overflow-hidden mx-4 shadow-xl border border-gray-100/80 dark:border-gray-800 bg-white dark:bg-gray-900"
      onPress={() => router.push(`/(item)/${item.id}`)}
      activeOpacity={0.93}
    >
      <View className="relative bg-gray-100 dark:bg-gray-800">
        {item.imageUrl ? (
          <Image
            source={{ uri: item.imageUrl }}
            className="w-full h-64"
            resizeMode="cover"
          />
        ) : (
          <View className="w-full h-64 bg-gray-200 dark:bg-gray-700 justify-center items-center">
            <Text className="text-gray-500 dark:text-gray-400 font-medium">No Image</Text>
          </View>
        )}

        <View className="absolute top-4 right-4 flex-col items-end space-y-2">
          <View className={`px-3 py-1 rounded-full border ${theme.bg} ${theme.border} shadow-sm bg-white dark:bg-gray-900/90`}>
            <Text className={`${theme.text} text-[11px] font-bold uppercase tracking-wider`}>
              {item.status}
            </Text>
          </View>
          <View className="bg-black/75 px-3 py-1 rounded-full">
            <PriceTag item={item} />
          </View>
        </View>
      </View>

      <View className="p-5 bg-white dark:bg-gray-900">
        <View className="flex-row items-center justify-between">
          <Text className="text-gray-900 dark:text-white text-xl font-extrabold flex-1 mr-3 leading-tight" numberOfLines={1}>
            {item.title}
          </Text>
          <StatBadge>
            {item.quantity} {item.unit}
          </StatBadge>
        </View>

        <Text className="text-gray-700 dark:text-gray-200 text-[15px] mt-2 leading-6" numberOfLines={3}>
          {item.description || 'No description provided.'}
        </Text>

        <View className="flex-row items-center mt-3">
          <MapPin size={14} color={colorScheme === 'dark' ? '#22c55e' : '#15803d'} />
          <Text className="text-gray-800 dark:text-gray-100 text-sm ml-2 flex-1" numberOfLines={1}>
            {formatLocation(item.location?.address)}
          </Text>
        </View>

        <View className="flex-row items-center mt-2">
          <Calendar size={14} color={colorScheme === 'dark' ? '#a5b4fc' : '#1d4ed8'} />
          <Text className="text-gray-800 dark:text-gray-100 text-sm ml-2">
            Expires {format(new Date(item.expiryDate), 'MMM d, yyyy')}
          </Text>
        </View>

        <CardMeta item={item} isDark={colorScheme === 'dark'} />
      </View>
    </TouchableOpacity>
    );
  };

  const ListHeader = () => (
    <View className="pb-6">
      <View className="px-5 pt-12">
        <View className="overflow-hidden rounded-3xl border border-gray-200 dark:border-gray-800 shadow-xl">
          <LinearGradient
            colors={colorScheme === 'dark' ? ['#0f172a', '#0b1220'] : ['#ecfdf3', '#d6f5e3']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View className="p-5">
              <View className="flex-row justify-between items-start">
                <View className="flex-1 pr-3">
                  <Text className="text-xs font-semibold uppercase tracking-[3px] text-emerald-700 dark:text-emerald-300">ShelfLife</Text>
                  <Text className="text-3xl font-black text-gray-900 dark:text-white mt-2 leading-9">Share. Claim. Waste less.</Text>
                  <Text className="text-gray-600 dark:text-gray-300 mt-3 leading-6">Local food stays local. Help it find a home.</Text>
                </View>
                <TouchableOpacity
                  onPress={() => router.push('/notifications')}
                  className="bg-white/80 dark:bg-gray-900/80 border border-white/40 dark:border-gray-700 rounded-2xl p-3 shadow-md"
                >
                  <Bell size={20} color={colorScheme === 'dark' ? '#fff' : '#111827'} />
                </TouchableOpacity>
              </View>

              <View className="flex-row items-center mt-5 space-x-3">
                <TouchableOpacity
                  onPress={() => router.push('/post')}
                  className="flex-1 bg-emerald-600 rounded-2xl px-4 py-3 flex-row items-center justify-between shadow-lg"
                  activeOpacity={0.9}
                >
                  <View>
                    <Text className="text-white font-semibold text-base">Share an item</Text>
                    <Text className="text-white/90 text-xs mt-1">Help someone nearby today</Text>
                  </View>
                  <ArrowUpRight size={18} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => router.push('/messages')}
                  className="w-14 h-14 rounded-2xl bg-white/80 dark:bg-gray-900/80 border border-white/40 dark:border-gray-700 items-center justify-center shadow"
                  activeOpacity={0.9}
                >
                  <Sparkles size={20} color={colorScheme === 'dark' ? '#a5b4fc' : '#7c3aed'} />
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                onPress={() => router.push('/search')}
                className="flex-row items-center bg-white/80 dark:bg-gray-900/80 p-4 rounded-2xl border border-white/40 dark:border-gray-700 mt-5"
                activeOpacity={0.9}
              >
                <View className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-900/30 items-center justify-center mr-3">
                  <Search size={20} color={colorScheme === 'dark' ? '#34d399' : '#059669'} />
                </View>
                <View className="flex-1">
                  <Text className="text-gray-900 dark:text-white font-semibold">Find food, people, shopkeepers…</Text>
                  <Text className="text-gray-600 dark:text-gray-400 text-sm">Try {`"bread", "vegetarian", or "cafe"`}</Text>
                </View>
                <ChevronRight size={18} color={colorScheme === 'dark' ? '#9ca3af' : '#475569'} />
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 6, gap: 10 }}
      >
        {CATEGORIES.map((cat) => {
          const active = selectedCategory === cat;
          return (
            <TouchableOpacity
              key={cat}
              onPress={() => setSelectedCategory(cat)}
              className={`${active ? 'bg-emerald-600' : 'bg-white dark:bg-gray-900'} px-4 py-2 rounded-full border ${active ? 'border-emerald-500' : 'border-gray-200 dark:border-gray-800'} shadow-sm`}
              activeOpacity={0.9}
            >
              <Text className={`${active ? 'text-white' : 'text-gray-800 dark:text-gray-100'} font-semibold text-sm`}>{cat}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {userAddress ? (
        <View className="px-5 mt-2">
          <View className="flex-row items-center bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-3 shadow-sm">
            <View className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-900/40 items-center justify-center mr-3">
              <MapPin size={16} color="#059669" />
            </View>
            <View className="flex-1">
              <Text className="text-gray-900 dark:text-white font-semibold">Serving around you</Text>
              <Text className="text-gray-600 dark:text-gray-400" numberOfLines={1}>{formatLocation(userAddress)}</Text>
            </View>
            <View className="px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-900/40">
              <Text className="text-emerald-700 dark:text-emerald-300 text-xs font-bold">Live</Text>
            </View>
          </View>
        </View>
      ) : null}
    </View>
  );

  return (
    <View className="flex-1 bg-gray-50 dark:bg-gray-950">
      <StatusBar barStyle={colorScheme === 'dark' ? "light-content" : "dark-content"} />
      <FlatList
        data={items}
        renderItem={renderItem}
        keyExtractor={(item) => item.id.toString()}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={() => fetchItems(selectedCategory)}
            tintColor={colorScheme === 'dark' ? '#22c55e' : '#22c55e'}
            colors={['#22c55e']}
            progressBackgroundColor={colorScheme === 'dark' ? '#0f172a' : '#ffffff'}
          />
        }
        contentContainerStyle={{ paddingBottom: 120, paddingTop: 4 }}
        ListHeaderComponent={<ListHeader />}
        ListEmptyComponent={
          <View className="flex-1 justify-center items-center mt-20 px-10">
            <View className="bg-gray-100 dark:bg-gray-800 p-6 rounded-full mb-4">
              <Clock size={40} color="#9ca3af" />
            </View>
            <Text className="text-gray-900 dark:text-white font-bold text-lg mb-2">No items found</Text>
            <Text className="text-gray-500 dark:text-gray-400 text-center leading-relaxed">
              There are no items available nearby right now. Be the first to share something!
            </Text>
          </View>
        }
      />
    </View>
  );
}