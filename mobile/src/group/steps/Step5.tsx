import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { C, FONT } from "@/theme";
import { matchDestinations } from "@/shared";
import { Button, Callout, Field, H3, Lead, Note, Panel, Row } from "@/components/ui";
import { budgetTotal, visionLabels } from "../derive";
import type { StepCtx } from "../ctx";

export function Step5({ ctx }: { ctx: StepCtx }) {
  const [skip, setSkip] = useState("");

  const matches = ctx.completed.has(2)
    ? matchDestinations({
        labels: visionLabels(ctx.polls, ctx.members, ctx.group),
        budgetPerPerson:
          ctx.budget || ctx.completed.has(4) ? budgetTotal(ctx.effectiveBudget) : null,
        kidsPresent: ctx.members.some((m) => (m.meta?.kids ?? 0) > 0),
        nightsKnown:
          typeof ctx.tripLength === "number"
            ? ctx.tripLength
            : ctx.group.data?.dates?.nights ?? null,
      })
    : [];

  return (
    <>
      {ctx.renderHeader(5)}
      <Lead>
        Now, and only now, the group picks where. Vote from a short list that fits the locked vision,
        dates, and budget.
      </Lead>

      {matches.length > 0 && (
        <Panel title="Matched to your group" tag="by Gatherwell">
          <Note style={{ marginTop: 0, marginBottom: 14 }}>
            Scored against your group&apos;s own votes: the vision, the budget, who&apos;s coming, and
            how far you&apos;ll fly.
          </Note>
          {matches.map(({ d, why }) => (
            <View key={d.id} style={st.card}>
              <View style={st.head}>
                <H3 style={{ flexShrink: 1 }}>{d.name}</H3>
                <Text style={st.country}>{d.country}</Text>
              </View>
              <Text style={st.months}>{d.months}</Text>
              <Text style={st.blurb}>{d.blurb}</Text>
              {why.length > 0 && <Text style={st.why}>Why it fits: {why.join(" · ")}</Text>}
              {!!d.picks?.length && (
                <Text style={st.picks}>
                  Gatherwell insider access: {d.picks.map((p) => p.t).join(" · ")}
                </Text>
              )}
              <Row style={{ marginTop: 10 }}>
                {ctx.isOrganizer && !ctx.completed.has(5) && (
                  <Button
                    label="Add to the shortlist"
                    small
                    onPress={() => ctx.onAddDestination(`${d.name}, ${d.country}`, d.blurb)}
                  />
                )}
                {d.villa >= 1 && (
                  <Button
                    label="See villas"
                    kind="outline"
                    small
                    onPress={() => ctx.openUrl("https://villa-info.net")}
                  />
                )}
              </Row>
            </View>
          ))}
        </Panel>
      )}

      {ctx.isOrganizer && !ctx.completed.has(5) && (
        <Callout title="Already decided?">
          <Note style={{ marginTop: 0, marginBottom: 8 }}>Skip the vote and enter it.</Note>
          <Field value={skip} onChangeText={setSkip} placeholder="e.g. Algarve, Portugal" />
          <Button
            label="Lock it in"
            kind="outline"
            small
            onPress={() => ctx.onSkipDestination(skip)}
            style={{ alignSelf: "flex-start" }}
          />
        </Callout>
      )}

      {ctx.renderPolls(5)}

      <Callout tone="sage" title="Why the shortlist stays short">
        Groups pick fastest and happiest from 3–5 vetted options. Unlimited options are where group
        trips go to die.
      </Callout>

      <View style={{ marginTop: 10 }}>{ctx.renderCompleteButton(5, "Lock the Winner →")}</View>
    </>
  );
}

const st = StyleSheet.create({
  card: { borderTopWidth: 1, borderTopColor: C.line, paddingTop: 14, marginBottom: 14 },
  head: { flexDirection: "row", alignItems: "baseline", gap: 8, flexWrap: "wrap" },
  country: { fontFamily: FONT.sans, fontSize: 13.5, color: C.inkSoft },
  months: {
    fontFamily: FONT.sansSemi,
    fontSize: 10.5,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    color: C.gold,
    marginTop: 4,
  },
  blurb: { fontFamily: FONT.sans, fontSize: 14.5, lineHeight: 22, color: C.ink, marginTop: 8 },
  why: { fontFamily: FONT.sansMedium, fontSize: 13.5, lineHeight: 21, color: C.sageDeep, marginTop: 8 },
  picks: { fontFamily: FONT.sans, fontSize: 13, lineHeight: 20, color: C.inkSoft, marginTop: 6 },
});
