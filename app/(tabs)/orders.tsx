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
import { Clock, ChefHat, CircleCheck as CheckCircle, Eye } from 'lucide-react-native'

export default function Orders() {
  const { branch } = useAuthContext()
  const [orders, setOrders] = useState<OrderWithItems[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<OrderWithItems | null>(null)

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

      setOrders(data as OrderWithItems[])
    } catch (error) {
      console.error('Error fetching orders:', error)
    }
    setLoading(false)
    setRefreshing(false)
  }

  const setupRealtimeSubscription = () => {
    if (!branch) return

    const channel = supabase
      .channel('orders_list_changes')
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'New': return '#ef4444'
      case 'Preparing': return '#f59e0b'
      case 'Ready': return '#10b981'
      default: return '#6b7280'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'New': return <Clock size={16} color="#fff" />
      case 'Preparing': return <ChefHat size={16} color="#fff" />
      case 'Ready': return <CheckCircle size={16} color="#fff" />
      default: return null
    }
  }

  const onRefresh = () => {
    setRefreshing(true)
    fetchOrders()
  }

  const renderOrderItem = ({ item }: { item: OrderWithItems }) => {
    const itemCount = item.order_items.reduce((sum, orderItem) => sum + orderItem.quantity, 0)
    
    return (
      <TouchableOpacity
        style={styles.orderCard}
        onPress={() => setSelectedOrder(item)}
      >
        <View style={styles.orderHeader}>
          <View style={styles.orderInfo}>
            <Text style={styles.tableNumber}>Table {item.table_number}</Text>
            <Text style={styles.orderTime}>
              {new Date(item.created_at).toLocaleString()}
            </Text>
          </View>
          
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
            {getStatusIcon(item.status)}
            <Text style={styles.statusText}>{item.status}</Text>
          </View>
        </View>
        
        <View style={styles.orderDetails}>
          <Text style={styles.itemCount}>{itemCount} items</Text>
          <Text style={styles.totalAmount}>£{item.total_amount.toFixed(2)}</Text>
        </View>
        
        {item.notes && (
          <Text style={styles.notes} numberOfLines={2}>{item.notes}</Text>
        )}

        <View style={styles.orderActions}>
          <TouchableOpacity style={styles.viewButton}>
            <Eye size={16} color="#d97706" />
            <Text style={styles.viewButtonText}>View Details</Text>
          </TouchableOpacity>
          
          {item.status === 'New' && (
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: '#f59e0b' }]}
              onPress={() => updateOrderStatus(item.id, 'Preparing')}
            >
              <Text style={styles.actionButtonText}>Start Preparing</Text>
            </TouchableOpacity>
          )}
          
          {item.status === 'Preparing' && (
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: '#10b981' }]}
              onPress={() => updateOrderStatus(item.id, 'Ready')}
            >
              <Text style={styles.actionButtonText}>Mark Ready</Text>
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    )
  }

  const renderOrderDetails = () => {
    if (!selectedOrder) return null

    return (
      <View style={styles.orderDetailsModal}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Order Details</Text>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setSelectedOrder(null)}
          >
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.modalContent}>
          <View style={styles.orderSummary}>
            <Text style={styles.orderSummaryTitle}>
              Table {selectedOrder.table_number}
            </Text>
            <Text style={styles.orderSummaryTime}>
              {new Date(selectedOrder.created_at).toLocaleString()}
            </Text>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(selectedOrder.status) }]}>
              {getStatusIcon(selectedOrder.status)}
              <Text style={styles.statusText}>{selectedOrder.status}</Text>
            </View>
          </View>
          
          <View style={styles.itemsList}>
            <Text style={styles.itemsListTitle}>Order Items</Text>
            {selectedOrder.order_items.map((item, index) => (
              <View key={index} style={styles.orderItemDetail}>
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName}>{item.menu_items.name}</Text>
                  <Text style={styles.itemQuantity}>Qty: {item.quantity}</Text>
                </View>
                <Text style={styles.itemPrice}>
                  £{(item.unit_price * item.quantity).toFixed(2)}
                </Text>
                {item.notes && (
                  <Text style={styles.itemNotes}>Note: {item.notes}</Text>
                )}
              </View>
            ))}
          </View>
          
          {selectedOrder.notes && (
            <View style={styles.orderNotesSection}>
              <Text style={styles.orderNotesTitle}>Order Notes</Text>
              <Text style={styles.orderNotesText}>{selectedOrder.notes}</Text>
            </View>
          )}
          
          <View style={styles.orderTotal}>
            <Text style={styles.orderTotalText}>
              Total: £{selectedOrder.total_amount.toFixed(2)}
            </Text>
          </View>
        </View>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Orders</Text>
        <Text style={styles.branchName}>{branch?.name} Branch</Text>
      </View>

      <FlatList
        data={orders}
        renderItem={renderOrderItem}
        keyExtractor={item => item.id}
        style={styles.ordersList}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      />

      {selectedOrder && renderOrderDetails()}
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
  ordersList: {
    flex: 1,
  },
  orderCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  orderInfo: {
    flex: 1,
  },
  tableNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  orderTime: {
    fontSize: 14,
    color: '#6b7280',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  orderDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  itemCount: {
    fontSize: 14,
    color: '#6b7280',
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: '600',
    color: '#d97706',
  },
  notes: {
    fontSize: 14,
    color: '#374151',
    fontStyle: 'italic',
    marginBottom: 16,
  },
  orderActions: {
    flexDirection: 'row',
    gap: 12,
  },
  viewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d97706',
  },
  viewButtonText: {
    color: '#d97706',
    fontSize: 14,
    fontWeight: '500',
  },
  actionButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  orderDetailsModal: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    width: '100%',
    maxWidth: 600,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 18,
    color: '#6b7280',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    width: '100%',
    maxWidth: 600,
    maxHeight: '80%',
    padding: 20,
  },
  orderSummary: {
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  orderSummaryTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  orderSummaryTime: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 12,
  },
  itemsList: {
    marginBottom: 20,
  },
  itemsListTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  orderItemDetail: {
    padding: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    marginBottom: 8,
  },
  itemInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
    flex: 1,
  },
  itemQuantity: {
    fontSize: 14,
    color: '#6b7280',
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: '#d97706',
    textAlign: 'right',
  },
  itemNotes: {
    fontSize: 12,
    color: '#6b7280',
    fontStyle: 'italic',
    marginTop: 4,
  },
  orderNotesSection: {
    marginBottom: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  orderNotesTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  orderNotesText: {
    fontSize: 14,
    color: '#374151',
    fontStyle: 'italic',
  },
  orderTotal: {
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    alignItems: 'center',
  },
  orderTotalText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
})