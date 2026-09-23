import { useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { C, FONT } from "@/theme";
import { Button, Callout, Chip, ChipRow, Field, Note, Panel, Row } from "@/components/ui";
import { decidedNights, decidedNightsUnresolved, fmtDateRange } from "./derive";
import type { Poll } from "./types";

/**
 * "Add your own poll", the organizer tool that sits under every step's polls.
 * Step 3 additionally offers the date-availability kind, whose options are built
 * from real calendar dates turned into N-night windows.
 */
export function PollBuilder({
  stepN,
  polls,
  tripLength,
  onCreate,
  onCancel,
  say,
  busy,
}: {
  stepN: number;
  polls: Poll[];
  tripLength: number | "vote" | null;
  onCreate: (
    kind: "choice" | "dates",
    question: string,
    options: { label: string; meta: string | null }[]
  ) => void;
  onCancel: () => void;
  say: (m: string) => void;
  busy: boolean;
}) {
  const [kind, setKind] = useState<"choice" | "dates">(stepN === 3 ? "dates" : "choice");
  const [question, setQuestion] = useState("");
  const [rows, setRows] = useState([
    { label: "", meta: "" },
    { label: "", meta: "" },
  ]);
  const [dates, setDates] = useState<string[]>([]);
  const [picking, setPicking] = useState(false);

  const nights = decidedNights(polls, tripLength);
  const lengthPending = kind === "dates" && tripLength === "vote" && decidedNightsUnresolved(polls, tripLength);

  const addDate = (d: Date) => {
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
      d.getDate()
    ).padStart(2, "0")}`;
    setDates((prev) => (prev.includes(iso) ? prev : [...prev, iso]));
  };

  const submit = () => {
    const q = question.trim() || (kind === "dates" ? "Which of these dates can you make?" : "");
    if (kind === "dates") {
      const options = [...dates].sort().map((d) => ({ label: fmtDateRange(d, nights), meta: d }));
      if (options.length < 2) {
        say("Add at least two candidate dates with the calendar.");
        return;
      }
      onCreate("dates", q, options);
      return;
    }
    const options = rows
      .map((r) => ({ label: r.label.trim(), meta: r.meta.trim() || null }))
      .filter((r) => r.label);
    if (!q || options.length < 2) {
      say("Add a question and at least two options.");
      return;
    }
    onCreate("choice", q, options);
  };

  return (
    <Panel title="New poll for this step">
      {stepN === 3 && (
        <ChipRow>
          <Chip label="Pick one winner" on={kind === "choice"} onPress={() => setKind("choice")} />
          <Chip label="Date availability" on={kind === "dates"} onPress={() => setKind("dates")} />
        </ChipRow>
      )}

      <Note style={{ marginTop: 0, marginBottom: 10 }}>
        {kind === "dates"
          ? `Pick each candidate start date. Each becomes a ${nights}-night window${
              tripLength === "vote"
                ? " (from the group's length vote)"
                : tripLength
                ? ""
                : " (set the trip length in Step 1 to change this)"
            }, and every traveler answers Yes, Maybe, or No.`
          : "The group votes and one option wins."}
      </Note>

      <Field
        value={question}
        onChangeText={setQuestion}
        placeholder={
          kind === "dates"
            ? "Which of these dates can you make?"
            : "Your question, e.g. Which house style fits us?"
        }
      />

      {lengthPending ? (
        <Callout title="Length first, then dates">
          Your group is voting on trip length (the poll above). Once that has votes, come back and the
          date ranges will use the winning length.
        </Callout>
      ) : kind === "dates" ? (
        <>
          <Button
            label="Add a start date"
            kind="outline"
            small
            onPress={() => setPicking(true)}
            style={{ alignSelf: "flex-start", marginBottom: 10 }}
          />
          {picking && (
            <DateTimePicker
              value={new Date()}
              mode="date"
              display={Platform.OS === "ios" ? "inline" : "default"}
              minimumDate={new Date()}
              onChange={(event, selected) => {
                if (Platform.OS !== "ios") setPicking(false);
                if (event.type === "set" && selected) addDate(selected);
              }}
            />
          )}
          {picking && Platform.OS === "ios" && (
            <Button
              label="Done adding dates"
              small
              kind="ghost"
              onPress={() => setPicking(false)}
              style={{ alignSelf: "flex-start" }}
            />
          )}
          {dates.length > 0 && (
            <ChipRow>
              {[...dates].sort().map((d) => (
                <Pressable
                  key={d}
                  onPress={() => setDates((prev) => prev.filter((x) => x !== d))}
                  accessibilityRole="button"
                  accessibilityLabel={`Remove ${fmtDateRange(d, nights)}`}
                  style={st.dateChip}
                >
                  <Text style={st.dateChipText}>{fmtDateRange(d, nights)} ✕</Text>
                </Pressable>
              ))}
            </ChipRow>
          )}
        </>
      ) : (
        <>
          {rows.map((r, i) => (
            <View key={i} style={st.optRow}>
              <Field
                value={r.label}
                onChangeText={(t) =>
                  setRows((rs) => rs.map((x, j) => (j === i ? { ...x, label: t } : x)))
                }
                placeholder={`Option ${i + 1}, e.g. Riviera Maya, Mexico`}
              />
              <Field
                value={r.meta}
                onChangeText={(t) =>
                  setRows((rs) => rs.map((x, j) => (j === i ? { ...x, meta: t } : x)))
                }
                placeholder="Short description (optional)"
              />
            </View>
          ))}
          <Button
            label="+ Add another option"
            kind="outline"
            small
            onPress={() => setRows((rs) => [...rs, { label: "", meta: "" }])}
            style={{ alignSelf: "flex-start", marginBottom: 10 }}
          />
        </>
      )}

      <Row>
        <Button label="Create poll" small busy={busy} onPress={submit} />
        <Button label="Cancel" kind="outline" small onPress={onCancel} />
      </Row>
    </Panel>
  );
}

const st = StyleSheet.create({
  optRow: { borderTopWidth: 1, borderTopColor: C.cream2, paddingTop: 12, marginBottom: 2 },
  dateChip: {
    borderWidth: 1,
    borderColor: C.ink,
    backgroundColor: C.ink,
    paddingVertical: 9,
    paddingHorizontal: 13,
  },
  dateChipText: { fontFamily: FONT.sansMedium, fontSize: 13, color: C.cream },
});
