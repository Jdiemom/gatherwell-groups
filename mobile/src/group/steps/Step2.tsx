import { Lead } from "@/components/ui";
import { View } from "react-native";
import type { StepCtx } from "../ctx";

export function Step2({ ctx }: { ctx: StepCtx }) {
  return (
    <>
      {ctx.renderHeader(2)}
      <Lead>
        Before dates or dollars, the group aligns on what this trip is for. Everyone votes; the
        winners become your group&apos;s brief.
      </Lead>
      {ctx.renderPolls(2)}
      <View style={{ marginTop: 10 }}>{ctx.renderCompleteButton(2, "Lock the Vision →")}</View>
    </>
  );
}
