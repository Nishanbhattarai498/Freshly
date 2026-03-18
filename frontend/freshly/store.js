import { create } from 'zustand';

export const useStore = create((set) => ({
  user: null,
  items: [],
  messages: [],
  
  setUser: (user) => set({ user }),
  setItems: (items) => set({ items }),
  setMessages: (messages) => set({ messages }),
  
  addItem: (item) => set((state) => ({
    items: [...state.items, item],
  })),
  
  updateItem: (id, updatedItem) => set((state) => ({
    items: state.items.map((item) =>
      item.id === id ? { ...item, ...updatedItem } : item
    ),
  })),
  
  deleteItem: (id) => set((state) => ({
    items: state.items.filter((item) => item.id !== id),
  })),
  
  addMessage: (message) => set((state) => ({
    messages: [...state.messages, message],
  })),
}));
