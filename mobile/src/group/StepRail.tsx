import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { C, FONT, RADIUS } from "@/theme";
import { STEPS } from "@/shared";

/**
 * The website shows all nine steps in a sidebar. A phone has no room for that, so
 * the same rail becomes a horizontal strip pinned under the header: same states
 * (done / active / locked), same tap-to-jump, same locking rule.
 */
export function StepRail({
  completed,
  current,
  nextStep,
  onPick,
}: {
  completed: Set<number>;
  current: number;
  nextStep: number;
  onPick: (n: number) => void;
}) {
  return (
    <View style={st.wrap}>
      <View style={st.progTrack}>
        <View style={[st.progFill, { width: `${(completed.size / 9) * 100}%` }]} />
      </View>
      <Text style={st.progLabel}>{completed.size} of 9 steps complete</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.row}>
        {STEPS.map((step) => {
          const done = completed.has(step.n);
          const locked = !done && step.n > nextStep;
          const active = step.n === current;
          return (
            <Pressable
              key={step.n}
              onPress={() => onPick(step.n)}
              accessibilityRole="tab"
              accessibilityState={{ selected: active, disabled: locked }}
              accessibilityLabel={`Step ${step.n}, ${step.t}${
                done ? ", complete" : locked ? ", locked" : ""
              }`}
              style={[st.item, active && st.itemActive, locked && st.itemLocked]}
            >
              <View style={[st.dot, done && st.dotDone, active && st.dotActive]}>
                <Text style={[st.dotText, (done || active) && { color: "#fff" }]}>
                  {done ? "✓" : step.n}
                </Text>
              </View>
              <Text style={[st.title, active && st.titleActive]} numberOfLines={1}>
                {step.t}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  wrap: {
    backgroundColor: C.white,
    borderBottomWidth: 1,
    borderBottomColor: C.line,
    paddingTop: 12,
    paddingBottom: 10,
  },
  progTrack: { height: 3, backgroundColor: C.cream2, marginHorizontal: 20, borderRadius: 2 },
  progFill: { height: 3, backgroundColor: C.sageDeep, borderRadius: 2 },
  progLabel: {
    fontFamily: FONT.sansSemi,
    fontSize: 10.5,
    letterSpacing: 1.4,
    textTransform: "uppercase",
    color: C.inkSoft,
    marginTop: 7,
    marginHorizontal: 20,
  },
  row: { paddingHorizontal: 14, paddingTop: 10, gap: 8 },
  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 11,
    borderRadius: RADIUS,
    borderWidth: 1,
    borderColor: "transparent",
    maxWidth: 190,
  },
  itemActive: { borderColor: C.line, backgroundColor: C.cream },
  itemLocked: { opacity: 0.4 },
  dot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: C.lineDark,
    alignItems: "center",
    justifyContent: "center",
  },
  dotDone: { backgroundColor: C.sageDeep, borderColor: C.sageDeep },
  dotActive: { backgroundColor: C.terracotta, borderColor: C.terracotta },
  dotText: { fontFamily: FONT.sansBold, fontSize: 11, color: C.inkSoft },
  title: { fontFamily: FONT.sansMedium, fontSize: 13, color: C.inkSoft, flexShrink: 1 },
  titleActive: { color: C.ink, fontFamily: FONT.sansSemi },
});
