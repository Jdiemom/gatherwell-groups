import { useState } from "react";
import { View } from "react-native";
import { Button, Field, Lead, Note, Panel, Row } from "@/components/ui";
import { PartnerCard } from "./PartnerCard";
import type { StepCtx } from "../ctx";

export function Step7({ ctx }: { ctx: StepCtx }) {
  const [open, setOpen] = useState(false);
  const [prefs, setPrefs] = useState("");

  return (
    <>
      {ctx.renderHeader(7)}
      <Lead>
        One house changes a group trip&apos;s chemistry. Compare true per-person cost, then book
        through our partners.
      </Lead>

      {ctx.renderPolls(7)}

      <PartnerCard
        mark="V"
        markColor="#0E9488"
        title="Villa collection"
        badge="Gatherwell exclusive"
        body="2,500+ luxury villas worldwide. Booking requests come straight to our team."
        action="Browse villas"
        onPress={() => ctx.openUrl("https://villa-info.net")}
      />
      <PartnerCard
        mark="L"
        markColor="#B08A3E"
        title="Luxury villa rentals"
        badge="Gatherwell exclusive"
        body="Top-tier homes with concierge included."
        action="Browse homes"
        onPress={() => ctx.openUrl("https://www.luxury-villa-rentals.com")}
      />
      <PartnerCard
        mark="C"
        markColor="#4A3F35"
        title="Prefer a ship to a villa?"
        badge="Gatherwell"
        body="Group cruises through our luxury cruise partners."
        action="See cruises"
        onPress={() => ctx.openUrl("https://gatherwelltravel.com/luxury-cruises")}
      />

      {ctx.isOrganizer && (
        <Panel title="Want us to pull options for you?">
          <Note style={{ marginTop: 0, marginBottom: 10 }}>
            One tap sends Gatherwell your group&apos;s dates, budget, and headcount. We reply with
            hand-picked villas (or ships) that actually fit.
          </Note>
          {!open ? (
            <Button
              label="Request options from Gatherwell"
              small
              onPress={() => setOpen(true)}
              style={{ alignSelf: "flex-start" }}
            />
          ) : (
            <>
              <Field
                value={prefs}
                onChangeText={setPrefs}
                multiline
                numberOfLines={4}
                placeholder="Anything we should know? Pool a must, walkable to town, cruise-curious, accessibility needs…"
              />
              <Row>
                <Button
                  label="Send request"
                  small
                  busy={ctx.busy}
                  onPress={async () => {
                    await ctx.onRequestStayOptions(prefs);
                    setOpen(false);
                    setPrefs("");
                  }}
                />
                <Button label="Cancel" kind="outline" small onPress={() => setOpen(false)} />
              </Row>
            </>
          )}
        </Panel>
      )}

      <View style={{ marginTop: 10 }}>
        {ctx.renderCompleteButton(7, "Book the Winner →", true, "Home base chosen. Group perks applied.")}
      </View>
    </>
  );
}
