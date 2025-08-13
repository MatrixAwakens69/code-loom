import { X, Crown, Eye, Edit3, User } from 'lucide-react'

interface ActiveUser {
  id: string
  name: string
  avatar?: string
}

interface Project {
  _id: string
  name: string
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
}

interface UsersListProps {
  users: ActiveUser[]
  project: Project
  onClose: () => void
}

export default function UsersList({ users, project, onClose }: UsersListProps) {
  const getPermission = (userId: string) => {
    if (project.owner._id === userId) {
      return 'owner'
    }
    
    const member = project.members.find(m => m.user._id === userId)
    return member?.permission || 'view'
  }

  const getPermissionIcon = (permission: string) => {
    switch (permission) {
      case 'owner':
        return <Crown className="h-4 w-4 text-yellow-400" />
      case 'edit':
        return <Edit3 className="h-4 w-4 text-green-400" />
      case 'view':
        return <Eye className="h-4 w-4 text-blue-400" />
      default:
        return <User className="h-4 w-4 text-gray-400" />
    }
  }

  const getPermissionLabel = (permission: string) => {
    switch (permission) {
      case 'owner':
        return 'Owner'
      case 'edit':
        return 'Editor'
      case 'view':
        return 'Viewer'
      default:
        return 'Unknown'
    }
  }

  const getStatusColor = (userId: string) => {
    const isActive = users.some(u => u.id === userId)
    return isActive ? 'bg-green-500' : 'bg-gray-500'
  }

  // Combine all project members with active status
  const allMembers = [
    {
      id: project.owner._id,
      name: project.owner.name,
      email: project.owner.email,
      avatar: project.owner.avatar,
      permission: 'owner' as const,
      joinedAt: new Date().toISOString() // Placeholder
    },
    ...project.members.map(member => ({
      id: member.user._id,
      name: member.user.name,
      email: member.user.email,
      avatar: member.user.avatar,
      permission: member.permission,
      joinedAt: member.joinedAt
    }))
  ]

  return (
    <div className="h-full flex flex-col bg-editor-sidebar">
      {/* Header */}
      <div className="p-4 border-b border-editor-border">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">Project Members</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <p className="text-sm text-gray-400 mt-1">
          {users.length} active • {allMembers.length} total
        </p>
      </div>

      {/* Active Users Section */}
      <div className="p-4 border-b border-editor-border">
        <h4 className="text-sm font-medium text-gray-300 mb-3">Currently Active</h4>
        {users.length === 0 ? (
          <p className="text-sm text-gray-500">No active users</p>
        ) : (
          <div className="space-y-2">
            {users.map(user => {
              const permission = getPermission(user.id)
              return (
                <div key={user.id} className="flex items-center space-x-3">
                  <div className="relative">
                    <img
                      src={user.avatar || `https://ui-avatars.com/api/?name=${user.name}&background=3b82f6&color=fff`}
                      alt={user.name}
                      className="h-8 w-8 rounded-full"
                    />
                    <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 border-2 border-editor-sidebar rounded-full" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{user.name}</p>
                    <div className="flex items-center space-x-1">
                      {getPermissionIcon(permission)}
                      <span className="text-xs text-gray-400">{getPermissionLabel(permission)}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* All Members Section */}
      <div className="flex-1 overflow-y-auto p-4">
        <h4 className="text-sm font-medium text-gray-300 mb-3">All Members</h4>
        <div className="space-y-3">
          {allMembers.map(member => {
            const isActive = users.some(u => u.id === member.id)
            return (
              <div key={member.id} className="flex items-center space-x-3">
                <div className="relative">
                  <img
                    src={member.avatar || `https://ui-avatars.com/api/?name=${member.name}&background=3b82f6&color=fff`}
                    alt={member.name}
                    className="h-8 w-8 rounded-full"
                  />
                  <div className={`absolute -bottom-1 -right-1 w-3 h-3 border-2 border-editor-sidebar rounded-full ${getStatusColor(member.id)}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{member.name}</p>
                  <p className="text-xs text-gray-500 truncate">{member.email}</p>
                  <div className="flex items-center space-x-1 mt-1">
                    {getPermissionIcon(member.permission)}
                    <span className="text-xs text-gray-400">{getPermissionLabel(member.permission)}</span>
                    {isActive && (
                      <span className="text-xs text-green-400">• Active</span>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Footer with member count */}
      <div className="p-4 border-t border-editor-border">
        <div className="text-xs text-gray-400 space-y-1">
          <div className="flex items-center justify-between">
            <span>Owner:</span>
            <span>1</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Editors:</span>
            <span>{project.members.filter(m => m.permission === 'edit').length}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Viewers:</span>
            <span>{project.members.filter(m => m.permission === 'view').length}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
