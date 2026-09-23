import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { JoinForm } from "@/components/JoinForm";
import { useSession } from "@/lib/session";
import { C } from "@/theme";

/**
 * Where an invite link lands: groupsbygatherwell.com/join/<code>.
 * Joining needs an account, so a signed-out traveller is sent to sign in and
 * brought straight back here with the code intact.
 */
export default function JoinFromLink() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const { ready, userId } = useSession();

  useEffect(() => {
    if (ready && !userId) {
      router.replace(`/sign-in?next=${encodeURIComponent(`/join/${code ?? ""}`)}`);
    }
  }, [ready, userId, code]);

  if (!ready || !userId) {
    return (
      <View style={{ flex: 1, backgroundColor: C.cream, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color={C.terracotta} />
      </View>
    );
  }
  return <JoinForm initialCode={code ?? ""} />;
}
