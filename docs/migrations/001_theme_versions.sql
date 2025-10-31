-- Migration: Add theme_versions table for Version Control (Feature 5/5)
-- Created: 2025-10-31
-- Description: Git-like version management system for design themes

-- 1. Create theme_versions table
CREATE TABLE IF NOT EXISTS theme_versions (
  id TEXT PRIMARY KEY,
  theme_id TEXT NOT NULL,
  version TEXT NOT NULL,
  commit_message TEXT NOT NULL,
  author TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  snapshot JSONB NOT NULL,
  parent_version_id TEXT,

  -- Foreign key constraints
  CONSTRAINT fk_theme FOREIGN KEY (theme_id)
    REFERENCES design_themes(id) ON DELETE CASCADE,
  CONSTRAINT fk_parent FOREIGN KEY (parent_version_id)
    REFERENCES theme_versions(id) ON DELETE SET NULL
);

-- 2. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_theme_versions_theme_id
  ON theme_versions(theme_id);

CREATE INDEX IF NOT EXISTS idx_theme_versions_created_at
  ON theme_versions(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_theme_versions_parent
  ON theme_versions(parent_version_id)
  WHERE parent_version_id IS NOT NULL;

-- 3. Enable Row Level Security
ALTER TABLE theme_versions ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS policies

-- Policy: Users can view their own theme versions
CREATE POLICY "Users can view their theme versions"
  ON theme_versions FOR SELECT
  USING (
    theme_id IN (
      SELECT id FROM design_themes
      WHERE project_id IN (
        SELECT id FROM projects WHERE created_by = auth.uid()
      )
    )
  );

-- Policy: Users can create theme versions for their themes
CREATE POLICY "Users can create theme versions"
  ON theme_versions FOR INSERT
  WITH CHECK (
    theme_id IN (
      SELECT id FROM design_themes
      WHERE project_id IN (
        SELECT id FROM projects WHERE created_by = auth.uid()
      )
    )
  );

-- Policy: Users can update their theme versions (for tags, etc.)
CREATE POLICY "Users can update their theme versions"
  ON theme_versions FOR UPDATE
  USING (
    theme_id IN (
      SELECT id FROM design_themes
      WHERE project_id IN (
        SELECT id FROM projects WHERE created_by = auth.uid()
      )
    )
  );

-- Policy: Users can delete their theme versions
CREATE POLICY "Users can delete their theme versions"
  ON theme_versions FOR DELETE
  USING (
    theme_id IN (
      SELECT id FROM design_themes
      WHERE project_id IN (
        SELECT id FROM projects WHERE created_by = auth.uid()
      )
    )
  );

-- 5. Add comments for documentation
COMMENT ON TABLE theme_versions IS
  'Version history for design themes with Git-like commit structure';

COMMENT ON COLUMN theme_versions.id IS
  'Unique version identifier';

COMMENT ON COLUMN theme_versions.theme_id IS
  'Reference to design_themes table';

COMMENT ON COLUMN theme_versions.version IS
  'Semantic version string (e.g., v1.0.0)';

COMMENT ON COLUMN theme_versions.commit_message IS
  'Description of changes in this version';

COMMENT ON COLUMN theme_versions.author IS
  'User who created this version';

COMMENT ON COLUMN theme_versions.snapshot IS
  'JSON snapshot of all tokens at this version';

COMMENT ON COLUMN theme_versions.parent_version_id IS
  'Reference to previous version (Git parent commit)';

-- 6. Create helper function for version cleanup
-- (Optional: Remove versions older than 90 days)
CREATE OR REPLACE FUNCTION cleanup_old_versions()
RETURNS void AS $$
BEGIN
  DELETE FROM theme_versions
  WHERE created_at < NOW() - INTERVAL '90 days'
    AND parent_version_id IS NOT NULL; -- Keep root versions
END;
$$ LANGUAGE plpgsql;

-- 7. Verification queries (run after migration)
-- Check if table was created successfully
-- SELECT EXISTS (
--   SELECT FROM information_schema.tables
--   WHERE table_name = 'theme_versions'
-- );

-- Check RLS is enabled
-- SELECT tablename, rowsecurity
-- FROM pg_tables
-- WHERE tablename = 'theme_versions';

-- Check policies
-- SELECT policyname, cmd, qual
-- FROM pg_policies
-- WHERE tablename = 'theme_versions';
