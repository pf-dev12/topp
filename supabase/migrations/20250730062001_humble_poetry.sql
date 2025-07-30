/*
  # Setup Branch Credentials

  1. New Tables
    - `branches` - Store branch information with credentials
    - `users` - Basic user table for Supabase Auth compatibility
  
  2. Security
    - Enable RLS on all tables
    - Add policies for branch-based access
  
  3. Sample Data
    - Cardiff branch credentials
    - Wembley branch credentials
    - Sample menu categories and items
*/

-- Create users table for Supabase Auth compatibility
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Create branches table with credentials
CREATE TABLE IF NOT EXISTS branches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  email text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE branches ENABLE ROW LEVEL SECURITY;

-- Create branch_sessions to track which user is logged into which branch
CREATE TABLE IF NOT EXISTS branch_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  branch_id uuid REFERENCES branches(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE branch_sessions ENABLE ROW LEVEL SECURITY;

-- Create menu categories
CREATE TABLE IF NOT EXISTS menu_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE menu_categories ENABLE ROW LEVEL SECURITY;

-- Create menu items
CREATE TABLE IF NOT EXISTS menu_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid REFERENCES menu_categories(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text DEFAULT '',
  price numeric(10,2) NOT NULL,
  available boolean DEFAULT true,
  image_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;

-- Create orders table
CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid REFERENCES branches(id) ON DELETE CASCADE,
  table_number text NOT NULL,
  status text DEFAULT 'New' CHECK (status IN ('New', 'Preparing', 'Ready')),
  total_amount numeric(10,2) DEFAULT 0,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Create order items table
CREATE TABLE IF NOT EXISTS order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
  menu_item_id uuid REFERENCES menu_items(id) ON DELETE CASCADE,
  quantity integer DEFAULT 1 NOT NULL,
  unit_price numeric(10,2) NOT NULL,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_menu_items_updated_at
  BEFORE UPDATE ON menu_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert branch credentials
INSERT INTO branches (name, email, password_hash) VALUES
  ('Cardiff', 'cardiff@tasteofpeshawar.com', '$2a$10$rQJ5qVJ5qVJ5qVJ5qVJ5qO'),
  ('Wembley', 'wembley@tasteofpeshawar.com', '$2a$10$rQJ5qVJ5qVJ5qVJ5qVJ5qO')
ON CONFLICT (name) DO NOTHING;

-- Insert menu categories
INSERT INTO menu_categories (name, display_order) VALUES
  ('Starters/Grill', 1),
  ('Special Offers', 2),
  ('Tawa', 3),
  ('Vegetarian', 4),
  ('Main Course', 5),
  ('Sides', 6),
  ('Drinks - Can', 7),
  ('Drinks - Glass Bottle', 8),
  ('Drinks - Water', 9),
  ('Drinks - Big Bottle', 10),
  ('Drinks - Hot', 11),
  ('Drinks - Lassi', 12)
ON CONFLICT (name) DO NOTHING;

-- Insert sample menu items
DO $$
DECLARE
  starters_id uuid;
  special_id uuid;
  tawa_id uuid;
  veg_id uuid;
  main_id uuid;
  sides_id uuid;
  drinks_can_id uuid;
  drinks_bottle_id uuid;
  drinks_water_id uuid;
  drinks_big_id uuid;
  drinks_hot_id uuid;
  drinks_lassi_id uuid;
BEGIN
  -- Get category IDs
  SELECT id INTO starters_id FROM menu_categories WHERE name = 'Starters/Grill';
  SELECT id INTO special_id FROM menu_categories WHERE name = 'Special Offers';
  SELECT id INTO tawa_id FROM menu_categories WHERE name = 'Tawa';
  SELECT id INTO veg_id FROM menu_categories WHERE name = 'Vegetarian';
  SELECT id INTO main_id FROM menu_categories WHERE name = 'Main Course';
  SELECT id INTO sides_id FROM menu_categories WHERE name = 'Sides';
  SELECT id INTO drinks_can_id FROM menu_categories WHERE name = 'Drinks - Can';
  SELECT id INTO drinks_bottle_id FROM menu_categories WHERE name = 'Drinks - Glass Bottle';
  SELECT id INTO drinks_water_id FROM menu_categories WHERE name = 'Drinks - Water';
  SELECT id INTO drinks_big_id FROM menu_categories WHERE name = 'Drinks - Big Bottle';
  SELECT id INTO drinks_hot_id FROM menu_categories WHERE name = 'Drinks - Hot';
  SELECT id INTO drinks_lassi_id FROM menu_categories WHERE name = 'Drinks - Lassi';

  -- Insert sample menu items
  INSERT INTO menu_items (category_id, name, description, price) VALUES
    -- Starters/Grill
    (starters_id, 'Chicken Tikka', 'Tender chicken pieces marinated in yogurt and spices', 8.95),
    (starters_id, 'Lamb Seekh Kebab', 'Minced lamb with herbs and spices grilled on skewers', 9.95),
    (starters_id, 'Mixed Grill Platter', 'Selection of grilled meats and vegetables', 16.95),
    (starters_id, 'Chicken Wings', 'Spicy marinated chicken wings', 7.95),
    
    -- Special Offers
    (special_id, 'Family Feast', 'Complete meal for 4 people with mixed dishes', 45.00),
    (special_id, 'Lunch Special', 'Any curry with rice and naan', 12.95),
    (special_id, 'Student Deal', 'Curry, rice, and drink', 9.95),
    
    -- Tawa
    (tawa_id, 'Chicken Tawa', 'Chicken cooked on traditional tawa with peppers', 13.95),
    (tawa_id, 'Lamb Tawa', 'Tender lamb pieces with onions and peppers', 15.95),
    (tawa_id, 'Mixed Tawa', 'Combination of chicken and lamb tawa style', 17.95),
    
    -- Vegetarian
    (veg_id, 'Dal Tarka', 'Lentils tempered with garlic and spices', 7.95),
    (veg_id, 'Palak Paneer', 'Spinach curry with cottage cheese', 9.95),
    (veg_id, 'Chana Masala', 'Chickpeas in rich tomato and onion gravy', 8.95),
    (veg_id, 'Vegetable Biryani', 'Fragrant rice with mixed vegetables', 11.95),
    
    -- Main Course
    (main_id, 'Chicken Karahi', 'Traditional chicken curry cooked in wok', 12.95),
    (main_id, 'Lamb Biryani', 'Aromatic rice with tender lamb pieces', 15.95),
    (main_id, 'Butter Chicken', 'Creamy tomato-based chicken curry', 13.95),
    (main_id, 'Fish Curry', 'Fresh fish in coconut and curry leaf sauce', 14.95),
    
    -- Sides
    (sides_id, 'Basmati Rice', 'Fragrant long-grain rice', 3.95),
    (sides_id, 'Garlic Naan', 'Leavened bread with garlic and herbs', 3.50),
    (sides_id, 'Raita', 'Yogurt with cucumber and mint', 2.95),
    (sides_id, 'Papadum', 'Crispy lentil wafers (2 pieces)', 2.50),
    
    -- Drinks - Can
    (drinks_can_id, 'Coca Cola', 'Classic cola drink', 1.95),
    (drinks_can_id, 'Sprite', 'Lemon-lime soda', 1.95),
    (drinks_can_id, 'Orange Fanta', 'Orange flavored soda', 1.95),
    
    -- Drinks - Glass Bottle
    (drinks_bottle_id, 'Mango Juice', 'Fresh mango juice', 3.50),
    (drinks_bottle_id, 'Apple Juice', 'Pure apple juice', 3.50),
    (drinks_bottle_id, 'Orange Juice', 'Freshly squeezed orange juice', 3.50),
    
    -- Drinks - Water
    (drinks_water_id, 'Still Water', 'Natural spring water', 1.50),
    (drinks_water_id, 'Sparkling Water', 'Carbonated spring water', 2.00),
    
    -- Drinks - Big Bottle
    (drinks_big_id, 'Coca Cola 1.5L', 'Large bottle of classic cola', 3.95),
    (drinks_big_id, 'Sprite 1.5L', 'Large bottle of lemon-lime soda', 3.95),
    
    -- Drinks - Hot
    (drinks_hot_id, 'Masala Chai', 'Spiced tea with milk', 2.95),
    (drinks_hot_id, 'Green Tea', 'Traditional green tea', 2.50),
    (drinks_hot_id, 'Coffee', 'Freshly brewed coffee', 2.95),
    
    -- Drinks - Lassi
    (drinks_lassi_id, 'Sweet Lassi', 'Traditional yogurt drink', 3.95),
    (drinks_lassi_id, 'Mango Lassi', 'Yogurt drink with mango', 4.50),
    (drinks_lassi_id, 'Salt Lassi', 'Savory yogurt drink', 3.95)
  ON CONFLICT DO NOTHING;
END $$;

-- RLS Policies

-- Users policies
CREATE POLICY "Users can read own data"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Branches policies  
CREATE POLICY "Anyone can read branches"
  ON branches
  FOR SELECT
  TO authenticated
  USING (true);

-- Branch sessions policies
CREATE POLICY "Users can manage own sessions"
  ON branch_sessions
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Menu categories policies
CREATE POLICY "Authenticated users can read menu categories"
  ON menu_categories
  FOR SELECT
  TO authenticated
  USING (true);

-- Menu items policies
CREATE POLICY "Authenticated users can read menu items"
  ON menu_items
  FOR SELECT
  TO authenticated
  USING (true);

-- Orders policies
CREATE POLICY "Users can read orders from their branch"
  ON orders
  FOR SELECT
  TO authenticated
  USING (
    branch_id IN (
      SELECT bs.branch_id 
      FROM branch_sessions bs 
      WHERE bs.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert orders for their branch"
  ON orders
  FOR INSERT
  TO authenticated
  WITH CHECK (
    branch_id IN (
      SELECT bs.branch_id 
      FROM branch_sessions bs 
      WHERE bs.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update orders from their branch"
  ON orders
  FOR UPDATE
  TO authenticated
  USING (
    branch_id IN (
      SELECT bs.branch_id 
      FROM branch_sessions bs 
      WHERE bs.user_id = auth.uid()
    )
  );

-- Order items policies
CREATE POLICY "Users can read order items from their branch"
  ON order_items
  FOR SELECT
  TO authenticated
  USING (
    order_id IN (
      SELECT o.id 
      FROM orders o
      JOIN branch_sessions bs ON o.branch_id = bs.branch_id
      WHERE bs.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert order items for their branch"
  ON order_items
  FOR INSERT
  TO authenticated
  WITH CHECK (
    order_id IN (
      SELECT o.id 
      FROM orders o
      JOIN branch_sessions bs ON o.branch_id = bs.branch_id
      WHERE bs.user_id = auth.uid()
    )
  );