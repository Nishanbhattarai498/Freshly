import { create } from 'zustand';
import { api } from '../services/api';

export interface Item {
  id: number;
  title: string;
  description: string;
  quantity: number;
  unit: string;
  expiryDate: string;
  status: 'AVAILABLE' | 'CLAIMED' | 'EXPIRED' | 'DELETED';
  imageUrl?: string;
  category?: string;
  originalPrice?: number;
  discountedPrice?: number;
  priceCurrency?: string;
  location: {
    latitude: number;
    longitude: number;
    address: string;
  };
  user: {
    id: string;
    displayName: string;
    avatarUrl: string;
    email?: string;
    role?: 'SHOPKEEPER' | 'CUSTOMER';
    rating?: {
      average: number;
      count: number;
    };
  };
}

export interface CreateItemPayload {
  title: string;
  description?: string;
  quantity: number;
  unit: string;
  expiryDate: string;
  imageUrl?: string;
  category?: string;
  originalPrice?: number;
  discountedPrice?: number;
  priceCurrency?: string;
  location: {
    latitude: number;
    longitude: number;
    address: string;
  };
}

interface AppState {
  items: Item[];
  isLoading: boolean;
  fetchItems: (category?: string) => Promise<void>;
  createItem: (data: CreateItemPayload) => Promise<void>;
  claimItem: (id: number) => Promise<void>;
}

export const useStore = create<AppState>((set, get) => ({
  items: [],
  isLoading: false,
  fetchItems: async (category?: string) => {
    set({ isLoading: true });
    try {
      const url = category && category !== 'All' ? `/items?category=${category}` : '/items';
      const response = await api.get(url);
      
      // Filter out expired items
      const now = new Date();
      const validItems = response.data.filter((item: Item) => {
        const expiryDate = new Date(item.expiryDate);
        // Keep item if it hasn't expired yet
        return expiryDate > now;
      });

      set({ items: validItems });
    } catch (error) {
      console.error('Fetch items error:', error);
    } finally {
      set({ isLoading: false });
    }
  },
  createItem: async (data: CreateItemPayload) => {
    set({ isLoading: true });
    try {
      await api.post('/items', data);
      await get().fetchItems(); // Refresh list
    } catch (error) {
      console.error('Create item error:', error);
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },
  claimItem: async (id) => {
    set({ isLoading: true });
    try {
      await api.post(`/items/${id}/claim`);
      await get().fetchItems(); // Refresh list
    } catch (error) {
      console.error('Claim item error:', error);
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },
}));
