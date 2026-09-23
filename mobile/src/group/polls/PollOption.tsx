import { Pressable, StyleSheet, Text, View } from "react-native";
import { C, FONT, RADIUS } from "@/theme";

/**
 * The website's `.poll-opt` row: label, live vote count, optional description, and
 * a fill bar showing its share. Selected, winning and closed states all read the
 * same way they do in the browser.
 */
export function PollOptionRow({
  label,
  meta,
  count,
  share,
  selected,
  winner,
  closed,
  onPress,
  countLabel,
}: {
  label: string;
  meta?: string | null;
  count: number;
  /** 0-1; width of the fill bar. */
  share: number;
  selected?: boolean;
  winner?: boolean;
  closed?: boolean;
  onPress?: () => void;
  countLabel?: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected, disabled: !!closed }}
      accessibilityLabel={`${label}${count > 0 ? `, ${countLabel ?? `${count} votes`}` : ""}`}
      onPress={closed ? undefined : onPress}
      style={({ pressed }) => [
        st.opt,
        selected && st.sel,
        winner && st.win,
        closed && st.closed,
        pressed && !closed && { opacity: 0.9 },
      ]}
    >
      <View style={st.head}>
        <Text style={[st.name, (selected || winner) && st.nameOn]}>
          {selected ? "✓ " : ""}
          {label}
        </Text>
        {count > 0 && <Text style={st.count}>{countLabel ?? `${count} vote${count !== 1 ? "s" : ""}`}</Text>}
      </View>
      {!!meta && <Text style={st.meta}>{meta}</Text>}
      {count > 0 && (
        <View style={st.track}>
          <View style={[st.fill, { width: `${Math.max(0, Math.min(share, 1)) * 100}%` }]} />
        </View>
      )}
    </Pressable>
  );
}

const st = StyleSheet.create({
  opt: {
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: C.white,
    borderRadius: RADIUS,
    padding: 14,
    marginBottom: -1,
  },
  sel: { borderColor: C.terracotta, backgroundColor: "#FDF7F2", zIndex: 2 },
  win: { borderColor: C.sageDeep, backgroundColor: "#F3F5EF", zIndex: 2 },
  closed: { backgroundColor: C.cream },
  head: { flexDirection: "row", alignItems: "center", gap: 10 },
  name: { flex: 1, fontFamily: FONT.sansMedium, fontSize: 15.5, color: C.ink, lineHeight: 22 },
  nameOn: { fontFamily: FONT.sansSemi },
  count: {
    fontFamily: FONT.sansSemi,
    fontSize: 12,
    color: C.inkSoft,
    letterSpacing: 0.4,
  },
  meta: { fontFamily: FONT.sans, fontSize: 13.5, color: C.inkSoft, marginTop: 3, lineHeight: 20 },
  track: { height: 3, backgroundColor: C.cream2, marginTop: 10, borderRadius: 2, overflow: "hidden" },
  fill: { height: 3, backgroundColor: C.goldSoft },
});
