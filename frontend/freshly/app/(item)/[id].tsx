import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, Image, TouchableOpacity, ActivityIndicator, Alert, Linking, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '@clerk/clerk-expo';
import { api } from '../../services/api';
import { ChevronLeft, MapPin, Clock, Tag, MessageCircle, AlertTriangle } from 'lucide-react-native';
import { formatDistanceToNow, format } from 'date-fns';
import type { Item } from '../../store';

type ItemDetailResponse = Item & {
  userId: string;
  claims?: { id: number }[];
};

const getErrorMessage = (error: unknown, fallback: string) => {
  const err = error as { response?: { data?: { error?: string } }; message?: string };
  return err?.response?.data?.error || err?.message || fallback;
};

const safeFormatDate = (value?: string) => {
  if (!value) return 'Unknown date';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unknown date';
  return format(date, 'MMM dd, yyyy');
};

const safeRelativeDate = (value?: string) => {
  if (!value) return 'Unknown time';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unknown time';
  return formatDistanceToNow(date, { addSuffix: true });
};

export default function ItemDetail() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { getToken, userId } = useAuth();
  
  const [item, setItem] = useState<ItemDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);

  const fetchItemDetails = useCallback(async () => {
    try {
      const response = await api.get(`/items/${id}`);
      setItem(response.data as ItemDetailResponse);
    } catch (error) {
      console.error('Error fetching item details:', error);
      Alert.alert('Error', 'Failed to load item details.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchItemDetails();
  }, [fetchItemDetails]);

  const handleClaim = async () => {
    if (claiming) return;
    try {
      setClaiming(true);
      const token = await getToken();
      if (!token) {
        Alert.alert('Login required', 'Please login again to claim this item.');
        return;
      }
      await api.post(`/items/${id}/claim`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      Alert.alert('Success', 'Item claimed successfully!');
      fetchItemDetails();
    } catch (error) {
      console.error('Claim error:', error);
      Alert.alert('Error', getErrorMessage(error, 'Failed to claim item.'));
    } finally {
      setClaiming(false);
    }
  };

  const handleMessageUser = async () => {
    try {
      const token = await getToken();
      if (!token) {
        Alert.alert('Login required', 'Please login again to start a conversation.');
        return;
      }

      const receiverId = item?.userId || item?.user?.id;
      if (!receiverId) {
        Alert.alert('Unavailable', 'This listing is missing owner information.');
        return;
      }

      const response = await api.post('/messages/start', { receiverId }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      // Navigate to the messages screen with the conversation ID
      router.push(`/messages/${response.data.id}`);
    } catch (error) {
      console.error('Message error:', error);
      Alert.alert('Error', 'Failed to start conversation.');
    }
  };

  const openMap = () => {
    if (!item?.location) return;
    const { latitude, longitude, address } = item.location;
    const url = Platform.select({
      ios: `maps://app?q=${encodeURIComponent(address)}&ll=${latitude},${longitude}`,
      android: `geo:${latitude},${longitude}?q=${encodeURIComponent(address)}`
    });
    if (url) {
      Linking.openURL(url);
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#10b981" />
      </View>
    );
  }

  if (!item) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>Item not found</Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 20 }}>
          <Text style={{ color: '#10b981' }}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isOwner = item.userId === userId;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#fff' }} bounces={false}>
      <View style={{ position: 'relative' }}>
        <Image 
          source={{ uri: item.imageUrl || 'https://via.placeholder.com/400' }} 
          style={{ width: '100%', height: 300 }} 
          resizeMode="cover"
        />
        <TouchableOpacity 
          style={{ position: 'absolute', top: 50, left: 20, backgroundColor: 'rgba(0,0,0,0.5)', padding: 10, borderRadius: 20 }}
          onPress={() => router.back()}
        >
          <ChevronLeft color="#fff" size={24} />
        </TouchableOpacity>
      </View>

      <View style={{ padding: 20 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View style={{ flex: 1, paddingRight: 10 }}>
            <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#111827' }}>{item.title}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
              <Tag color="#10b981" size={16} />
              <Text style={{ color: '#10b981', marginLeft: 4, fontWeight: '600' }}>{item.category || 'General'}</Text>
            </View>
          </View>
          
          <View style={{ backgroundColor: '#10b981', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 }}>
            <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 18 }}>
              {item.discountedPrice === 0 ? 'Free' : `${item.priceCurrency || '$'}${item.discountedPrice}`}
            </Text>
            {item.originalPrice && item.discountedPrice !== undefined && item.originalPrice > item.discountedPrice && (
              <Text style={{ color: 'rgba(255,255,255,0.8)', textDecorationLine: 'line-through', fontSize: 12, textAlign: 'center' }}>
                {item.priceCurrency || '$'}{item.originalPrice}
              </Text>
            )}
          </View>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 20, backgroundColor: '#f3f4f6', padding: 12, borderRadius: 12 }}>
          <Image 
            source={{ uri: item.user?.avatarUrl || 'https://via.placeholder.com/40' }} 
            style={{ width: 40, height: 40, borderRadius: 20 }} 
          />
          <View style={{ marginLeft: 12, flex: 1 }}>
            <Text style={{ fontWeight: '600', fontSize: 16 }}>{item.user?.displayName || 'Unknown User'}</Text>
            <Text style={{ color: '#6b7280', fontSize: 12 }}>
              {item.user?.rating?.average ? `★ ${item.user.rating.average.toFixed(1)} (${item.user.rating.count} ratings)` : 'No ratings yet'}
            </Text>
          </View>
          {!isOwner && (
            <TouchableOpacity onPress={handleMessageUser} style={{ padding: 10, backgroundColor: '#e5e7eb', borderRadius: 20 }}>
              <MessageCircle color="#374151" size={20} />
            </TouchableOpacity>
          )}
        </View>

        <View style={{ marginTop: 20 }}>
          <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 8 }}>Description</Text>
          <Text style={{ color: '#4b5563', lineHeight: 22 }}>{item.description || 'No description provided.'}</Text>
        </View>

        <View style={{ marginTop: 24, gap: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#fef3c7', alignItems: 'center', justifyContent: 'center' }}>
              <AlertTriangle color="#d97706" size={20} />
            </View>
            <View style={{ marginLeft: 12 }}>
              <Text style={{ color: '#6b7280', fontSize: 12 }}>Quantity Available</Text>
              <Text style={{ fontWeight: '600', fontSize: 16 }}>{item.quantity} {item.unit}</Text>
            </View>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#fee2e2', alignItems: 'center', justifyContent: 'center' }}>
              <Clock color="#ef4444" size={20} />
            </View>
            <View style={{ marginLeft: 12 }}>
              <Text style={{ color: '#6b7280', fontSize: 12 }}>Expires</Text>
              <Text style={{ fontWeight: '600', fontSize: 16, color: '#ef4444' }}>
                {safeFormatDate(item.expiryDate)} ({safeRelativeDate(item.expiryDate)})
              </Text>
            </View>
          </View>

          {item.location && (
            <TouchableOpacity onPress={openMap} style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#e0e7ff', alignItems: 'center', justifyContent: 'center' }}>
                <MapPin color="#4f46e5" size={20} />
              </View>
              <View style={{ marginLeft: 12, flex: 1 }}>
                <Text style={{ color: '#6b7280', fontSize: 12 }}>Pick up at</Text>
                <Text style={{ fontWeight: '600', fontSize: 15 }} numberOfLines={2}>{item.location.address}</Text>
              </View>
            </TouchableOpacity>
          )}
        </View>

        {!isOwner && item.status === 'AVAILABLE' && (
          <TouchableOpacity 
            onPress={handleClaim}
            disabled={claiming}
            style={{ 
              marginTop: 30, 
              backgroundColor: '#10b981', 
              paddingVertical: 16, 
              borderRadius: 16, 
              alignItems: 'center',
              opacity: claiming ? 0.7 : 1
            }}
          >
            {claiming ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold' }}>Claim Item</Text>
            )}
          </TouchableOpacity>
        )}

        {item.status === 'CLAIMED' && (
          <View style={{ marginTop: 30, backgroundColor: '#fef3c7', padding: 16, borderRadius: 16, alignItems: 'center' }}>
            <Text style={{ color: '#d97706', fontSize: 16, fontWeight: 'bold' }}>This item has been claimed</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}