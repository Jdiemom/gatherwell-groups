import { type ReactNode } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { C, FONT, RADIUS } from "@/theme";
import { H3 } from "./ui";

/**
 * Stands in for the website's `.modal-bg` overlay. `dismissable={false}` is used
 * for the traveller profile and the tie-break, which the web app also refuses to
 * let you click away from.
 */
export function Sheet({
  visible,
  title,
  onClose,
  children,
  dismissable = true,
}: {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  dismissable?: boolean;
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={dismissable ? onClose : () => {}}
    >
      <Pressable style={st.bg} onPress={dismissable ? onClose : undefined}>
        <Pressable style={st.card} onPress={(e) => e.stopPropagation()}>
          <View style={st.head}>
            <H3 style={{ flex: 1 }}>{title}</H3>
            {dismissable && (
              <Pressable onPress={onClose} hitSlop={12} accessibilityLabel="Close" accessibilityRole="button">
                <Text style={st.close}>×</Text>
              </Pressable>
            )}
          </View>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 6 }}>
            {children}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

/** The document preview the site shows before you download an output. */
export function DocumentSheet({
  doc,
  onClose,
  onShare,
}: {
  doc: { title: string; body: string; filename: string } | null;
  onClose: () => void;
  onShare: () => void;
}) {
  return (
    <Sheet visible={!!doc} title={doc?.title ?? ""} onClose={onClose}>
      <ScrollView horizontal showsHorizontalScrollIndicator>
        <Text style={st.pre}>{doc?.body}</Text>
      </ScrollView>
      {!!doc?.filename && (
        <Pressable style={st.shareBtn} onPress={onShare} accessibilityRole="button">
          <Text style={st.shareText}>Save or share file</Text>
        </Pressable>
      )}
    </Sheet>
  );
}

const st = StyleSheet.create({
  bg: {
    flex: 1,
    backgroundColor: "rgba(51,46,41,.55)",
    justifyContent: "center",
    padding: 18,
  },
  card: {
    backgroundColor: C.cream,
    borderRadius: RADIUS,
    padding: 20,
    maxHeight: "88%",
  },
  head: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 12 },
  close: { fontSize: 30, lineHeight: 32, color: C.inkSoft },
  pre: {
    fontFamily: "Courier",
    fontSize: 12,
    lineHeight: 18,
    color: C.ink,
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.line,
    padding: 12,
  },
  shareBtn: {
    marginTop: 14,
    backgroundColor: C.terracotta,
    borderRadius: RADIUS,
    paddingVertical: 14,
    alignItems: "center",
  },
  shareText: {
    color: "#fff",
    fontFamily: FONT.sansSemi,
    fontSize: 13,
    letterSpacing: 1.6,
    textTransform: "uppercase",
  },
});
