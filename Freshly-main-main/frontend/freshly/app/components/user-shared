import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, Image, Alert, RefreshControl } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { api } from '../../services/api';
import { useUser } from '@clerk/clerk-expo';
import { useStore } from '../../store';
import { getCurrencySymbol } from '../utils/currencies';
import { ArrowLeft, Trash, Package, Calendar } from 'lucide-react-native';
import { formatDistanceToNow } from 'date-fns';
import { useColorScheme } from 'nativewind';
import { LoadingView } from '../../components/ui/States';

export default function UserShared() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchShared = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/items/user/${id}`);
      setItems(res.data || []);
    } catch (error) {
      console.error('Error fetching shared items:', error);
      Alert.alert('Error', 'Could not load shared items');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchShared();
  };

  useEffect(() => {
    if (id) fetchShared();
  }, [id]);

  const handleDelete = (itemId: number) => {
    Alert.alert('Delete post', 'Are you sure you want to delete this post? This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          console.log(`Attempting to delete item ${itemId}`);
          const response = await api.delete(`/items/${itemId}`);
          console.log('Delete response:', response.data);
          setItems((prev) => prev.filter((it) => it.id !== itemId));
          // Refresh global feed
          try { useStore.getState().fetchItems(); } catch (e) { /* ignore */ }
          Alert.alert('Success', 'Post deleted successfully');
        } catch (error: any) {
          console.error('Delete error:', error);
          console.error('Error response:', error.response?.data);
          console.error('Error status:', error.response?.status);
          const errorMsg = error.response?.data?.error || error.response?.data?.details || error.message || 'Failed to delete';
          Alert.alert('Delete Failed', errorMsg);
        }
      }}
    ]);
  };

  const { user: currentUser } = useUser();

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity 
      onPress={() => router.push(`/(item)/${item.id}`)} 
      className="p-4 bg-white dark:bg-gray-800 mb-3 mx-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700" 
      activeOpacity={0.8}
    >
      <View className="flex-row items-start">
        <Image 
          source={{ uri: item.imageUrl || 'https://via.placeholder.com/80' }} 
          className="w-24 h-24 rounded-xl mr-4" 
          resizeMode="cover"
        />
        <View className="flex-1" style={{ minWidth: 0 }}>
          <View className="flex-row justify-between items-start mb-2">
            <Text className="text-lg font-bold text-gray-900 dark:text-white flex-1" numberOfLines={2}>{item.title}</Text>
            <View className={`ml-2 px-3 py-1 rounded-full ${
              item.status === 'AVAILABLE' ? 'bg-green-100 dark:bg-green-900/30' :
              item.status === 'CLAIMED' ? 'bg-orange-100 dark:bg-orange-900/30' :
              'bg-gray-100 dark:bg-gray-700'
            }`}>
              <Text className={`text-xs font-bold uppercase ${
                item.status === 'AVAILABLE' ? 'text-green-700 dark:text-green-300' :
                item.status === 'CLAIMED' ? 'text-orange-700 dark:text-orange-300' :
                'text-gray-600 dark:text-gray-300'
              }`}>{item.status}</Text>
            </View>
          </View>
          
          {item.location?.address && (
            <Text className="text-sm text-gray-500 dark:text-gray-400 mt-1" numberOfLines={2}>
              📍 {item.location.address}
            </Text>
          )}
          
          <View className="flex-row items-center justify-between mt-2">
            <Text className="text-base text-green-600 dark:text-green-400 font-bold">
              {item.discountedPrice ? `${getCurrencySymbol(item.priceCurrency)}${item.discountedPrice}` : 
               item.originalPrice ? `${getCurrencySymbol(item.priceCurrency)}${item.originalPrice}` : 'Free'}
            </Text>
            {item.expiryDate && (
              <View className="flex-row items-center">
                <Calendar size={12} color="#9ca3af" />
                <Text className="text-xs text-gray-500 dark:text-gray-400 ml-1">
                  {formatDistanceToNow(new Date(item.expiryDate), { addSuffix: true })}
                </Text>
              </View>
            )}
          </View>
        </View>
        {currentUser?.id === String(id) && (
          <TouchableOpacity 
            onPress={(e) => {
              e.stopPropagation();
              handleDelete(item.id);
            }} 
            className="p-2.5 ml-2 bg-red-50 dark:bg-red-900/20 rounded-xl"
          >
            <Trash size={18} color="#ef4444" />
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return <LoadingView message="Loading shared posts..." />;
  }

  return (
    <View className="flex-1 bg-gray-50 dark:bg-gray-900">
      <View className="pt-14 pb-5 px-6 bg-white dark:bg-gray-800 shadow-sm z-10 rounded-b-3xl">
        <View className="flex-row items-center">
          <TouchableOpacity 
            onPress={() => router.back()} 
            className="mr-3 p-2.5 rounded-full bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600"
          >
            <ArrowLeft size={20} color={colorScheme === 'dark' ? '#fff' : '#111827'} />
          </TouchableOpacity>
          <View className="flex-1">
            <Text className="text-2xl font-extrabold text-gray-900 dark:text-white">Shared Posts</Text>
            <Text className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{items.length} {items.length === 1 ? 'post' : 'posts'}</Text>
          </View>
        </View>
      </View>

      <FlatList 
        data={items} 
        renderItem={renderItem} 
        keyExtractor={(i) => String(i.id)} 
        contentContainerStyle={{ paddingTop: 16, paddingBottom: 140 }}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            tintColor={colorScheme === 'dark' ? '#22c55e' : '#22c55e'}
            colors={['#22c55e']}
          />
        }
        ListEmptyComponent={
          <View className="p-8 items-center justify-center mt-12">
            <View className="bg-green-100 dark:bg-green-900/20 p-6 rounded-full mb-4">
              <Package size={48} color="#22c55e" />
            </View>
            <Text className="text-xl font-bold text-gray-900 dark:text-white mb-2">No Shared Posts</Text>
            <Text className="text-gray-500 dark:text-gray-400 text-center px-8 leading-relaxed">
              You haven't shared any items yet. Start sharing to help your community!
            </Text>
          </View>
        } 
      />
    </View>
  );
}
