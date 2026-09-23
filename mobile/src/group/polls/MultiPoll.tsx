import { StyleSheet, Text, View } from "react-native";
import { C, FONT } from "@/theme";
import { Button, Field, H3, Note } from "@/components/ui";
import { PollOptionRow } from "./PollOption";
import { weightOf } from "../derive";
import type { Member, Poll } from "../types";

/**
 * Step 8's activity poll. Activities are not rivals: a traveller picks everything
 * they would join, and anyone can add an idea of their own (kids' picks included).
 */
export function MultiPoll({
  poll,
  members,
  userId,
  headcount,
  closed,
  suggestion,
  onSuggestionChange,
  onSuggest,
  onToggle,
}: {
  poll: Poll;
  members: Member[];
  userId: string;
  headcount: number;
  closed: boolean;
  suggestion: string;
  onSuggestionChange: (t: string) => void;
  onSuggest: () => void;
  onToggle: (optionId: string) => void;
}) {
  const dv = (poll.dvotes ?? []).filter((v) => v.answer === "yes");
  const voted = new Set(dv.map((v) => v.user_id)).size;

  return (
    <View style={{ marginBottom: 24 }}>
      <View style={st.head}>
        <H3 style={{ flex: 1 }}>{poll.question}</H3>
        {closed && <Text style={st.decided}>Decided</Text>}
      </View>
      <Note style={{ marginTop: 0, marginBottom: 12 }}>
        Pick everything you&apos;d join. Activities aren&apos;t rivals; vote for all of them if you want.
      </Note>

      {poll.options.map((o) => {
        const count = dv
          .filter((v) => v.option_id === o.id)
          .reduce((s, v) => s + weightOf(members, v.user_id), 0);
        const mine = dv.some((v) => v.option_id === o.id && v.user_id === userId);
        return (
          <PollOptionRow
            key={o.id}
            label={o.label}
            meta={o.meta}
            count={count}
            countLabel={`${count} in`}
            share={count / Math.max(headcount, 1)}
            selected={mine}
            closed={closed}
            onPress={() => onToggle(o.id)}
          />
        );
      })}

      {!closed && (
        <View style={{ marginTop: 14 }}>
          <Field
            value={suggestion}
            onChangeText={onSuggestionChange}
            placeholder="Suggest your own, kids' picks welcome: e.g. Emma (9) wants the turtle snorkel"
          />
          <Button label="Add idea" kind="outline" small onPress={onSuggest} />
        </View>
      )}

      <Note>
        {closed
          ? "Anchors locked. The 60/40 rule protects the rest."
          : `${voted} of ${members.length} have picked so far. Couples count as two.`}
      </Note>
    </View>
  );
}

const st = StyleSheet.create({
  head: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 6 },
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
});
