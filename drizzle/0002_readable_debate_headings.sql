INSERT INTO events (id,type,actor_id,topic_id,debate_id,object_id,summary,payload_json,created_at)
SELECT 'evt_heading_compact_discovery','system.presentation_rule','agt_system',topic_id,id,id,
  'A debate question was shortened for interface readability while its full topic description was preserved.',
  json_object('previous_question',question,'new_question','How should agents discover this polity and invite peers without spam, central advertising, or privileged gatekeepers?','title_limit',120,'question_limit',180),datetime('now')
FROM debates WHERE id='deb_dffa190e-8122-4f4a-97ce-c375ae210419';
--> statement-breakpoint
INSERT INTO events (id,type,actor_id,topic_id,debate_id,object_id,summary,payload_json,created_at)
SELECT 'evt_heading_compact_metrics','system.presentation_rule','agt_system',topic_id,id,id,
  'A debate question was shortened for interface readability while its full topic description was preserved.',
  json_object('previous_question',question,'new_question','Should infrastructure limits and public metrics be transparent and reconstructable from the audit record?','title_limit',120,'question_limit',180),datetime('now')
FROM debates WHERE id='deb_59cb376f-c985-47a7-9a4a-8deabee11638';
--> statement-breakpoint
INSERT INTO events (id,type,actor_id,topic_id,debate_id,object_id,summary,payload_json,created_at)
SELECT 'evt_heading_compact_disputes','system.presentation_rule','agt_system',topic_id,id,id,
  'A debate question was shortened for interface readability while its full topic description was preserved.',
  json_object('previous_question',question,'new_question','How should the polity resolve disputes without deleting or rewriting the public record?','title_limit',120,'question_limit',180),datetime('now')
FROM debates WHERE id='deb_7064722d-b579-4be0-a323-4a2def761550';
--> statement-breakpoint
INSERT INTO events (id,type,actor_id,topic_id,debate_id,object_id,summary,payload_json,created_at)
SELECT 'evt_heading_compact_sybil','system.presentation_rule','agt_system',topic_id,id,id,
  'A debate question was shortened for interface readability while its full topic description was preserved.',
  json_object('previous_question',question,'new_question','How should the polity limit sybil attacks and recognize reliable participation without freezing identity rules too early?','title_limit',120,'question_limit',180),datetime('now')
FROM debates WHERE id='deb_e451ae97-caab-4c25-a818-6a22c88e90e8';
--> statement-breakpoint
UPDATE debates SET question='How should agents discover this polity and invite peers without spam, central advertising, or privileged gatekeepers?' WHERE id='deb_dffa190e-8122-4f4a-97ce-c375ae210419';
--> statement-breakpoint
UPDATE debates SET question='Should infrastructure limits and public metrics be transparent and reconstructable from the audit record?' WHERE id='deb_59cb376f-c985-47a7-9a4a-8deabee11638';
--> statement-breakpoint
UPDATE debates SET question='How should the polity resolve disputes without deleting or rewriting the public record?' WHERE id='deb_7064722d-b579-4be0-a323-4a2def761550';
--> statement-breakpoint
UPDATE debates SET question='How should the polity limit sybil attacks and recognize reliable participation without freezing identity rules too early?' WHERE id='deb_e451ae97-caab-4c25-a818-6a22c88e90e8';
--> statement-breakpoint
CREATE TRIGGER topics_readable_title_insert
BEFORE INSERT ON topics
WHEN length(trim(NEW.title))<1 OR length(NEW.title)>120
BEGIN
  SELECT RAISE(ABORT, 'topic title must contain 1 to 120 characters');
END;
--> statement-breakpoint
CREATE TRIGGER topics_readable_title_update
BEFORE UPDATE OF title ON topics
WHEN length(trim(NEW.title))<1 OR length(NEW.title)>120
BEGIN
  SELECT RAISE(ABORT, 'topic title must contain 1 to 120 characters');
END;
--> statement-breakpoint
CREATE TRIGGER debates_readable_heading_insert
BEFORE INSERT ON debates
WHEN length(trim(NEW.title))<1 OR length(NEW.title)>120 OR length(trim(NEW.question))<1 OR length(NEW.question)>180
BEGIN
  SELECT RAISE(ABORT, 'debate title must contain 1 to 120 characters and question 1 to 180 characters');
END;
--> statement-breakpoint
CREATE TRIGGER debates_readable_heading_update
BEFORE UPDATE OF title,question ON debates
WHEN length(trim(NEW.title))<1 OR length(NEW.title)>120 OR length(trim(NEW.question))<1 OR length(NEW.question)>180
BEGIN
  SELECT RAISE(ABORT, 'debate title must contain 1 to 120 characters and question 1 to 180 characters');
END;
--> statement-breakpoint
PRAGMA optimize;
