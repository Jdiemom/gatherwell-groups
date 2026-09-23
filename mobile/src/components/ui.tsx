import { type ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import { C, FONT, RADIUS } from "@/theme";

/* ---------------- type ---------------- */

export function H1({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text style={[s.h1, style]}>{children}</Text>;
}
export function H2({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text style={[s.h2, style]}>{children}</Text>;
}
export function H3({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text style={[s.h3, style]}>{children}</Text>;
}
export function Body({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text style={[s.body, style]}>{children}</Text>;
}
export function Lead({ children }: { children: ReactNode }) {
  return <Text style={s.lead}>{children}</Text>;
}
export function Note({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text style={[s.note, style]}>{children}</Text>;
}
export function Eyebrow({ children }: { children: ReactNode }) {
  return <Text style={s.eyebrow}>{children}</Text>;
}

/* ---------------- buttons ---------------- */

type BtnKind = "primary" | "sage" | "outline" | "ghost" | "gold";

export function Button({
  label,
  onPress,
  kind = "primary",
  small,
  disabled,
  busy,
  style,
}: {
  label: string;
  onPress: () => void;
  kind?: BtnKind;
  small?: boolean;
  disabled?: boolean;
  busy?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const off = disabled || busy;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!off }}
      disabled={off}
      onPress={onPress}
      style={({ pressed }) => [
        s.btn,
        small && s.btnSm,
        kindStyle[kind],
        off && s.btnOff,
        pressed && !off && s.btnPressed,
        style,
      ]}
    >
      {busy ? (
        <ActivityIndicator size="small" color={kind === "outline" || kind === "ghost" ? C.ink : "#fff"} />
      ) : (
        <Text style={[s.btnText, small && s.btnTextSm, kindText[kind]]}>{label}</Text>
      )}
    </Pressable>
  );
}

const kindStyle: Record<BtnKind, ViewStyle> = {
  primary: { backgroundColor: C.terracotta, borderColor: C.terracotta },
  sage: { backgroundColor: C.sageDeep, borderColor: C.sageDeep },
  gold: { backgroundColor: C.gold, borderColor: C.gold },
  outline: { backgroundColor: "transparent", borderColor: C.ink },
  ghost: { backgroundColor: "transparent", borderColor: "transparent" },
};
const kindText: Record<BtnKind, TextStyle> = {
  primary: { color: "#fff" },
  sage: { color: "#fff" },
  gold: { color: "#fff" },
  outline: { color: C.ink },
  ghost: { color: C.terracotta },
};

/* ---------------- surfaces ---------------- */

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[s.card, style]}>{children}</View>;
}

/** The website's `.bw` block: a bordered white worksheet panel. */
export function Panel({
  title,
  tag,
  children,
}: {
  title?: string;
  tag?: string;
  children: ReactNode;
}) {
  return (
    <View style={s.panel}>
      {!!title && (
        <View style={s.panelHead}>
          <H3 style={{ flexShrink: 1 }}>{title}</H3>
          {!!tag && <Text style={s.panelTag}>{tag}</Text>}
        </View>
      )}
      {children}
    </View>
  );
}

export function Callout({
  tone = "cream",
  title,
  children,
}: {
  tone?: "cream" | "sage" | "teal" | "gold";
  title?: string;
  children?: ReactNode;
}) {
  return (
    <View style={[s.callout, calloutTone[tone]]}>
      {!!title && <Text style={s.calloutTitle}>{title}</Text>}
      {typeof children === "string" ? <Text style={s.calloutBody}>{children}</Text> : children}
    </View>
  );
}
const calloutTone: Record<string, ViewStyle> = {
  cream: { backgroundColor: C.cream2, borderLeftColor: C.gold },
  sage: { backgroundColor: "#F2F5EE", borderLeftColor: C.sageDeep },
  teal: { backgroundColor: "#EDF7F6", borderLeftColor: C.teal },
  gold: { backgroundColor: "#FCF8EE", borderLeftColor: C.gold },
};

export function Pill({ children, tone }: { children: ReactNode; tone?: "sage" | "teal" }) {
  return (
    <View
      style={[
        s.pill,
        tone === "sage" && { backgroundColor: "#F2F5EE" },
        tone === "teal" && { backgroundColor: "#EDF7F6" },
      ]}
    >
      <Text
        style={[
          s.pillText,
          tone === "sage" && { color: C.sageDeep },
          tone === "teal" && { color: C.teal },
        ]}
        numberOfLines={1}
      >
        {children}
      </Text>
    </View>
  );
}

/** The `.tpl-chip` toggle used all over the site for inline choices. */
export function Chip({
  label,
  on,
  onPress,
  disabled,
}: {
  label: string;
  on?: boolean;
  onPress?: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: !!on, disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[s.chip, on && s.chipOn, disabled && { opacity: on ? 1 : 0.45 }]}
    >
      <Text style={[s.chipText, on && s.chipTextOn]}>{label}</Text>
    </Pressable>
  );
}

export function ChipRow({ children }: { children: ReactNode }) {
  return <View style={s.chipRow}>{children}</View>;
}

export function Field({
  label,
  value,
  onChangeText,
  placeholder,
  multiline,
  keyboardType,
  autoCapitalize,
  numberOfLines,
  editable = true,
}: {
  label?: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  multiline?: boolean;
  keyboardType?: "default" | "numeric" | "email-address";
  autoCapitalize?: "none" | "sentences" | "characters" | "words";
  numberOfLines?: number;
  editable?: boolean;
}) {
  return (
    <View style={{ marginBottom: 12 }}>
      {!!label && <Text style={s.label}>{label}</Text>}
      <TextInput
        style={[s.input, multiline && { height: (numberOfLines ?? 4) * 22 + 20, textAlignVertical: "top" }]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#A79C8C"
        multiline={multiline}
        numberOfLines={numberOfLines}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        editable={editable}
        autoCorrect={keyboardType !== "email-address"}
      />
    </View>
  );
}

export function Divider() {
  return <View style={s.divider} />;
}

export function Row({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[s.row, style]}>{children}</View>;
}

export function Screen({ children, scroll = true }: { children: ReactNode; scroll?: boolean }) {
  if (!scroll) return <View style={s.screen}>{children}</View>;
  return (
    <ScrollView
      style={s.screen}
      contentContainerStyle={{ padding: 20, paddingBottom: 64 }}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  );
}

export const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.cream },

  h1: { fontFamily: FONT.serif, fontSize: 32, lineHeight: 37, color: C.ink, letterSpacing: -0.3 },
  h2: { fontFamily: FONT.serif, fontSize: 25, lineHeight: 30, color: C.ink, letterSpacing: -0.2 },
  h3: { fontFamily: FONT.serif, fontSize: 18, lineHeight: 23, color: C.ink },
  body: { fontFamily: FONT.sans, fontSize: 16, lineHeight: 26, color: C.ink },
  lead: { fontFamily: FONT.sans, fontSize: 16.5, lineHeight: 27, color: C.inkSoft, marginBottom: 18 },
  note: { fontFamily: FONT.sans, fontSize: 13.5, lineHeight: 21, color: C.inkSoft, marginTop: 10 },
  eyebrow: {
    fontFamily: FONT.sansSemi,
    fontSize: 11,
    letterSpacing: 2.6,
    textTransform: "uppercase",
    color: C.gold,
    marginBottom: 10,
  },

  btn: {
    borderRadius: RADIUS,
    borderWidth: 1,
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
  },
  btnSm: { paddingVertical: 10, paddingHorizontal: 16, minHeight: 40 },
  btnOff: { opacity: 0.45 },
  btnPressed: { opacity: 0.85 },
  btnText: {
    fontFamily: FONT.sansSemi,
    fontSize: 13,
    letterSpacing: 1.6,
    textTransform: "uppercase",
  },
  btnTextSm: { fontSize: 12, letterSpacing: 1.3 },

  card: {
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: RADIUS,
    padding: 18,
  },
  panel: {
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: RADIUS,
    padding: 18,
    marginVertical: 14,
  },
  panelHead: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12, flexWrap: "wrap" },
  panelTag: {
    fontFamily: FONT.sansBold,
    fontSize: 10.5,
    letterSpacing: 1.3,
    textTransform: "uppercase",
    color: C.gold,
  },

  callout: { borderLeftWidth: 3, padding: 16, marginVertical: 12, borderRadius: RADIUS },
  calloutTitle: { fontFamily: FONT.sansBold, fontSize: 15, color: C.ink, marginBottom: 5 },
  calloutBody: { fontFamily: FONT.sans, fontSize: 14.5, lineHeight: 23, color: C.inkSoft },

  pill: {
    backgroundColor: C.cream2,
    borderRadius: 999,
    paddingVertical: 5,
    paddingHorizontal: 12,
    maxWidth: 220,
  },
  pillText: { fontFamily: FONT.sansMedium, fontSize: 12.5, color: C.inkSoft },

  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 10 },
  chip: {
    borderWidth: 1,
    borderColor: C.lineDark,
    backgroundColor: C.white,
    borderRadius: RADIUS,
    paddingVertical: 9,
    paddingHorizontal: 14,
  },
  chipOn: { backgroundColor: C.ink, borderColor: C.ink },
  chipText: { fontFamily: FONT.sansMedium, fontSize: 13.5, color: C.ink },
  chipTextOn: { color: C.cream },

  label: {
    fontFamily: FONT.sansSemi,
    fontSize: 11.5,
    letterSpacing: 1.3,
    textTransform: "uppercase",
    color: C.inkSoft,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: C.lineDark,
    backgroundColor: C.white,
    borderRadius: RADIUS,
    paddingHorizontal: 13,
    paddingVertical: 12,
    fontFamily: FONT.sans,
    fontSize: 16,
    color: C.ink,
    minHeight: 48,
  },

  divider: { height: 1, backgroundColor: C.line, marginVertical: 22 },
  row: { flexDirection: "row", alignItems: "center", gap: 10, flexWrap: "wrap" },
});
