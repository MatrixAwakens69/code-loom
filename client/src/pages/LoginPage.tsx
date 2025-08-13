import { Code } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

export default function LoginPage() {
  const { login } = useAuth()

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 flex items-center justify-center">
      <div className="max-w-md w-full mx-4">
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-8 border border-gray-700">
          {/* Logo */}
          <div className="flex items-center justify-center space-x-2 mb-8">
            <Code className="h-10 w-10 text-blue-400" />
            <span className="text-2xl font-bold text-white">CodeLoom</span>
          </div>

          {/* Title */}
          <h1 className="text-2xl font-bold text-white text-center mb-2">
            Welcome Back
          </h1>
          <p className="text-gray-400 text-center mb-8">
            Sign in to continue collaborating on your projects
          </p>

          {/* Google Sign In Button */}
          <button
            onClick={login}
            className="w-full bg-white hover:bg-gray-100 text-gray-900 font-medium py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center space-x-3 border border-gray-300"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            <span>Continue with Google</span>
          </button>

          {/* Features List */}
          <div className="mt-8 pt-6 border-t border-gray-700">
            <h3 className="text-sm font-medium text-gray-300 mb-4">
              What you'll get:
            </h3>
            <ul className="space-y-2 text-sm text-gray-400">
              <li className="flex items-center">
                <div className="w-1.5 h-1.5 bg-blue-400 rounded-full mr-3"></div>
                Real-time collaborative editing
              </li>
              <li className="flex items-center">
                <div className="w-1.5 h-1.5 bg-blue-400 rounded-full mr-3"></div>
                Integrated voice communication
              </li>
              <li className="flex items-center">
                <div className="w-1.5 h-1.5 bg-blue-400 rounded-full mr-3"></div>
                Project and team management
              </li>
              <li className="flex items-center">
                <div className="w-1.5 h-1.5 bg-blue-400 rounded-full mr-3"></div>
                Advanced permission controls
              </li>
            </ul>
          </div>

          {/* Privacy Notice */}
          <p className="mt-6 text-xs text-gray-500 text-center">
            By signing in, you agree to our Terms of Service and Privacy Policy.
            We only access your basic profile information.
          </p>
        </div>
      </div>
    </div>
  )
}
