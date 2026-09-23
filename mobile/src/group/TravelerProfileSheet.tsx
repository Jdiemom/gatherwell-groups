import { useMemo, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { C, FONT } from "@/theme";
import { AIRPORTS } from "@/shared";
import { Sheet } from "@/components/Sheet";
import { Button, Chip, ChipRow, Field, Note } from "@/components/ui";
import type { MemberMeta } from "./types";

/**
 * "Before you vote: who are you?" Thirty seconds, once. Answering as a couple is
 * what makes every later vote and dollar figure count for two, so the sheet
 * cannot be dismissed until it is filled in, same as the website.
 */
export function TravelerProfileSheet({
  visible,
  initialName,
  initialMeta,
  saving,
  onSave,
}: {
  visible: boolean;
  initialName: string;
  initialMeta: MemberMeta;
  saving: boolean;
  onSave: (name: string, meta: MemberMeta) => void;
}) {
  const [name, setName] = useState(initialName);
  const [meta, setMeta] = useState<MemberMeta>(initialMeta);
  const [airportQuery, setAirportQuery] = useState(initialMeta.home_airport ?? "");

  const airportMatches = useMemo(() => {
    const q = airportQuery.trim().toLowerCase();
    if (q.length < 2) return [];
    return AIRPORTS.filter(
      (a) => a.code.toLowerCase().includes(q) || a.city.toLowerCase().includes(q)
    ).slice(0, 6);
  }, [airportQuery]);

  const exactAirport = AIRPORTS.some((a) => a.code === airportQuery.trim().toUpperCase());

  return (
    <Sheet visible={visible} title="Before you vote: who are you?" onClose={() => {}} dismissable={false}>
      <Note style={{ marginTop: 0, marginBottom: 14 }}>
        Thirty seconds, once. It makes every vote and every dollar figure accurate.
      </Note>

      <Field label="Your name" value={name} onChangeText={setName} placeholder="e.g. Julie" />

      <Text style={st.label}>Are you answering…</Text>
      <ChipRow>
        <Chip
          label="Just for me"
          on={meta.answering_for === "solo"}
          onPress={() => setMeta({ ...meta, answering_for: "solo" })}
        />
        <Chip
          label="For us as a couple"
          on={meta.answering_for === "couple"}
          onPress={() => setMeta({ ...meta, answering_for: "couple" })}
        />
        <Chip
          label="My partner answers separately"
          on={meta.answering_for === "partner_separate"}
          onPress={() => setMeta({ ...meta, answering_for: "partner_separate" })}
        />
      </ChipRow>

      {meta.answering_for === "couple" && (
        <>
          <Note style={{ marginTop: 0 }}>
            Answering as a couple means every vote you cast counts as two, and you both count in the
            budget and headcount.
          </Note>
          <Field
            label="Your partner's name"
            value={meta.partner_name ?? ""}
            onChangeText={(t) => setMeta({ ...meta, partner_name: t })}
            placeholder="Partner's name"
          />
        </>
      )}
      {meta.answering_for === "partner_separate" && (
        <Field
          label="Your partner's name (so the organizer knows who's still to join)"
          value={meta.partner_name ?? ""}
          onChangeText={(t) => setMeta({ ...meta, partner_name: t })}
          placeholder="Partner's name"
        />
      )}

      <Text style={st.label}>Kids traveling with you</Text>
      <ChipRow>
        {[0, 1, 2, 3, 4].map((k) => (
          <Chip
            key={k}
            label={k === 0 ? "None" : `${k}${k === 4 ? "+" : ""}`}
            on={(meta.kids ?? 0) === k}
            onPress={() => setMeta({ ...meta, kids: k })}
          />
        ))}
      </ChipRow>

      {(meta.kids ?? 0) > 0 && (
        <Field
          label="Their ages (helps with houses and activities)"
          value={meta.kid_ages ?? ""}
          onChangeText={(t) => setMeta({ ...meta, kid_ages: t })}
          placeholder="e.g. 6, 9, 14"
        />
      )}

      <Field
        label="Home airport"
        value={airportQuery}
        onChangeText={(t) => {
          setAirportQuery(t);
          setMeta({ ...meta, home_airport: t.trim().toUpperCase() });
        }}
        placeholder="Start typing a city or code"
        autoCapitalize="characters"
      />
      {airportMatches.length > 0 && !exactAirport && (
        <View style={st.suggest}>
          <FlatList
            data={airportMatches}
            keyExtractor={(a) => a.code}
            keyboardShouldPersistTaps="handled"
            scrollEnabled={false}
            renderItem={({ item }) => (
              <Pressable
                style={st.suggestRow}
                accessibilityRole="button"
                onPress={() => {
                  setAirportQuery(item.code);
                  setMeta({ ...meta, home_airport: item.code });
                }}
              >
                <Text style={st.suggestCode}>{item.code}</Text>
                <Text style={st.suggestCity}>{item.city}</Text>
              </Pressable>
            )}
          />
        </View>
      )}

      <Text style={st.label}>Packing style</Text>
      <ChipRow>
        <Chip label="Carry-on only" on={meta.bags === "carryon"} onPress={() => setMeta({ ...meta, bags: "carryon" })} />
        <Chip label="I check a bag" on={meta.bags === "checked"} onPress={() => setMeta({ ...meta, bags: "checked" })} />
      </ChipRow>

      <Text style={st.label}>Cabin comfort</Text>
      <ChipRow>
        <Chip label="Economy" on={meta.cabin === "economy"} onPress={() => setMeta({ ...meta, cabin: "economy" })} />
        <Chip label="Premium economy" on={meta.cabin === "premium"} onPress={() => setMeta({ ...meta, cabin: "premium" })} />
        <Chip label="Business" on={meta.cabin === "business"} onPress={() => setMeta({ ...meta, cabin: "business" })} />
      </ChipRow>

      <Button
        label="Save and start voting"
        busy={saving}
        onPress={() => onSave(name, meta)}
        style={{ marginTop: 8 }}
      />
    </Sheet>
  );
}

const st = StyleSheet.create({
  label: {
    fontFamily: FONT.sansSemi,
    fontSize: 11.5,
    letterSpacing: 1.3,
    textTransform: "uppercase",
    color: C.inkSoft,
    marginBottom: 6,
  },
  suggest: {
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: C.white,
    marginTop: -6,
    marginBottom: 12,
  },
  suggestRow: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
    paddingVertical: 11,
    paddingHorizontal: 13,
    borderBottomWidth: 1,
    borderBottomColor: C.cream2,
  },
  suggestCode: { fontFamily: FONT.sansBold, fontSize: 14, color: C.ink, width: 44 },
  suggestCity: { fontFamily: FONT.sans, fontSize: 14, color: C.inkSoft, flex: 1 },
});
