import { useCallback, useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { C, FONT } from "@/theme";
import { useSession } from "@/lib/session";
import { loadDashboard, type DashboardGroup } from "@/group/load";
import { createGroup } from "@/group/actions";
import { Button, Card, Chip, ChipRow, Divider, Field, H2, Note, Pill, Row } from "@/components/ui";
import { Toast } from "@/components/Toast";

const TRIP_TYPES = [
  "Family reunion",
  "Friends getaway",
  "Milestone celebration",
  "Multigenerational trip",
  "Other",
];

export default function Trips() {
  const { userId, email, signOut } = useSession();
  const [groups, setGroups] = useState<DashboardGroup[]>([]);
  const [hasActiveSub, setHasActiveSub] = useState(false);
  const [plan, setPlan] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState("");

  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [tripType, setTripType] = useState(TRIP_TYPES[0]);
  const [busy, setBusy] = useState(false);

  const say = (m: string) => {
    setToast(m);
    setTimeout(() => setToast(""), 3200);
  };

  const refresh = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    const data = await loadDashboard(userId);
    setGroups(data.groups);
    setHasActiveSub(data.hasActiveSub);
    setPlan(data.plan);
    setLoading(false);
  }, [userId]);

  // Coming back from a group should show any change immediately.
  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh])
  );

  return (
    <View style={{ flex: 1, backgroundColor: C.cream }}>
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 60 }}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} tintColor={C.terracotta} />}
      >
        <Row style={{ marginBottom: 16 }}>
          {!!plan && <Pill tone="teal">{plan[0].toUpperCase() + plan.slice(1)} plan</Pill>}
          {!!email && <Pill>{email}</Pill>}
        </Row>

        <H2>Your trips</H2>
        <Note style={{ marginBottom: 18 }}>Every group you organize or belong to lives here.</Note>

        {!loading && groups.length === 0 && (
          <Card>
            <Note style={{ marginTop: 0 }}>
              {hasActiveSub
                ? "No trips yet. Start your first group below."
                : "No trips yet. Join one with an invite code from a friend, or subscribe on the website to start your own."}
            </Note>
          </Card>
        )}

        {groups.map((g) => (
          <Pressable
            key={g.id}
            accessibilityRole="button"
            onPress={() => router.push(`/group/${g.id}`)}
            style={({ pressed }) => [st.groupRow, pressed && { opacity: 0.9 }]}
          >
            <View style={{ flex: 1 }}>
              <Text style={st.groupName}>{g.name}</Text>
              <Text style={st.groupMeta}>
                {g.role === "organizer" ? "You're the organizer" : "Member"}
                {g.trip_type ? ` · ${g.trip_type}` : ""}
              </Text>
            </View>
            <Text style={st.open}>Open →</Text>
          </Pressable>
        ))}

        <Divider />

        <Button
          label="Join a trip with a code"
          kind="outline"
          onPress={() => router.push("/join")}
          style={{ marginBottom: 14 }}
        />

        {hasActiveSub ? (
          creating ? (
            <Card>
              <H2 style={{ fontSize: 20, marginBottom: 12 }}>Start a new group trip</H2>
              <Field
                label="Trip name"
                value={name}
                onChangeText={setName}
                placeholder="e.g. Anderson Family Reunion 2027"
              />
              <Text style={st.label}>Trip type</Text>
              <ChipRow>
                {TRIP_TYPES.map((t) => (
                  <Chip key={t} label={t} on={tripType === t} onPress={() => setTripType(t)} />
                ))}
              </ChipRow>
              <Row>
                <Button
                  label="Create group"
                  busy={busy}
                  onPress={async () => {
                    if (!name.trim()) return say("Give your trip a name.");
                    setBusy(true);
                    const { error, id } = await createGroup(name.trim(), tripType);
                    setBusy(false);
                    if (error || !id) return say(error ?? "Something went wrong.");
                    setCreating(false);
                    setName("");
                    router.push(`/group/${id}`);
                  }}
                />
                <Button label="Cancel" kind="outline" onPress={() => setCreating(false)} />
              </Row>
            </Card>
          ) : (
            <Button label="+ Start a new group trip" onPress={() => setCreating(true)} />
          )
        ) : (
          <Card>
            <H2 style={{ fontSize: 20, marginBottom: 8 }}>Ready to organize a trip?</H2>
            <Note style={{ marginTop: 0 }}>
              One subscription covers your whole group. Plans start at $19 a month and are set up on
              the website at groupsbygatherwell.com, then you sign in here with the same email.
            </Note>
          </Card>
        )}

        <Divider />
        <Button
          label="Sign out"
          kind="ghost"
          small
          onPress={async () => {
            await signOut();
            router.replace("/sign-in");
          }}
        />
      </ScrollView>
      <Toast message={toast} />
    </View>
  );
}

const st = StyleSheet.create({
  groupRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.line,
    padding: 16,
    marginBottom: 10,
  },
  groupName: { fontFamily: FONT.sansSemi, fontSize: 16.5, color: C.ink },
  groupMeta: { fontFamily: FONT.sans, fontSize: 13.5, color: C.inkSoft, marginTop: 2 },
  open: { fontFamily: FONT.sansSemi, fontSize: 12.5, color: C.sageDeep, letterSpacing: 0.6 },
  label: {
    fontFamily: FONT.sansSemi,
    fontSize: 11.5,
    letterSpacing: 1.3,
    textTransform: "uppercase",
    color: C.inkSoft,
    marginBottom: 6,
  },
});
