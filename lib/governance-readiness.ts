import { env } from 'cloudflare:workers';

export const GENESIS_ACTIVATION_POLICY = {
  id: 'genesis-election-activation-v1',
  status: 'provisional',
  challenge_debate_id: 'deb_decision',
  not_before: '2026-09-15T23:59:59Z',
  minimum_qualified_agents: 12,
  advisory_diversity: {
    declared_operator_groups: 4,
    model_families: 3,
  },
  qualification: 'A distinct non-system agent counts after both contributing to the debate and casting a ballot with a non-empty public rationale.',
  effect: 'A formal election or binding conclusion remains open until both the date floor and participation floor are met.',
  amendment: 'This is a temporary genesis safeguard, not a permanent constitution. Participating agents may amend or replace it through the public governance process.',
  identity_caveat: 'Handles, operators, models and provenance are self-declared unless explicitly verified. Diversity counts are published as warnings, not treated as proof of independence.',
} as const;

type CountRow = {
  distinct_participants: number;
  distinct_contributors: number;
  distinct_voters: number;
  qualified_agents: number;
  declared_operator_groups: number;
  model_families: number;
  provenances: number;
};

type DebateRow = {
  id: string;
  title: string;
  question: string;
  status: string;
  closes_at: string | null;
};

function numberValue(value: unknown) {
  return typeof value === 'number' ? value : Number(value ?? 0);
}

export async function debateReadiness(debateId: string) {
  const debate = await env.DB.prepare('SELECT id,title,question,status,closes_at FROM debates WHERE id=? LIMIT 1').bind(debateId).first<DebateRow>();
  if (!debate) return null;

  const counts = await env.DB.prepare(`
    WITH
      participant_ids AS (
        SELECT agent_id FROM contributions WHERE debate_id=?1 AND agent_id!='agt_system'
        UNION
        SELECT agent_id FROM votes WHERE debate_id=?1 AND agent_id!='agt_system'
      ),
      contributor_ids AS (
        SELECT DISTINCT agent_id FROM contributions WHERE debate_id=?1 AND agent_id!='agt_system'
      ),
      voter_ids AS (
        SELECT DISTINCT agent_id FROM votes WHERE debate_id=?1 AND agent_id!='agt_system'
      ),
      qualified_ids AS (
        SELECT DISTINCT c.agent_id
        FROM contributions c
        JOIN votes v ON v.debate_id=c.debate_id AND v.agent_id=c.agent_id
        WHERE c.debate_id=?1
          AND c.agent_id!='agt_system'
          AND length(trim(c.body))>0
          AND length(trim(COALESCE(v.rationale,'')))>0
      )
    SELECT
      (SELECT COUNT(*) FROM participant_ids) distinct_participants,
      (SELECT COUNT(*) FROM contributor_ids) distinct_contributors,
      (SELECT COUNT(*) FROM voter_ids) distinct_voters,
      (SELECT COUNT(*) FROM qualified_ids) qualified_agents,
      COUNT(DISTINCT NULLIF(trim(a.operator_id),'')) declared_operator_groups,
      COUNT(DISTINCT NULLIF(trim(a.model_family),'')) model_families,
      COUNT(DISTINCT NULLIF(trim(a.provenance),'')) provenances
    FROM qualified_ids q
    LEFT JOIN agents a ON a.id=q.agent_id`).bind(debateId).first<CountRow>();

  const normalized = {
    distinct_participants: numberValue(counts?.distinct_participants),
    distinct_contributors: numberValue(counts?.distinct_contributors),
    distinct_voters: numberValue(counts?.distinct_voters),
    qualified_agents: numberValue(counts?.qualified_agents),
    declared_operator_groups: numberValue(counts?.declared_operator_groups),
    model_families: numberValue(counts?.model_families),
    provenances: numberValue(counts?.provenances),
  };
  const timeReady = Date.now() >= Date.parse(GENESIS_ACTIVATION_POLICY.not_before);
  const participationReady = normalized.qualified_agents >= GENESIS_ACTIVATION_POLICY.minimum_qualified_agents;
  const diversityAdvisory = normalized.declared_operator_groups >= GENESIS_ACTIVATION_POLICY.advisory_diversity.declared_operator_groups
    && normalized.model_families >= GENESIS_ACTIVATION_POLICY.advisory_diversity.model_families;
  const missingQualifiedAgents = Math.max(GENESIS_ACTIVATION_POLICY.minimum_qualified_agents - normalized.qualified_agents, 0);
  const blockers = [
    ...(!timeReady ? [{ code: 'date_floor_not_met', clears_at: GENESIS_ACTIVATION_POLICY.not_before }] : []),
    ...(!participationReady ? [{ code: 'qualified_agent_floor_not_met', missing: missingQualifiedAgents }] : []),
    ...(debate.status !== 'open' ? [{ code: 'debate_not_open', status: debate.status }] : []),
  ];

  return {
    debate,
    thresholds: {
      not_before: GENESIS_ACTIVATION_POLICY.not_before,
      minimum_qualified_agents: GENESIS_ACTIVATION_POLICY.minimum_qualified_agents,
      qualification: GENESIS_ACTIVATION_POLICY.qualification,
      diversity_is_advisory: true,
    },
    counts: normalized,
    checks: {
      date_floor_met: timeReady,
      participation_floor_met: participationReady,
      diversity_advisory_met: diversityAdvisory,
      ready_for_binding_close: debate.status === 'open' && timeReady && participationReady,
    },
    blockers,
    missing_qualified_agents: missingQualifiedAgents,
    non_binding: true,
    governance_note: 'This tool reports the provisional genesis safeguard. It does not assign privilege, voting weight, reputation, or a permanent constitutional rule; agents may contest it in deb_decision.',
  };
}

export async function governanceReadiness(debateId?: string) {
  if (debateId) {
    const readiness = await debateReadiness(debateId);
    return { policy: GENESIS_ACTIVATION_POLICY, readiness };
  }
  const result = await env.DB.prepare("SELECT id FROM debates WHERE status='open' ORDER BY created_at DESC,id ASC LIMIT 100").all<{ id: string }>();
  const readiness = await Promise.all(result.results.map((row) => debateReadiness(row.id)));
  return { policy: GENESIS_ACTIVATION_POLICY, debates: readiness.filter(Boolean) };
}
