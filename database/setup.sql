-- Cloudy Clutches Database Setup
-- Run this in your Neon PostgreSQL console

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  google_id VARCHAR(255),
  avatar TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Admin table
CREATE TABLE IF NOT EXISTS admin (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Insert default admin (email: admin@123, password: pass@123)
INSERT INTO admin (email, password) VALUES ('admin@123', 'pass@123')
ON CONFLICT (email) DO NOTHING;

-- Products table
CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100) NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  stock INTEGER DEFAULT 0,
  available BOOLEAN DEFAULT TRUE,
  image BYTEA,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Orders table
CREATE TABLE IF NOT EXISTS orders (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  total_amount DECIMAL(10, 2) NOT NULL,
  transaction_id VARCHAR(255),
  shipping_address TEXT,
  status VARCHAR(50) DEFAULT 'Pending',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Order items table
CREATE TABLE IF NOT EXISTS order_items (
  id SERIAL PRIMARY KEY,
  order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
  product_id INTEGER REFERENCES products(id),
  quantity INTEGER NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Sample products (optional)
INSERT INTO products (name, description, category, price, stock, available)
VALUES
  ('Pearl Hair Clip Set', 'Elegant pearl hair clips, set of 3', 'Hair Accessories', 299, 20, TRUE),
  ('Scrunchie Bundle', 'Silky satin scrunchies in pastel shades, pack of 5', 'Hair Accessories', 199, 30, TRUE),
  ('Birthday Hamper Delight', 'Curated birthday gift hamper with snacks and accessories', 'Hampers', 999, 10, TRUE),
  ('Anniversary Luxury Hamper', 'Premium anniversary hamper with chocolates and accessories', 'Hampers', 1499, 5, TRUE),
  ('Fresh Rose Bouquet', 'Beautiful fresh roses arranged with greens', 'Bouquets', 599, 8, TRUE),
  ('Dried Flower Arrangement', 'Timeless dried flower bouquet in rustic tones', 'Bouquets', 449, 12, TRUE)
ON CONFLICT DO NOTHING;
