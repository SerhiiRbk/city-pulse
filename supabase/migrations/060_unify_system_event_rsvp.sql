-- Migration: Delete 'interested' records for system events
-- No schema changes needed — 'going' status already exists in the enum

-- Remove all 'interested' attendance records for system events
DELETE FROM event_attendees
WHERE status = 'interested'
  AND event_id IN (
    SELECT id FROM events WHERE is_system = true
  );

-- Document the policy: system events only use status = 'going'
COMMENT ON TABLE event_attendees IS
  'System events (is_system=true) only use status=going. The interested status is reserved for community events only (enforced at application layer).';
