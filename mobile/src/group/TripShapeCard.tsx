import { StyleSheet, Text, View } from "react-native";
import { C, FONT } from "@/theme";
import { Card } from "@/components/ui";

/** The website's "The trip so far" sidebar panel. */
export function TripShapeCard({
  items,
}: {
  items: { label: string; value: string; locked: boolean }[];
}) {
  if (items.length === 0) return null;
  return (
    <Card style={{ marginBottom: 18 }}>
      <Text style={st.head}>The trip so far</Text>
      {items.map((it) => (
        <View key={it.label} style={st.row}>
          <Text style={st.k}>{it.label}</Text>
          <Text style={st.v}>{it.value}</Text>
          <Text style={[st.state, { color: it.locked ? C.sageDeep : C.gold }]}>
            {it.locked ? "locked in" : "leaning"}
          </Text>
        </View>
      ))}
    </Card>
  );
}

const st = StyleSheet.create({
  head: {
    fontFamily: FONT.sansBold,
    fontSize: 11,
    letterSpacing: 2,
    textTransform: "uppercase",
    color: C.gold,
    marginBottom: 12,
  },
  row: { paddingVertical: 8, borderTopWidth: 1, borderTopColor: C.cream2 },
  k: {
    fontFamily: FONT.sansSemi,
    fontSize: 10.5,
    letterSpacing: 1.4,
    textTransform: "uppercase",
    color: C.inkSoft,
  },
  v: { fontFamily: FONT.sansSemi, fontSize: 14.5, color: C.ink, lineHeight: 21, marginTop: 2 },
  state: {
    fontFamily: FONT.sansSemi,
    fontSize: 11,
    letterSpacing: 0.6,
    marginTop: 1,
  },
});
