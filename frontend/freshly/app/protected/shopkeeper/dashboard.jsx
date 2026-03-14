import { View, Text, Button } from 'react-native';

export default function ShopkeeperDashboard({ navigation }) {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
      <Text style={{ fontSize: 24, fontWeight: 'bold' }}>Welcome Shopkeeper 🏪</Text>
      <Text style={{ fontSize: 16, marginVertical: 10 }}>
        Here you can add expiring products & discounts.
      </Text>
      <Button title="Add Product" onPress={() => navigation.navigate('AddProduct')} />
      <Button title="Add Discount" onPress={() => navigation.navigate('AddDiscount')} />
    </View>
  );
}