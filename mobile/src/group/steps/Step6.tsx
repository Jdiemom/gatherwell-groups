import { StyleSheet, Text, View } from "react-native";
import { C, FONT } from "@/theme";
import { Button, Lead, Note } from "@/components/ui";
import { fmt } from "../derive";
import { flightPlanDoc } from "../documents";
import { PartnerCard } from "./PartnerCard";
import type { StepCtx } from "../ctx";

export function Step6({ ctx }: { ctx: StepCtx }) {
  return (
    <>
      {ctx.renderHeader(6)}
      <Lead>
        This is where most groups burn the most money. Your dates are locked, so buy in the
        data-backed window.
      </Lead>

      {/* The buying-window timeline, rebuilt as three proportional bands. */}
      <View style={st.timeline} accessibilityLabel="Flight buying window timeline">
        <View style={[st.zone, { flex: 22, backgroundColor: "#F3D8C6" }]}>
          <Text style={[st.zoneText, { color: "#96430F" }]}>Too early</Text>
          <Text style={[st.zoneSub, { color: "#96430F" }]}>prices unsettled</Text>
        </View>
        <View style={[st.zone, { flex: 40, backgroundColor: "#CDE9E6" }]}>
          <Text style={[st.zoneText, { color: "#0B6A61" }]}>✓ Buying window</Text>
          <Text style={[st.zoneSub, { color: "#0B6A61" }]}>intl: ~2–6 months out</Text>
        </View>
        <View style={[st.zone, { flex: 38, backgroundColor: "#F3D8C6" }]}>
          <Text style={[st.zoneText, { color: "#96430F" }]}>Too late</Text>
          <Text style={[st.zoneSub, { color: "#96430F" }]}>fares climb weekly</Text>
        </View>
      </View>

      <Note>
        International fares have historically bottomed out around 2–6 months before departure;
        domestic 1–3 months out averages roughly 25% below peak. Airfare is dynamic and no window is
        guaranteed: this improves your odds, it is not a promise.
      </Note>

      {ctx.renderPolls(6)}

      <PartnerCard
        mark="S"
        markColor="#0770E3"
        title="Watch your route on Skyscanner"
        body='Search your route and dates, then tap "Get price alerts." Skyscanner emails you when the fare moves, so the group buys on a signal, not a hunch.'
        action="Open"
        onPress={() => ctx.openUrl("https://www.skyscanner.com")}
      />
      <PartnerCard
        mark="G"
        markColor="#4A3F35"
        title="Have Gatherwell ticket the group"
        badge="$50/person"
        body="Flat $50 per traveler, matching online pricing: advisors don't earn on flights. We hold group space and ticket everyone together. Ideal for 10+ from one city."
        action="Ask us"
        onPress={ctx.openContact}
      />

      <View style={{ marginTop: 10, gap: 10 }}>
        {ctx.renderCompleteButton(
          6,
          "Flights Planned. Complete Step →",
          true,
          `Estimated ${fmt(Math.round(ctx.members.length * 600 * 0.12))} kept by buying in the window.`
        )}
        <Button
          label="Preview flight plan"
          kind="outline"
          small
          onPress={() => ctx.showDoc(flightPlanDoc(ctx.group))}
        />
      </View>
    </>
  );
}

const st = StyleSheet.create({
  timeline: { flexDirection: "row", gap: 2, marginBottom: 4, marginTop: 4 },
  zone: { paddingVertical: 14, paddingHorizontal: 8, alignItems: "center", justifyContent: "center" },
  zoneText: { fontFamily: FONT.sansBold, fontSize: 11.5, textAlign: "center" },
  zoneSub: { fontFamily: FONT.sans, fontSize: 10.5, textAlign: "center", marginTop: 3 },
});
