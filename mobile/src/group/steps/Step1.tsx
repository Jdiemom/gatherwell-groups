import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { C, FONT, AV_COLORS } from "@/theme";
import { Button, Callout, Chip, ChipRow, Field, H3, Lead, Note, Panel, Row } from "@/components/ui";
import { INVITE_TEMPLATES, inviteLink } from "../documents";
import type { StepCtx } from "../ctx";

const LENGTHS: [number | "vote", string][] = [
  [4, "Long weekend · 4 nights"],
  [7, "One week · 7 nights"],
  [10, "Ten days · 10 nights"],
  [14, "Two weeks · 14 nights"],
  ["vote", "Let the group vote"],
];

export function Step1({ ctx }: { ctx: StepCtx }) {
  const [custom, setCustom] = useState("");
  const [tpl, setTpl] = useState<string | null>(null);
  const [inviteMsg, setInviteMsg] = useState<string | null>(null);
  const [discuss, setDiscuss] = useState(ctx.group.data?.discuss ?? {});

  const waiting = ctx.members
    .filter((m) => m.meta?.answering_for === "partner_separate" && m.meta?.partner_name)
    .map((m) => `${m.meta!.partner_name} (${m.name}'s partner)`);

  return (
    <>
      {ctx.renderHeader(1)}
      <Lead>
        Trips die from soft commitments. Get real names in, then set a commitment device before
        anyone books anything.
      </Lead>

      <H3>Your travelers ({ctx.members.length})</H3>
      <View style={st.chips}>
        {ctx.members.map((m, i) => (
          <View key={m.user_id} style={[st.chip, m.user_id === ctx.userId && st.chipYou]}>
            <View style={[st.av, { backgroundColor: AV_COLORS[i % AV_COLORS.length] }]}>
              <Text style={st.avText}>{m.name[0]?.toUpperCase()}</Text>
            </View>
            <Text style={st.chipText}>
              {m.name}
              {m.role === "organizer" ? " · organizer" : ""}
            </Text>
          </View>
        ))}
      </View>

      <Panel title="How long is this trip?">
        <Note style={{ marginTop: 0, marginBottom: 12 }}>
          {ctx.isOrganizer
            ? "Set it now, or let the group vote in Step 3. Date options will use this length."
            : "Your organizer sets this, or the group votes on it in Step 3."}
        </Note>
        <ChipRow>
          {LENGTHS.map(([v, label]) => (
            <Chip
              key={String(v)}
              label={label}
              on={ctx.tripLength === v}
              disabled={!ctx.isOrganizer}
              onPress={() => ctx.onSaveTripLength(v)}
            />
          ))}
        </ChipRow>
        {ctx.isOrganizer && (
          <Row>
            <View style={{ width: 120 }}>
              <Field
                value={custom}
                onChangeText={setCustom}
                placeholder="nights"
                keyboardType="numeric"
              />
            </View>
            <Button
              label="Set"
              kind="outline"
              small
              onPress={() => {
                const v = parseInt(custom.replace(/\D/g, "") || "0", 10);
                if (v >= 1 && v <= 60) {
                  ctx.onSaveTripLength(v);
                  setCustom("");
                } else {
                  ctx.say("Enter a number of nights between 1 and 60.");
                }
              }}
            />
          </Row>
        )}
      </Panel>

      <Callout tone="sage" title="Invite your group">
        <Note style={{ marginTop: 0 }}>
          Anyone with your invite link can join free and vote on every decision.
        </Note>
        <Button
          label="Copy invite link"
          kind="sage"
          small
          onPress={ctx.onCopyInvite}
          style={{ marginTop: 12, alignSelf: "flex-start" }}
        />
      </Callout>

      {ctx.isOrganizer && (
        <Panel title="Invite message">
          <Note style={{ marginTop: 0, marginBottom: 12 }}>
            Pick a style, tweak the words, send it wherever your group talks.
          </Note>
          <ChipRow>
            {INVITE_TEMPLATES.map((t) => (
              <Chip
                key={t.key}
                label={t.label}
                on={tpl === t.key}
                onPress={() => {
                  setTpl(t.key);
                  setInviteMsg(t.text(ctx.group.name, inviteLink(ctx.group.join_code)));
                }}
              />
            ))}
          </ChipRow>
          {inviteMsg !== null && (
            <>
              <Field value={inviteMsg} onChangeText={setInviteMsg} multiline numberOfLines={10} />
              <Row>
                <Button label="Share it" small onPress={() => ctx.onShareInvite(inviteMsg)} />
              </Row>
            </>
          )}
        </Panel>
      )}

      {ctx.isOrganizer && (
        <Panel title="Where does your group talk?">
          <Note style={{ marginTop: 0, marginBottom: 10 }}>
            Paste your group&apos;s WhatsApp invite link (and a video-call link if you use one). A
            &quot;Discuss&quot; button will appear in group emails whenever a decision needs talking
            out.
          </Note>
          <Field
            value={discuss.whatsapp ?? ""}
            onChangeText={(t) => setDiscuss({ ...discuss, whatsapp: t })}
            placeholder="WhatsApp group invite link"
            autoCapitalize="none"
          />
          <Field
            value={discuss.video ?? ""}
            onChangeText={(t) => setDiscuss({ ...discuss, video: t })}
            placeholder="Video call link (Zoom, FaceTime, Meet) · optional"
            autoCapitalize="none"
          />
          <Button
            label="Save links"
            kind="outline"
            small
            onPress={() => ctx.onSaveDiscussLinks(discuss)}
            style={{ alignSelf: "flex-start" }}
          />
        </Panel>
      )}

      {ctx.isSolo && ctx.headcount >= 8 && (
        <Callout title="Your group outgrew the Solo plan">
          <Note style={{ marginTop: 0 }}>
            Solo covers up to 8 travelers. Upgrade to Group for unlimited travelers, Boost the
            Budget, and group flight quotes. You can upgrade from your account on the website.
          </Note>
        </Callout>
      )}

      {waiting.length > 0 && (
        <Callout title="Still to join">
          {`${waiting.join(" · ")}. Send them the invite link so their votes count.`}
        </Callout>
      )}

      <Callout tone="sage" title="Kids on this trip?">
        Our suggested house rule: adults vote on the structure (dates, budget, where), and kids get a
        voice on the fun in Step 8. Teens 13+ can be invited as full voting members if your group
        wants; that&apos;s your call as organizer.
      </Callout>

      <Callout title="Method rule: no planning around a “maybe”">
        Pick a commitment device with your group: a small deposit, a reply-by date, or the
        ticketed-means-in rule. Groups that set one in week one keep 90%+ of their headcount.
      </Callout>

      <View style={{ marginTop: 18 }}>
        {ctx.renderCompleteButton(1, "Crew is in. Complete Step 1 →", ctx.members.length >= 2)}
      </View>
      {ctx.members.length < 2 && ctx.isOrganizer && !ctx.completed.has(1) && (
        <Note>Invite at least one traveler to complete this step.</Note>
      )}
    </>
  );
}

const st = StyleSheet.create({
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10, marginBottom: 6 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: C.white,
    paddingVertical: 7,
    paddingHorizontal: 11,
    borderRadius: 999,
  },
  chipYou: { borderColor: C.terracotta },
  av: { width: 22, height: 22, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  avText: { color: "#fff", fontFamily: FONT.sansBold, fontSize: 11 },
  chipText: { fontFamily: FONT.sansMedium, fontSize: 13.5, color: C.ink },
});
