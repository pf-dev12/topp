/*
  # Taste of Peshawar Restaurant Management Schema

  1. New Tables
    - `branches`
      - `id` (uuid, primary key)
      - `name` (text) - Cardiff or Wembley
      - `created_at` (timestamp)
    
    - `branch_users`
      - `id` (uuid, primary key)
      - `branch_id` (uuid, foreign key)
      - `user_id` (uuid, foreign key to auth.users)
      - `created_at` (timestamp)
    
    - `menu_categories`
      - `id` (uuid, primary key)
      - `name` (text)
      - `display_order` (integer)
      - `created_at` (timestamp)
    
    - `menu_items`
      - `id` (uuid, primary key)
      - `category_id` (uuid, foreign key)
      - `name` (text)
      - `description` (text)
      - `price` (decimal)
      - `available` (boolean, default true)
      - `image_url` (text, optional)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `orders`
      - `id` (uuid, primary key)
      - `branch_id` (uuid, foreign key)
      - `table_number` (text)
      - `status` (text, default 'New')
      - `total_amount` (decimal)
      - `notes` (text, optional)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `order_items`
      - `id` (uuid, primary key)
      - `order_id` (uuid, foreign key)
      - `menu_item_id` (uuid, foreign key)
      - `quantity` (integer)
      - `unit_price` (decimal)
      - `notes` (text, optional)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Branch-specific policies ensuring data isolation
    - Only authenticated users can access their branch data

  3. Initial Data
    - Create Cardiff and Wembley branches
    - Create menu categories
    - Sample menu items for demonstration
*/

-- Create branches table
CREATE TABLE IF NOT EXISTS branches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create branch_users table
CREATE TABLE IF NOT EXISTS branch_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid REFERENCES branches(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

-- Create menu_categories table
CREATE TABLE IF NOT EXISTS menu_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Create menu_items table
CREATE TABLE IF NOT EXISTS menu_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid REFERENCES menu_categories(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text DEFAULT '',
  price decimal(10,2) NOT NULL,
  available boolean DEFAULT true,
  image_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create orders table
CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid REFERENCES branches(id) ON DELETE CASCADE,
  table_number text NOT NULL,
  status text DEFAULT 'New' CHECK (status IN ('New', 'Preparing', 'Ready')),
  total_amount decimal(10,2) DEFAULT 0,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create order_items table
CREATE TABLE IF NOT EXISTS order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
  menu_item_id uuid REFERENCES menu_items(id) ON DELETE CASCADE,
  quantity integer NOT NULL DEFAULT 1,
  unit_price decimal(10,2) NOT NULL,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE branch_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for branches
CREATE POLICY "Users can read branches"
  ON branches FOR SELECT
  TO authenticated
  USING (true);

-- RLS Policies for branch_users
CREATE POLICY "Users can read their branch association"
  ON branch_users FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- RLS Policies for menu_categories (readable by all authenticated users)
CREATE POLICY "Authenticated users can read menu categories"
  ON menu_categories FOR SELECT
  TO authenticated
  USING (true);

-- RLS Policies for menu_items (readable by all authenticated users)
CREATE POLICY "Authenticated users can read menu items"
  ON menu_items FOR SELECT
  TO authenticated
  USING (true);

-- RLS Policies for orders (branch-specific)
CREATE POLICY "Users can read orders from their branch"
  ON orders FOR SELECT
  TO authenticated
  USING (
    branch_id IN (
      SELECT branch_id FROM branch_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert orders for their branch"
  ON orders FOR INSERT
  TO authenticated
  WITH CHECK (
    branch_id IN (
      SELECT branch_id FROM branch_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update orders from their branch"
  ON orders FOR UPDATE
  TO authenticated
  USING (
    branch_id IN (
      SELECT branch_id FROM branch_users WHERE user_id = auth.uid()
    )
  );

-- RLS Policies for order_items (branch-specific through orders)
CREATE POLICY "Users can read order items from their branch"
  ON order_items FOR SELECT
  TO authenticated
  USING (
    order_id IN (
      SELECT id FROM orders WHERE branch_id IN (
        SELECT branch_id FROM branch_users WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can insert order items for their branch"
  ON order_items FOR INSERT
  TO authenticated
  WITH CHECK (
    order_id IN (
      SELECT id FROM orders WHERE branch_id IN (
        SELECT branch_id FROM branch_users WHERE user_id = auth.uid()
      )
    )
  );

-- Insert initial branches
INSERT INTO branches (name) VALUES ('Cardiff'), ('Wembley') ON CONFLICT (name) DO NOTHING;

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
  drinks_hot_id uuid;
  drinks_lassi_id uuid;
BEGIN
  SELECT id INTO starters_id FROM menu_categories WHERE name = 'Starters/Grill';
  SELECT id INTO special_id FROM menu_categories WHERE name = 'Special Offers';
  SELECT id INTO tawa_id FROM menu_categories WHERE name = 'Tawa';
  SELECT id INTO veg_id FROM menu_categories WHERE name = 'Vegetarian';
  SELECT id INTO main_id FROM menu_categories WHERE name = 'Main Course';
  SELECT id INTO sides_id FROM menu_categories WHERE name = 'Sides';
  SELECT id INTO drinks_can_id FROM menu_categories WHERE name = 'Drinks - Can';
  SELECT id INTO drinks_hot_id FROM menu_categories WHERE name = 'Drinks - Hot';
  SELECT id INTO drinks_lassi_id FROM menu_categories WHERE name = 'Drinks - Lassi';

  -- Starters/Grill
  INSERT INTO menu_items (category_id, name, description, price) VALUES
    (starters_id, 'Chicken Tikka', 'Tender chicken pieces marinated in spices and grilled', 8.99),
    (starters_id, 'Lamb Seekh Kebab', 'Minced lamb kebab with traditional spices', 9.99),
    (starters_id, 'Mixed Grill Platter', 'Selection of grilled meats and vegetables', 16.99);

  -- Special Offers
  INSERT INTO menu_items (category_id, name, description, price) VALUES
    (special_id, 'Family Feast', 'Complete meal for 4 people with rice, naan and drinks', 39.99),
    (special_id, 'Lunch Special', 'Any curry with rice and naan', 12.99);

  -- Tawa
  INSERT INTO menu_items (category_id, name, description, price) VALUES
    (tawa_id, 'Chicken Tawa', 'Chicken cooked on traditional tawa with vegetables', 13.99),
    (tawa_id, 'Lamb Tawa', 'Lamb cooked on traditional tawa with vegetables', 14.99);

  -- Vegetarian
  INSERT INTO menu_items (category_id, name, description, price) VALUES
    (veg_id, 'Dal Makhani', 'Creamy black lentils cooked with butter and spices', 8.99),
    (veg_id, 'Palak Paneer', 'Cottage cheese in spinach curry', 9.99),
    (veg_id, 'Vegetable Biryani', 'Fragrant basmati rice with mixed vegetables', 11.99);

  -- Main Course
  INSERT INTO menu_items (category_id, name, description, price) VALUES
    (main_id, 'Chicken Karahi', 'Traditional Pakistani chicken curry', 12.99),
    (main_id, 'Lamb Biryani', 'Aromatic rice with tender lamb pieces', 15.99),
    (main_id, 'Fish Curry', 'Fresh fish in spicy curry sauce', 13.99);

  -- Sides
  INSERT INTO menu_items (category_id, name, description, price) VALUES
    (sides_id, 'Basmati Rice', 'Fragrant long-grain rice', 3.99),
    (sides_id, 'Garlic Naan', 'Fresh bread with garlic and herbs', 3.50),
    (sides_id, 'Raita', 'Yogurt with cucumber and mint', 2.99);

  -- Drinks
  INSERT INTO menu_items (category_id, name, description, price) VALUES
    (drinks_can_id, 'Coca Cola', '330ml can', 1.99),
    (drinks_can_id, 'Sprite', '330ml can', 1.99),
    (drinks_hot_id, 'Masala Chai', 'Traditional spiced tea', 2.50),
    (drinks_hot_id, 'Green Tea', 'Fresh green tea', 2.00),
    (drinks_lassi_id, 'Mango Lassi', 'Sweet mango yogurt drink', 3.50),
    (drinks_lassi_id, 'Sweet Lassi', 'Traditional sweet yogurt drink', 3.00);
END $$;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_menu_items_updated_at BEFORE UPDATE ON menu_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();