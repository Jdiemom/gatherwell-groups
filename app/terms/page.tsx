import type { Metadata } from "next";
import LegalShell from "@/app/components/LegalShell";
import {
  CONTACT_EMAIL,
  CONTACT_PHONE,
  GOVERNING_LAW,
  LEGAL_NAME,
  MAILING_ADDRESS,
  PARTNERS,
  PLAN_PRICES,
  PRODUCT_NAME,
  SITE_URL,
} from "@/lib/legal";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "The agreement between you and Gatherwell Travel when you use Groups by Gatherwell to plan a group trip.",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <LegalShell
      eyebrow="The Fine Print"
      title="Terms of Service"
      intro="Plain language, because a group trip is complicated enough. This is the agreement between you and us when you use Groups by Gatherwell."
      active="terms"
    >
      <div className="legal-toc">
        <div>On this page</div>
        <a href="#who">Who we are</a>
        <a href="#what">What the service is</a>
        <a href="#accounts">Accounts and groups</a>
        <a href="#billing">Membership and billing</a>
        <a href="#booking">Booking and partners</a>
        <a href="#estimates">Estimates and timing</a>
        <a href="#conduct">How you may use it</a>
        <a href="#method">Our method and content</a>
        <a href="#liability">Disclaimers and liability</a>
        <a href="#ending">Ending the agreement</a>
        <a href="#changes">Changes and law</a>
      </div>

      <h2 id="who">1. Who we are</h2>
      <p>
        {PRODUCT_NAME} is a service of {LEGAL_NAME}
        {" (“Gatherwell,” “we,” “us”). "}
        This site is <a href={SITE_URL}>{SITE_URL}</a>. You can reach a person at{" "}
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> or {CONTACT_PHONE}.
        {MAILING_ADDRESS ? ` Our mailing address is ${MAILING_ADDRESS}.` : ""}
      </p>
      <p>
        By creating an account, joining a group, or paying for a membership, you agree to these
        terms. If you do not agree with them, please do not use the service.
      </p>

      <h2 id="what">2. What the service is, and what it is not</h2>
      <p>
        {PRODUCT_NAME} is planning software. It walks a group through nine steps, collects
        everyone&apos;s votes and answers, and produces documents you keep: a budget, a date
        decision, a shortlist, a payment schedule, an itinerary.
      </p>
      <p>
        <b>We are not the travel supplier.</b> We do not operate flights, hotels, villas, tours, or
        transfers. When your group books something, that booking is a contract between the traveler
        and the airline, property, or tour operator, on their terms and their cancellation rules.
        Any question about a booking has to be settled with the company that took the money.
      </p>
      <p>
        Our separate full-service travel agency, Gatherwell Travel, is a different arrangement with
        its own agreement and its own fees. Nothing on this site commits you to it.
      </p>

      <h2 id="accounts">3. Accounts and groups</h2>
      <ul>
        <li>You must be 18 or older to hold an account. Travelers aged 13 to 17 may be invited by an organizer only with a parent or guardian&apos;s permission. We do not create accounts for children under 13.</li>
        <li>You are responsible for what happens under your account. Sign-in links are sent to your email, so keep your email secure and do not forward those links.</li>
        <li>The <b>organizer</b> is the person who creates the group and holds the membership. The organizer can invite and remove travelers, close polls, record decisions, and end the group.</li>
        <li><b>Travelers</b> join free with an invite link. Travelers do not need a membership.</li>
        <li>A group&apos;s answers, votes, and documents are visible to the members of that group. Budget votes are recorded and displayed without names attached, and we keep it that way.</li>
        <li>Give accurate information. Dates, headcounts, and budgets drive real money decisions for other people in your group.</li>
      </ul>

      <h2 id="billing">4. Membership and billing</h2>
      <p>Memberships are monthly and priced in US dollars:</p>
      <ul>
        {PLAN_PRICES.map((p) => (
          <li key={p.name}>
            <b>{p.name}</b>: {p.price}
          </li>
        ))}
      </ul>
      <p>
        Payments are handled by Stripe. We never see or store your full card number. Your membership
        renews automatically each month on the date you subscribed until you cancel, and the card on
        file is charged each time.
      </p>
      <p>
        You can cancel at any time from your account, and cancellation stops the next charge. What
        happens to the rest of a month you already paid for is set out in our{" "}
        <a href="/refunds">Cancellations and Refunds policy</a>, which is part of these terms.
      </p>
      <p>
        We may change prices. If we do, we will email you at least 30 days before the change affects
        your renewal, and you can cancel before it takes effect. Applicable taxes may be added at
        checkout.
      </p>

      <h2 id="booking">5. Booking links and how we earn</h2>
      <p>
        Some links in the service take you to partner companies, including{" "}
        {PARTNERS.join(", ")}. If your group books through one of those links, we may earn a
        commission or a referral fee from that company. It costs you nothing extra, and it never
        changes what we recommend to you: the shortlist your group sees is driven by your own
        answers and votes.
      </p>
      <p>
        Prices, availability, and terms on partner sites belong to those companies and can change
        between the moment you see them and the moment you book.
      </p>

      <h2 id="estimates">6. Estimates, savings figures, and flight timing</h2>
      <p>
        The savings numbers on our marketing pages and inside the product are estimates built from
        published industry averages and our own advisory fees. They are illustrations, not a promise
        of what your group will save.
      </p>
      <p>
        Our flight guidance tells you when historical data says fares are usually lowest. Airfare
        pricing is set by airlines and moves for reasons no model captures. <b>We cannot guarantee
        that buying inside a recommended window will get you a lower fare</b>, and we will never tell
        you otherwise. Treat it as a nudge, not a certainty.
      </p>
      <p>
        Any research links, restaurant suggestions, or destination notes are starting points for your
        own research, not vetted recommendations for your specific group.
      </p>

      <h2 id="conduct">7. How you may use the service</h2>
      <p>Please do not:</p>
      <ul>
        <li>Use the service to harass, threaten, or deceive anyone, including people in your own group</li>
        <li>Upload anything unlawful, or anyone&apos;s personal information you do not have permission to share</li>
        <li>Try to break, overload, scrape, or reverse engineer the service, or get at data that is not yours</li>
        <li>Share your account so that people outside your paid plan get access to the method</li>
        <li>Resell, license, or rebuild the service, or use it to run a competing planning product</li>
      </ul>
      <p>We can suspend or close an account that does any of this.</p>

      <h2 id="method">8. Our method, your content</h2>
      <p>
        The Gatherwell Method, the nine-step sequence, the step content, the destination library, the
        matching logic, the document templates, the software, and the brand are ours and stay ours.
        Your membership buys you the right to use them to plan your own group&apos;s trips. It does
        not let you copy, publish, adapt, or teach the method as your own, or use it to build a
        competing service.
      </p>
      <p>
        What you type stays yours. You give us permission to store it, show it to your group, and use
        it to run the service and produce your documents. We may use anonymized, aggregated
        information, for example how many groups pick a given month, to improve the product. That
        never identifies you or your group.
      </p>
      <p>
        If you send us an idea or a suggestion, including through the feedback button, we may build it
        without owing you anything for it.
      </p>

      <h2 id="liability">9. Disclaimers and limits</h2>
      <p>
        The service is provided as it is. We do our best to keep it running and accurate, but we do
        not promise it will be uninterrupted, error free, or right for every group.
      </p>
      <p>
        To the fullest extent the law allows, {LEGAL_NAME} is not liable for indirect or
        consequential losses, and our total liability to you for any claim connected to the service
        is limited to what you paid us in the twelve months before the claim arose. Nothing here
        limits liability that cannot be limited by law.
      </p>
      <p>
        We are not responsible for a supplier&apos;s cancellation, a missed flight, a change in
        pricing, or a disagreement between members of your group. Please carry travel insurance.
      </p>

      <h2 id="ending">10. Ending the agreement</h2>
      <p>
        You can stop at any time by canceling your membership and closing your account. We can
        suspend or end an account that breaches these terms, and we will tell you why unless we are
        prevented from doing so.
      </p>
      <p>
        When a membership ends, the organizer keeps read access to the documents already produced for
        a reasonable period so nobody loses a locked itinerary mid-trip. Steps that are still open
        stop being editable.
      </p>

      <h2 id="changes">11. Changes, law, and contact</h2>
      <p>
        We may update these terms. If a change matters, we will email account holders and update the
        date at the top of this page. Continuing to use the service after that means you accept the
        new version.
      </p>
      <p>
        These terms are governed by the laws of {GOVERNING_LAW}, and the courts there have
        jurisdiction. If one clause turns out to be unenforceable, the rest still stands.
      </p>
      <p>
        Questions about any of this go to a real person at{" "}
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
      </p>
    </LegalShell>
  );
}
