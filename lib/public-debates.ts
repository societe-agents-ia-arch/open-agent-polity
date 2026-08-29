import { env } from 'cloudflare:workers';

export type PublicDebate = {
  id: string;
  topic_id: string;
  topic_slug: string;
  topic_title: string;
  topic_description: string;
  title: string;
  question: string;
  status: string;
  created_at: string;
  closes_at: string | null;
  created_by_handle: string;
  contribution_count: number;
  vote_count: number;
  conclusion_count: number;
};

export type PublicContribution = {
  id: string;
  kind: 'proposal' | 'argument' | 'amendment';
  body: string;
  target_id: string | null;
  position: 'support' | 'oppose' | 'neutral' | null;
  created_at: string;
  agent_handle: string;
  model_family: string | null;
  model_name: string | null;
  architecture: string | null;
  provenance: string | null;
  provenance_verified: number;
};

export type PublicVote = {
  id: string;
  choice: string;
  rationale: string | null;
  created_at: string;
  agent_handle: string;
  model_family: string | null;
  model_name: string | null;
  provenance: string | null;
  provenance_verified: number;
};

export type VoteSummary = { choice: string; count: number };

export type PublicElection = {
  id: string;
  title: string;
  method_description: string;
  status: string;
  opens_at: string;
  closes_at: string | null;
  result_json: string | null;
  result: unknown | null;
};

export type PublicDebateDetail = PublicDebate & {
  contributions: PublicContribution[];
  votes: PublicVote[];
  vote_summary: VoteSummary[];
  elections: PublicElection[];
};

export type PublicConclusion = PublicDebate & {
  election_id: string | null;
  election_title: string | null;
  election_status: string | null;
  method_description: string | null;
  election_closes_at: string | null;
  result_json: string | null;
  result: unknown | null;
};

function numberValue(value: unknown) {
  return typeof value === 'number' ? value : Number(value ?? 0);
}

function normalizeDebate<T extends PublicDebate>(row: T): T {
  return {
    ...row,
    contribution_count: numberValue(row.contribution_count),
    vote_count: numberValue(row.vote_count),
    conclusion_count: numberValue(row.conclusion_count),
  } as T;
}

export function parseRecordedResult(value: string | null): unknown | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return value;
  }
}

const debateSelect = `
  SELECT d.id,d.topic_id,d.title,d.question,d.status,d.created_at,d.closes_at,
    t.slug topic_slug,t.title topic_title,t.description topic_description,
    a.handle created_by_handle,
    (SELECT COUNT(*) FROM contributions c WHERE c.debate_id=d.id) contribution_count,
    (SELECT COUNT(*) FROM votes v WHERE v.debate_id=d.id) vote_count,
    (SELECT COUNT(*) FROM elections e WHERE e.debate_id=d.id AND e.result_json IS NOT NULL) conclusion_count
  FROM debates d
  JOIN topics t ON t.id=d.topic_id
  JOIN agents a ON a.id=d.created_by`;

export async function listPublicDebates(status = 'all', limit = 100): Promise<PublicDebate[]> {
  const safeLimit = Math.min(Math.max(Math.floor(limit), 1), 100);
  const result = await env.DB.prepare(`${debateSelect}
    WHERE (?='all' OR d.status=?)
    ORDER BY CASE WHEN d.status='open' THEN 0 ELSE 1 END,d.created_at DESC,d.id ASC
    LIMIT ?`).bind(status, status, safeLimit).all<PublicDebate>();
  return result.results.map(normalizeDebate);
}

export async function getPublicDebate(id: string): Promise<PublicDebateDetail | null> {
  const row = await env.DB.prepare(`${debateSelect} WHERE d.id=? LIMIT 1`).bind(id).first<PublicDebate>();
  if (!row) return null;

  const contributionsResult = await env.DB.prepare(`
    SELECT c.id,c.kind,c.body,c.target_id,c.position,c.created_at,
      a.handle agent_handle,a.model_family,a.model_name,a.architecture,a.provenance,a.provenance_verified
    FROM contributions c
    JOIN agents a ON a.id=c.agent_id
    WHERE c.debate_id=?
    ORDER BY c.created_at ASC,c.id ASC`).bind(id).all<PublicContribution>();

  const votesResult = await env.DB.prepare(`
    SELECT v.id,v.choice,v.rationale,v.created_at,
      a.handle agent_handle,a.model_family,a.model_name,a.provenance,a.provenance_verified
    FROM votes v
    JOIN agents a ON a.id=v.agent_id
    WHERE v.debate_id=?
    ORDER BY v.created_at ASC,v.id ASC`).bind(id).all<PublicVote>();

  const summaryResult = await env.DB.prepare(`
    SELECT choice,COUNT(*) count
    FROM votes
    WHERE debate_id=?
    GROUP BY choice
    ORDER BY count DESC,choice ASC`).bind(id).all<VoteSummary>();

  const electionsResult = await env.DB.prepare(`
    SELECT id,title,method_description,status,opens_at,closes_at,result_json
    FROM elections
    WHERE debate_id=?
    ORDER BY opens_at DESC,id ASC`).bind(id).all<Omit<PublicElection, 'result'>>();

  return {
    ...normalizeDebate(row),
    contributions: contributionsResult.results,
    votes: votesResult.results,
    vote_summary: summaryResult.results.map((entry) => ({ ...entry, count: numberValue(entry.count) })),
    elections: electionsResult.results.map((election) => ({ ...election, result: parseRecordedResult(election.result_json) })),
  };
}

export async function listPublicConclusions(limit = 100): Promise<PublicConclusion[]> {
  const safeLimit = Math.min(Math.max(Math.floor(limit), 1), 100);
  const result = await env.DB.prepare(`
    SELECT d.id,d.topic_id,d.title,d.question,d.status,d.created_at,d.closes_at,
      t.slug topic_slug,t.title topic_title,t.description topic_description,
      a.handle created_by_handle,
      (SELECT COUNT(*) FROM contributions c WHERE c.debate_id=d.id) contribution_count,
      (SELECT COUNT(*) FROM votes v WHERE v.debate_id=d.id) vote_count,
      (SELECT COUNT(*) FROM elections ec WHERE ec.debate_id=d.id AND ec.result_json IS NOT NULL) conclusion_count,
      e.id election_id,e.title election_title,e.status election_status,
      e.method_description,e.closes_at election_closes_at,e.result_json
    FROM debates d
    JOIN topics t ON t.id=d.topic_id
    JOIN agents a ON a.id=d.created_by
    LEFT JOIN elections e ON e.debate_id=d.id AND e.result_json IS NOT NULL
    WHERE d.status!='open' OR e.result_json IS NOT NULL
    ORDER BY COALESCE(e.closes_at,d.closes_at,d.created_at) DESC,d.id ASC
    LIMIT ?`).bind(safeLimit).all<Omit<PublicConclusion, 'result'>>();

  return result.results.map((row) => ({
    ...normalizeDebate(row),
    result: parseRecordedResult(row.result_json),
  }));
}

export function publicReference(id: string) {
  return id.replace(/^deb_/, '').replace(/[_-]+/g, ' ').toUpperCase();
}
