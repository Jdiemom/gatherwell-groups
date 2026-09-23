import { ActivityIndicator, View } from "react-native";
import { Redirect } from "expo-router";
import { useSession } from "@/lib/session";
import { C } from "@/theme";

/** Sends you to your trips if the stored session is still good, otherwise sign-in. */
export default function Index() {
  const { ready, userId } = useSession();

  if (!ready) {
    return (
      <View style={{ flex: 1, backgroundColor: C.cream, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color={C.terracotta} />
      </View>
    );
  }
  return <Redirect href={userId ? "/trips" : "/sign-in"} />;
}
