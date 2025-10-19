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

-- Create fruits table
CREATE TABLE IF NOT EXISTS fruits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  price REAL NOT NULL CHECK(price >= 0),
  quantity INTEGER NOT NULL DEFAULT 0 CHECK(quantity >= 0),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create index on created_at for faster queries
CREATE INDEX IF NOT EXISTS idx_fruits_created_at ON fruits(created_at);

-- Insert sample fruit data
INSERT INTO fruits (name, price, quantity) VALUES
  ('Apple', 1.99, 100),
  ('Banana', 0.99, 150),
  ('Orange', 2.49, 80),
  ('Mango', 3.99, 45),
  ('Strawberry', 4.99, 60);
