import { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text } from "react-native";
import { C, FONT, RADIUS } from "@/theme";

/** The website's bottom toast, which is how every action reports back to the user. */
export function Toast({ message }: { message: string }) {
  const op = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(op, {
      toValue: message ? 1 : 0,
      duration: 180,
      useNativeDriver: true,
    }).start();
  }, [message, op]);

  if (!message) return null;
  return (
    <Animated.View style={[st.wrap, { opacity: op }]} pointerEvents="none" accessibilityLiveRegion="polite">
      <Text style={st.text}>{message}</Text>
    </Animated.View>
  );
}

const st = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 34,
    backgroundColor: C.ink,
    borderRadius: RADIUS,
    paddingVertical: 13,
    paddingHorizontal: 17,
  },
  text: { color: C.cream, fontFamily: FONT.sansMedium, fontSize: 14.5, lineHeight: 21 },
});
