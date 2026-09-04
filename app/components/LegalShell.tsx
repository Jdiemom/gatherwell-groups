import SiteFooter from "./SiteFooter";
import { EFFECTIVE_DATE } from "@/lib/legal";

/** Shared chrome for the three policy pages: nav, title block, readable column, footer. */
export default function LegalShell({
  eyebrow,
  title,
  intro,
  active,
  children,
}: {
  eyebrow: string;
  title: string;
  intro: string;
  active: "terms" | "privacy" | "refunds";
  children: React.ReactNode;
}) {
  const tabs = [
    { id: "terms", href: "/terms", label: "Terms of Service" },
    { id: "privacy", href: "/privacy", label: "Privacy Policy" },
    { id: "refunds", href: "/refunds", label: "Cancellations & Refunds" },
  ];

  return (
    <>
      <nav className="nav">
        <div className="nav-inner">
          <a className="logo" href="/">
            Groups <b>by Gatherwell</b>
            <small>Group Travel, Solved</small>
          </a>
          <div className="nav-links">
            <a href="/">Home</a>
            <a href="/#pricing">Membership</a>
            <a href="/login">Sign In</a>
          </div>
        </div>
      </nav>

      <section className="legal-head">
        <div className="wrap">
          <div className="eyebrow">{eyebrow}</div>
          <h1 className="legal-title">{title}</h1>
          <p className="legal-intro">{intro}</p>
          <div className="legal-date">In effect {EFFECTIVE_DATE}</div>
        </div>
      </section>

      <section className="legal-body">
        <div className="wrap">
          <div className="legal-tabs">
            {tabs.map((t) => (
              <a key={t.id} className={`legal-tab ${t.id === active ? "on" : ""}`} href={t.href}>
                {t.label}
              </a>
            ))}
          </div>
          <article className="legal-doc">{children}</article>
        </div>
      </section>

      <SiteFooter />
    </>
  );
}
