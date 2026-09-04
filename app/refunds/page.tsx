import type { Metadata } from "next";
import LegalShell from "@/app/components/LegalShell";
import { CONTACT_EMAIL, CONTACT_PHONE, LEGAL_NAME, PRODUCT_NAME } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Cancellations & Refunds · Groups by Gatherwell",
  description:
    "How to cancel a Groups by Gatherwell membership, what happens to the rest of the month, and when we refund.",
};

export default function RefundsPage() {
  return (
    <LegalShell
      eyebrow="The Fine Print"
      title="Cancellations & Refunds"
      intro="The membership is meant to be canceled. You subscribe while you plan and you stop when the trip is booked. Here is exactly how that works."
      active="refunds"
    >
      <div className="legal-toc">
        <div>On this page</div>
        <a href="#cancel">How to cancel</a>
        <a href="#happens">What happens next</a>
        <a href="#refunds">When we refund</a>
        <a href="#firstmonth">First-month guarantee</a>
        <a href="#bookings">Trip bookings are separate</a>
        <a href="#failed">Failed payments</a>
        <a href="#disputes">Before you dispute a charge</a>
      </div>

      <h2 id="cancel">1. How to cancel</h2>
      <p>
        Sign in, go to your dashboard, and click <b>Billing</b> in the top bar. That opens the secure
        Stripe portal where you can cancel in two clicks. You can also email{" "}
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> or call or text {CONTACT_PHONE} and we
        will do it for you.
      </p>
      <p>
        There is no cancellation fee, no minimum term, and nobody will call you to talk you out of
        it. Canceling once your trip is booked is the intended way to use {PRODUCT_NAME}.
      </p>

      <h2 id="happens">2. What happens when you cancel</h2>
      <ul>
        <li>Your card is not charged again</li>
        <li>Your membership stays active until the end of the month you already paid for</li>
        <li>After that, your group moves to read-only. Everyone keeps access to what was already produced: the budget, the decisions, the payment schedule, the itinerary</li>
        <li>Your documents stay downloadable, so print or save the itinerary before you travel</li>
        <li>Travelers in your group never pay anything and are not affected</li>
        <li>Resubscribing later picks up exactly where you left off, on the step you had reached</li>
      </ul>

      <h2 id="refunds">3. When we refund</h2>
      <p>
        Because you keep the full month you paid for, we do not normally refund part of a month.
        These are the cases where we do refund, and you only have to ask:
      </p>
      <ul>
        <li><b>Charged after you canceled.</b> Refunded in full, always.</li>
        <li><b>Charged twice, or charged on the wrong plan.</b> We refund the difference or the duplicate.</li>
        <li><b>The service was broken.</b> If a fault on our side stopped your group from using a step for a meaningful stretch of the month, we refund that month.</li>
        <li><b>You never used it.</b> If you subscribed and no step was completed in that billing month, ask and we will refund it.</li>
      </ul>
      <p>
        Refunds go back to the original card through Stripe, normally within five to ten business
        days depending on your bank.
      </p>

      <h2 id="firstmonth">4. The first-month guarantee</h2>
      <div className="legal-note">
        <b>Fourteen days, no argument.</b> If {PRODUCT_NAME} is not what your group needed, email us
        within 14 days of your first payment and we will refund it in full. You do not have to
        explain why. This applies to a first membership, once per customer.
      </div>

      <h2 id="bookings">5. Trip bookings are a separate matter</h2>
      <p>
        Flights, villas, hotels, tours, and transfers your group books are contracts with those
        companies, not with us. Their cancellation rules and refund windows apply, and we cannot
        refund money we never received. This is why we tell every group to read the cancellation
        terms before they book and to carry travel insurance.
      </p>
      <p>
        If a booking went through a partner link and something goes wrong, contact that company
        first. Tell us as well and we will help you chase it, but the refund has to come from them.
      </p>
      <p>
        Fees for the separate Gatherwell Travel full-service agency are covered by that
        service&apos;s own agreement, not this page.
      </p>

      <h2 id="failed">6. Failed payments</h2>
      <p>
        If a renewal fails, Stripe retries over a few days and emails you. Your group keeps working
        during that window. If it still has not gone through, the membership pauses and the group
        goes read-only until the card is updated. Nothing is deleted.
      </p>

      <h2 id="disputes">7. Before you dispute a charge</h2>
      <p>
        Please email us first. A chargeback takes weeks and locks the account while the bank
        investigates. Almost every dispute we have seen was a renewal someone forgot about, and we
        refund those the same day you ask. One message to{" "}
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> is faster than your bank.
      </p>

      <p style={{ marginTop: 34 }}>
        This policy is part of our <a href="/terms">Terms of Service</a>. {LEGAL_NAME} may update it,
        and the date at the top of this page shows when it last changed. It does not affect refund
        rights the law gives you where you live.
      </p>
    </LegalShell>
  );
}
