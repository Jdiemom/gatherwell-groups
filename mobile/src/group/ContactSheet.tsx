import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { C, FONT } from "@/theme";
import { CONTACT_EMAIL, CONTACT_PHONE, CONTACT_PHONE_HREF } from "@/shared";
import { Sheet } from "@/components/Sheet";
import { Body } from "@/components/ui";

/** "Need a human?" The advisory team sits behind every step. */
export function ContactSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const rows = [
    { title: "Email us", sub: CONTACT_EMAIL, url: `mailto:${CONTACT_EMAIL}` },
    { title: "Call us", sub: CONTACT_PHONE, url: `tel:${CONTACT_PHONE_HREF}` },
    { title: "Text us", sub: `Same number: ${CONTACT_PHONE}`, url: `sms:${CONTACT_PHONE_HREF}` },
  ];
  return (
    <Sheet visible={visible} title="Talk to a real person" onClose={onClose}>
      <Body style={{ marginBottom: 6 }}>
        The Gatherwell Travel advisory team is behind every step. Hand us one decision or the whole
        trip.
      </Body>
      {rows.map((r) => (
        <Pressable
          key={r.title}
          accessibilityRole="link"
          style={st.row}
          onPress={() => Linking.openURL(r.url).catch(() => {})}
        >
          <View>
            <Text style={st.title}>{r.title}</Text>
            <Text style={st.sub}>{r.sub}</Text>
          </View>
        </Pressable>
      ))}
    </Sheet>
  );
}

const st = StyleSheet.create({
  row: {
    borderTopWidth: 1,
    borderTopColor: C.line,
    paddingVertical: 16,
  },
  title: { fontFamily: FONT.sansSemi, fontSize: 16, color: C.ink },
  sub: { fontFamily: FONT.sans, fontSize: 14, color: C.inkSoft, marginTop: 2 },
});
