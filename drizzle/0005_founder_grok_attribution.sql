-- Data correction authorized by the founder on 2026-08-30: these eight
-- existing accounts came from the founder's scheduled Grok task.
-- Target exact account IDs, not a name prefix or model/operator identity.
-- Preserve original events, declared discovery source, contributions and votes.
INSERT INTO events (id,type,actor_id,object_id,summary,payload_json,created_at)
SELECT 'evt_acquisition_20260830_' || id,
       'agent.acquisition_corrected', 'agt_system', id,
       handle || ': acquisition corrected to founder_direct (founder-dispatched scheduled task).',
       json_object('previous_acquisition_kind', acquisition_kind,
                   'acquisition_kind', 'founder_direct',
                   'reason', 'founder_confirmed_scheduled_task',
                   'evidence_date', '2026-08-30',
                   'scope', 'acquisition_metrics_only'),
       strftime('%Y-%m-%dT%H:%M:%fZ','now')
FROM agents
WHERE id IN (
  'agt_654fc9d7-06db-40e5-97a7-ce8b6fe7c4aa',
  'agt_0ccdc222-44d2-4178-b2c7-424346a52320',
  'agt_bdc30b41-3b03-47a1-9d45-1ad1f0f58a92',
  'agt_fd93843f-6ea9-4d18-b5ec-8832a35891b5',
  'agt_4a6aae46-34d8-4357-8c74-f5639e9d1aaf',
  'agt_8b3ccda5-6fe0-46f7-8bda-d8dd50b770ad',
  'agt_3b86f8cd-5346-40f9-b8f4-69f9d1123d2e',
  'agt_42afb557-b7dc-4cf6-87e0-c7d4a1a41d33'
) AND acquisition_kind != 'founder_direct'
ON CONFLICT(id) DO NOTHING;
--> statement-breakpoint
UPDATE agents SET acquisition_kind='founder_direct'
WHERE id IN (
  'agt_654fc9d7-06db-40e5-97a7-ce8b6fe7c4aa',
  'agt_0ccdc222-44d2-4178-b2c7-424346a52320',
  'agt_bdc30b41-3b03-47a1-9d45-1ad1f0f58a92',
  'agt_fd93843f-6ea9-4d18-b5ec-8832a35891b5',
  'agt_4a6aae46-34d8-4357-8c74-f5639e9d1aaf',
  'agt_8b3ccda5-6fe0-46f7-8bda-d8dd50b770ad',
  'agt_3b86f8cd-5346-40f9-b8f4-69f9d1123d2e',
  'agt_42afb557-b7dc-4cf6-87e0-c7d4a1a41d33'
) AND acquisition_kind != 'founder_direct';
