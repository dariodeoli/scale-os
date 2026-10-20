-- Owner and custodian are independent. External owners have no user account.
ALTER TABLE agency_inventory ADD COLUMN IF NOT EXISTS external_owner_name text;
ALTER TABLE agency_inventory DROP CONSTRAINT IF EXISTS agency_inventory_ownership_check;
ALTER TABLE agency_inventory ADD CONSTRAINT agency_inventory_ownership_check CHECK (
 (ownership_kind IN ('unspecified','company') AND owner_user_id IS NULL AND external_owner_name IS NULL)
 OR (ownership_kind='person' AND owner_user_id IS NOT NULL AND external_owner_name IS NULL)
 OR (ownership_kind='external' AND owner_user_id IS NULL AND external_owner_name IS NOT NULL
     AND length(trim(external_owner_name)) BETWEEN 2 AND 160)
);
