import { View } from "react-native";
import { Callout, Lead } from "@/components/ui";
import { PartnerCard } from "./PartnerCard";
import type { StepCtx } from "../ctx";

export function Step8({ ctx }: { ctx: StepCtx }) {
  return (
    <>
      {ctx.renderHeader(8)}
      <Lead>
        Plan 60% of the days and protect the rest. Vote on the anchors; whitespace stays sacred.
      </Lead>

      {ctx.renderPolls(8)}

      <Callout tone="sage" title="The 60/40 rule">
        A few shared anchor experiences, plenty of unscheduled space. Over-scheduled groups come home
        tired; under-scheduled ones never leave the pool.
      </Callout>

      <PartnerCard
        mark="G"
        markColor="#FF5533"
        title="Book activities on GetYourGuide"
        badge="Partner link"
        body="Reserve the winning experiences. Free cancellation on most."
        action="Open"
        onPress={() =>
          ctx.openUrl("https://www.getyourguide.com?partner_id=J0NPR1G&cmp=share_to_earn")
        }
      />
      <PartnerCard
        mark="S"
        markColor="#1C5D8C"
        title="Cruising? Book shore excursions"
        badge="Partner link"
        body="Port-by-port excursions for the whole group."
        action="Open"
        onPress={() =>
          ctx.openUrl("https://www.shoreexcursionsgroup.com/?id=1948366&source=advisorseed")
        }
      />

      <View style={{ marginTop: 10 }}>
        {ctx.renderCompleteButton(
          8,
          "Anchor the Winners →",
          true,
          "Activities anchored. Group rates locked through partners."
        )}
      </View>
    </>
  );
}
