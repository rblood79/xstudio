-- Add custom_id column to elements table for user-defined component IDs
-- This allows users to set custom identifiers for event handling and component selection

ALTER TABLE elements ADD COLUMN IF NOT EXISTS custom_id TEXT;

-- Create index for faster lookups by custom_id
CREATE INDEX IF NOT EXISTS idx_elements_custom_id ON elements(custom_id);

-- Add comment for documentation
COMMENT ON COLUMN elements.custom_id IS 'User-defined custom ID for component identification (e.g., button_1, input_2). Used for event handling, CSS selectors, and testing.';
