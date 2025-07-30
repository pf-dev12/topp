export interface Branch {
  id: string
  name: string
  created_at: string
}

export interface BranchUser {
  id: string
  branch_id: string
  user_id: string
  created_at: string
}

export interface MenuCategory {
  id: string
  name: string
  display_order: number
  created_at: string
}

export interface MenuItem {
  id: string
  category_id: string
  name: string
  description: string
  price: number
  available: boolean
  image_url: string | null
  created_at: string
  updated_at: string
}

export interface Order {
  id: string
  branch_id: string
  table_number: string
  status: 'New' | 'Preparing' | 'Ready'
  total_amount: number
  notes: string
  created_at: string
  updated_at: string
}

export interface OrderItem {
  id: string
  order_id: string
  menu_item_id: string
  quantity: number
  unit_price: number
  notes: string
  created_at: string
}

export interface OrderWithItems extends Order {
  order_items: (OrderItem & {
    menu_items: MenuItem
  })[]
}

export interface MenuItemWithCategory extends MenuItem {
  menu_categories: MenuCategory
}