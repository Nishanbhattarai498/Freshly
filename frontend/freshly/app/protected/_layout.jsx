import { Redirect, Slot, Stack, useSegments } from "expo-router";
import { useUser } from "@clerk/clerk-expo";

export default function ProtectedLayout() {
  const { isLoaded, isSignedIn, user } = useUser();
  const segments = useSegments();

  if (!isLoaded) return null;

  if (!isSignedIn) {
    return <Redirect href="/auth/login" />;
  }

  const role = user?.unsafeMetadata?.role;
  const currentArea = segments[1] || "";

  if (role === "SHOPKEEPER" && currentArea !== "shopkeeper") {
    return <Redirect href="/protected/shopkeeper/dashboard" />;
  }

  if (role === "CUSTOMER" && currentArea !== "customer") {
    return <Redirect href="/protected/customer/home" />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Slot />
    </Stack>
  );
}