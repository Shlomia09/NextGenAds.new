import { Link, useNavigate } from 'react-router-dom';
import { RougeLogo } from '../brand/RougeLogo';

export function MarketingNav() {
  const navigate = useNavigate();
  return (
    <nav className="mk-nav">
      <div className="mk-wrap mk-nav-inner">
        <Link to="/" className="mk-logo" aria-label="Rouge home">
          <RougeLogo variant="lockup" />
        </Link>
        <div className="mk-nav-links">
          <a href="/#how" className="mk-hide-sm">How it works</a>
          <Link to="/pricing" className="mk-hide-sm">Pricing</Link>
          <Link to="/login">Log in</Link>
          <button className="btn btn-primary btn-sm" onClick={() => navigate('/login')}>Get started</button>
        </div>
      </div>
    </nav>
  );
}

export function MarketingFooter() {
  return (
    <footer className="mk-footer">
      <div className="mk-wrap mk-footer-inner">
        <div className="mk-footer-brand">
          <Link to="/" className="mk-logo" aria-label="Rouge home">
            <RougeLogo variant="lockup" />
          </Link>
          <span>Beauty campaign intelligence · askrouge.com</span>
        </div>
        <div className="mk-footer-links">
          <Link to="/pricing">Pricing</Link>
          <Link to="/login">Log in</Link>
        </div>
      </div>
    </footer>
  );
}
