import { useEffect, useRef, useState } from 'react'
import Editor, { OnMount, OnChange } from '@monaco-editor/react'
import * as monaco from 'monaco-editor'
import { useSocket } from '../contexts/SocketContext'
import { useAuth } from '../contexts/AuthContext'

interface MonacoEditorProps {
  value: string
  language: string
  onChange: (value: string) => void
  readOnly?: boolean
}

interface CursorPosition {
  lineNumber: number
  column: number
}

interface UserCursor {
  user: {
    id: string
    name: string
    avatar?: string
  }
  position: CursorPosition
  selection?: {
    startLineNumber: number
    startColumn: number
    endLineNumber: number
    endColumn: number
  }
}

export default function MonacoEditor({ value, language, onChange, readOnly = false }: MonacoEditorProps) {
  const { socket } = useSocket()
  const { user } = useAuth()
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null)
  const [userCursors, setUserCursors] = useState<UserCursor[]>([])
  const monacoRef = useRef<typeof monaco | null>(null)
  const decorationsRef = useRef<string[]>([])

  useEffect(() => {
    if (socket && editorRef.current) {
      // Listen for cursor updates from other users
      socket.on('cursor-updated', (data: UserCursor & { filePath: string }) => {
        if (data.user.id !== user?.id) {
          setUserCursors(prev => {
            const filtered = prev.filter(cursor => cursor.user.id !== data.user.id)
            return [...filtered, {
              user: data.user,
              position: data.position,
              selection: data.selection
            }]
          })
        }
      })

      return () => {
        socket.off('cursor-updated')
      }
    }
  }, [socket, user])

  // Update cursor decorations when userCursors change
  useEffect(() => {
    if (editorRef.current && monacoRef.current) {
      const editor = editorRef.current
      const monaco = monacoRef.current

      // Clear previous decorations
      if (decorationsRef.current.length > 0) {
        editor.removeDecorations(decorationsRef.current)
      }

      // Create new decorations for user cursors
      const newDecorations: monaco.editor.IModelDeltaDecoration[] = []

      userCursors.forEach((userCursor, index) => {
        const color = getUserColor(userCursor.user.id)
        
        // Cursor decoration
        newDecorations.push({
          range: new monaco.Range(
            userCursor.position.lineNumber,
            userCursor.position.column,
            userCursor.position.lineNumber,
            userCursor.position.column
          ),
          options: {
            className: `user-cursor-${index}`,
            stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
            beforeContentClassName: `user-cursor-line-${index}`,
          }
        })

        // Selection decoration
        if (userCursor.selection) {
          newDecorations.push({
            range: new monaco.Range(
              userCursor.selection.startLineNumber,
              userCursor.selection.startColumn,
              userCursor.selection.endLineNumber,
              userCursor.selection.endColumn
            ),
            options: {
              className: `user-selection-${index}`,
              stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
            }
          })
        }
      })

      // Apply decorations
      decorationsRef.current = editor.createDecorationsCollection(newDecorations).getDecorations().map(d => d.id)

      // Inject custom CSS for cursor colors
      injectCursorStyles(userCursors)
    }
  }, [userCursors])

  const handleEditorDidMount: OnMount = (editor, monaco) => {
    editorRef.current = editor
    monacoRef.current = monaco

    // Configure editor
    editor.updateOptions({
      fontSize: 14,
      fontFamily: "'Fira Code', 'JetBrains Mono', 'Source Code Pro', monospace",
      fontLigatures: true,
      minimap: { enabled: true },
      wordWrap: 'on',
      lineNumbers: 'on',
      renderWhitespace: 'selection',
      scrollBeyondLastLine: false,
      automaticLayout: true,
      tabSize: 2,
      insertSpaces: true,
      readOnly
    })

    // Listen for cursor position changes
    editor.onDidChangeCursorPosition((e) => {
      if (socket && !readOnly) {
        const position = e.position
        const selection = editor.getSelection()
        
        socket.emit('cursor-position', {
          projectId: 'current-project', // This should be passed as prop
          filePath: 'current-file', // This should be passed as prop
          position: {
            lineNumber: position.lineNumber,
            column: position.column
          },
          selection: selection ? {
            startLineNumber: selection.startLineNumber,
            startColumn: selection.startColumn,
            endLineNumber: selection.endLineNumber,
            endColumn: selection.endColumn
          } : undefined
        })
      }
    })

    // Setup themes
    monaco.editor.defineTheme('codeloom-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '6a9955', fontStyle: 'italic' },
        { token: 'keyword', foreground: '569cd6' },
        { token: 'string', foreground: 'ce9178' },
        { token: 'number', foreground: 'b5cea8' },
        { token: 'regexp', foreground: 'd16969' },
        { token: 'type', foreground: '4ec9b0' },
        { token: 'class', foreground: '4ec9b0' },
        { token: 'function', foreground: 'dcdcaa' },
        { token: 'variable', foreground: '9cdcfe' }
      ],
      colors: {
        'editor.background': '#1e1e1e',
        'editor.foreground': '#cccccc',
        'editor.lineHighlightBackground': '#2d2d30',
        'editor.selectionBackground': '#264f78',
        'editor.inactiveSelectionBackground': '#3a3d41',
        'editorCursor.foreground': '#aeafad',
        'editorWhitespace.foreground': '#404040',
        'editorIndentGuide.background': '#404040',
        'editorIndentGuide.activeBackground': '#707070',
        'editorLineNumber.foreground': '#858585',
        'editorLineNumber.activeForeground': '#c6c6c6'
      }
    })

    monaco.editor.setTheme('codeloom-dark')
  }

  const handleEditorChange: OnChange = (newValue) => {
    if (newValue !== undefined) {
      onChange(newValue)
    }
  }

  const getUserColor = (userId: string): string => {
    // Generate consistent colors for users
    const colors = [
      '#ff6b6b', '#4ecdc4', '#45b7d1', '#f9ca24', 
      '#f0932b', '#eb4d4b', '#6c5ce7', '#a29bfe',
      '#fd79a8', '#e17055', '#00b894', '#0984e3'
    ]
    
    let hash = 0
    for (let i = 0; i < userId.length; i++) {
      const char = userId.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    
    return colors[Math.abs(hash) % colors.length]
  }

  const injectCursorStyles = (cursors: UserCursor[]) => {
    // Remove existing cursor styles
    const existingStyle = document.getElementById('codeloom-cursor-styles')
    if (existingStyle) {
      existingStyle.remove()
    }

    if (cursors.length === 0) return

    // Create new style element
    const style = document.createElement('style')
    style.id = 'codeloom-cursor-styles'
    
    let css = ''
    
    cursors.forEach((cursor, index) => {
      const color = getUserColor(cursor.user.id)
      
      css += `
        .user-cursor-line-${index}::before {
          content: '';
          position: absolute;
          top: 0;
          width: 2px;
          height: 1.2em;
          background-color: ${color};
          z-index: 10;
        }
        
        .user-cursor-line-${index}::after {
          content: '${cursor.user.name}';
          position: absolute;
          top: -20px;
          left: 0;
          background-color: ${color};
          color: white;
          font-size: 11px;
          padding: 2px 6px;
          border-radius: 3px;
          white-space: nowrap;
          z-index: 10;
          pointer-events: none;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        }
        
        .user-selection-${index} {
          background-color: ${color}40 !important;
        }
        
        .user-cursor-${index} {
          background-color: ${color} !important;
        }
      `
    })
    
    style.textContent = css
    document.head.appendChild(style)
  }

  return (
    <div className="h-full w-full relative">
      <Editor
        height="100%"
        language={language}
        value={value}
        onChange={handleEditorChange}
        onMount={handleEditorDidMount}
        options={{
          readOnly,
          scrollBeyondLastLine: false,
          fontSize: 14,
          fontFamily: "'Fira Code', 'JetBrains Mono', 'Source Code Pro', monospace",
          fontLigatures: true,
          minimap: { enabled: true },
          wordWrap: 'on',
          lineNumbers: 'on',
          renderWhitespace: 'selection',
          automaticLayout: true,
          tabSize: 2,
          insertSpaces: true,
          cursorStyle: 'line',
          cursorBlinking: 'blink',
          renderLineHighlight: 'all',
          selectOnLineNumbers: true,
          smoothScrolling: true,
          multiCursorModifier: 'ctrlCmd',
          formatOnPaste: true,
          formatOnType: true
        }}
        loading={
          <div className="h-full flex items-center justify-center bg-editor-bg">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        }
      />
      
      {/* Collaborative cursors info panel */}
      {userCursors.length > 0 && (
        <div className="absolute top-2 right-2 bg-editor-sidebar border border-editor-border rounded-lg p-2 space-y-1 max-w-48">
          <div className="text-xs text-gray-300 font-medium">Active Cursors:</div>
          {userCursors.map((cursor, index) => (
            <div key={cursor.user.id} className="flex items-center space-x-2 text-xs">
              <div 
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: getUserColor(cursor.user.id) }}
              />
              <span className="text-gray-300 truncate">{cursor.user.name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
