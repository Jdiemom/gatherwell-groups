import { StyleSheet, Text, View } from "react-native";
import { C, FONT, RADIUS } from "@/theme";
import { Button } from "@/components/ui";

/** The website's `.partner-card`: logo square, pitch, and one action. */
export function PartnerCard({
  mark,
  markColor,
  title,
  badge,
  body,
  action,
  onPress,
}: {
  mark: string;
  markColor: string;
  title: string;
  badge?: string;
  body: string;
  action: string;
  onPress: () => void;
}) {
  return (
    <View style={st.card}>
      <View style={st.row}>
        <View style={[st.mark, { backgroundColor: markColor }]}>
          <Text style={st.markText}>{mark}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={st.title}>{title}</Text>
          {!!badge && <Text style={st.badge}>{badge}</Text>}
        </View>
      </View>
      <Text style={st.body}>{body}</Text>
      <Button label={action} kind="sage" small onPress={onPress} style={{ alignSelf: "flex-start" }} />
    </View>
  );
}

const st = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: C.white,
    borderRadius: RADIUS,
    padding: 16,
    marginBottom: 12,
    gap: 10,
  },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  mark: { width: 38, height: 38, borderRadius: RADIUS, alignItems: "center", justifyContent: "center" },
  markText: { color: "#fff", fontFamily: FONT.sansBold, fontSize: 17 },
  title: { fontFamily: FONT.serif, fontSize: 16.5, color: C.ink, lineHeight: 22 },
  badge: {
    fontFamily: FONT.sansBold,
    fontSize: 9.5,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    color: C.gold,
    marginTop: 3,
  },
  body: { fontFamily: FONT.sans, fontSize: 14, lineHeight: 21, color: C.inkSoft },
});
