import { useState } from "react";
import { View } from "react-native";
import { router } from "expo-router";
import { joinGroup } from "@/group/actions";
import { Button, Card, Field, H2, Note, Screen } from "@/components/ui";
import { Toast } from "@/components/Toast";

/**
 * Shared by /join (type the code) and /join/[code] (tapped an invite link).
 * Invite links look like groupsbygatherwell.com/join/<code>, which the app
 * registers as a universal link, so the same URL works with or without the app
 * installed.
 */
export function JoinForm({ initialCode = "" }: { initialCode?: string }) {
  const [code, setCode] = useState(initialCode);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState("");

  const say = (m: string) => {
    setToast(m);
    setTimeout(() => setToast(""), 3200);
  };

  return (
    <View style={{ flex: 1 }}>
      <Screen>
        <H2>Join a trip</H2>
        <Note style={{ marginBottom: 18 }}>
          Your organizer&apos;s invite link ends in a short code. Paste or type it here and
          you&apos;re in; joining is always free for travelers.
        </Note>
        <Card>
          <Field
            label="Invite code"
            value={code}
            onChangeText={setCode}
            placeholder="e.g. k7m2npqr"
            autoCapitalize="none"
          />
          <Button
            label="Join this trip"
            busy={busy}
            onPress={async () => {
              // Accept a pasted full link as readily as a bare code.
              const clean = code.trim().toLowerCase().replace(/^.*\/join\//, "").replace(/[^a-z0-9]/g, "");
              if (!clean) return say("Enter the invite code.");
              setBusy(true);
              const { error, group } = await joinGroup(clean);
              setBusy(false);
              if (error || !group) return say(error ?? "Couldn't join just now.");
              router.replace(`/group/${group.id}`);
            }}
          />
        </Card>
      </Screen>
      <Toast message={toast} />
    </View>
  );
}
