import { Link } from 'react-router-dom'
import { Code, Users, Mic, Shield, Zap, Globe } from 'lucide-react'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900">
      {/* Navigation */}
      <nav className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Code className="h-8 w-8 text-blue-400" />
            <span className="text-xl font-bold text-white">CodeLoom</span>
          </div>
          <Link
            to="/login"
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors duration-200"
          >
            Get Started
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="container mx-auto px-6 py-20 text-center">
        <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">
          Code Together,
          <span className="text-blue-400"> Build Better</span>
        </h1>
        <p className="text-xl text-gray-300 mb-12 max-w-3xl mx-auto">
          A sophisticated real-time collaborative IDE that brings your team together. 
          Edit code simultaneously, communicate with voice chat, and build amazing projects together.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            to="/login"
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-lg font-medium text-lg transition-colors duration-200 inline-flex items-center justify-center"
          >
            <Users className="mr-2 h-5 w-5" />
            Start Collaborating
          </Link>
          <a
            href="#features"
            className="border border-blue-400 text-blue-400 hover:bg-blue-400 hover:text-white px-8 py-4 rounded-lg font-medium text-lg transition-colors duration-200 inline-flex items-center justify-center"
          >
            Learn More
          </a>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="container mx-auto px-6 py-20">
        <h2 className="text-3xl md:text-4xl font-bold text-white text-center mb-16">
          Everything You Need for Team Development
        </h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          <FeatureCard
            icon={<Code className="h-8 w-8 text-blue-400" />}
            title="Real-time Code Editing"
            description="Edit code simultaneously with your team members using our advanced Monaco editor with conflict resolution."
          />
          <FeatureCard
            icon={<Mic className="h-8 w-8 text-green-400" />}
            title="Voice Communication"
            description="Integrated voice chat allows you to discuss code changes and collaborate more effectively in real-time."
          />
          <FeatureCard
            icon={<Shield className="h-8 w-8 text-purple-400" />}
            title="Permission Control"
            description="Fine-grained access control allows project admins to set view or edit permissions for each team member."
          />
          <FeatureCard
            icon={<Zap className="h-8 w-8 text-yellow-400" />}
            title="Lightning Fast"
            description="Built with modern technologies for optimal performance, ensuring smooth collaboration even with large codebases."
          />
          <FeatureCard
            icon={<Users className="h-8 w-8 text-red-400" />}
            title="Team Management"
            description="Easily invite team members, manage projects, and track collaboration through an intuitive dashboard."
          />
          <FeatureCard
            icon={<Globe className="h-8 w-8 text-indigo-400" />}
            title="Cloud Synchronization"
            description="Your projects are automatically synchronized across all devices, ensuring you never lose your work."
          />
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-6 py-20 text-center">
        <div className="bg-blue-900/30 rounded-2xl p-12 backdrop-blur-sm border border-blue-500/20">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Ready to Transform Your Development Workflow?
          </h2>
          <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
            Join thousands of developers who are already collaborating more effectively with CodeLoom.
          </p>
          <Link
            to="/login"
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-lg font-medium text-lg transition-colors duration-200 inline-flex items-center justify-center"
          >
            Get Started for Free
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="container mx-auto px-6 py-8 border-t border-gray-800">
        <div className="flex items-center justify-center space-x-2">
          <Code className="h-6 w-6 text-blue-400" />
          <span className="text-gray-400">© 2024 CodeLoom. Built for developers, by developers.</span>
        </div>
      </footer>
    </div>
  )
}

interface FeatureCardProps {
  icon: React.ReactNode
  title: string
  description: string
}

function FeatureCard({ icon, title, description }: FeatureCardProps) {
  return (
    <div className="bg-gray-800/50 p-6 rounded-xl border border-gray-700 hover:border-blue-500/50 transition-colors duration-200">
      <div className="mb-4">{icon}</div>
      <h3 className="text-xl font-semibold text-white mb-3">{title}</h3>
      <p className="text-gray-400">{description}</p>
    </div>
  )
}
