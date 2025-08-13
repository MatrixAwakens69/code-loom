import { useState, useRef, useEffect } from 'react'
import { Terminal as TerminalIcon, Play, Square, Trash2, FolderOpen, Download } from 'lucide-react'
import axios from 'axios'

interface TerminalProps {
  projectId: string
}

interface TerminalCommand {
  id: string
  command: string
  output: string
  status: 'running' | 'completed' | 'error'
  timestamp: Date
  exitCode?: number
}

const API_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:5000'

export default function Terminal({ projectId }: TerminalProps) {
  const [commands, setCommands] = useState<TerminalCommand[]>([])
  const [currentCommand, setCurrentCommand] = useState('')
  const [isRunning, setIsRunning] = useState(false)
  const [activeTab, setActiveTab] = useState<'terminal' | 'problems' | 'output'>('terminal')
  const [currentDirectory, setCurrentDirectory] = useState('/')
  const [commandHistory, setCommandHistory] = useState<string[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const terminalRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Auto-scroll to bottom when new commands are added
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight
    }
  }, [commands])

  useEffect(() => {
    // Focus input when terminal tab is active
    if (activeTab === 'terminal' && inputRef.current) {
      inputRef.current.focus()
    }
  }, [activeTab])

  const executeCommand = async (command: string) => {
    if (!command.trim() || isRunning) return

    const newCommand: TerminalCommand = {
      id: Date.now().toString(),
      command: command.trim(),
      output: '',
      status: 'running',
      timestamp: new Date()
    }

    setCommands(prev => [...prev, newCommand])
    setCurrentCommand('')
    setIsRunning(true)
    
    // Add to command history
    setCommandHistory(prev => [...prev, command.trim()])
    setHistoryIndex(-1)

    try {
      // Execute command on the server
      const response = await axios.post(`${API_URL}/api/projects/${projectId}/terminal/execute`, {
        command: command.trim(),
        cwd: currentDirectory
      })

      const { output, exitCode, newCwd } = response.data
      
      // Update command with results
      setCommands(prev => 
        prev.map(cmd => 
          cmd.id === newCommand.id 
            ? { 
                ...cmd, 
                output, 
                status: exitCode === 0 ? 'completed' : 'error',
                exitCode 
              }
            : cmd
        )
      )

      // Update current directory if changed
      if (newCwd) {
        setCurrentDirectory(newCwd)
      }

      // Show success/error message
      if (exitCode === 0) {
        console.log(`Command executed successfully: ${command}`)
      } else {
        console.error(`Command failed with exit code ${exitCode}: ${command}`)
      }

    } catch (error: any) {
      console.error('Failed to execute command:', error)
      
      const errorMessage = error.response?.data?.error || 'Failed to execute command'
      
      setCommands(prev => 
        prev.map(cmd => 
          cmd.id === newCommand.id 
            ? { ...cmd, output: `Error: ${errorMessage}`, status: 'error', exitCode: 1 }
            : cmd
        )
      )
    } finally {
      setIsRunning(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    executeCommand(currentCommand)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (commandHistory.length > 0) {
        const newIndex = Math.min(historyIndex + 1, commandHistory.length - 1)
        setHistoryIndex(newIndex)
        setCurrentCommand(commandHistory[commandHistory.length - 1 - newIndex])
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1
        setHistoryIndex(newIndex)
        setCurrentCommand(newIndex === -1 ? '' : commandHistory[commandHistory.length - 1 - newIndex])
      } else if (historyIndex === 0) {
        setHistoryIndex(-1)
        setCurrentCommand('')
      }
    }
  }

  const clearTerminal = () => {
    setCommands([])
  }

  const stopCommand = () => {
    // Send stop signal to server
    axios.post(`${API_URL}/api/projects/${projectId}/terminal/stop`)
      .catch(console.error)
    
    setIsRunning(false)
    
    // Mark last running command as stopped
    setCommands(prev => 
      prev.map(cmd => 
        cmd.status === 'running' 
          ? { ...cmd, status: 'error', output: 'Command stopped by user', exitCode: 130 }
          : cmd
      )
    )
  }

  const openFileExplorer = () => {
    // This would open the system file explorer
    console.log('Opening file explorer...')
  }

  const downloadOutput = () => {
    const output = commands.map(cmd => 
      `$ ${cmd.command}\n${cmd.output}\n`
    ).join('\n')
    
    const blob = new Blob([output], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `terminal-output-${new Date().toISOString().split('T')[0]}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running':
        return 'text-yellow-400'
      case 'completed':
        return 'text-green-400'
      case 'error':
        return 'text-red-400'
      default:
        return 'text-gray-400'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running':
        return '⏳'
      case 'completed':
        return '✅'
      case 'error':
        return '❌'
      default:
        return '•'
    }
  }

  const getPrompt = () => {
    const dir = currentDirectory === '/' ? 'root' : currentDirectory.split('/').pop()
    return `user@codeloom:${dir}$ `
  }

  return (
    <div className="h-full bg-editor-sidebar border-t border-editor-border flex flex-col">
      {/* Terminal Tabs */}
      <div className="flex border-b border-editor-border">
        <button
          onClick={() => setActiveTab('terminal')}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'terminal'
              ? 'text-white border-b-2 border-blue-500'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <TerminalIcon className="h-4 w-4 inline mr-2" />
          Terminal
        </button>
        <button
          onClick={() => setActiveTab('problems')}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'problems'
              ? 'text-white border-b-2 border-blue-500'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          Problems
        </button>
        <button
          onClick={() => setActiveTab('output')}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'output'
              ? 'text-white border-b-2 border-blue-500'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          Output
        </button>
      </div>

      {/* Terminal Content */}
      {activeTab === 'terminal' && (
        <>
          {/* Terminal Controls */}
          <div className="flex items-center justify-between p-2 border-b border-editor-border">
            <div className="flex items-center space-x-2">
              <span className="text-xs text-gray-400">Terminal</span>
              <span className="text-xs text-gray-500">•</span>
              <span className="text-xs text-gray-400">{currentDirectory}</span>
              {isRunning && (
                <>
                  <span className="text-xs text-gray-500">•</span>
                  <div className="flex items-center space-x-1">
                    <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
                    <span className="text-xs text-yellow-400">Running</span>
                  </div>
                </>
              )}
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={openFileExplorer}
                className="p-1 text-gray-400 hover:text-white transition-colors"
                title="Open File Explorer"
              >
                <FolderOpen className="h-4 w-4" />
              </button>
              <button
                onClick={downloadOutput}
                className="p-1 text-gray-400 hover:text-white transition-colors"
                title="Download Output"
              >
                <Download className="h-4 w-4" />
              </button>
              <button
                onClick={stopCommand}
                disabled={!isRunning}
                className="p-1 text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title="Stop Command"
              >
                <Square className="h-4 w-4" />
              </button>
              <button
                onClick={clearTerminal}
                className="p-1 text-gray-400 hover:text-white transition-colors"
                title="Clear Terminal"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Terminal Output */}
          <div 
            ref={terminalRef}
            className="flex-1 p-3 overflow-y-auto font-mono text-sm bg-black"
          >
            {commands.length === 0 ? (
              <div className="text-gray-500 text-center py-8">
                <TerminalIcon className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>Terminal ready. Type a command to get started.</p>
                <p className="text-xs mt-2">Try: npm install, git status, ls, or any shell command</p>
                <p className="text-xs mt-1 text-gray-600">Current directory: {currentDirectory}</p>
              </div>
            ) : (
              <div className="space-y-2">
                {commands.map((cmd) => (
                  <div key={cmd.id} className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className={getStatusColor(cmd.status)}>
                        {getStatusIcon(cmd.status)}
                      </span>
                      <span className="text-gray-400">
                        {cmd.timestamp.toLocaleTimeString()}
                      </span>
                      {cmd.exitCode !== undefined && (
                        <span className="text-gray-500">
                          [exit: {cmd.exitCode}]
                        </span>
                      )}
                    </div>
                    <div className="ml-6">
                      <div className="text-green-400">{getPrompt()}{cmd.command}</div>
                      {cmd.output && (
                        <div className="text-gray-300 whitespace-pre-wrap mt-1 font-mono">
                          {cmd.output}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Command Input */}
          <div className="p-3 border-t border-editor-border bg-black">
            <form onSubmit={handleSubmit} className="flex items-center space-x-2">
              <span className="text-green-400 font-mono">{getPrompt()}</span>
              <input
                ref={inputRef}
                type="text"
                value={currentCommand}
                onChange={(e) => setCurrentCommand(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Enter command..."
                className="flex-1 bg-transparent text-white placeholder-gray-500 focus:outline-none font-mono text-sm"
                disabled={isRunning}
              />
              <button
                type="submit"
                disabled={!currentCommand.trim() || isRunning}
                className="p-1 text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title="Run Command"
              >
                <Play className="h-4 w-4" />
              </button>
            </form>
          </div>
        </>
      )}

      {/* Problems Tab */}
      {activeTab === 'problems' && (
        <div className="flex-1 p-4 text-center text-gray-400">
          <p>No problems detected</p>
        </div>
      )}

      {/* Output Tab */}
      {activeTab === 'output' && (
        <div className="flex-1 p-4 text-center text-gray-400">
          <p>Build output will appear here</p>
        </div>
      )}
    </div>
  )
}
