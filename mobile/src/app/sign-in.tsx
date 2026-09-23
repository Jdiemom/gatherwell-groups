import { useState } from "react";
import { KeyboardAvoidingView, Platform, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "@/lib/supabase";
import { Logo } from "@/components/Logo";
import { Toast } from "@/components/Toast";
import { Button, Card, Eyebrow, Field, H2, Note, Screen, Body } from "@/components/ui";

/**
 * The website emails a magic link, which works because a browser can follow it
 * back into the same tab. On a phone that round trip is fragile, so the app uses
 * the six-digit code from the same email instead: one Supabase email, two ways in.
 */
export default function SignIn() {
  // Set when an invite link bounced through here: go back to it once signed in.
  const { next } = useLocalSearchParams<{ next?: string }>();
  const [stage, setStage] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState("");

  const say = (m: string) => {
    setToast(m);
    setTimeout(() => setToast(""), 3000);
  };

  async function sendCode() {
    const address = email.trim().toLowerCase();
    if (!address.includes("@")) return say("Enter the email address you use for the trip.");
    setBusy(true);
    const { error } = await supabase.auth.signInWithOtp({
      email: address,
      options: { shouldCreateUser: true },
    });
    setBusy(false);
    if (error) return say(error.message);
    setStage("code");
    say("Check your email for the code.");
  }

  async function verify() {
    const token = code.trim();
    if (token.length < 6) return say("Enter the six-digit code from the email.");
    setBusy(true);
    const { error } = await supabase.auth.verifyOtp({
      email: email.trim().toLowerCase(),
      token,
      type: "email",
    });
    setBusy(false);
    if (error) return say("That code didn't work. Check it, or send a new one.");
    // Only ever follow an in-app path, never an arbitrary URL.
    router.replace(next && next.startsWith("/") ? next : "/trips");
  }

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <Screen>
          <View style={{ alignItems: "center", marginTop: 40, marginBottom: 28 }}>
            <Logo tagline />
          </View>

          <View style={{ alignItems: "center", marginBottom: 20 }}>
            <Eyebrow>Members</Eyebrow>
            <H2 style={{ textAlign: "center" }}>Sign in to Groups by Gatherwell</H2>
          </View>

          <Card>
            {stage === "email" ? (
              <>
                <Body style={{ marginBottom: 16 }}>
                  No passwords here. Enter your email and we&apos;ll send you a sign-in code.
                </Body>
                <Field
                  label="Email"
                  value={email}
                  onChangeText={setEmail}
                  placeholder="you@example.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
                <Button label="Email me a code" busy={busy} onPress={sendCode} />
                <Note>New here? Same box. Your account is created the first time you sign in.</Note>
              </>
            ) : (
              <>
                <Body style={{ marginBottom: 16 }}>
                  We sent a six-digit code to {email.trim().toLowerCase()}. It can take a minute to
                  arrive.
                </Body>
                <Field
                  label="Your code"
                  value={code}
                  onChangeText={setCode}
                  placeholder="123456"
                  keyboardType="numeric"
                  autoCapitalize="none"
                />
                <Button label="Sign in" busy={busy} onPress={verify} />
                <Button
                  label="Use a different email"
                  kind="ghost"
                  small
                  onPress={() => {
                    setStage("email");
                    setCode("");
                  }}
                  style={{ marginTop: 8 }}
                />
              </>
            )}
          </Card>
        </Screen>
      </KeyboardAvoidingView>
      <Toast message={toast} />
    </SafeAreaView>
  );
}
