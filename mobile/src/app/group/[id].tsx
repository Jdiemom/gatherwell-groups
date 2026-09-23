import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { Stack, router, useLocalSearchParams } from "expo-router";
import { C } from "@/theme";
import { useSession } from "@/lib/session";
import { loadGroup } from "@/group/load";
import { GroupScreen } from "@/group/GroupScreen";
import { Button, Card, H2, Note, Screen } from "@/components/ui";
import type { GroupBundle } from "@/group/types";

export default function GroupRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { userId, ready } = useSession();
  const [bundle, setBundle] = useState<GroupBundle | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "missing">("loading");

  const load = useCallback(async () => {
    if (!id) return;
    setState("loading");
    const data = await loadGroup(id);
    if (!data) {
      setState("missing");
      return;
    }
    setBundle(data);
    setState("ready");
  }, [id]);

  useEffect(() => {
    if (ready && userId) void load();
  }, [ready, userId, load]);

  if (ready && !userId) {
    return (
      <Screen>
        <Card>
          <H2>Please sign in</H2>
          <Note>Sign in to see this trip.</Note>
          <Button label="Sign in" onPress={() => router.replace("/sign-in")} style={{ marginTop: 14 }} />
        </Card>
      </Screen>
    );
  }

  if (state === "missing") {
    return (
      <Screen>
        <Card>
          <H2>Group not found</H2>
          <Note>
            You may not be a member of this group yet. Ask the organizer for the invite link.
          </Note>
          <Button
            label="Back to your trips"
            kind="outline"
            onPress={() => router.replace("/trips")}
            style={{ marginTop: 14 }}
          />
        </Card>
      </Screen>
    );
  }

  if (state === "loading" || !bundle || !userId) {
    return (
      <View style={{ flex: 1, backgroundColor: C.cream, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color={C.terracotta} />
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: bundle.group.name }} />
      <GroupScreen bundle={bundle} userId={userId} />
    </>
  );
}
