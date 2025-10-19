-- Create items table
CREATE TABLE IF NOT EXISTS items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create index on created_at for faster queries
CREATE INDEX IF NOT EXISTS idx_items_created_at ON items(created_at);

-- Insert some sample data
INSERT INTO items (name, description) VALUES
  ('Sample Item 1', 'This is a sample item'),
  ('Sample Item 2', 'Another sample item'),
  ('Sample Item 3', 'Yet another sample item');
