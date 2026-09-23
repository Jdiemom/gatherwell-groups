import { useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { C, FONT } from "@/theme";
import { Button, Callout, Chip, ChipRow, Field, Lead, Note, Panel, Row } from "@/components/ui";
import { BUDGET_ROWS, budgetBuffer, budgetTotal, fmt, votedBudgetTarget } from "../derive";
import { boostPreview, budgetDoc } from "../documents";
import type { StepCtx } from "../ctx";
import type { Budget } from "../types";

type BoostMode = "lump" | "perPerson" | "cover";

export function Step4({ ctx }: { ctx: StepCtx }) {
  const b = ctx.effectiveBudget;
  const editable = ctx.isOrganizer && !ctx.completed.has(4);
  const n = ctx.headcount;

  const [boostOpen, setBoostOpen] = useState(false);
  const [mode, setMode] = useState<BoostMode>("lump");
  const [amount, setAmount] = useState("");
  const [anonymous, setAnonymous] = useState(false);
  const [confirm, setConfirm] = useState(false);

  const update = (k: keyof Budget, v: string) =>
    ctx.setBudget({ ...b, [k]: Math.max(0, parseInt(v.replace(/\D/g, "") || "0", 10)) });

  const parsedAmount = parseInt(amount.replace(/\D/g, "") || "0", 10);
  const monthsNote = (() => {
    if (!ctx.dates) return "";
    const months = Math.max(1, Math.round((ctx.dates.start.getTime() - Date.now()) / (30 * 86400000)));
    return ` Save ${fmt(Math.ceil(budgetTotal(b) / months))} a month between now and departure and the trip is paid before you pack.`;
  })();

  return (
    <>
      {ctx.renderHeader(4)}
      <Lead>
        Money talk sinks friendships when it&apos;s public. Everyone votes a comfortable number
        anonymously; the group adopts a target from the honest middle.
      </Lead>

      {ctx.renderPolls(4)}

      <Panel
        title="Budget worksheet"
        tag={
          votedBudgetTarget(ctx.polls, ctx.members, ctx.group) && !ctx.budget
            ? "started from your group's vote"
            : undefined
        }
      >
        <View style={[st.row, st.head]}>
          <Text style={[st.cell, st.headText, { flex: 1.4 }]}>Category</Text>
          <Text style={[st.cell, st.headText, st.num]}>Per person</Text>
          <Text style={[st.cell, st.headText, st.num]}>Group of {n}</Text>
        </View>

        {BUDGET_ROWS.map(([k, label]) => (
          <View style={st.row} key={k}>
            <Text style={[st.cell, { flex: 1.4 }]}>{label}</Text>
            {editable ? (
              <TextInput
                style={[st.cell, st.num, st.input]}
                value={String(b[k])}
                keyboardType="numeric"
                onChangeText={(v) => update(k, v)}
                accessibilityLabel={`${label} per person`}
              />
            ) : (
              <Text style={[st.cell, st.num]}>{fmt(b[k])}</Text>
            )}
            <Text style={[st.cell, st.num]}>{fmt(b[k] * n)}</Text>
          </View>
        ))}

        <View style={st.row}>
          <Text style={[st.cell, { flex: 1.4 }]}>Buffer (10%)</Text>
          <Text style={[st.cell, st.num]}>{fmt(budgetBuffer(b))}</Text>
          <Text style={[st.cell, st.num]}>{fmt(budgetBuffer(b) * n)}</Text>
        </View>

        <View style={[st.row, st.total]}>
          <Text style={[st.cell, st.totalText, { flex: 1.4 }]}>TOTAL</Text>
          <Text style={[st.cell, st.totalText, st.num]}>{fmt(budgetTotal(b))}</Text>
          <Text style={[st.cell, st.totalText, st.num]}>{fmt(budgetTotal(b) * n)}</Text>
        </View>

        {editable && (
          <Button
            label="Save budget for the group"
            small
            onPress={() => ctx.onSaveBudget(b)}
            style={{ marginTop: 14, alignSelf: "flex-start" }}
          />
        )}

        <Note>
          {editable
            ? "Adjust the numbers to fit your trip, then save. Every later output uses these figures."
            : "Set by your organizer. Every budget output uses these figures."}
          {monthsNote}
        </Note>
      </Panel>

      {!ctx.completed.has(4) &&
        (ctx.isSolo ? (
          <Callout title="🔒 Boost the Budget · Group plan feature">
            On the Group plan, any traveler can add funds to the trip or cover it entirely, announced
            to the group on their terms. You can upgrade from your account on the website.
          </Callout>
        ) : (
          <Panel title="Feeling generous?">
            <Note style={{ marginTop: 0, marginBottom: 10 }}>
              Any traveler can raise the trip&apos;s budget, or take care of the whole thing.
            </Note>
            {!boostOpen ? (
              <Button
                label="I'd like to help fund this trip"
                kind="outline"
                small
                onPress={() => setBoostOpen(true)}
                style={{ alignSelf: "flex-start" }}
              />
            ) : (
              <>
                <Note style={{ marginTop: 0 }}>
                  For your group of {ctx.headcount}: the current budget totals{" "}
                  {fmt(budgetTotal(b) * ctx.headcount)} ({fmt(budgetTotal(b))} per person).
                </Note>
                <ChipRow>
                  <Chip label="Add a lump sum" on={mode === "lump"} onPress={() => { setMode("lump"); setConfirm(false); }} />
                  <Chip label="Add $ per traveler" on={mode === "perPerson"} onPress={() => { setMode("perPerson"); setConfirm(false); }} />
                  <Chip label="Cover the whole trip" on={mode === "cover"} onPress={() => { setMode("cover"); setConfirm(false); }} />
                </ChipRow>
                <Field
                  value={amount}
                  onChangeText={(t) => { setAmount(t); setConfirm(false); }}
                  placeholder={
                    mode === "cover"
                      ? "Type COVER to confirm"
                      : mode === "perPerson"
                      ? "Amount per traveler, e.g. 150"
                      : "Amount, e.g. 2000"
                  }
                  keyboardType={mode === "cover" ? "default" : "numeric"}
                  autoCapitalize={mode === "cover" ? "characters" : "none"}
                />
                <ChipRow>
                  <Chip label="Share my name" on={!anonymous} onPress={() => setAnonymous(false)} />
                  <Chip label="Keep me anonymous" on={anonymous} onPress={() => setAnonymous(true)} />
                </ChipRow>

                {mode === "cover" && (
                  <Callout title="Covering the whole trip?">
                    Our full-service team can plan and book every detail, so you only write one check.
                    Tap &quot;Need a human?&quot; at the top to reach Gatherwell Travel.
                  </Callout>
                )}

                <Callout tone="sage" title="The group will receive exactly this message:">
                  {boostPreview(
                    mode,
                    parsedAmount,
                    anonymous,
                    ctx.me?.name ?? "You",
                    ctx.headcount
                  )}
                </Callout>

                <Row>
                  {!confirm ? (
                    <Button
                      label="Continue"
                      small
                      onPress={() => {
                        if (mode !== "cover" && parsedAmount <= 0) {
                          ctx.say("Enter a real dollar amount.");
                          return;
                        }
                        if (mode === "cover" && amount.trim().toUpperCase() !== "COVER") {
                          ctx.say("Type COVER in the box to confirm you mean the whole trip.");
                          return;
                        }
                        setConfirm(true);
                      }}
                    />
                  ) : (
                    <Button
                      label="Confirm and tell the group"
                      small
                      busy={ctx.busy}
                      onPress={async () => {
                        await ctx.onBoost(mode, mode === "cover" ? 0 : parsedAmount, anonymous);
                        setBoostOpen(false);
                        setAmount("");
                        setConfirm(false);
                        setAnonymous(false);
                        setMode("lump");
                      }}
                    />
                  )}
                  <Button
                    label="Cancel"
                    kind="outline"
                    small
                    onPress={() => { setBoostOpen(false); setConfirm(false); setAmount(""); }}
                  />
                </Row>
              </>
            )}
          </Panel>
        ))}

      <Callout tone="teal" title="Track it in the Gatherwell Budgeting app">
        <Note style={{ marginTop: 0 }}>
          Once adopted, your budget becomes the yardstick for every later choice.
        </Note>
        <Button
          label="Get the Budgeting App"
          kind="sage"
          small
          onPress={() => ctx.openUrl("https://apps.apple.com/us/app/gatherwell-travel/id6762874183")}
          style={{ marginTop: 12, alignSelf: "flex-start" }}
        />
      </Callout>

      <View style={{ marginTop: 10, gap: 10 }}>
        {ctx.renderCompleteButton(4, "Adopt Budget →", true, "Budget set. Advisor fee avoided: ~$40/person.")}
        <Button
          label="Preview budget spreadsheet"
          kind="outline"
          small
          onPress={() => ctx.showDoc(budgetDoc(ctx.group, b, ctx.headcount))}
        />
      </View>
    </>
  );
}

const st = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: C.cream2,
  },
  head: { borderBottomWidth: 1, borderBottomColor: C.line },
  headText: {
    fontFamily: FONT.sansSemi,
    fontSize: 10.5,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    color: C.inkSoft,
  },
  cell: { fontFamily: FONT.sans, fontSize: 14.5, color: C.ink },
  num: { flex: 1, textAlign: "right" },
  input: {
    borderWidth: 1,
    borderColor: C.lineDark,
    backgroundColor: C.cream,
    paddingVertical: 7,
    paddingHorizontal: 9,
    fontFamily: FONT.sans,
    fontSize: 14.5,
    color: C.ink,
  },
  total: { borderBottomWidth: 0 },
  totalText: { fontFamily: FONT.sansBold, fontSize: 15.5 },
});
