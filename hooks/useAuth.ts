import { useEffect, useState } from 'react'
import { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { Branch } from '@/types/database'

export interface AuthState {
  session: Session | null
  user: User | null
  branch: Branch | null
  loading: boolean
}

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    session: null,
    user: null,
    branch: null,
    loading: true
  })

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setAuthState(prev => ({ ...prev, session, user: session?.user ?? null }))
      if (session?.user) {
        fetchUserBranch(session.user.id)
      } else {
        setAuthState(prev => ({ ...prev, loading: false }))
      }
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setAuthState(prev => ({ ...prev, session, user: session?.user ?? null }))
        
        if (session?.user) {
          await fetchUserBranch(session.user.id)
        } else {
          setAuthState(prev => ({ ...prev, branch: null, loading: false }))
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const fetchUserBranch = async (userId: string) => {
    try {
      const { data: branchUser, error } = await supabase
        .from('branch_users')
        .select(`
          branch_id,
          branches (
            id,
            name,
            created_at
          )
        `)
        .eq('user_id', userId)
        .single()

      if (error) {
        console.error('Error fetching user branch:', error)
        setAuthState(prev => ({ ...prev, loading: false }))
        return
      }

      setAuthState(prev => ({
        ...prev,
        branch: branchUser.branches as Branch,
        loading: false
      }))
    } catch (error) {
      console.error('Error fetching user branch:', error)
      setAuthState(prev => ({ ...prev, loading: false }))
    }
  }

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    return { data, error }
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    return { error }
  }

  return {
    ...authState,
    signIn,
    signOut,
  }
}