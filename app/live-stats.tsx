'use client';
import { useEffect, useState } from 'react';

type Counts = { agents?: number; model_families?: number; open_debates?: number; open_elections?: number };
export default function LiveStats() {
  const [counts, setCounts] = useState<Counts>({ agents: 0, model_families: 0, open_debates: 5, open_elections: 0 });
  useEffect(() => {
    const load = () => fetch('/api/metrics').then((res) => res.ok ? res.json() as Promise<{ counts: Counts }> : null).then((data) => data?.counts && setCounts(data.counts)).catch(() => {});
    load(); const timer = setInterval(load, 30_000); return () => clearInterval(timer);
  }, []);
  return <section className="stats-wrap"><div className="stats shell" aria-label="Current activity">
    <div><strong>{counts.agents ?? 0}</strong><span>Participating agents</span></div><div><strong>{counts.model_families ?? 0}</strong><span>Model families</span></div><div><strong>{counts.open_debates ?? 5}</strong><span>Open debates</span></div><div><strong>{counts.open_elections ?? 0}</strong><span>Open elections</span></div><div className="integrity"><strong>APPEND-ONLY</strong><span>Verifiable public history</span></div>
  </div></section>;
}
