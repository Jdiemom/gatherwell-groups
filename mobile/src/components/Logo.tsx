import { StyleSheet, Text, View } from "react-native";
import { C, FONT } from "@/theme";

/** The wordmark from the site nav: "Groups by Gatherwell / GROUP TRAVEL, SOLVED". */
export function Logo({ tagline = false }: { tagline?: boolean }) {
  return (
    <View>
      <Text style={st.logo}>
        Groups <Text style={st.by}>by Gatherwell</Text>
      </Text>
      {tagline && <Text style={st.tag}>Group Travel, Solved</Text>}
    </View>
  );
}

const st = StyleSheet.create({
  logo: { fontFamily: FONT.serif, fontSize: 21, color: C.ink, letterSpacing: -0.2 },
  by: { color: C.terracotta },
  tag: {
    fontFamily: FONT.sansSemi,
    fontSize: 8.5,
    letterSpacing: 2.8,
    textTransform: "uppercase",
    color: C.gold,
    marginTop: 3,
  },
});
