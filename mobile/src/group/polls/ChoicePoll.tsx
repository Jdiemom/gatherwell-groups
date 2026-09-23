import { Pressable, StyleSheet, Text, View } from "react-native";
import { C, FONT } from "@/theme";
import { Callout, Chip, ChipRow, H3, Note } from "@/components/ui";
import { PollOptionRow } from "./PollOption";
import { weightOf } from "../derive";
import type { Group, Member, Poll } from "../types";

/**
 * "Pick one winner" and the anonymous budget poll. Budget polls show totals only,
 * never who voted for what, which is the whole point of Step 4.
 */
export function ChoicePoll({
  poll,
  members,
  group,
  userId,
  closed,
  isOrganizer,
  onVote,
  onRemove,
  onRecordDecision,
  removeArmed,
  recordOpen,
  onToggleRecord,
}: {
  poll: Poll;
  members: Member[];
  group: Group;
  userId: string;
  closed: boolean;
  isOrganizer: boolean;
  onVote: (optionId: string) => void;
  onRemove: () => void;
  onRecordDecision: (optionId: string) => void;
  removeArmed: boolean;
  recordOpen: boolean;
  onToggleRecord: () => void;
}) {
  const override = group.data?.decisions?.[poll.id];
  const shut = closed || !!override;
  const total = poll.votes.reduce((s, v) => s + weightOf(members, v.user_id), 0);
  const mine = poll.votes.find((v) => v.user_id === userId)?.option_id;
  const isBudget = poll.kind === "budget";

  const countFor = (optionId: string) =>
    poll.votes.filter((v) => v.option_id === optionId).reduce((s, v) => s + weightOf(members, v.user_id), 0);

  const max = Math.max(
    0,
    ...poll.options.filter((o) => !o.label.toLowerCase().includes("flexible")).map((o) => countFor(o.id))
  );

  const voted = new Set(poll.votes.map((v) => v.user_id)).size;

  return (
    <View style={{ marginBottom: 24 }}>
      <View style={st.head}>
        <H3 style={{ flex: 1 }}>{poll.question}</H3>
        {shut && <Text style={st.decided}>Decided</Text>}
      </View>

      {isOrganizer && !shut && (
        <View style={st.adminRow}>
          <Pressable onPress={onRemove} accessibilityRole="button">
            <Text style={st.adminBtn}>{removeArmed ? "Tap again to remove" : "Remove"}</Text>
          </Pressable>
          <Pressable onPress={onToggleRecord} accessibilityRole="button">
            <Text style={[st.adminBtn, { color: C.sageDeep }]}>
              {recordOpen ? "Cancel" : "Already decided?"}
            </Text>
          </Pressable>
        </View>
      )}

      {recordOpen && !shut && (
        <Callout tone="sage" title="Record the decision your group already made">
          <Note style={{ marginTop: 0, marginBottom: 10 }}>
            Tap the option that won. It locks in without a vote.
          </Note>
          <ChipRow>
            {poll.options.map((o) => (
              <Chip key={o.id} label={o.label} onPress={() => onRecordDecision(o.id)} />
            ))}
          </ChipRow>
        </Callout>
      )}

      {poll.options.map((o) => {
        const count = countFor(o.id);
        const flex = o.label.toLowerCase().includes("flexible");
        const winner = override ? o.id === override : total > 0 && !flex && count === max && max > 0;
        return (
          <PollOptionRow
            key={o.id}
            label={o.label}
            meta={o.meta}
            count={count}
            share={total ? count / total : 0}
            selected={mine === o.id && !shut}
            winner={winner}
            closed={shut}
            onPress={() => onVote(o.id)}
          />
        );
      })}

      <Note>
        {shut
          ? "This poll closed when the step was completed. The winning option is locked in."
          : isBudget
          ? "Budget votes are anonymous: everyone sees the totals, never who picked what. Couples count twice."
          : `${voted} of ${members.length} have voted. Couples count as two votes.`}
      </Note>
    </View>
  );
}

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
  adminRow: { flexDirection: "row", gap: 18, marginBottom: 10 },
  adminBtn: { fontFamily: FONT.sansSemi, fontSize: 12.5, color: C.terracotta, letterSpacing: 0.3 },
});
