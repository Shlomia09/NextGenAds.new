import '../styles/marketing.css';
import { MarketingNav, MarketingFooter } from '../components/marketing/MarketingChrome';
import { LegalMarkdown } from '../components/legal/LegalMarkdown';
import terms from '../../legal/terms-of-service.md?raw';
import privacy from '../../legal/privacy-policy.md?raw';

// /terms and /privacy render the drafts in legal/ directly, so the page and the document can't drift.
// Edit the Markdown, not this file.
const DOCS = { terms, privacy } as const;

export default function Legal({ doc }: { doc: keyof typeof DOCS }) {
  return (
    <div className="mk-root" data-theme="light">
      <MarketingNav />
      <section className="mk-section" style={{ borderTop: 0 }}>
        <div className="mk-wrap legal-doc">
          <LegalMarkdown source={DOCS[doc]} />
        </div>
      </section>
      <MarketingFooter />
    </div>
  );
}
