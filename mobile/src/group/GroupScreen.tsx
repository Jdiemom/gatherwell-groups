import { useCallback, useMemo, useRef, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { C, FONT } from "@/theme";
import { STEPS } from "@/shared";
import { Button, Callout, Card, Field, Note, Pill, Row } from "@/components/ui";
import { Toast } from "@/components/Toast";
import { DocumentSheet } from "@/components/Sheet";
import { copy, openUrl as open, shareDocument, shareText } from "@/lib/output";
import { Linking } from "react-native";

import { StepRail } from "./StepRail";
import { TripShapeCard } from "./TripShapeCard";
import { PollBuilder } from "./PollSection";
import { ChoicePoll } from "./polls/ChoicePoll";
import { DatePoll } from "./polls/DatePoll";
import { MultiPoll } from "./polls/MultiPoll";
import { TravelerProfileSheet } from "./TravelerProfileSheet";
import { TieBreakSheet } from "./TieBreakSheet";
import { ContactSheet } from "./ContactSheet";
import { Step1 } from "./steps/Step1";
import { Step2 } from "./steps/Step2";
import { Step3 } from "./steps/Step3";
import { Step4 } from "./steps/Step4";
import { Step5 } from "./steps/Step5";
import { Step6 } from "./steps/Step6";
import { Step7 } from "./steps/Step7";
import { Step8 } from "./steps/Step8";
import { Step9 } from "./steps/Step9";

import * as A from "./actions";
import {
  bestDateIso,
  decidedNights,
  defaultBudget,
  fmt,
  headcountOf,
  savingsOf,
  tiedPolls,
  tripDates,
  tripShape,
} from "./derive";
import { inviteLink } from "./documents";
import type { Doc } from "./documents";
import type { StepCtx } from "./ctx";
import type { Budget, GroupBundle, ItinDay, MemberMeta, PayPlan, Poll } from "./types";

export function GroupScreen({ bundle, userId }: { bundle: GroupBundle; userId: string }) {
  const [group, setGroup] = useState(bundle.group);
  const [members, setMembers] = useState(bundle.members);
  const [polls, setPolls] = useState(bundle.polls);
  const [completed, setCompleted] = useState(new Set(bundle.completed));
  const plan = bundle.plan;

  const [current, setCurrent] = useState(() => {
    for (let i = 1; i <= 9; i++) if (!new Set(bundle.completed).has(i)) return i;
    return 9;
  });

  const [budget, setBudgetState] = useState<Budget | null>(group.data?.budget ?? null);
  const [tripLength, setTripLength] = useState<number | "vote" | null>(group.data?.tripLength ?? null);
  const [itinerary, setItinerary] = useState<ItinDay[] | null>(group.data?.itinerary ?? null);
  const [payplan, setPayplan] = useState<PayPlan>(group.data?.payplan ?? "monthly");

  const [toast, setToast] = useState("");
  const [doc, setDoc] = useState<Doc | null>(null);
  const [contactOpen, setContactOpen] = useState(false);
  const [tieBreak, setTieBreak] = useState<{ stepN: number; polls: Poll[] } | null>(null);
  const [busy, setBusy] = useState(false);

  const [removeArmed, setRemoveArmed] = useState<string | null>(null);
  const [recordOpen, setRecordOpen] = useState<string | null>(null);
  const [suggestion, setSuggestion] = useState("");
  const [builderStep, setBuilderStep] = useState<number | null>(null);

  const me = members.find((m) => m.user_id === userId);
  const [profileOpen, setProfileOpen] = useState(!me?.meta?.answering_for);

  const isOrganizer = group.owner_id === userId;
  const isSolo = plan === "solo";
  const isConcierge = plan === "concierge";
  const headcount = headcountOf(members);

  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const say = useCallback((message: string) => {
    setToast(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 2600);
  }, []);

  const nextStep = useMemo(() => {
    for (let i = 1; i <= 9; i++) if (!completed.has(i)) return i;
    return 9;
  }, [completed]);

  const savings = useMemo(() => savingsOf(completed, headcount), [completed, headcount]);
  const dates = useMemo(() => tripDates(group, polls, tripLength), [group, polls, tripLength]);
  const effectiveBudget = budget ?? defaultBudget(polls, members, group);

  /* ---------------- voting ---------------- */

  const runAutoAdvance = useCallback(
    async (stepN: number) => {
      const out = await A.autoAdvance(group.id, stepN);
      if (!out) return;
      if (out.advanced) {
        setCompleted((c) => new Set([...c, stepN]));
        if (out.nextStep) setCurrent(out.nextStep);
        say(`Everyone voted! Step ${stepN} locked in, and the group has been emailed the results.`);
      } else if (out.tie) {
        say("Everyone has voted and it's a tie. The group has been emailed; votes stay open.");
      } else if (out.datesReady) {
        say("Everyone has answered the dates. Results are on their way to the whole group.");
      }
    },
    [group.id, say]
  );

  async function vote(poll: Poll, optionId: string) {
    if (completed.has(poll.step_n) && poll.step_n !== 6) {
      say("This decision is locked in. Ask your organizer to reopen the step if plans changed.");
      return;
    }
    if (group.data?.decisions?.[poll.id]) {
      say("Your organizer recorded this decision; no vote needed.");
      return;
    }
    const error = await A.castVote(poll.id, optionId, userId);
    if (error) return say(error);
    setPolls((ps) =>
      ps.map((p) =>
        p.id !== poll.id
          ? p
          : {
              ...p,
              votes: [...p.votes.filter((v) => v.user_id !== userId), { option_id: optionId, user_id: userId }],
            }
      )
    );
    say(me?.meta?.answering_for === "couple" ? "Vote recorded, counting for both of you." : "Vote recorded.");
    void runAutoAdvance(poll.step_n);
  }

  async function voteDate(poll: Poll, optionId: string, answer: "yes" | "no" | "maybe") {
    if (completed.has(poll.step_n)) {
      say("This decision is locked in. Ask your organizer to reopen the step if plans changed.");
      return;
    }
    const error = await A.castDateVote(poll.id, optionId, userId, answer);
    if (error) return say(error);
    setPolls((ps) =>
      ps.map((p) =>
        p.id !== poll.id
          ? p
          : {
              ...p,
              dvotes: [
                ...(p.dvotes ?? []).filter((v) => !(v.user_id === userId && v.option_id === optionId)),
                { option_id: optionId, user_id: userId, answer },
              ],
            }
      )
    );
    void runAutoAdvance(poll.step_n);
  }

  async function toggleActivity(poll: Poll, optionId: string) {
    if (completed.has(poll.step_n)) return say("This step is locked in.");
    const mine = (poll.dvotes ?? []).some(
      (v) => v.user_id === userId && v.option_id === optionId && v.answer === "yes"
    );
    if (mine) {
      const error = await A.removeActivityVote(optionId, userId);
      if (error) return say(error);
      setPolls((ps) =>
        ps.map((p) =>
          p.id !== poll.id
            ? p
            : { ...p, dvotes: (p.dvotes ?? []).filter((v) => !(v.user_id === userId && v.option_id === optionId)) }
        )
      );
    } else {
      const error = await A.addActivityVote(poll.id, optionId, userId);
      if (error) return say(error);
      setPolls((ps) =>
        ps.map((p) =>
          p.id !== poll.id
            ? p
            : { ...p, dvotes: [...(p.dvotes ?? []), { option_id: optionId, user_id: userId, answer: "yes" }] }
        )
      );
      void runAutoAdvance(poll.step_n);
    }
  }

  /* ---------------- organizer ---------------- */

  async function declareWinner(pollId: string, optionId: string) {
    const decisions = { ...(group.data?.decisions ?? {}), [pollId]: optionId };
    const { error, data } = await A.patchGroupData(group, { decisions });
    if (error || !data) return say("Couldn't save the tie-break.");
    setGroup((g) => ({ ...g, data }));
    setTieBreak((t) => {
      if (!t) return null;
      const rest = t.polls.filter((p) => p.id !== pollId);
      return rest.length ? { ...t, polls: rest } : null;
    });
    setRecordOpen(null);
    say("Recorded as the decision.");
  }

  async function completeStep(n: number, message?: string) {
    if (!isOrganizer) return say("Only the organizer can complete a step.");
    const tied = tiedPolls(polls, members, group, n);
    if (tied.length > 0) {
      setTieBreak({ stepN: n, polls: tied });
      say("There's a tie to break first. Your call.");
      return;
    }
    setBusy(true);
    const error = await A.completeStep(group.id, n, userId);
    if (error) {
      setBusy(false);
      return say(error);
    }
    setCompleted((c) => new Set([...c, n]));

    // Step 3 locks structured dates so the itinerary, payments and savings have real dates.
    if (n === 3) {
      const start = bestDateIso(polls, members);
      if (start) {
        const nights = decidedNights(polls, tripLength);
        const { data } = await A.patchGroupData(group, { dates: { start, nights } });
        if (data) setGroup((g) => ({ ...g, data }));
      }
    }
    // Step 6 turns anyone wanting a group quote into a Gatherwell lead.
    if (n === 6) A.requestFlightQuotes(group.id);

    if (n < 9) {
      setCurrent(n + 1);
      A.notifyStep(group.id, n + 1, "opened");
    }
    setBusy(false);
    say(message || `Step ${n} complete. Step ${n + 1} unlocked! Your group has been emailed.`);
  }

  async function reopenStep(n: number) {
    if (!isOrganizer) return say("Only the organizer can reopen a step.");
    const error = await A.reopenStep(group.id, n);
    if (error) return say(error);
    setCompleted((c) => {
      const next = new Set(c);
      next.delete(n);
      return next;
    });
    setCurrent(n);
    A.notifyStep(group.id, n, "reopened");
    say(`Step ${n} reopened. Voting is live again, and your group has been emailed.`);
  }

  /* ---------------- step chrome ---------------- */

  const renderHeader = useCallback(
    (n: number) => <StepHeader stepN={n} isConcierge={isConcierge} groupId={group.id} say={say} />,
    [isConcierge, group.id, say]
  );

  const renderCompleteButton = useCallback(
    (n: number, label: string, enabled = true, message?: string) => {
      if (completed.has(n)) {
        return (
          <Row>
            <Pill tone="sage">✓ Step complete</Pill>
            {isOrganizer && (
              <Button label="Reopen this step" kind="outline" small onPress={() => reopenStep(n)} />
            )}
          </Row>
        );
      }
      if (!isOrganizer) {
        return <Note style={{ marginTop: 0 }}>The organizer completes this step when the group is ready.</Note>;
      }
      return (
        <Button label={label} disabled={!enabled} busy={busy} onPress={() => completeStep(n, message)} />
      );
    },
    // reopenStep/completeStep are stable enough for this screen's lifetime
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [completed, isOrganizer, busy, polls, members, group, tripLength]
  );

  const renderPolls = useCallback(
    (n: number) => {
      const locked = completed.has(n) && n !== 6;
      const forStep = polls.filter((p) => p.step_n === n);
      return (
        <View>
          {forStep.map((poll) => {
            if (poll.kind === "dates") {
              return (
                <DatePoll
                  key={poll.id}
                  poll={poll}
                  members={members}
                  userId={userId}
                  closed={completed.has(n)}
                  isOrganizer={isOrganizer}
                  removeArmed={removeArmed === poll.id}
                  onRemove={() => armRemove(poll.id)}
                  onAnswer={(optionId, answer) => voteDate(poll, optionId, answer)}
                />
              );
            }
            if (poll.kind === "multi") {
              return (
                <MultiPoll
                  key={poll.id}
                  poll={poll}
                  members={members}
                  userId={userId}
                  headcount={headcount}
                  closed={completed.has(n)}
                  suggestion={suggestion}
                  onSuggestionChange={setSuggestion}
                  onSuggest={() => suggestActivity(poll)}
                  onToggle={(optionId) => toggleActivity(poll, optionId)}
                />
              );
            }
            return (
              <ChoicePoll
                key={poll.id}
                poll={poll}
                members={members}
                group={group}
                userId={userId}
                closed={completed.has(n) && n !== 6}
                isOrganizer={isOrganizer}
                removeArmed={removeArmed === poll.id}
                recordOpen={recordOpen === poll.id}
                onToggleRecord={() => setRecordOpen((r) => (r === poll.id ? null : poll.id))}
                onRecordDecision={(optionId) => declareWinner(poll.id, optionId)}
                onRemove={() => armRemove(poll.id)}
                onVote={(optionId) => vote(poll, optionId)}
              />
            );
          })}

          {isOrganizer && !locked && (
            builderStep === n ? (
              <PollBuilder
                stepN={n}
                polls={polls}
                tripLength={tripLength}
                say={say}
                busy={busy}
                onCancel={() => setBuilderStep(null)}
                onCreate={(kind, question, options) => createPoll(n, kind, question, options)}
              />
            ) : (
              <Button
                label="+ Add your own poll"
                kind="outline"
                small
                style={{ alignSelf: "flex-start", marginBottom: 20 }}
                onPress={() => setBuilderStep(n)}
              />
            )
          )}
        </View>
      );
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [polls, members, completed, group, removeArmed, recordOpen, suggestion, builderStep, tripLength, busy, headcount]
  );

  function armRemove(pollId: string) {
    if (removeArmed === pollId) {
      void (async () => {
        const error = await A.deletePoll(pollId);
        if (error) return say(error);
        setPolls((ps) => ps.filter((p) => p.id !== pollId));
        setRemoveArmed(null);
        say("Poll removed.");
      })();
      return;
    }
    setRemoveArmed(pollId);
  }

  async function createPoll(
    stepN: number,
    kind: "choice" | "dates",
    question: string,
    options: { label: string; meta: string | null }[]
  ) {
    setBusy(true);
    const { error, poll } = await A.createPoll(group.id, stepN, kind, question, options);
    setBusy(false);
    if (error || !poll) return say(error ?? "Couldn't create the poll.");
    setPolls((ps) => [...ps, poll]);
    setBuilderStep(null);
    say("Poll added. Your group can vote now.");
  }

  async function suggestActivity(poll: Poll) {
    const label = suggestion.trim();
    if (!label) return say("Type your activity idea first.");
    const { error, option } = await A.suggestOption(poll, label, me?.name ?? "a traveler");
    if (error || !option) return say(error ?? "Couldn't add it.");
    setPolls((ps) => ps.map((p) => (p.id !== poll.id ? p : { ...p, options: [...p.options, option] })));
    setSuggestion("");
    say("Added! Now vote for it.");
  }

  /* ---------------- the context handed to each step ---------------- */

  const ctx: StepCtx = {
    group,
    members,
    polls,
    completed,
    plan,
    userId,
    me,
    isOrganizer,
    isSolo,
    isConcierge,
    headcount,
    budget,
    effectiveBudget,
    tripLength,
    itinerary,
    payplan,
    dates,
    savings,
    busy,

    renderHeader,
    renderPolls,
    renderCompleteButton,

    say,
    showDoc: setDoc,
    setBudget: setBudgetState,
    setItinerary,

    onSaveBudget: async (b) => {
      if (!isOrganizer) return say("Only the organizer can save the budget.");
      const { error, data } = await A.saveBudget(group, b);
      if (error || !data) return say("Couldn't save the budget. Try again.");
      setGroup((g) => ({ ...g, data }));
      setBudgetState(b);
      say("Budget saved for the whole group.");
    },

    onSaveTripLength: async (v) => {
      if (!isOrganizer) return;
      const { error, data } = await A.patchGroupData(group, {
        budget: budget ?? group.data?.budget,
        tripLength: v,
      });
      if (error || !data) return say("Couldn't save the trip length. Try again.");
      setGroup((g) => ({ ...g, data }));
      setTripLength(v);

      if (v === "vote") {
        const exists = polls.some((p) => p.step_n === 3 && p.question.toLowerCase().includes("how long"));
        if (!exists) {
          const { poll } = await A.createPoll(group.id, 3, "choice", "How long should the trip be?", [
            { label: "4 nights", meta: "A long weekend" },
            { label: "7 nights", meta: "One full week" },
            { label: "10 nights", meta: "Room to breathe" },
            { label: "14 nights", meta: "The big one" },
          ]);
          if (poll) setPolls((ps) => [...ps, poll]);
        }
        say("The group will vote on trip length in Step 3.");
      } else {
        say(`Trip length set: ${v} nights.`);
      }
    },

    onSaveDiscussLinks: async (links) => {
      const { error, data } = await A.patchGroupData(group, { discuss: links });
      if (error || !data) return say("Couldn't save the links.");
      setGroup((g) => ({ ...g, data }));
      say("Discussion links saved. They'll appear in group emails too.");
    },

    onSaveItinerary: async () => {
      if (!itinerary) return;
      setBusy(true);
      const { error, data } = await A.saveItinerary(group, itinerary, payplan);
      setBusy(false);
      if (error || !data) return say("Couldn't save the itinerary.");
      setGroup((g) => ({ ...g, data }));
      say("Itinerary saved for the whole group.");
    },

    onSetPayPlan: async (v) => {
      if (!isOrganizer) return;
      setPayplan(v);
      const { data } = await A.patchGroupData(group, { payplan: v });
      if (data) setGroup((g) => ({ ...g, data }));
    },

    onSkipDestination: async (destination) => {
      const dest = destination.trim();
      if (!dest) return say("Type the destination first.");
      const { error, data } = await A.patchGroupData(group, { destination: dest });
      if (error || !data) return say("Couldn't save the destination.");
      setGroup((g) => ({ ...g, data }));
      await completeStep(5, `${dest} it is. Step 6 unlocked!`);
    },

    onAddDestination: async (label, blurb) => {
      const dp = polls.find((p) => p.step_n === 5 && p.kind === "choice");
      if (!dp) return say("No destination poll to add to. Create one first.");
      if (dp.options.some((o) => o.label === label)) return say("Already on the shortlist.");
      const { error, option } = await A.addDestinationOption(dp, label, blurb);
      if (error || !option) return say(error ?? "Couldn't add it.");
      setPolls((ps) => ps.map((p) => (p.id !== dp.id ? p : { ...p, options: [...p.options, option] })));
      say(`${label.split(",")[0]} added to the shortlist.`);
    },

    onBoost: async (mode, amount, anonymous) => {
      setBusy(true);
      const error = await A.submitBoost(group.id, mode, amount, anonymous);
      setBusy(false);
      say(error ?? "Done. The group has been told, exactly as previewed.");
    },

    onRequestStayOptions: async (preferences) => {
      setBusy(true);
      const error = await A.requestStayOptions(group.id, preferences);
      setBusy(false);
      say(error ?? "Sent! Gatherwell will reply with options that fit your group.");
    },

    onCopyInvite: async () => {
      const ok = await copy(inviteLink(group.join_code));
      say(ok ? "Invite link copied. Send it to your travelers!" : "Couldn't copy. Try again.");
    },

    onShareInvite: async (message) => {
      const shared = await shareText(message, `Our ${group.name} trip: you're in`);
      if (!shared) {
        const copied = await copy(message);
        if (copied) say("Invite message copied. Paste it anywhere your group talks.");
      }
    },

    openContact: () => setContactOpen(true),
    openUrl: (url) => void open(url),
  };

  const shape = tripShape(polls, members, group, completed, tripLength, budget);
  const StepBody = [Step1, Step2, Step3, Step4, Step5, Step6, Step7, Step8, Step9][current - 1];

  return (
    <View style={{ flex: 1, backgroundColor: C.cream }}>
      <StepRail
        completed={completed}
        current={current}
        nextStep={nextStep}
        onPick={(n) => {
          if (!completed.has(n) && n > nextStep) {
            say(`That step is locked. Finish Step ${nextStep} first: one decision at a time is the method.`);
            return;
          }
          setCurrent(n);
        }}
      />

      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 90 }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={sx.savingsStrip}>
          <Text style={sx.savingsAmount}>{fmt(savings)}</Text>
          <Text style={sx.savingsLabel}>
            estimated savings your group has locked in so far. Updates as you complete steps.
          </Text>
        </View>

        <TripShapeCard items={shape} />

        <Card>
          <StepBody ctx={ctx} />
        </Card>
      </ScrollView>

      <TravelerProfileSheet
        visible={profileOpen}
        initialName={me?.rawName ?? ""}
        initialMeta={me?.meta ?? {}}
        saving={busy}
        onSave={async (name, meta: MemberMeta) => {
          const clean = name.trim();
          if (!clean) return say("Your name is the one required field.");
          if (!meta.answering_for) return say("Tell us if you're answering solo or as a couple.");
          if (meta.answering_for !== "solo" && !(meta.partner_name ?? "").trim()) {
            return say("Add your partner's name.");
          }
          setBusy(true);
          const error = await A.saveTravelerProfile(group.id, userId, clean, {
            ...meta,
            partner_name: meta.partner_name?.trim() || undefined,
            home_airport: meta.home_airport?.trim().toUpperCase() || undefined,
            kids: Math.max(0, Math.min(12, Number(meta.kids) || 0)),
            kid_ages: meta.kid_ages?.trim() || undefined,
          });
          setBusy(false);
          if (error) return say(error);
          setMembers((ms) =>
            ms.map((m) => (m.user_id === userId ? { ...m, name: clean, rawName: clean, meta } : m))
          );
          setProfileOpen(false);
          say(
            meta.answering_for === "couple"
              ? "Saved. Your votes count for both of you."
              : "Saved. Welcome aboard!"
          );
        }}
      />

      <TieBreakSheet
        tie={tieBreak}
        members={members}
        onPick={declareWinner}
        onClose={() => setTieBreak(null)}
      />

      <ContactSheet visible={contactOpen} onClose={() => setContactOpen(false)} />

      <DocumentSheet
        doc={doc}
        onClose={() => setDoc(null)}
        onShare={async () => {
          if (!doc) return;
          const ok = await shareDocument(doc.filename, doc.data ?? doc.body);
          if (!ok) say("Sharing isn't available here, so the document was copied instead.");
        }}
      />

      <Toast message={toast} />
    </View>
  );
}

/** Step title, plus the Concierge advisor panel when the group is on that plan. */
function StepHeader({
  stepN,
  isConcierge,
  groupId,
  say,
}: {
  stepN: number;
  isConcierge: boolean;
  groupId: string;
  say: (m: string) => void;
}) {
  const step = STEPS[stepN - 1];
  const [message, setMessage] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={sx.stepEyebrow}>Step {stepN} of 9 · The Gatherwell Method</Text>
      <Text style={sx.stepTitle}>{step.t}</Text>

      {isConcierge && (
        <Callout tone="gold" title="Concierge · your advisor is on this step">
          {message === null ? (
            <Row style={{ marginTop: 8 }}>
              <Button label="Email your advisor" kind="gold" small onPress={() => setMessage("")} />
              <Button
                label="Call (888) 664-3090"
                kind="outline"
                small
                onPress={() => Linking.openURL("tel:+18886643090").catch(() => {})}
              />
            </Row>
          ) : (
            <>
              <Field
                value={message}
                onChangeText={setMessage}
                multiline
                numberOfLines={3}
                placeholder={`Ask anything about ${step.t.toLowerCase()}. Your advisor sees your group's full context.`}
              />
              <Row>
                <Button
                  label="Send with priority"
                  kind="gold"
                  small
                  busy={sending}
                  onPress={async () => {
                    const text = message.trim();
                    if (!text) return say("Type your question first.");
                    setSending(true);
                    const error = await A.askConcierge(groupId, stepN, text);
                    setSending(false);
                    if (error) return say(error);
                    setMessage(null);
                    say("Sent to your advisor with priority. Expect a reply within one business day.");
                  }}
                />
                <Button label="Cancel" kind="outline" small onPress={() => setMessage(null)} />
              </Row>
            </>
          )}
        </Callout>
      )}
    </View>
  );
}

const sx = StyleSheet.create({
  savingsStrip: {
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.line,
    padding: 16,
    marginBottom: 16,
  },
  savingsAmount: { fontFamily: FONT.serif, fontSize: 28, color: C.sageDeep },
  savingsLabel: { fontFamily: FONT.sans, fontSize: 13, lineHeight: 20, color: C.inkSoft, marginTop: 2 },
  stepEyebrow: {
    fontFamily: FONT.sansSemi,
    fontSize: 10.5,
    letterSpacing: 2,
    textTransform: "uppercase",
    color: C.gold,
    marginBottom: 8,
  },
  stepTitle: { fontFamily: FONT.serif, fontSize: 27, lineHeight: 32, color: C.ink, letterSpacing: -0.2 },
});
