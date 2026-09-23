import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import * as Print from "expo-print";
import * as Clipboard from "expo-clipboard";
import { Linking, Platform, Share } from "react-native";

/**
 * The website's outputs are browser downloads (`a.download`) and `window.print()`.
 * Neither exists on a phone, so the same documents go through the share sheet,
 * which is the native equivalent and lets people save to Files, mail it, or drop
 * it in the group chat.
 */

/** Writes `body` to a real file and opens the share sheet on it. */
export async function shareDocument(filename: string, body: string): Promise<boolean> {
  try {
    const file = new File(Paths.cache, filename);
    if (file.exists) file.delete();
    file.create({ overwrite: true });
    file.write(body);

    if (!(await Sharing.isAvailableAsync())) {
      // Simulators and a few locked-down devices have no share sheet.
      await Clipboard.setStringAsync(body);
      return false;
    }
    await Sharing.shareAsync(file.uri, {
      mimeType: filename.endsWith(".csv") ? "text/csv" : "text/plain",
      dialogTitle: filename,
      UTI: filename.endsWith(".csv") ? "public.comma-separated-values-text" : "public.plain-text",
    });
    return true;
  } catch {
    await Clipboard.setStringAsync(body).catch(() => {});
    return false;
  }
}

export async function copy(text: string): Promise<boolean> {
  try {
    await Clipboard.setStringAsync(text);
    return true;
  } catch {
    return false;
  }
}

/** The printed keepsake itinerary, rendered as the same document the website prints. */
export async function printHtml(html: string): Promise<void> {
  await Print.printAsync({ html });
}

export async function openUrl(url: string): Promise<void> {
  try {
    await Linking.openURL(url);
  } catch {
    /* a dead partner link should never crash a step */
  }
}

/**
 * Opens the system share sheet on a piece of text. The website offers separate
 * "Email it" and "Text it" buttons; a phone already has one control that covers
 * Messages, Mail, WhatsApp and everything else the group actually uses.
 * Returns false if the user dismissed it, so callers can stay quiet.
 */
export async function shareText(message: string, subject?: string): Promise<boolean> {
  try {
    const result = await Share.share(
      Platform.OS === "ios" ? { message } : { message, title: subject },
      subject ? { dialogTitle: subject } : undefined
    );
    return result.action === Share.sharedAction;
  } catch {
    return false;
  }
}
