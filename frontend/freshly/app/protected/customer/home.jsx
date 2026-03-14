import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useAuth } from "@clerk/clerk-expo";
import { useRouter } from "expo-router";

export default function CustomerHome() {
  const { signOut } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await signOut();
    router.replace("/auth/login");
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <Text style={styles.title}>ExpiryPredict</Text>
      <Text style={styles.subtitle}>
        Find products near expiry at lower prices
      </Text>

      {/* Feature Cards */}
      <TouchableOpacity style={styles.card}>
        <Text style={styles.cardTitle}>Nearby Expiring Products</Text>
        <Text style={styles.cardDesc}>
          Discover discounted items close to expiry
        </Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.card}>
        <Text style={styles.cardTitle}>Prediction Results</Text>
        <Text style={styles.cardDesc}>
          Check AI predicted expiry dates
        </Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.card}>
        <Text style={styles.cardTitle}>Saved Products</Text>
        <Text style={styles.cardDesc}>
          View items you saved earlier
        </Text>
      </TouchableOpacity>

      {/* Logout */}
      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 25,
    backgroundColor: "#f8fafc",
  },

  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginTop: 40,
  },

  subtitle: {
    fontSize: 15,
    color: "#6b7280",
    marginBottom: 30,
  },

  card: {
    backgroundColor: "white",
    padding: 18,
    borderRadius: 14,
    marginBottom: 16,
    elevation: 3,
  },

  cardTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 5,
  },

  cardDesc: {
    color: "#6b7280",
  },

  logoutBtn: {
    marginTop: 30,
    backgroundColor: "#ef4444",
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
  },

  logoutText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 16,
  },
});