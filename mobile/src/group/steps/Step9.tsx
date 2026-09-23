import { Pressable, StyleSheet, Text, View } from "react-native";
import { C, FONT, RADIUS } from "@/theme";
import { Button, Callout, Chip, ChipRow, Lead, Note, Panel, Row } from "@/components/ui";
import {
  budgetTotal,
  buildItinerary,
  dayLabel,
  fmt,
  installmentDates,
  moveItem,
  paymentInstallments,
} from "../derive";
import { itineraryPrintHtml, masterItineraryDoc, paymentScheduleDoc } from "../documents";
import { printHtml } from "@/lib/output";
import type { StepCtx } from "../ctx";
import type { PayPlan } from "../types";

const PLANS: [PayPlan, string][] = [
  ["full", "Pay in full"],
  ["monthly", "Monthly until the trip"],
  ["biweekly", "Twice a month"],
];

export function Step9({ ctx }: { ctx: StepCtx }) {
  const b = ctx.effectiveBudget;
  const total = budgetTotal(b);
  const { label, count } = paymentInstallments(ctx.dates, ctx.payplan);
  const per = Math.ceil(total / count);
  const itin = ctx.itinerary;

  return (
    <>
      {ctx.renderHeader(9)}
      <Lead>
        Everything the group decided, in one place. This is the moment the group chat goes blissfully
        silent.
      </Lead>

      <View style={st.savings}>
        <Text style={st.savingsLabel}>Total estimated savings this trip</Text>
        <Text style={st.savingsValue}>{fmt(ctx.savings)}</Text>
        <Text style={st.savingsNote}>
          vs. per-person advisor fees and un-timed flight purchases.
        </Text>
      </View>

      <Panel title="The itinerary" tag="the keepsake">
        {!ctx.dates ? (
          <Note style={{ marginTop: 0 }}>
            Lock your dates in Step 3 and the day-by-day itinerary builds itself here.
          </Note>
        ) : itin === null ? (
          <>
            <Note style={{ marginTop: 0, marginBottom: 12 }}>
              One tap drafts your {ctx.dates.nights + 1} days: winning activities placed, transfers
              and the welcome dinner slotted, free time protected. Then shape it however you like.
            </Note>
            {ctx.isOrganizer ? (
              <Button
                label="Build my itinerary"
                small
                style={{ alignSelf: "flex-start" }}
                onPress={() =>
                  ctx.setItinerary(
                    buildItinerary(ctx.group, ctx.polls, ctx.members, ctx.tripLength)
                  )
                }
              />
            ) : (
              <Note style={{ marginTop: 0 }}>
                Your organizer builds this; it appears here when saved.
              </Note>
            )}
          </>
        ) : (
          <>
            {itin.map((day, di) => (
              <View key={di} style={st.day}>
                <Text style={st.dayHead}>{dayLabel(di, ctx.dates)}</Text>
                {day.items.map((item, ii) => (
                  <View key={item.id} style={st.item}>
                    <Text style={st.itemText}>{item.t}</Text>
                    <View style={st.itemActions}>
                      {!!item.link && (
                        <Pressable onPress={() => ctx.openUrl(item.link!)} accessibilityRole="link">
                          <Text style={st.link}>
                            {item.k === "transfer" ? "Book transfer" : "Research"}
                          </Text>
                        </Pressable>
                      )}
                      {ctx.isOrganizer && (
                        <>
                          {(
                            [
                              ["↑", "up", "Move up"],
                              ["↓", "down", "Move down"],
                              ["◂", "prevDay", "Move to previous day"],
                              ["▸", "nextDay", "Move to next day"],
                            ] as const
                          ).map(([glyph, dir, label]) => (
                            <Pressable
                              key={dir}
                              hitSlop={8}
                              accessibilityRole="button"
                              accessibilityLabel={label}
                              onPress={() => ctx.setItinerary(moveItem(itin, di, ii, dir))}
                            >
                              <Text style={st.ctl}>{glyph}</Text>
                            </Pressable>
                          ))}
                          <Pressable
                            hitSlop={8}
                            accessibilityRole="button"
                            accessibilityLabel="Remove this item"
                            onPress={() => {
                              const days = itin.map((d) => ({ items: [...d.items] }));
                              days[di].items.splice(ii, 1);
                              ctx.setItinerary(days);
                            }}
                          >
                            <Text style={[st.ctl, { color: C.terracotta }]}>✕</Text>
                          </Pressable>
                        </>
                      )}
                    </View>
                  </View>
                ))}
                {ctx.isOrganizer && (
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => {
                      const days = itin.map((d) => ({ items: [...d.items] }));
                      days[di].items.push({
                        id: `n${di}-${days[di].items.length}-${Math.floor(Math.random() * 1e6)}`,
                        t: "New plan…",
                        k: "custom",
                      });
                      ctx.setItinerary(days);
                    }}
                  >
                    <Text style={st.add}>+ Add to this day</Text>
                  </Pressable>
                )}
              </View>
            ))}

            <Row style={{ marginTop: 16 }}>
              {ctx.isOrganizer && (
                <Button label="Save itinerary" small busy={ctx.busy} onPress={ctx.onSaveItinerary} />
              )}
              {ctx.isSolo ? (
                <Note style={{ marginTop: 0 }}>
                  🔒 Print edition is on the Group plan. Upgrade on the website to unlock it.
                </Note>
              ) : (
                <Button
                  label="Print / save as PDF"
                  kind="outline"
                  small
                  onPress={() =>
                    printHtml(
                      itineraryPrintHtml(ctx.group, itin, ctx.dates, ctx.headcount, total)
                    ).catch(() => ctx.say("Couldn't open the printer."))
                  }
                />
              )}
            </Row>
            <Note>
              Transfers are pre-bookable through our partner; twelve people in a taxi line is how
              trips start badly.
            </Note>
          </>
        )}
      </Panel>

      <Panel title="Payments">
        <Note style={{ marginTop: 0, marginBottom: 10 }}>
          How does the group want to pay itself off?
        </Note>
        <ChipRow>
          {PLANS.map(([v, text]) => (
            <Chip
              key={v}
              label={text}
              on={ctx.payplan === v}
              disabled={!ctx.isOrganizer}
              onPress={() => ctx.onSetPayPlan(v)}
            />
          ))}
        </ChipRow>
        <Note>
          {`${fmt(total)} per person as ${label}${count > 1 ? ` of ${fmt(per)}` : ""}. The schedule download lists every date, per traveler.`}
          {count > 1 ? ` First payment ${installmentDates(count, ctx.payplan)[0]}.` : ""}
        </Note>
      </Panel>

      <View style={{ marginTop: 14, gap: 10 }}>
        {ctx.renderCompleteButton(
          9,
          ctx.completed.has(9) ? "Trip Planned 🎉" : "Generate Final Outputs →",
          true,
          "Trip complete! 🎉 Every output is ready whenever you need it."
        )}
        <Button
          label="Itinerary preview"
          kind="outline"
          small
          onPress={() => ctx.showDoc(masterItineraryDoc(ctx.group, ctx.polls, b, ctx.headcount))}
        />
        <Button
          label="Payment schedule"
          kind="outline"
          small
          onPress={() =>
            ctx.showDoc(
              paymentScheduleDoc(ctx.group, ctx.members, b, ctx.headcount, ctx.dates, ctx.payplan)
            )
          }
        />
      </View>

      {ctx.completed.has(9) && (
        <Callout title="Next trip?">
          Your group and its history stay saved. Start the next adventure from your dashboard.
        </Callout>
      )}
    </>
  );
}

const st = StyleSheet.create({
  savings: {
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: C.white,
    borderRadius: RADIUS,
    padding: 16,
    marginBottom: 14,
  },
  savingsLabel: {
    fontFamily: FONT.sansSemi,
    fontSize: 10.5,
    letterSpacing: 1.4,
    textTransform: "uppercase",
    color: C.inkSoft,
  },
  savingsValue: { fontFamily: FONT.serif, fontSize: 32, color: C.sageDeep, marginTop: 4 },
  savingsNote: { fontFamily: FONT.sans, fontSize: 13, color: C.inkSoft, marginTop: 2, lineHeight: 20 },

  day: { marginBottom: 16 },
  dayHead: {
    fontFamily: FONT.sansBold,
    fontSize: 10.5,
    letterSpacing: 1.6,
    textTransform: "uppercase",
    color: C.gold,
    borderBottomWidth: 1,
    borderBottomColor: C.line,
    paddingBottom: 6,
    marginBottom: 8,
  },
  item: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: C.cream2 },
  itemText: { fontFamily: FONT.sans, fontSize: 14.5, lineHeight: 22, color: C.ink },
  itemActions: { flexDirection: "row", alignItems: "center", gap: 16, marginTop: 6 },
  link: { fontFamily: FONT.sansSemi, fontSize: 12.5, color: C.terracotta },
  ctl: { fontSize: 16, color: C.inkSoft, paddingHorizontal: 2 },
  add: { fontFamily: FONT.sansSemi, fontSize: 13, color: C.sageDeep, marginTop: 10 },
});
