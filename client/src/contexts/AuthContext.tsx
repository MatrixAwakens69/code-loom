import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { 
  User as FirebaseUser, 
  signInWithPopup, 
  signOut as firebaseSignOut,
  onAuthStateChanged
} from 'firebase/auth'
import { auth, googleProvider } from '../config/firebase'
import axios from 'axios'

interface User {
  _id: string
  name: string
  email: string
  avatar?: string
}

interface AuthContextType {
  user: User | null
  firebaseUser: FirebaseUser | null
  loading: boolean
  login: () => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setFirebaseUser(firebaseUser)
      
      if (firebaseUser) {
        try {
          // Get the ID token
          const idToken = await firebaseUser.getIdToken()
          
          // Set the token in axios headers
          axios.defaults.headers.common['Authorization'] = `Bearer ${idToken}`
          
          // Fetch user data from your backend
          const response = await axios.get(`${import.meta.env.VITE_SERVER_URL}/api/auth/me`)
          setUser(response.data.user)
        } catch (error) {
          console.error('Failed to fetch user data:', error)
          setUser(null)
        }
      } else {
        setUser(null)
        delete axios.defaults.headers.common['Authorization']
      }
      
      setLoading(false)
    })

    return unsubscribe
  }, [])

  const login = async () => {
    try {
      setLoading(true)
      const result = await signInWithPopup(auth, googleProvider)
      
      if (result.user) {
        // Get the ID token
        const idToken = await result.user.getIdToken()
        
        // Set the token in axios headers
        axios.defaults.headers.common['Authorization'] = `Bearer ${idToken}`
        
        // The user data will be fetched in the useEffect above
      }
    } catch (error) {
      console.error('Login error:', error)
      throw error
    } finally {
      setLoading(false)
    }
  }

  const logout = async () => {
    try {
      await firebaseSignOut(auth)
      setUser(null)
      delete axios.defaults.headers.common['Authorization']
    } catch (error) {
      console.error('Logout error:', error)
      throw error
    }
  }

  const value: AuthContextType = {
    user,
    firebaseUser,
    loading,
    login,
    logout
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
