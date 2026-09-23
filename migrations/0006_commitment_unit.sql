-- The week has never been exposed by the application. Fail rather than guess a unit if an
-- external writer populated the old unitless table; existing empty installations migrate as-is.
ALTER TABLE commitments ADD COLUMN unit TEXT NOT NULL CHECK (unit IN ('times', 'minutes'));
