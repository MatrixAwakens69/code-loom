import { useState } from 'react'
import { 
  ChevronRight, 
  ChevronDown, 
  File, 
  FileText, 
  FileCode, 
  FileImage,
  FileVideo,
  Database,
  Settings,
  Hash
} from 'lucide-react'

interface ProjectFile {
  name: string
  path: string
  content: string
  language: string
  createdAt: string
  updatedAt: string
}

interface FileExplorerProps {
  files: ProjectFile[]
  activeFile: ProjectFile | null
  onFileSelect: (file: ProjectFile) => void
}

interface FileNode {
  name: string
  path: string
  type: 'file' | 'folder'
  children?: FileNode[]
  file?: ProjectFile
}

export default function FileExplorer({ files, activeFile, onFileSelect }: FileExplorerProps) {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['/']))

  // Build file tree from flat file list
  const buildFileTree = (files: ProjectFile[]): FileNode[] => {
    const root: FileNode = { name: '', path: '/', type: 'folder', children: [] }
    
    files.forEach(file => {
      const pathParts = file.path.split('/').filter(Boolean)
      let currentNode = root
      
      pathParts.forEach((part, index) => {
        const currentPath = '/' + pathParts.slice(0, index + 1).join('/')
        const isFile = index === pathParts.length - 1
        
        if (!currentNode.children) {
          currentNode.children = []
        }
        
        let existingNode = currentNode.children.find(child => child.name === part)
        
        if (!existingNode) {
          existingNode = {
            name: part,
            path: currentPath,
            type: isFile ? 'file' : 'folder',
            children: isFile ? undefined : [],
            file: isFile ? file : undefined
          }
          currentNode.children.push(existingNode)
        }
        
        currentNode = existingNode
      })
    })
    
    return root.children || []
  }

  const toggleFolder = (path: string) => {
    setExpandedFolders(prev => {
      const newSet = new Set(prev)
      if (newSet.has(path)) {
        newSet.delete(path)
      } else {
        newSet.add(path)
      }
      return newSet
    })
  }

  const getFileIcon = (fileName: string, language: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase()
    
    // Language-specific icons
    if (language === 'javascript' || language === 'typescript') {
      return <FileCode className="h-4 w-4 text-yellow-400" />
    }
    if (language === 'python') {
      return <FileCode className="h-4 w-4 text-blue-400" />
    }
    if (language === 'java') {
      return <FileCode className="h-4 w-4 text-red-400" />
    }
    if (language === 'html') {
      return <FileCode className="h-4 w-4 text-orange-400" />
    }
    if (language === 'css' || language === 'scss') {
      return <FileCode className="h-4 w-4 text-blue-400" />
    }
    if (language === 'json') {
      return <FileText className="h-4 w-4 text-green-400" />
    }
    if (language === 'markdown') {
      return <FileText className="h-4 w-4 text-gray-400" />
    }
    
    // Extension-specific icons
    switch (extension) {
      case 'png':
      case 'jpg':
      case 'jpeg':
      case 'gif':
      case 'svg':
      case 'webp':
        return <FileImage className="h-4 w-4 text-purple-400" />
      case 'mp4':
      case 'webm':
      case 'avi':
      case 'mov':
        return <FileVideo className="h-4 w-4 text-red-400" />
      case 'sql':
      case 'db':
        return <Database className="h-4 w-4 text-blue-400" />
      case 'env':
      case 'config':
      case 'conf':
        return <Settings className="h-4 w-4 text-gray-400" />
      case 'md':
        return <Hash className="h-4 w-4 text-gray-400" />
      default:
        return <File className="h-4 w-4 text-gray-400" />
    }
  }

  const renderFileNode = (node: FileNode, depth: number = 0): JSX.Element => {
    const isExpanded = expandedFolders.has(node.path)
    const isActive = activeFile?.path === node.path
    const paddingLeft = depth * 12 + 8

    if (node.type === 'folder') {
      return (
        <div key={node.path}>
          <div
            className="flex items-center py-1 px-2 hover:bg-editor-tab cursor-pointer transition-colors"
            style={{ paddingLeft }}
            onClick={() => toggleFolder(node.path)}
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4 text-gray-400 mr-1" />
            ) : (
              <ChevronRight className="h-4 w-4 text-gray-400 mr-1" />
            )}
            <span className="text-sm text-gray-300">{node.name}</span>
          </div>
          {isExpanded && node.children && (
            <div>
              {node.children
                .sort((a, b) => {
                  // Folders first, then files
                  if (a.type !== b.type) {
                    return a.type === 'folder' ? -1 : 1
                  }
                  return a.name.localeCompare(b.name)
                })
                .map(child => renderFileNode(child, depth + 1))}
            </div>
          )}
        </div>
      )
    }

    // File node
    return (
      <div
        key={node.path}
        className={`flex items-center py-1 px-2 hover:bg-editor-tab cursor-pointer transition-colors ${
          isActive ? 'bg-blue-600 text-white' : 'text-gray-300'
        }`}
        style={{ paddingLeft }}
        onClick={() => node.file && onFileSelect(node.file)}
      >
        {getFileIcon(node.name, node.file?.language || '')}
        <span className="text-sm ml-2 truncate">{node.name}</span>
        {isActive && (
          <div className="ml-auto w-1 h-4 bg-blue-400 rounded-full" />
        )}
      </div>
    )
  }

  const fileTree = buildFileTree(files)

  return (
    <div className="h-full overflow-y-auto">
      {fileTree.length === 0 ? (
        <div className="p-4 text-center text-gray-500">
          <File className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No files in this project</p>
        </div>
      ) : (
        <div className="py-2">
          {fileTree
            .sort((a, b) => {
              // Folders first, then files
              if (a.type !== b.type) {
                return a.type === 'folder' ? -1 : 1
              }
              return a.name.localeCompare(b.name)
            })
            .map(node => renderFileNode(node))}
        </div>
      )}
    </div>
  )
}
