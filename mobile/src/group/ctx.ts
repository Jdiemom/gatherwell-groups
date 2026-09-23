import type { ReactNode } from "react";
import type { Doc } from "./documents";
import type { Budget, Group, ItinDay, Member, PayPlan, Poll } from "./types";

/**
 * Everything the nine step screens are allowed to touch. The web app keeps all of
 * this in one component closure; on the phone the steps live in their own files,
 * so the closure becomes an explicit object. The container in GroupScreen.tsx is
 * the only thing that builds it.
 */
export type StepCtx = {
  /* state */
  group: Group;
  members: Member[];
  polls: Poll[];
  completed: Set<number>;
  plan: string;
  userId: string;
  me: Member | undefined;
  isOrganizer: boolean;
  isSolo: boolean;
  isConcierge: boolean;
  headcount: number;
  budget: Budget | null;
  effectiveBudget: Budget;
  tripLength: number | "vote" | null;
  itinerary: ItinDay[] | null;
  payplan: PayPlan;
  dates: { start: Date; nights: number } | null;
  savings: number;
  busy: boolean;

  /* chrome the steps reuse */
  renderHeader: (stepN: number) => ReactNode;
  renderPolls: (stepN: number) => ReactNode;
  renderCompleteButton: (
    stepN: number,
    label: string,
    enabled?: boolean,
    message?: string
  ) => ReactNode;

  /* actions */
  say: (message: string) => void;
  showDoc: (doc: Doc) => void;
  setBudget: (b: Budget) => void;
  setItinerary: (days: ItinDay[] | null) => void;
  onSaveBudget: (b: Budget) => void;
  onSaveTripLength: (v: number | "vote") => void;
  onSaveDiscussLinks: (links: { whatsapp?: string; video?: string }) => void;
  onSaveItinerary: () => void;
  onSetPayPlan: (v: PayPlan) => void;
  onSkipDestination: (destination: string) => void;
  onAddDestination: (label: string, blurb: string) => void;
  onBoost: (
    mode: "lump" | "perPerson" | "cover",
    amount: number,
    anonymous: boolean
  ) => Promise<void>;
  onRequestStayOptions: (preferences: string) => Promise<void>;
  onCopyInvite: () => void;
  onShareInvite: (message: string) => void;
  openContact: () => void;
  openUrl: (url: string) => void;
};
