-- Test migration to verify Supabase integration is working
-- Created: 2026-06-21

CREATE TABLE IF NOT EXISTS test_connection (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  description TEXT
);

-- Enable Row Level Security
ALTER TABLE test_connection ENABLE ROW LEVEL SECURITY;

-- Create a simple policy for testing
CREATE POLICY "Allow public read on test_connection" ON test_connection
  FOR SELECT USING (true);

-- Insert a test record
INSERT INTO test_connection (name, description) VALUES 
  ('Test Record', 'This confirms the migration ran successfully!');

-- Comment to indicate successful test
COMMENT ON TABLE test_connection IS 'Test table - can be deleted after confirming migrations work';
