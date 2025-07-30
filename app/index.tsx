import { useEffect } from 'react'
import { View, StyleSheet } from 'react-native'
import { router } from 'expo-router'
import { useAuthContext } from '@/contexts/AuthContext'

export default function Index() {
  const { session, loading } = useAuthContext()

  useEffect(() => {
    if (!loading) {
      if (session) {
        router.replace('/(tabs)')
      } else {
        router.replace('/login')
      }
    }
  }, [session, loading])

  return <View style={styles.container} />
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
})