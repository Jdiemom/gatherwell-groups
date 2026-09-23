import { View } from "react-native";
import { Sheet } from "@/components/Sheet";
import { H3, Note } from "@/components/ui";
import { PollOptionRow } from "./polls/PollOption";
import { weightOf } from "./derive";
import type { Member, Poll } from "./types";

/**
 * When the group is split, the organizer decides. The website shows only the
 * tied options, and so does this.
 */
export function TieBreakSheet({
  tie,
  members,
  onPick,
  onClose,
}: {
  tie: { stepN: number; polls: Poll[] } | null;
  members: Member[];
  onPick: (pollId: string, optionId: string) => void;
  onClose: () => void;
}) {
  return (
    <Sheet visible={!!tie} title="Break the tie" onClose={onClose}>
      <Note style={{ marginTop: 0, marginBottom: 16 }}>
        The group is split, so the call is yours. Pick the winner for each tied poll; your choice is
        recorded as the decision.
      </Note>

      {(tie?.polls ?? []).map((poll) => {
        const counts = poll.options
          .filter((o) => !o.label.toLowerCase().includes("flexible"))
          .map((o) => ({
            o,
            c: poll.votes
              .filter((v) => v.option_id === o.id)
              .reduce((sum, v) => sum + weightOf(members, v.user_id), 0),
          }))
          .sort((a, b) => b.c - a.c);
        const top = counts.filter((x) => x.c === counts[0]?.c);

        return (
          <View key={poll.id} style={{ marginBottom: 18 }}>
            <H3 style={{ marginBottom: 8 }}>{poll.question}</H3>
            {top.map(({ o, c }) => (
              <PollOptionRow
                key={o.id}
                label={o.label}
                meta={o.meta}
                count={c}
                share={1}
                onPress={() => onPick(poll.id, o.id)}
              />
            ))}
          </View>
        );
      })}

      <Note>After the ties are broken, complete the step again.</Note>
    </Sheet>
  );
}
