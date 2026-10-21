import { useNavigate } from 'react-router-dom';
import '../styles/marketing.css';
import { MarketingNav, MarketingFooter } from '../components/marketing/MarketingChrome';
import { PricingSection } from '../components/marketing/PricingSection';

// Pricing page — the same section 7 as the landing, on its own page. Always Bone.
export default function Pricing() {
  const navigate = useNavigate();
  return (
    <div className="mk-root" data-theme="light">
      <MarketingNav />
      <section className="mk-section" style={{ borderTop: 0 }}>
        <div className="mk-wrap">
          <PricingSection headingLevel="h1" />
          <div className="mk-close">
            <button className="btn btn-primary btn-lg" onClick={() => navigate('/login')}>Get started</button>
          </div>
        </div>
      </section>
      <MarketingFooter />
    </div>
  );
}
