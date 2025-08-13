import { useState, useEffect, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useSocket } from '../contexts/SocketContext'
import MonacoEditor from '../components/MonacoEditor'
import FileExplorer from '../components/FileExplorer'
import VoiceChat from '../components/VoiceChat'
import UsersList from '../components/UsersList'
import { 
  ArrowLeft, 
  Save, 
  Users, 
  Mic, 
  MicOff,
  Settings,
  Play,
  Folder,
  Plus,
  X
} from 'lucide-react'
import axios from 'axios'
import toast from 'react-hot-toast'

interface ProjectFile {
  name: string
  path: string
  content: string
  language: string
  createdAt: string
  updatedAt: string
}

interface Project {
  _id: string
  name: string
  description?: string
  owner: {
    _id: string
    name: string
    email: string
    avatar?: string
  }
  members: Array<{
    user: {
      _id: string
      name: string
      email: string
      avatar?: string
    }
    permission: 'view' | 'edit'
    joinedAt: string
  }>
  files: ProjectFile[]
  userPermission: 'view' | 'edit'
  createdAt: string
  updatedAt: string
}

interface ActiveUser {
  id: string
  name: string
  avatar?: string
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

export default function ProjectEditor() {
  const { projectId } = useParams<{ projectId: string }>()
  const { user } = useAuth()
  const { socket, connected } = useSocket()
  
  const [project, setProject] = useState<Project | null>(null)
  const [activeFile, setActiveFile] = useState<ProjectFile | null>(null)
  const [fileContent, setFileContent] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeUsers, setActiveUsers] = useState<ActiveUser[]>([])
  const [showVoiceChat, setShowVoiceChat] = useState(false)
  const [showUsersList, setShowUsersList] = useState(false)
  const [sidebarWidth, setSidebarWidth] = useState(250)
  const [showNewFileModal, setShowNewFileModal] = useState(false)

  const saveTimeoutRef = useRef<NodeJS.Timeout>()
  const resizeRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (projectId) {
      fetchProject()
    }
  }, [projectId])

  useEffect(() => {
    if (socket && projectId && connected) {
      // Join project room
      socket.emit('join-project', projectId)

      // Listen for active users updates
      socket.on('active-users', (users: ActiveUser[]) => {
        setActiveUsers(users)
      })

      socket.on('user-joined', (data: { user: ActiveUser }) => {
        setActiveUsers(prev => [...prev.filter(u => u.id !== data.user.id), data.user])
        toast.success(`${data.user.name} joined the project`)
      })

      socket.on('user-left', (data: { user: ActiveUser }) => {
        setActiveUsers(prev => prev.filter(u => u.id !== data.user.id))
        toast(`${data.user.name} left the project`, { icon: '👋' })
      })

      // Listen for file changes from other users
      socket.on('file-changed', (data: { filePath: string, content: string, user: { name: string } }) => {
        if (activeFile && activeFile.path === data.filePath) {
          setFileContent(data.content)
          toast(`File updated by ${data.user.name}`, { icon: '📝' })
        }
      })

      return () => {
        socket.emit('leave-project', projectId)
        socket.off('active-users')
        socket.off('user-joined')
        socket.off('user-left')
        socket.off('file-changed')
      }
    }
  }, [socket, projectId, connected, activeFile])

  const fetchProject = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/projects/${projectId}`)
      const projectData = response.data.project
      setProject(projectData)
      
      // Load first file by default
      if (projectData.files.length > 0) {
        const firstFile = projectData.files[0]
        setActiveFile(firstFile)
        setFileContent(firstFile.content)
      }
    } catch (error: any) {
      console.error('Failed to fetch project:', error)
      toast.error(error.response?.data?.error || 'Failed to load project')
    } finally {
      setLoading(false)
    }
  }

  const handleFileSelect = (file: ProjectFile) => {
    setActiveFile(file)
    setFileContent(file.content)
  }

  const handleContentChange = (newContent: string) => {
    setFileContent(newContent)
    
    // Emit real-time changes to other users
    if (socket && activeFile && project) {
      socket.emit('file-change', {
        projectId: project._id,
        filePath: activeFile.path,
        content: newContent
      })
    }

    // Auto-save after 2 seconds of inactivity
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }
    
    saveTimeoutRef.current = setTimeout(() => {
      handleSave(newContent)
    }, 2000)
  }

  const handleSave = async (content?: string) => {
    if (!activeFile || !project || project.userPermission !== 'edit') return

    setSaving(true)
    try {
      await axios.put(
        `${API_URL}/api/projects/${project._id}/files${activeFile.path}`,
        {
          content: content || fileContent,
          language: activeFile.language
        }
      )
      
      // Update local file reference
      if (project.files) {
        const fileIndex = project.files.findIndex(f => f.path === activeFile.path)
        if (fileIndex !== -1) {
          const updatedFiles = [...project.files]
          updatedFiles[fileIndex] = {
            ...updatedFiles[fileIndex],
            content: content || fileContent,
            updatedAt: new Date().toISOString()
          }
          setProject({ ...project, files: updatedFiles })
        }
      }
      
      toast.success('File saved', { duration: 1000 })
    } catch (error) {
      console.error('Failed to save file:', error)
      toast.error('Failed to save file')
    } finally {
      setSaving(false)
    }
  }

  const handleManualSave = () => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }
    handleSave()
  }

  const createNewFile = async (fileName: string, language: string) => {
    if (!project || project.userPermission !== 'edit') return

    try {
      const filePath = `/${fileName}`
      await axios.put(
        `${API_URL}/api/projects/${project._id}/files${filePath}`,
        {
          content: '',
          language
        }
      )

      // Refresh project to get updated files
      await fetchProject()
      toast.success('File created successfully')
    } catch (error) {
      console.error('Failed to create file:', error)
      toast.error('Failed to create file')
    }
  }

  // Handle sidebar resize
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    const startX = e.clientX
    const startWidth = sidebarWidth

    const handleMouseMove = (e: MouseEvent) => {
      const newWidth = startWidth + (e.clientX - startX)
      setSidebarWidth(Math.max(200, Math.min(600, newWidth)))
    }

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }

  if (loading) {
    return (
      <div className="h-screen bg-editor-bg flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="h-screen bg-editor-bg flex items-center justify-center text-white">
        <div className="text-center">
          <h2 className="text-2xl font-semibold mb-4">Project not found</h2>
          <Link to="/dashboard" className="btn-primary">
            Return to Dashboard
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen bg-editor-bg text-white flex flex-col overflow-hidden">
      {/* Header */}
      <header className="bg-editor-sidebar border-b border-editor-border px-4 py-2 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link
            to="/dashboard"
            className="text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-lg font-semibold">{project.name}</h1>
          {project.description && (
            <span className="text-sm text-gray-400">— {project.description}</span>
          )}
        </div>

        <div className="flex items-center space-x-2">
          {/* Connection Status */}
          <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`} />
          
          {/* Active Users Count */}
          <button
            onClick={() => setShowUsersList(!showUsersList)}
            className="flex items-center space-x-1 px-3 py-1 rounded bg-editor-tab hover:bg-gray-600 transition-colors"
          >
            <Users className="h-4 w-4" />
            <span className="text-sm">{activeUsers.length}</span>
          </button>

          {/* Voice Chat Toggle */}
          <button
            onClick={() => setShowVoiceChat(!showVoiceChat)}
            className={`p-2 rounded transition-colors ${
              showVoiceChat 
                ? 'bg-green-600 hover:bg-green-700' 
                : 'bg-editor-tab hover:bg-gray-600'
            }`}
          >
            {showVoiceChat ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
          </button>

          {/* Save Button */}
          <button
            onClick={handleManualSave}
            disabled={saving || project.userPermission !== 'edit'}
            className="flex items-center space-x-1 px-3 py-1 rounded bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Save className="h-4 w-4" />
            <span className="text-sm">{saving ? 'Saving...' : 'Save'}</span>
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <div 
          className="bg-editor-sidebar border-r border-editor-border flex flex-col"
          style={{ width: sidebarWidth }}
        >
          {/* File Explorer Header */}
          <div className="p-3 border-b border-editor-border">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-300">FILES</h3>
              {project.userPermission === 'edit' && (
                <button
                  onClick={() => setShowNewFileModal(true)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <Plus className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {/* File Explorer */}
          <div className="flex-1 overflow-y-auto">
            <FileExplorer
              files={project.files}
              activeFile={activeFile}
              onFileSelect={handleFileSelect}
            />
          </div>

          {/* Permission Badge */}
          <div className="p-3 border-t border-editor-border">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-400">Permission:</span>
              <span className={`px-2 py-1 rounded ${
                project.userPermission === 'edit' 
                  ? 'bg-green-600 text-white' 
                  : 'bg-yellow-600 text-white'
              }`}>
                {project.userPermission}
              </span>
            </div>
          </div>
        </div>

        {/* Resize Handle */}
        <div
          ref={resizeRef}
          className="w-1 bg-editor-border hover:bg-blue-500 cursor-col-resize transition-colors"
          onMouseDown={handleMouseDown}
        />

        {/* Main Editor Area */}
        <div className="flex-1 flex flex-col">
          {activeFile ? (
            <>
              {/* File Tab */}
              <div className="bg-editor-tab border-b border-editor-border px-4 py-2 flex items-center">
                <span className="text-sm">{activeFile.name}</span>
                {saving && (
                  <span className="ml-2 text-xs text-gray-400">Saving...</span>
                )}
              </div>

              {/* Editor */}
              <div className="flex-1">
                <MonacoEditor
                  value={fileContent}
                  language={activeFile.language}
                  onChange={handleContentChange}
                  readOnly={project.userPermission !== 'edit'}
                />
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center text-gray-400">
                <Folder className="h-16 w-16 mx-auto mb-4" />
                <p>Select a file to start editing</p>
              </div>
            </div>
          )}
        </div>

        {/* Right Sidebar - Users List */}
        {showUsersList && (
          <div className="w-64 bg-editor-sidebar border-l border-editor-border">
            <UsersList 
              users={activeUsers} 
              project={project}
              onClose={() => setShowUsersList(false)}
            />
          </div>
        )}
      </div>

      {/* Voice Chat */}
      {showVoiceChat && (
        <VoiceChat
          projectId={project._id}
          currentUser={user!}
          onClose={() => setShowVoiceChat(false)}
        />
      )}

      {/* New File Modal */}
      {showNewFileModal && (
        <NewFileModal
          onClose={() => setShowNewFileModal(false)}
          onCreateFile={createNewFile}
        />
      )}
    </div>
  )
}

// New File Modal Component
interface NewFileModalProps {
  onClose: () => void
  onCreateFile: (fileName: string, language: string) => void
}

function NewFileModal({ onClose, onCreateFile }: NewFileModalProps) {
  const [fileName, setFileName] = useState('')
  const [language, setLanguage] = useState('javascript')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (fileName.trim()) {
      onCreateFile(fileName.trim(), language)
      onClose()
    }
  }

  const getLanguageFromExtension = (name: string) => {
    const ext = name.split('.').pop()?.toLowerCase()
    const langMap: { [key: string]: string } = {
      'js': 'javascript',
      'ts': 'typescript',
      'jsx': 'javascript',
      'tsx': 'typescript',
      'py': 'python',
      'java': 'java',
      'cpp': 'cpp',
      'c': 'c',
      'cs': 'csharp',
      'php': 'php',
      'rb': 'ruby',
      'go': 'go',
      'rs': 'rust',
      'html': 'html',
      'css': 'css',
      'scss': 'scss',
      'json': 'json',
      'xml': 'xml',
      'md': 'markdown',
      'sql': 'sql',
      'sh': 'shell'
    }
    return langMap[ext || ''] || 'plaintext'
  }

  const handleFileNameChange = (name: string) => {
    setFileName(name)
    const detectedLang = getLanguageFromExtension(name)
    setLanguage(detectedLang)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-editor-sidebar rounded-lg p-6 w-full max-w-md border border-editor-border">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Create New File</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              File Name
            </label>
            <input
              type="text"
              value={fileName}
              onChange={(e) => handleFileNameChange(e.target.value)}
              className="w-full px-3 py-2 bg-editor-bg border border-editor-border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., index.js, styles.css, README.md"
              required
            />
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Language
            </label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="w-full px-3 py-2 bg-editor-bg border border-editor-border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="javascript">JavaScript</option>
              <option value="typescript">TypeScript</option>
              <option value="python">Python</option>
              <option value="java">Java</option>
              <option value="cpp">C++</option>
              <option value="c">C</option>
              <option value="csharp">C#</option>
              <option value="php">PHP</option>
              <option value="ruby">Ruby</option>
              <option value="go">Go</option>
              <option value="rust">Rust</option>
              <option value="html">HTML</option>
              <option value="css">CSS</option>
              <option value="scss">SCSS</option>
              <option value="json">JSON</option>
              <option value="xml">XML</option>
              <option value="markdown">Markdown</option>
              <option value="sql">SQL</option>
              <option value="shell">Shell</option>
              <option value="plaintext">Plain Text</option>
            </select>
          </div>

          <div className="flex space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!fileName.trim()}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Create
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
