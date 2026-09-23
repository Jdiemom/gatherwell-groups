import { Pressable, StyleSheet, Text, View } from "react-native";
import { C, FONT, RADIUS } from "@/theme";
import { H3, Note } from "@/components/ui";
import { weightOf } from "../derive";
import type { Member, Poll } from "../types";

const ANSWERS = ["yes", "maybe", "no"] as const;
type Answer = (typeof ANSWERS)[number];

/**
 * Step 3's availability poll: every traveller answers Yes / Maybe / No for each
 * candidate window, and the front-runner surfaces itself.
 */
export function DatePoll({
  poll,
  members,
  userId,
  closed,
  isOrganizer,
  onAnswer,
  onRemove,
  removeArmed,
}: {
  poll: Poll;
  members: Member[];
  userId: string;
  closed: boolean;
  isOrganizer: boolean;
  onAnswer: (optionId: string, answer: Answer) => void;
  onRemove: () => void;
  removeArmed: boolean;
}) {
  const dv = poll.dvotes ?? [];
  const sum = (rows: { user_id: string }[]) => rows.reduce((s, v) => s + weightOf(members, v.user_id), 0);

  const scored = poll.options.map((o) => ({
    o,
    yes: sum(dv.filter((v) => v.option_id === o.id && v.answer === "yes")),
    maybe: sum(dv.filter((v) => v.option_id === o.id && v.answer === "maybe")),
    no: sum(dv.filter((v) => v.option_id === o.id && v.answer === "no")),
  }));
  const best = [...scored].sort((a, b) => b.yes - a.yes || b.maybe - a.maybe || a.no - b.no)[0];

  const answeredAll = members.filter((m) =>
    poll.options.every((o) => dv.some((v) => v.user_id === m.user_id && v.option_id === o.id))
  ).length;

  return (
    <View style={{ marginBottom: 24 }}>
      <View style={st.head}>
        <H3 style={{ flex: 1 }}>{poll.question}</H3>
        {closed && <Text style={st.decided}>Decided</Text>}
      </View>
      {isOrganizer && !closed && (
        <Pressable onPress={onRemove} accessibilityRole="button" style={{ marginBottom: 10 }}>
          <Text style={st.adminBtn}>{removeArmed ? "Tap again to remove" : "Remove"}</Text>
        </Pressable>
      )}

      {scored.map(({ o, yes, maybe, no }) => {
        const mine = dv.find((v) => v.user_id === userId && v.option_id === o.id)?.answer as
          | Answer
          | undefined;
        const isBest = best && best.o.id === o.id && best.yes > 0;
        return (
          <View key={o.id} style={[st.row, isBest && st.rowBest]}>
            <View style={{ marginBottom: 10 }}>
              <View style={st.labelRow}>
                <Text style={st.name}>{o.label}</Text>
                {isBest && <Text style={st.front}>Front-runner</Text>}
              </View>
              {yes + maybe + no > 0 && (
                <Text style={st.counts}>
                  {yes} yes · {maybe} maybe · {no} no
                </Text>
              )}
            </View>
            <View style={st.btns}>
              {ANSWERS.map((a) => (
                <Pressable
                  key={a}
                  disabled={closed}
                  onPress={() => onAnswer(o.id, a)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: mine === a, disabled: closed }}
                  accessibilityLabel={`${a} for ${o.label}`}
                  style={[st.btn, mine === a && toneOn[a], closed && { opacity: 0.55 }]}
                >
                  <Text style={[st.btnText, mine === a && { color: "#fff" }]}>
                    {a === "yes" ? "Yes" : a === "maybe" ? "Maybe" : "No"}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        );
      })}

      <Note>
        {closed
          ? "Dates locked in."
          : `${answeredAll} of ${members.length} travelers have answered every date. When everyone has, the results go to the whole group automatically.`}
      </Note>
    </View>
  );
}

const toneOn = {
  yes: { backgroundColor: C.sageDeep, borderColor: C.sageDeep },
  maybe: { backgroundColor: C.gold, borderColor: C.gold },
  no: { backgroundColor: C.terracotta, borderColor: C.terracotta },
} as const;

const st = StyleSheet.create({
  head: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 },
  decided: {
    fontFamily: FONT.sansBold,
    fontSize: 10.5,
    letterSpacing: 1.4,
    textTransform: "uppercase",
    color: C.sageDeep,
    borderWidth: 1,
    borderColor: "#C9D2C0",
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  adminBtn: { fontFamily: FONT.sansSemi, fontSize: 12.5, color: C.terracotta },
  row: {
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: C.white,
    padding: 15,
    marginBottom: -1,
    borderRadius: RADIUS,
  },
  rowBest: { borderColor: C.sageDeep, backgroundColor: "#F7F9F4", zIndex: 1 },
  labelRow: { flexDirection: "row", alignItems: "center", gap: 10, flexWrap: "wrap" },
  name: { fontFamily: FONT.sansSemi, fontSize: 15.5, color: C.ink, flexShrink: 1 },
  front: {
    fontFamily: FONT.sansBold,
    fontSize: 10,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    color: C.sageDeep,
    borderWidth: 1,
    borderColor: "#C9D2C0",
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  counts: { fontFamily: FONT.sans, fontSize: 13, color: C.inkSoft, marginTop: 4 },
  btns: { flexDirection: "row", gap: 8 },
  btn: {
    flex: 1,
    borderWidth: 1,
    borderColor: C.lineDark,
    backgroundColor: C.cream,
    borderRadius: RADIUS,
    paddingVertical: 11,
    alignItems: "center",
    minHeight: 44,
    justifyContent: "center",
  },
  btnText: { fontFamily: FONT.sansSemi, fontSize: 13, color: C.ink },
});
