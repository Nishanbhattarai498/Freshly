import React from 'react';
import { View, Text, ActivityIndicator } from 'react-native';

export const LoadingView = ({ message = 'Loading...' }) => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
    <ActivityIndicator size="large" color="#0000ff" />
    <Text style={{ marginTop: 10 }}>{message}</Text>
  </View>
);

export const ErrorView = ({ message = 'An error occurred', onRetry }) => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
    <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 10 }}>
      Error
    </Text>
    <Text style={{ textAlign: 'center', marginBottom: 20 }}>{message}</Text>
    {onRetry && (
      <Text
        style={{ color: 'blue', fontSize: 16, padding: 10 }}
        onPress={onRetry}
      >
        Retry
      </Text>
    )}
  </View>
);

export const StatusPopup = ({ visible, message, type = 'info', onClose }) => {
  if (!visible) return null;

  return (
    <View
      style={{
        position: 'absolute',
        bottom: 20,
        left: 0,
        right: 0,
        alignItems: 'center',
      }}
    >
      <View
        style={{
          backgroundColor: type === 'success' ? 'green' : 'orange',
          padding: 15,
          borderRadius: 5,
          width: '90%',
        }}
      >
        <Text style={{ color: 'white', textAlign: 'center' }}>{message}</Text>
      </View>
    </View>
  );
};

export const EmptyView = ({ message = 'No data available' }) => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
    <Text style={{ fontSize: 16, color: '#999' }}>{message}</Text>
  </View>
);
