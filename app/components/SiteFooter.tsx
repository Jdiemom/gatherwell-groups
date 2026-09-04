import { CONTACT_EMAIL, CONTACT_PHONE, CONTACT_PHONE_HREF, LEGAL_NAME } from "@/lib/legal";

/** The one footer used by the homepage and every legal page, so the policy links can never go missing. */
export default function SiteFooter() {
  return (
    <footer>
      <div className="wrap">
        <div className="cols">
          <div>
            <div className="logo" style={{ color: "#fff" }}>
              Groups <b>by Gatherwell</b>
            </div>
            <p style={{ marginTop: 14, maxWidth: 320, lineHeight: 1.8 }}>
              Meaningful travel, beautifully planned, for groups who&apos;d rather do it
              themselves.
            </p>
          </div>
          <div>
            <div className="ft-head">Talk to a human</div>
            <p>
              <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
              <br />
              <a href={`tel:${CONTACT_PHONE_HREF}`}>{CONTACT_PHONE}</a>
              <br />
              <span style={{ fontSize: 13.5, color: "rgba(255,255,255,.65)" }}>Call or text, we answer both.</span>
            </p>
          </div>
          <div>
            <div className="ft-head">The Gatherwell Family</div>
            <p>
              <a href="https://gatherwelltravel.com" target="_blank" rel="noopener noreferrer">Gatherwell Travel · Full Service</a>
              <br />
              <a href="https://apps.apple.com/us/app/gatherwell-travel/id6762874183" target="_blank" rel="noopener noreferrer">Gatherwell Budgeting App</a>
              <br />
              <a href="/login">Member Sign In</a>
            </p>
          </div>
          <div>
            <div className="ft-head">The Fine Print</div>
            <p>
              <a href="/terms">Terms of Service</a>
              <br />
              <a href="/privacy">Privacy Policy</a>
              <br />
              <a href="/refunds">Cancellations &amp; Refunds</a>
            </p>
          </div>
        </div>
        <div className="ft-line">
          <span>© {new Date().getFullYear()} {LEGAL_NAME}. All rights reserved.</span>
          <span>www.groupsbygatherwell.com</span>
        </div>
      </div>
    </footer>
  );
}
