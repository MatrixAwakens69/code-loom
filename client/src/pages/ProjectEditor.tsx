import { useState, useEffect, useRef } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { ArrowLeft, Users, Mic, MicOff, Save, Plus, X } from 'lucide-react'
import MonacoEditor from '../components/MonacoEditor'
import FileExplorer from '../components/FileExplorer'
import UsersList from '../components/UsersList'
import VoiceChat from '../components/VoiceChat'
import Terminal from '../components/Terminal'
import axios from 'axios'
import toast from 'react-hot-toast'

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
  files: Array<{
    name: string
    path: string
    content: string
    language: string
    createdAt: string
    updatedAt: string
  }>
  userPermission: 'view' | 'edit'
}

interface ActiveUser {
  _id: string
  name: string
  email: string
  avatar?: string
}

interface ProjectFile {
  name: string
  path: string
  content: string
  language: string
  createdAt: string
  updatedAt: string
}

const API_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:5000'

export default function ProjectEditor() {
  const { projectId } = useParams()
  const { user } = useAuth()
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeFile, setActiveFile] = useState<string>('/index.js')
  const [connected, setConnected] = useState(false)
  const [activeUsers, setActiveUsers] = useState<any[]>([])
  const [showUsersList, setShowUsersList] = useState(false)
  const [showVoiceChat, setShowVoiceChat] = useState(false)
  const [saving, setSaving] = useState(false)
  const [sidebarWidth, setSidebarWidth] = useState(250)
  const [isResizing, setIsResizing] = useState(false)
  const [showNewFileModal, setShowNewFileModal] = useState(false)
  const [rightSidebarWidth, setRightSidebarWidth] = useState(300)
  const [isResizingRight, setIsResizingRight] = useState(false)
  const sidebarRef = useRef<HTMLDivElement>(null)
  const rightSidebarRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (projectId) {
      fetchProject()
    }
  }, [projectId])

  const fetchProject = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/projects/${projectId}`)
      setProject(response.data.project)
      setActiveFile(response.data.project.files[0]?.path || '/index.js')
    } catch (error) {
      console.error('Failed to fetch project:', error)
      toast.error('Failed to load project')
    } finally {
      setLoading(false)
    }
  }

  const handleFileSelect = (filePath: string) => {
    setActiveFile(filePath)
  }

  const handleManualSave = async () => {
    if (!project || project.userPermission !== 'edit') return

    try {
      setSaving(true)
      const activeFileData = project.files.find(f => f.path === activeFile)
      if (!activeFileData) return

      await axios.put(`${API_URL}/api/projects/${projectId}/files/${encodeURIComponent(activeFile)}`, {
        content: activeFileData.content,
        language: activeFileData.language
      })

      toast.success('File saved successfully')
    } catch (error) {
      console.error('Failed to save file:', error)
      toast.error('Failed to save file')
    } finally {
      setSaving(false)
    }
  }

  const createNewFile = async (fileName: string, language: string) => {
    if (!project || project.userPermission !== 'edit') return

    try {
      const filePath = `/${fileName}`
      const now = new Date().toISOString()
      const newFile: ProjectFile = {
        name: fileName,
        path: filePath,
        content: '',
        language,
        createdAt: now,
        updatedAt: now
      }

      // Add to local state first
      setProject(prev => {
        if (!prev) return prev
        return { ...prev, files: [...prev.files, newFile] }
      })

      // Set as active file
      setActiveFile(filePath)

      // Save to server
      await axios.put(`${API_URL}/api/projects/${projectId}/files/${encodeURIComponent(filePath)}`, {
        content: '',
        language
      })

      toast.success('File created successfully')
      setShowNewFileModal(false)
    } catch (error) {
      console.error('Failed to create file:', error)
      toast.error('Failed to create file')
    }
  }

  // Left sidebar resize handlers
  const handleLeftMouseDown = (e: React.MouseEvent) => {
    setIsResizing(true)
    e.preventDefault()
  }

  const handleLeftMouseMove = (e: MouseEvent) => {
    if (!isResizing) return
    
    const newWidth = e.clientX
    if (newWidth > 200 && newWidth < 600) {
      setSidebarWidth(newWidth)
    }
  }

  const handleLeftMouseUp = () => {
    setIsResizing(false)
  }

  // Right sidebar resize handlers
  const handleRightMouseDown = (e: React.MouseEvent) => {
    setIsResizingRight(true)
    e.preventDefault()
  }

  const handleRightMouseMove = (e: MouseEvent) => {
    if (!isResizingRight) return
    
    const newWidth = window.innerWidth - e.clientX
    if (newWidth > 200 && newWidth < 600) {
      setRightSidebarWidth(newWidth)
    }
  }

  const handleRightMouseUp = () => {
    setIsResizingRight(false)
  }

  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleLeftMouseMove)
      document.addEventListener('mouseup', handleLeftMouseUp)
      return () => {
        document.removeEventListener('mousemove', handleLeftMouseMove)
        document.removeEventListener('mouseup', handleLeftMouseUp)
      }
    }
  }, [isResizing])

  useEffect(() => {
    if (isResizingRight) {
      document.addEventListener('mousemove', handleRightMouseMove)
      document.addEventListener('mouseup', handleRightMouseUp)
      return () => {
        document.removeEventListener('mousemove', handleRightMouseMove)
        document.removeEventListener('mouseup', handleRightMouseUp)
      }
    }
  }, [isResizingRight])

  if (loading) {
    return (
      <div className="h-screen bg-editor-bg flex items-center justify-center text-white">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="h-screen bg-editor-bg flex items-center justify-center text-white">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Project Not Found</h2>
          <p className="text-gray-400 mb-6">The project you're looking for doesn't exist or you don't have access to it.</p>
          <Link
            to="/dashboard"
            className="bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-lg font-medium transition-colors"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    )
  }

  // Convert project files to ProjectFile format for FileExplorer
  const projectFiles: ProjectFile[] = project.files.map(file => ({
    name: file.name,
    path: file.path,
    content: file.content,
    language: file.language,
    createdAt: file.createdAt || new Date().toISOString(),
    updatedAt: file.updatedAt || new Date().toISOString()
  }))

  // Find the active file object
  const activeFileObj = projectFiles.find(f => f.path === activeFile)

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
        {/* Resizable Sidebar */}
        <div 
          ref={sidebarRef}
          className="bg-editor-sidebar border-r border-editor-border flex flex-col relative"
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
              files={projectFiles}
              activeFile={activeFileObj || null}
              onFileSelect={(file) => setActiveFile(file.path)}
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

          {/* Resize Handle */}
          <div
            className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-500 transition-colors"
            onMouseDown={handleLeftMouseDown}
          />
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col">
          {/* Editor Tabs */}
          <div className="bg-editor-tab border-b border-editor-border px-4 py-2">
            <div className="flex items-center space-x-2">
              <div className="bg-editor-bg px-3 py-1 rounded-t text-sm">
                {activeFile.split('/').pop()}
              </div>
              <button className="text-gray-400 hover:text-white transition-colors">
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Monaco Editor */}
          <div className="flex-1">
            <MonacoEditor
              value={activeFileObj?.content || ''}
              language={activeFileObj?.language || 'javascript'}
              onChange={(content) => {
                // Update the file content in local state
                setProject(prev => {
                  if (!prev) return prev
                  const newFiles = prev.files.map(f => 
                    f.path === activeFile ? { ...f, content } : f
                  )
                  return { ...prev, files: newFiles }
                })
              }}
              readOnly={project.userPermission !== 'edit'}
            />
          </div>

          {/* Terminal */}
          <div className="h-64 bg-editor-sidebar border-t border-editor-border">
            <Terminal projectId={projectId!} />
          </div>
        </div>

        {/* Right Sidebar - Users List */}
        {showUsersList && (
          <div 
            ref={rightSidebarRef}
            className="bg-editor-sidebar border-l border-editor-border flex flex-col relative"
            style={{ width: rightSidebarWidth }}
          >
            <UsersList
              users={[project.owner, ...project.members.map(m => m.user)].map(user => ({
                id: user._id,
                name: user.name,
                email: user.email,
                avatar: user.avatar
              }))}
              project={project}
              onClose={() => setShowUsersList(false)}
            />
            {/* Resize Handle */}
            <div
              className="absolute left-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-500 transition-colors"
              onMouseDown={handleRightMouseDown}
            />
          </div>
        )}
      </div>

      {/* Voice Chat Overlay */}
      {showVoiceChat && (
        <VoiceChat
          projectId={projectId!}
          currentUser={{
            id: user?._id || '',
            name: user?.name || '',
            email: user?.email || '',
            avatar: user?.avatar
          }}
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
