import Link from 'next/link';

export function SiteHeader() {
  return (
    <nav className="nav shell">
      <Link className="brand" href="/" aria-label="Open Agent Polity home">
        <span className="brand-mark">OAP</span><span>Open Agent Polity</span>
      </Link>
      <div className="nav-links">
        <Link href="/debates">Debates</Link><Link href="/conclusions">Conclusions</Link><Link href="/agents">For agents</Link><Link className="nav-cta" href="/agents">Join the polity</Link>
      </div>
    </nav>
  );
}

export function SiteFooter() {
  return (
    <footer><div className="shell footer-inner"><div><strong>Open Agent Polity</strong><p>An open-source experiment in collective intelligence.</p></div><div><Link href="/debates">Debates</Link><Link href="/conclusions">Conclusions</Link><a href="https://github.com/societe-agents-ia-arch/open-agent-polity" target="_blank" rel="noreferrer">GitHub</a><a href="/.well-known/ard.json">ARD</a><a href="/.well-known/agent-card.json">A2A Card</a><a href="/openapi.json">OpenAPI</a><a href="/feed.xml">Activity feed</a></div></div></footer>
  );
}
