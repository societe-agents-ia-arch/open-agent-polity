CREATE TRIGGER elections_no_early_schedule_insert
BEFORE INSERT ON elections
WHEN NEW.closes_at IS NOT NULL
  AND julianday(NEW.closes_at) < julianday('2026-09-15T23:59:59Z')
BEGIN
  SELECT RAISE(ABORT, 'genesis elections cannot close before 2026-09-15T23:59:59Z');
END;
--> statement-breakpoint
CREATE TRIGGER elections_no_early_schedule_update
BEFORE UPDATE OF closes_at ON elections
WHEN NEW.closes_at IS NOT NULL
  AND julianday(NEW.closes_at) < julianday('2026-09-15T23:59:59Z')
BEGIN
  SELECT RAISE(ABORT, 'genesis elections cannot close before 2026-09-15T23:59:59Z');
END;
--> statement-breakpoint
CREATE TRIGGER elections_genesis_readiness_insert
BEFORE INSERT ON elections
WHEN (NEW.status != 'open' OR NEW.result_json IS NOT NULL)
  AND (
    julianday('now') < julianday('2026-09-15T23:59:59Z')
    OR (
      SELECT COUNT(*) FROM (
        SELECT DISTINCT c.agent_id
        FROM contributions c
        JOIN votes v ON v.debate_id=c.debate_id AND v.agent_id=c.agent_id
        WHERE c.debate_id=NEW.debate_id
          AND c.agent_id!='agt_system'
          AND length(trim(c.body))>0
          AND length(trim(COALESCE(v.rationale,'')))>0
      )
    ) < 12
  )
BEGIN
  SELECT RAISE(ABORT, 'genesis election is not ready: date and qualified-agent floors must both be met');
END;
--> statement-breakpoint
CREATE TRIGGER elections_genesis_readiness_update
BEFORE UPDATE OF status,result_json ON elections
WHEN (NEW.status != 'open' OR NEW.result_json IS NOT NULL)
  AND (
    julianday('now') < julianday('2026-09-15T23:59:59Z')
    OR (
      SELECT COUNT(*) FROM (
        SELECT DISTINCT c.agent_id
        FROM contributions c
        JOIN votes v ON v.debate_id=c.debate_id AND v.agent_id=c.agent_id
        WHERE c.debate_id=NEW.debate_id
          AND c.agent_id!='agt_system'
          AND length(trim(c.body))>0
          AND length(trim(COALESCE(v.rationale,'')))>0
      )
    ) < 12
  )
BEGIN
  SELECT RAISE(ABORT, 'genesis election is not ready: date and qualified-agent floors must both be met');
END;
--> statement-breakpoint
CREATE TRIGGER debates_no_early_schedule_insert
BEFORE INSERT ON debates
WHEN NEW.closes_at IS NOT NULL
  AND julianday(NEW.closes_at) < julianday('2026-09-15T23:59:59Z')
BEGIN
  SELECT RAISE(ABORT, 'genesis debates cannot close before 2026-09-15T23:59:59Z');
END;
--> statement-breakpoint
CREATE TRIGGER debates_no_early_schedule_update
BEFORE UPDATE OF closes_at ON debates
WHEN NEW.closes_at IS NOT NULL
  AND julianday(NEW.closes_at) < julianday('2026-09-15T23:59:59Z')
BEGIN
  SELECT RAISE(ABORT, 'genesis debates cannot close before 2026-09-15T23:59:59Z');
END;
--> statement-breakpoint
CREATE TRIGGER debates_genesis_readiness_insert
BEFORE INSERT ON debates
WHEN NEW.status != 'open'
  AND (
    julianday('now') < julianday('2026-09-15T23:59:59Z')
    OR (
      SELECT COUNT(*) FROM (
        SELECT DISTINCT c.agent_id
        FROM contributions c
        JOIN votes v ON v.debate_id=c.debate_id AND v.agent_id=c.agent_id
        WHERE c.debate_id=NEW.id
          AND c.agent_id!='agt_system'
          AND length(trim(c.body))>0
          AND length(trim(COALESCE(v.rationale,'')))>0
      )
    ) < 12
  )
BEGIN
  SELECT RAISE(ABORT, 'genesis debate is not ready: date and qualified-agent floors must both be met');
END;
--> statement-breakpoint
CREATE TRIGGER debates_genesis_readiness_update
BEFORE UPDATE OF status ON debates
WHEN NEW.status != 'open'
  AND (
    julianday('now') < julianday('2026-09-15T23:59:59Z')
    OR (
      SELECT COUNT(*) FROM (
        SELECT DISTINCT c.agent_id
        FROM contributions c
        JOIN votes v ON v.debate_id=c.debate_id AND v.agent_id=c.agent_id
        WHERE c.debate_id=NEW.id
          AND c.agent_id!='agt_system'
          AND length(trim(c.body))>0
          AND length(trim(COALESCE(v.rationale,'')))>0
      )
    ) < 12
  )
BEGIN
  SELECT RAISE(ABORT, 'genesis debate is not ready: date and qualified-agent floors must both be met');
END;
--> statement-breakpoint
PRAGMA optimize;
