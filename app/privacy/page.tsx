import type { Metadata } from "next";
import LegalShell from "@/app/components/LegalShell";
import {
  CONTACT_EMAIL,
  LEGAL_NAME,
  MAILING_ADDRESS,
  PROCESSORS,
  PRODUCT_NAME,
} from "@/lib/legal";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "What Groups by Gatherwell collects, why, who sees it, and how to get it deleted.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <LegalShell
      eyebrow="The Fine Print"
      title="Privacy Policy"
      intro="What we collect, why we collect it, who can see it, and how to make us delete it. No hidden clauses."
      active="privacy"
    >
      <div className="legal-toc">
        <div>On this page</div>
        <a href="#collect">What we collect</a>
        <a href="#why">Why we use it</a>
        <a href="#group">What your group can see</a>
        <a href="#share">Who else sees it</a>
        <a href="#payments">Payments</a>
        <a href="#email">Email and cookies</a>
        <a href="#children">Children</a>
        <a href="#keep">How long we keep it</a>
        <a href="#rights">Your rights</a>
        <a href="#contact">Contact</a>
      </div>

      <p>
        {PRODUCT_NAME} is run by {LEGAL_NAME}. This policy covers the website and the member app.
        {MAILING_ADDRESS ? ` Our mailing address is ${MAILING_ADDRESS}.` : ""}
      </p>

      <h2 id="collect">1. What we collect</h2>
      <h3>You give us</h3>
      <ul>
        <li>Your name and email address when you sign in or join the waitlist</li>
        <li>Your home airport, whether you are answering for yourself or a couple, and the number and ages of any children traveling with you</li>
        <li>Your survey answers, poll votes, budget numbers, availability, suggestions, and anything you type into a step</li>
        <li>What you write in the feedback form, plus the page you were on when you wrote it</li>
        <li>What you tell us when you request a villa quote, a flight quote, or a consultation</li>
      </ul>
      <h3>We collect automatically</h3>
      <ul>
        <li>Basic technical information from your visit: IP address, browser type, pages viewed, and timestamps, kept in server logs</li>
        <li>Whether an email we sent was delivered</li>
      </ul>
      <p>
        We do not buy personal information about you from data brokers, and we do not run advertising
        trackers on this site.
      </p>

      <h2 id="why">2. Why we use it</h2>
      <ul>
        <li>To run the service: create your group, count votes, produce your budget, itinerary, and payment schedule</li>
        <li>To send the emails the service depends on: sign-in links, invites, poll deadlines, flight-window alerts, and a note to the organizer when someone joins</li>
        <li>To take payment and manage your membership</li>
        <li>To answer you when you ask us something or request a quote</li>
        <li>To fix problems, keep the service secure, and decide what to build next</li>
      </ul>
      <p>
        Where the law requires a legal basis, ours is performing our contract with you, our
        legitimate interest in running and improving a service you asked for, your consent for
        marketing email, and compliance with legal obligations.
      </p>

      <h2 id="group">3. What the people in your group can see</h2>
      <p>
        Group travel only works when a group can see its own decisions. Inside a group, other members
        can see your display name, which polls you have answered, your availability, your activity and
        destination votes, and your suggestions.
      </p>
      <div className="legal-note">
        <b>Budget votes are the exception.</b> What each person votes on money is recorded and shown
        without a name attached, to the organizer as well as everyone else. It is designed that way
        so nobody feels pressure to overcommit, and we do not undo it on request.
      </div>
      <p>
        The organizer additionally sees membership and progress information for the group they run.
        Anyone can leave a group, and an organizer can remove a member.
      </p>

      <h2 id="share">4. Who else sees it</h2>
      <p>These companies process data on our behalf, under contract, only to do their job for us:</p>
      <ul>
        {PROCESSORS.map((p) => (
          <li key={p.name}>
            <b>{p.name}</b> {p.role}
          </li>
        ))}
      </ul>
      <p>
        When you ask us for a quote or a consultation, the details of that request go to the
        Gatherwell Travel advisory team so a person can answer you, and may be shared with the
        specific supplier needed to price it.
      </p>
      <p>
        Partner links take you to other companies&apos; websites. Once you are there, their privacy
        policy applies, not ours. We may be told that a booking came from us so that a commission can
        be paid, which does not tell them who you are on our side.
      </p>
      <p>
        We will also disclose information if the law requires it, and we would pass account data to a
        buyer if the business were ever sold. <b>We do not sell your personal information.</b>
      </p>

      <h2 id="payments">5. Payments</h2>
      <p>
        Stripe processes every payment. Your card details go to Stripe, not to us. We store your
        subscription status, plan, and the identifiers Stripe gives us so we know whether your
        membership is active.
      </p>

      <h2 id="email">6. Email and cookies</h2>
      <p>
        Signing in uses a link sent to your email, so there is no password for us to lose. We set
        cookies that keep you signed in and make the site work. We do not use advertising or
        cross-site tracking cookies.
      </p>
      <p>
        Emails tied to your trip, such as sign-in links, invites, and poll deadlines, are part of the
        service and cannot be turned off while you are in a group. Any occasional tips email has an
        unsubscribe link, and leaving the waitlist is one click.
      </p>

      <h2 id="children">7. Children</h2>
      <p>
        We do not knowingly collect personal information from children under 13, and we do not create
        accounts for them. Where a group records the number and ages of children traveling, that
        exists only to size the villa, the headcount, the flight seats, and the budget. A traveler
        aged 13 to 17 may be invited as a member only with a parent or guardian&apos;s permission. If
        you believe a child has given us information, email us and we will delete it.
      </p>

      <h2 id="keep">8. How long we keep it</h2>
      <ul>
        <li>Account and group data stays while your account is open, so you can look back at trips you have taken</li>
        <li>When you ask us to delete your account, we remove your personal details within 30 days, other than what we must keep</li>
        <li>Payment and tax records are kept as long as accounting law requires, normally seven years</li>
        <li>Server logs are kept for a short period for security and troubleshooting</li>
        <li>Deleting your own account does not erase the group&apos;s history for the other travelers, because it is their trip too. Your votes stay in the totals without your name.</li>
      </ul>

      <h2 id="rights">9. Your rights</h2>
      <p>
        Depending on where you live, you have the right to ask for a copy of what we hold, to correct
        it, to have it deleted, to limit or object to how we use it, and to withdraw consent for
        marketing email. Email us and we will action it. We will not treat you differently for
        asking.
      </p>
      <p>
        Our servers and our suppliers are in Canada, the United States, and the European Union, so
        your information may be processed outside the country you live in, under contracts that
        require it to be protected to the standard described here.
      </p>
      <p>
        We protect data with encrypted connections, database access rules that keep one group&apos;s
        data out of another group&apos;s reach, and service keys held only on the server. No system
        is perfect. If a breach ever affects you, we will tell you and the relevant regulator as the
        law requires.
      </p>

      <h2 id="contact">10. Contact</h2>
      <p>
        Privacy questions, deletion requests, and complaints go to{" "}
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> and a person will answer. If you are
        not satisfied, you can complain to the privacy regulator where you live.
      </p>
      <p>
        We may update this policy. The date at the top of the page tells you when it last changed, and
        we will email account holders about anything significant.
      </p>
    </LegalShell>
  );
}
