import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  ScrollView,
} from 'react-native'
import { supabase } from '@/lib/supabase'
import { useAuthContext } from '@/contexts/AuthContext'
import { MenuCategory, MenuItem } from '@/types/database'
import { Plus, Minus, ShoppingCart } from 'lucide-react-native'

interface CartItem extends MenuItem {
  quantity: number
  notes: string
}

export default function NewOrder() {
  const { branch } = useAuthContext()
  const [categories, setCategories] = useState<MenuCategory[]>([])
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [cart, setCart] = useState<CartItem[]>([])
  const [tableNumber, setTableNumber] = useState('')
  const [orderNotes, setOrderNotes] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchMenuData()
  }, [])

  const fetchMenuData = async () => {
    try {
      const [categoriesResult, itemsResult] = await Promise.all([
        supabase
          .from('menu_categories')
          .select('*')
          .order('display_order'),
        supabase
          .from('menu_items')
          .select('*')
          .eq('available', true)
      ])

      if (categoriesResult.error) throw categoriesResult.error
      if (itemsResult.error) throw itemsResult.error

      setCategories(categoriesResult.data)
      setMenuItems(itemsResult.data)
      
      if (categoriesResult.data.length > 0) {
        setSelectedCategory(categoriesResult.data[0].id)
      }
    } catch (error) {
      console.error('Error fetching menu data:', error)
    }
    setLoading(false)
  }

  const addToCart = (item: MenuItem) => {
    setCart(prev => {
      const existingItem = prev.find(cartItem => cartItem.id === item.id)
      if (existingItem) {
        return prev.map(cartItem =>
          cartItem.id === item.id
            ? { ...cartItem, quantity: cartItem.quantity + 1 }
            : cartItem
        )
      } else {
        return [...prev, { ...item, quantity: 1, notes: '' }]
      }
    })
  }

  const updateCartItemQuantity = (itemId: string, quantity: number) => {
    if (quantity <= 0) {
      setCart(prev => prev.filter(item => item.id !== itemId))
    } else {
      setCart(prev =>
        prev.map(item =>
          item.id === itemId ? { ...item, quantity } : item
        )
      )
    }
  }

  const updateCartItemNotes = (itemId: string, notes: string) => {
    setCart(prev =>
      prev.map(item =>
        item.id === itemId ? { ...item, notes } : item
      )
    )
  }

  const getTotalAmount = () => {
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0)
  }

  const placeOrder = async () => {
    if (!branch) {
      Alert.alert('Error', 'Branch information not available')
      return
    }

    if (!tableNumber.trim()) {
      Alert.alert('Error', 'Please enter a table number')
      return
    }

    if (cart.length === 0) {
      Alert.alert('Error', 'Please add items to your order')
      return
    }

    try {
      // Create the order
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          branch_id: branch.id,
          table_number: tableNumber.trim(),
          total_amount: getTotalAmount(),
          notes: orderNotes.trim(),
          status: 'New'
        })
        .select()
        .single()

      if (orderError) throw orderError

      // Create order items
      const orderItems = cart.map(item => ({
        order_id: order.id,
        menu_item_id: item.id,
        quantity: item.quantity,
        unit_price: item.price,
        notes: item.notes
      }))

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems)

      if (itemsError) throw itemsError

      Alert.alert('Success', 'Order placed successfully!', [
        {
          text: 'OK',
          onPress: () => {
            setCart([])
            setTableNumber('')
            setOrderNotes('')
          }
        }
      ])
    } catch (error) {
      console.error('Error placing order:', error)
      Alert.alert('Error', 'Failed to place order. Please try again.')
    }
  }

  const filteredItems = menuItems.filter(item => item.category_id === selectedCategory)

  const renderMenuItem = ({ item }: { item: MenuItem }) => {
    const cartItem = cart.find(cartItem => cartItem.id === item.id)
    const quantity = cartItem?.quantity || 0

    return (
      <View style={styles.menuItem}>
        <View style={styles.menuItemInfo}>
          <Text style={styles.menuItemName}>{item.name}</Text>
          <Text style={styles.menuItemDescription}>{item.description}</Text>
          <Text style={styles.menuItemPrice}>£{item.price.toFixed(2)}</Text>
        </View>
        
        <View style={styles.quantityControls}>
          {quantity > 0 && (
            <TouchableOpacity
              style={styles.quantityButton}
              onPress={() => updateCartItemQuantity(item.id, quantity - 1)}
            >
              <Minus size={20} color="#fff" />
            </TouchableOpacity>
          )}
          
          {quantity > 0 && (
            <Text style={styles.quantityText}>{quantity}</Text>
          )}
          
          <TouchableOpacity
            style={[styles.quantityButton, styles.addButton]}
            onPress={() => addToCart(item)}
          >
            <Plus size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  const renderCartItem = (item: CartItem, index: number) => (
    <View key={item.id} style={styles.cartItem}>
      <View style={styles.cartItemInfo}>
        <Text style={styles.cartItemName}>{item.name}</Text>
        <Text style={styles.cartItemPrice}>
          £{item.price.toFixed(2)} x {item.quantity} = £{(item.price * item.quantity).toFixed(2)}
        </Text>
      </View>
      
      <View style={styles.cartItemControls}>
        <View style={styles.quantityControls}>
          <TouchableOpacity
            style={styles.quantityButton}
            onPress={() => updateCartItemQuantity(item.id, item.quantity - 1)}
          >
            <Minus size={16} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.quantityText}>{item.quantity}</Text>
          <TouchableOpacity
            style={[styles.quantityButton, styles.addButton]}
            onPress={() => updateCartItemQuantity(item.id, item.quantity + 1)}
          >
            <Plus size={16} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
      
      <TextInput
        style={styles.notesInput}
        placeholder="Special instructions..."
        value={item.notes}
        onChangeText={(text) => updateCartItemNotes(item.id, text)}
        multiline
      />
    </View>
  )

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text>Loading menu...</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>New Order</Text>
        <Text style={styles.branchName}>{branch?.name} Branch</Text>
      </View>

      <View style={styles.content}>
        {/* Menu Section */}
        <View style={styles.menuSection}>
          <View style={styles.categoryTabs}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {categories.map(category => (
                <TouchableOpacity
                  key={category.id}
                  style={[
                    styles.categoryTab,
                    selectedCategory === category.id && styles.selectedCategoryTab
                  ]}
                  onPress={() => setSelectedCategory(category.id)}
                >
                  <Text style={[
                    styles.categoryTabText,
                    selectedCategory === category.id && styles.selectedCategoryTabText
                  ]}>
                    {category.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <FlatList
            data={filteredItems}
            renderItem={renderMenuItem}
            keyExtractor={item => item.id}
            showsVerticalScrollIndicator={false}
            style={styles.menuList}
          />
        </View>

        {/* Cart Section */}
        <View style={styles.cartSection}>
          <View style={styles.cartHeader}>
            <ShoppingCart size={24} color="#d97706" />
            <Text style={styles.cartTitle}>Order Summary</Text>
            <Text style={styles.cartCount}>{cart.length} items</Text>
          </View>

          <View style={styles.orderInputs}>
            <TextInput
              style={styles.tableInput}
              placeholder="Table Number"
              value={tableNumber}
              onChangeText={setTableNumber}
            />
            <TextInput
              style={styles.notesInput}
              placeholder="Order notes..."
              value={orderNotes}
              onChangeText={setOrderNotes}
              multiline
            />
          </View>

          <ScrollView style={styles.cartList} showsVerticalScrollIndicator={false}>
            {cart.map(renderCartItem)}
          </ScrollView>

          <View style={styles.cartFooter}>
            <Text style={styles.totalAmount}>
              Total: £{getTotalAmount().toFixed(2)}
            </Text>
            <TouchableOpacity
              style={[
                styles.placeOrderButton,
                (cart.length === 0 || !tableNumber.trim()) && styles.disabledButton
              ]}
              onPress={placeOrder}
              disabled={cart.length === 0 || !tableNumber.trim()}
            >
              <Text style={styles.placeOrderButtonText}>Place Order</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
    padding: 20,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    marginBottom: 20,
    paddingTop: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  branchName: {
    fontSize: 18,
    color: '#d97706',
    fontWeight: '600',
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    gap: 20,
  },
  menuSection: {
    flex: 2,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
  },
  categoryTabs: {
    marginBottom: 16,
  },
  categoryTab: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginRight: 12,
    borderRadius: 25,
    backgroundColor: '#f3f4f6',
  },
  selectedCategoryTab: {
    backgroundColor: '#d97706',
  },
  categoryTabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
  },
  selectedCategoryTabText: {
    color: '#fff',
  },
  menuList: {
    flex: 1,
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  menuItemInfo: {
    flex: 1,
    marginRight: 16,
  },
  menuItemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  menuItemDescription: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  menuItemPrice: {
    fontSize: 16,
    fontWeight: '600',
    color: '#d97706',
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  quantityButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#ef4444',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButton: {
    backgroundColor: '#10b981',
  },
  quantityText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    minWidth: 24,
    textAlign: 'center',
  },
  cartSection: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
  },
  cartHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  cartTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  cartCount: {
    fontSize: 14,
    color: '#6b7280',
  },
  orderInputs: {
    gap: 12,
    marginBottom: 16,
  },
  tableInput: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f9fafb',
  },
  notesInput: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    backgroundColor: '#f9fafb',
    height: 60,
    textAlignVertical: 'top',
  },
  cartList: {
    flex: 1,
    marginBottom: 16,
  },
  cartItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  cartItemInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cartItemName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
  },
  cartItemPrice: {
    fontSize: 14,
    color: '#d97706',
    fontWeight: '500',
  },
  cartItemControls: {
    alignItems: 'center',
    marginBottom: 8,
  },
  cartFooter: {
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 16,
    gap: 12,
  },
  totalAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    textAlign: 'center',
  },
  placeOrderButton: {
    backgroundColor: '#d97706',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#9ca3af',
  },
  placeOrderButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
})