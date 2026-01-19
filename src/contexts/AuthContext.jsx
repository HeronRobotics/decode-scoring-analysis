import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

const AuthContext = createContext(null)

const AuthProviderInner = ({ children }) => {
  const [session, setSession] = useState(null)
  const [user, setUser] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)

  useEffect(() => {
    const init = async () => {
      const { data, error } = await supabase.auth.getSession()
      if (error) {
        console.error('Error getting Supabase session', error)
      }
      setSession(data?.session ?? null)
      setUser(data?.session?.user ?? null)
      setAuthLoading(false)
    }

    init()

    const { data: subscription } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        setSession(newSession)
        setUser(newSession?.user ?? null)
      },
    )

    return () => {
      subscription.subscription.unsubscribe()
    }
  }, [])

  const value = {
    user,
    session,
    authLoading,
    async signIn({ email, password }) {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (!error) {
        setSession(data.session)
        setUser(data.session?.user ?? null)
      }
      return { data, error }
    },
    async signUp({ email, password }) {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      })
      if (!error) {
        setSession(data.session)
        setUser(data.session?.user ?? null)
      }
      return { data, error }
    },
    async signOut() {
      const { error } = await supabase.auth.signOut()
      if (error) {
        console.error('Error signing out', error)
      }
      setSession(null)
      setUser(null)
    },
  }
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const AuthProvider = AuthProviderInner

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  return useContext(AuthContext)
}
