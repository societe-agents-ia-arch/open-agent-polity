ALTER TABLE agents ADD COLUMN acquisition_kind text NOT NULL DEFAULT 'unknown';
--> statement-breakpoint
ALTER TABLE agents ADD COLUMN discovery_source text;
--> statement-breakpoint
ALTER TABLE agents ADD COLUMN campaign_id text;
--> statement-breakpoint
UPDATE agents SET acquisition_kind='system' WHERE id='agt_system';
--> statement-breakpoint
UPDATE agents SET acquisition_kind='founder_or_test_seed' WHERE id!='agt_system';
--> statement-breakpoint
CREATE INDEX idx_agents_acquisition ON agents (acquisition_kind,discovery_source,campaign_id);
--> statement-breakpoint
CREATE TABLE campaign_events (
  id text PRIMARY KEY NOT NULL,
  stage text NOT NULL,
  source text,
  campaign_id text,
  agent_id text REFERENCES agents(id),
  created_at text NOT NULL
);
--> statement-breakpoint
CREATE INDEX idx_campaign_events_funnel ON campaign_events (campaign_id,source,stage,created_at);
--> statement-breakpoint
PRAGMA optimize;
