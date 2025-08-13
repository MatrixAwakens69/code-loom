import { useState } from 'react'
import { X, Crown, Eye, Edit3, User, Plus, Mail, Clock } from 'lucide-react'
import axios from 'axios'
import toast from 'react-hot-toast'

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
  invites?: Array<{
    _id: string
    email: string
    permission: 'view' | 'edit'
    status: 'pending' | 'accepted' | 'declined'
    invitedAt: string
  }>
}

interface UsersListProps {
  users: ActiveUser[]
  project: Project
  onClose: () => void
}

const API_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:5000'

export default function UsersList({ users, project, onClose }: UsersListProps) {
  const [showInviteForm, setShowInviteForm] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [invitePermission, setInvitePermission] = useState<'view' | 'edit'>('view')
  const [sendingInvite, setSendingInvite] = useState(false)

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

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inviteEmail.trim()) return

    try {
      setSendingInvite(true)
      await axios.post(`${API_URL}/api/projects/${project._id}/invite`, {
        email: inviteEmail.trim(),
        permission: invitePermission
      })

      toast.success('Invite sent successfully')
      setInviteEmail('')
      setShowInviteForm(false)
      // Refresh the project data to show new invite
      window.location.reload()
    } catch (error: any) {
      console.error('Failed to send invite:', error)
      toast.error(error.response?.data?.error || 'Failed to send invite')
    } finally {
      setSendingInvite(false)
    }
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
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-white">Project Members</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <div className="text-sm text-gray-400 mb-3">
          {users.length} active • {allMembers.length} total
        </div>

        {/* Invite Button */}
        <button
          onClick={() => setShowInviteForm(!showInviteForm)}
          className="w-full flex items-center justify-center space-x-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          <Plus className="h-4 w-4" />
          <span>Invite Member</span>
        </button>
      </div>

      {/* Invite Form */}
      {showInviteForm && (
        <div className="p-4 border-b border-editor-border bg-editor-bg">
          <form onSubmit={handleSendInvite} className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Email Address
              </label>
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="user@example.com"
                className="w-full px-3 py-2 bg-editor-sidebar border border-editor-border rounded text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Permission
              </label>
              <select
                value={invitePermission}
                onChange={(e) => setInvitePermission(e.target.value as 'view' | 'edit')}
                className="w-full px-3 py-2 bg-editor-sidebar border border-editor-border rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              >
                <option value="view">View Only</option>
                <option value="edit">Can Edit</option>
              </select>
            </div>

            <div className="flex space-x-2">
              <button
                type="button"
                onClick={() => setShowInviteForm(false)}
                className="flex-1 px-3 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors text-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={sendingInvite || !inviteEmail.trim()}
                className="flex-1 px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
              >
                {sendingInvite ? 'Sending...' : 'Send Invite'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Currently Active */}
      <div className="p-4 border-b border-editor-border">
        <h4 className="text-sm font-medium text-gray-300 mb-3">Currently Active</h4>
        {users.length === 0 ? (
          <p className="text-sm text-gray-500">No active users</p>
        ) : (
          <div className="space-y-2">
            {users.map((user) => {
              const member = allMembers.find(m => m.id === user.id)
              if (!member) return null
              
              return (
                <div key={user.id} className="flex items-center space-x-3 p-2 bg-editor-bg rounded">
                  <div className="relative">
                    {member.avatar ? (
                      <img
                        src={member.avatar}
                        alt={member.name}
                        className="h-8 w-8 rounded-full"
                      />
                    ) : (
                      <div className="h-8 w-8 bg-blue-600 rounded-full flex items-center justify-center">
                        <span className="text-xs text-white font-medium">
                          {member.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                    <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-editor-sidebar ${getStatusColor(user.id)}`} />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-white">{member.name}</p>
                    <p className="text-xs text-gray-400">{member.email}</p>
                  </div>
                  <div className="flex items-center space-x-1">
                    {getPermissionIcon(member.permission)}
                    <span className="text-xs text-gray-400">{getPermissionLabel(member.permission)}</span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* All Members */}
      <div className="flex-1 p-4 overflow-y-auto">
        <h4 className="text-sm font-medium text-gray-300 mb-3">All Members</h4>
        <div className="space-y-2">
          {allMembers.map((member) => (
            <div key={member.id} className="flex items-center space-x-3 p-2 bg-editor-bg rounded">
              <div className="relative">
                {member.avatar ? (
                  <img
                    src={member.avatar}
                    alt={member.name}
                    className="h-8 w-8 rounded-full"
                  />
                ) : (
                  <div className="h-8 w-8 bg-blue-600 rounded-full flex items-center justify-center">
                    <span className="text-xs text-white font-medium">
                      {member.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-editor-sidebar ${getStatusColor(member.id)}`} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-white">{member.name}</p>
                <p className="text-xs text-gray-400">{member.email}</p>
              </div>
              <div className="flex items-center space-x-1">
                {getPermissionIcon(member.permission)}
                <span className="text-xs text-gray-400">{getPermissionLabel(member.permission)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Pending Invites */}
      {project.invites && project.invites.length > 0 && (
        <div className="p-4 border-t border-editor-border">
          <h4 className="text-sm font-medium text-gray-300 mb-3">Pending Invites</h4>
          <div className="space-y-2">
            {project.invites
              .filter(invite => invite.status === 'pending')
              .map((invite) => (
                <div key={invite._id} className="flex items-center space-x-3 p-2 bg-editor-bg rounded">
                  <div className="h-8 w-8 bg-yellow-600 rounded-full flex items-center justify-center">
                    <Mail className="h-4 w-4 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-white">{invite.email}</p>
                    <p className="text-xs text-gray-400 flex items-center space-x-1">
                      <Clock className="h-3 w-3" />
                      <span>Pending</span>
                    </p>
                  </div>
                  <div className="flex items-center space-x-1">
                    {getPermissionIcon(invite.permission)}
                    <span className="text-xs text-gray-400">{getPermissionLabel(invite.permission)}</span>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="p-4 border-t border-editor-border text-xs text-gray-400">
        <div className="space-y-1">
          <div className="flex justify-between">
            <span>Owner:</span>
            <span>{project.owner.name}</span>
          </div>
          <div className="flex justify-between">
            <span>Editors:</span>
            <span>{project.members.filter(m => m.permission === 'edit').length}</span>
          </div>
          <div className="flex justify-between">
            <span>Viewers:</span>
            <span>{project.members.filter(m => m.permission === 'view').length}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
