import { View } from "react-native";
import { Callout, Lead } from "@/components/ui";
import type { StepCtx } from "../ctx";

export function Step3({ ctx }: { ctx: StepCtx }) {
  const hasDatePoll = ctx.polls.some((p) => p.step_n === 3 && p.kind === "dates");
  return (
    <>
      {ctx.renderHeader(3)}
      <Lead>
        The date poll that ends the &quot;any weekend works&quot; spiral. Lock a window early: it&apos;s
        what makes the flight-savings step possible.
      </Lead>

      {ctx.isOrganizer && !ctx.completed.has(3) && !hasDatePoll && (
        <Callout tone="sage" title="Put real dates on the table">
          Use &quot;Add your own poll&quot; below and pick Date availability. List your actual candidate
          weeks; every traveler answers Yes, Maybe, or No for each. The front-runner surfaces itself.
        </Callout>
      )}

      {ctx.renderPolls(3)}

      <Callout title="Method rule: 72-hour decision window">
        Set a deadline with your group, then lock the top window. Deadlines are what make group
        planning humane.
      </Callout>

      <View style={{ marginTop: 10 }}>
        {ctx.renderCompleteButton(
          3,
          "Lock the Dates →",
          true,
          "Dates locked! Early dates mean cheap flights later."
        )}
      </View>
    </>
  );
}
