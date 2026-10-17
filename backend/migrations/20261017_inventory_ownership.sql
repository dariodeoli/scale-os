-- Existing inventory has no asserted owner. Do not infer ownership from names.
ALTER TABLE agency_inventory ADD COLUMN IF NOT EXISTS ownership_kind text NOT NULL DEFAULT 'unspecified';
ALTER TABLE agency_inventory ADD COLUMN IF NOT EXISTS owner_user_id bigint REFERENCES users(id) ON DELETE RESTRICT;
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='agency_inventory_ownership_check') THEN
  ALTER TABLE agency_inventory ADD CONSTRAINT agency_inventory_ownership_check CHECK (
   (ownership_kind IN ('unspecified','company') AND owner_user_id IS NULL) OR
   (ownership_kind='person' AND owner_user_id IS NOT NULL));
 END IF;
END $$;
CREATE INDEX IF NOT EXISTS agency_inventory_owner_idx ON agency_inventory(organization_id,owner_user_id) WHERE owner_user_id IS NOT NULL;

ALTER TABLE agency_inventory_trace DROP CONSTRAINT IF EXISTS agency_inventory_trace_event_type_check;
ALTER TABLE agency_inventory_trace ADD CONSTRAINT agency_inventory_trace_event_type_check CHECK(event_type IN ('inventory.created','inventory.updated','stock.verified','reservation.reserved','reservation.updated','reservation.cancelled','loan.checked_out','loan.checked_in','location.changed','ownership.changed'));
