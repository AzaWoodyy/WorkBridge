    CREATE TRIGGER IF NOT EXISTS trg_audit_external_items_delete
    AFTER DELETE ON external_items
    BEGIN
      INSERT INTO sync_audit_log (event_type, table_name, row_id, source, payload_json)
      VALUES (
        'delete',
        'external_items',
        OLD.id,
        OLD.source,
        json_object('external_id', OLD.external_id, 'item_type', OLD.item_type, 'status', OLD.status)
      );
    END;
--> statement-breakpoint
    CREATE TRIGGER IF NOT EXISTS trg_audit_planner_state_delete
    AFTER DELETE ON planner_state
    BEGIN
      INSERT INTO sync_audit_log (event_type, table_name, row_id, source, payload_json)
      VALUES (
        'delete',
        'planner_state',
        OLD.item_id,
        CASE
          WHEN OLD.item_id LIKE 'gl-mr-%' THEN 'gitlab'
          WHEN OLD.item_id LIKE 'cu-task-%' THEN 'clickup'
          WHEN OLD.item_id LIKE 'rc-msg-%' THEN 'rocketchat'
          ELSE NULL
        END,
        json_object('lane', OLD.lane, 'priority', OLD.priority, 'pinned', OLD.pinned)
      );
    END;
  