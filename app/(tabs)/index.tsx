import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native'
import { supabase } from '@/lib/supabase'
import { useAuthContext } from '@/contexts/AuthContext'
import { OrderWithItems } from '@/types/database'
import { Clock, ChefHat, CircleCheck as CheckCircle } from 'lucide-react-native'

export default function Dashboard() {
  const { branch } = useAuthContext()
  const [orders, setOrders] = useState<{
    new: OrderWithItems[]
    preparing: OrderWithItems[]
    ready: OrderWithItems[]
  }>({ new: [], preparing: [], ready: [] })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (branch) {
      fetchOrders()
      setupRealtimeSubscription()
    }
  }, [branch])

  const fetchOrders = async () => {
    if (!branch) return

    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (
            *,
            menu_items (*)
          )
        `)
        .eq('branch_id', branch.id)
        .order('created_at', { ascending: false })

      if (error) throw error

      const ordersData = data as OrderWithItems[]
      setOrders({
        new: ordersData.filter(order => order.status === 'New'),
        preparing: ordersData.filter(order => order.status === 'Preparing'),
        ready: ordersData.filter(order => order.status === 'Ready'),
      })
    } catch (error) {
      console.error('Error fetching orders:', error)
    }
    setLoading(false)
  }

  const setupRealtimeSubscription = () => {
    if (!branch) return

    const channel = supabase
      .channel('orders_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `branch_id=eq.${branch.id}`,
        },
        () => {
          fetchOrders()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }

  const updateOrderStatus = async (orderId: string, newStatus: 'New' | 'Preparing' | 'Ready') => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId)

      if (error) throw error
    } catch (error) {
      console.error('Error updating order status:', error)
    }
  }

  const renderOrderCard = (order: OrderWithItems) => {
    const itemCount = order.order_items.reduce((sum, item) => sum + item.quantity, 0)
    
    return (
      <View key={order.id} style={styles.orderCard}>
        <View style={styles.orderHeader}>
          <Text style={styles.tableNumber}>Table {order.table_number}</Text>
          <Text style={styles.orderTime}>
            {new Date(order.created_at).toLocaleTimeString([], { 
              hour: '2-digit', 
              minute: '2-digit' 
            })}
          </Text>
        </View>
        
        <Text style={styles.itemCount}>{itemCount} items</Text>
        <Text style={styles.totalAmount}>£{order.total_amount.toFixed(2)}</Text>
        
        {order.notes && (
          <Text style={styles.notes}>{order.notes}</Text>
        )}

        <View style={styles.statusButtons}>
          {order.status === 'New' && (
            <TouchableOpacity
              style={[styles.statusButton, styles.preparingButton]}
              onPress={() => updateOrderStatus(order.id, 'Preparing')}
            >
              <Text style={styles.statusButtonText}>Start Preparing</Text>
            </TouchableOpacity>
          )}
          {order.status === 'Preparing' && (
            <TouchableOpacity
              style={[styles.statusButton, styles.readyButton]}
              onPress={() => updateOrderStatus(order.id, 'Ready')}
            >
              <Text style={styles.statusButtonText}>Mark Ready</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    )
  }

  const renderStatusSection = (title: string, orders: OrderWithItems[], icon: React.ReactNode, color: string) => (
    <View style={styles.statusSection}>
      <View style={[styles.statusHeader, { backgroundColor: color }]}>
        {icon}
        <Text style={styles.statusTitle}>{title}</Text>
        <View style={styles.statusCount}>
          <Text style={styles.statusCountText}>{orders.length}</Text>
        </View>
      </View>
      
      {orders.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>No {title.toLowerCase()} orders</Text>
        </View>
      ) : (
        <FlatList
          data={orders}
          renderItem={({ item }) => renderOrderCard(item)}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  )

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Dashboard</Text>
        <Text style={styles.branchName}>{branch?.name} Branch</Text>
      </View>

      <View style={styles.statusGrid}>
        {renderStatusSection(
          'New Orders',
          orders.new,
          <Clock size={20} color="#fff" />,
          '#ef4444'
        )}
        
        {renderStatusSection(
          'Preparing',
          orders.preparing,
          <ChefHat size={20} color="#fff" />,
          '#f59e0b'
        )}
        
        {renderStatusSection(
          'Ready',
          orders.ready,
          <CheckCircle size={20} color="#fff" />,
          '#10b981'
        )}
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
  header: {
    marginBottom: 30,
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
  statusGrid: {
    flex: 1,
    flexDirection: 'row',
    gap: 16,
  },
  statusSection: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 8,
  },
  statusTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  statusCount: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  statusCountText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  orderCard: {
    backgroundColor: '#f9fafb',
    margin: 8,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  tableNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  orderTime: {
    fontSize: 14,
    color: '#6b7280',
  },
  itemCount: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  totalAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#d97706',
    marginBottom: 8,
  },
  notes: {
    fontSize: 14,
    color: '#374151',
    fontStyle: 'italic',
    marginBottom: 12,
  },
  statusButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  statusButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  preparingButton: {
    backgroundColor: '#f59e0b',
  },
  readyButton: {
    backgroundColor: '#10b981',
  },
  statusButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    color: '#6b7280',
  },
})