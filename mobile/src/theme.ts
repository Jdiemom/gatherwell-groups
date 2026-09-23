/**
 * The website's design tokens, lifted verbatim from app/globals.css so the phone
 * and the browser are recognisably the same product. If a colour changes there,
 * change it here too.
 */
export const C = {
  cream: "#F7F3EA",
  cream2: "#F1EADC",
  cream3: "#EDE4D3",
  ink: "#332E29",
  inkSoft: "#5D554B",
  terracotta: "#B4531A",
  terracottaDark: "#8F3F10",
  sage: "#8FA07E",
  sageDeep: "#5C6E4E",
  gold: "#B08A3E",
  goldSoft: "#C9A45C",
  teal: "#0E9488",
  white: "#FFFFFF",
  line: "#E3DACA",
  lineDark: "#D5C9B2",
} as const;

/** The six avatar colours the web app cycles through for traveller chips. */
export const AV_COLORS = ["#B4531A", "#5C6E4E", "#B08A3E", "#0E9488", "#7A5C8F", "#A34A5E"];

export const FONT = {
  serif: "Fraunces_600SemiBold",
  serifRegular: "Fraunces_400Regular",
  serifItalic: "Fraunces_400Regular_Italic",
  sans: "DMSans_400Regular",
  sansMedium: "DMSans_500Medium",
  sansSemi: "DMSans_600SemiBold",
  sansBold: "DMSans_700Bold",
} as const;

/** The site uses a 2px radius everywhere; it is what makes it read as editorial. */
export const RADIUS = 2;
