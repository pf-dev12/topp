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
      const { data: branchSession, error } = await supabase
        .from('branch_sessions')
        .select(`
          branch_id,
          branches (
            id,
            name,
            email,
            created_at
          )
        `)
        .eq('user_id', userId)
        .single()

      if (error) {
        console.error('Error fetching branch session:', error)
        setAuthState(prev => ({ ...prev, loading: false }))
        return
      }

      setAuthState(prev => ({
        ...prev,
        branch: branchSession.branches as Branch,
        loading: false
      }))
    } catch (error) {
      console.error('Error fetching branch session:', error)
      setAuthState(prev => ({ ...prev, loading: false }))
    }
  }

  const signInWithBranch = async (branchEmail: string, branchPassword: string) => {
    try {
      // First, verify branch credentials
      const { data: branch, error: branchError } = await supabase
        .from('branches')
        .select('*')
        .eq('email', branchEmail)
        .single()

      if (branchError || !branch) {
        return { data: null, error: { message: 'Invalid branch credentials' } }
      }

      // For demo purposes, we'll use a simple password check
      // In production, you'd want proper password hashing
      if (branchPassword !== 'peshawar2024') {
        return { data: null, error: { message: 'Invalid branch credentials' } }
      }

      // Create or get a user for this branch
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: branchEmail,
        password: 'defaultpassword123', // Default password for all branch users
      })

      if (authError) {
        // If user doesn't exist, create one
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: branchEmail,
          password: 'defaultpassword123',
        })

        if (signUpError) {
          return { data: null, error: signUpError }
        }

        if (signUpData.user) {
          // Create branch session
          await supabase
            .from('branch_sessions')
            .upsert({
              user_id: signUpData.user.id,
              branch_id: branch.id
            })
        }

        return { data: signUpData, error: null }
      }

      if (authData.user) {
        // Create or update branch session
        await supabase
          .from('branch_sessions')
          .upsert({
            user_id: authData.user.id,
            branch_id: branch.id
          })
      }

      return { data: authData, error: null }
    } catch (error) {
      return { data: null, error: { message: 'Authentication failed' } }
    }
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    return { error }
  }

  return {
    ...authState,
    signInWithBranch,
    signOut,
  }
}