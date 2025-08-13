import express from 'express'
import { auth, AuthRequest } from '../middleware/auth'
import { Project, IProject, IProjectInvite } from '../models/Project'
import { User, IUser } from '../models/User'
import mongoose from 'mongoose'

const router = express.Router()

// Get all projects for user (owned + member of)
router.get('/', auth, async (req: AuthRequest, res) => {
  try {
    const userUid = req.user!.uid

    // Find user by Firebase UID
    const user = await User.findOne({ firebaseUid: userUid }) as IUser | null
    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    // Find projects where user is owner or member
    const projects = await Project.find({
      $or: [
        { owner: user._id },
        { 'members.user': user._id }
      ]
    })
    .populate('owner', 'name email avatar')
    .populate('members.user', 'name email avatar')
    .sort({ updatedAt: -1 })

    res.json({ success: true, projects })
  } catch (error) {
    console.error('Get projects error:', error)
    res.status(500).json({ error: 'Failed to fetch projects' })
  }
})

// Get user's invites
router.get('/invites', auth, async (req: AuthRequest, res) => {
  try {
    const userEmail = req.user!.email

    const projects = await Project.find({
      'invites.email': userEmail,
      'invites.status': 'pending'
    })
    .populate('owner', 'name email avatar')
    .populate('invites.invitedBy', 'name email avatar')

    const invites = projects.flatMap(project => 
      project.invites
        .filter(invite => invite.email === userEmail && invite.status === 'pending')
        .map(invite => ({
          id: invite._id,
          projectId: project._id,
          projectName: project.name,
          projectDescription: project.description,
          permission: invite.permission,
          invitedBy: invite.invitedBy,
          invitedAt: invite.invitedAt,
          owner: project.owner
        }))
    )

    res.json({ success: true, invites })
  } catch (error) {
    console.error('Get invites error:', error)
    res.status(500).json({ error: 'Failed to fetch invites' })
  }
})

// Create new project
router.post('/', auth, async (req: AuthRequest, res) => {
  try {
    const { name, description, isPublic } = req.body
    const userUid = req.user!.uid

    // Find user by Firebase UID
    const user = await User.findOne({ firebaseUid: userUid }) as IUser | null
    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    const project = new Project({
      name,
      description,
      owner: user._id,
      isPublic: isPublic || false,
      members: [],
      invites: [],
      files: [{
        name: 'index.js',
        path: '/index.js',
        content: '// Welcome to your new project!\nconsole.log("Hello, World!");\n',
        language: 'javascript'
      }]
    })

    await project.save()
    await project.populate('owner', 'name email avatar')

    res.status(201).json({ success: true, project })
  } catch (error) {
    console.error('Create project error:', error)
    res.status(500).json({ error: 'Failed to create project' })
  }
})

// Get specific project
router.get('/:projectId', auth, async (req: AuthRequest, res) => {
  try {
    const { projectId } = req.params
    const userUid = req.user!.uid

    // Find user by Firebase UID
    const user = await User.findOne({ firebaseUid: userUid }) as IUser | null
    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    const project = await Project.findOne({
      _id: projectId,
      $or: [
        { owner: user._id },
        { 'members.user': user._id },
        { isPublic: true }
      ]
    })
    .populate('owner', 'name email avatar')
    .populate('members.user', 'name email avatar')

    if (!project) {
      return res.status(404).json({ error: 'Project not found or access denied' })
    }

    // Check user permission
    const isOwner = project.owner._id.toString() === user._id.toString()
    const member = project.members.find(m => m.user._id.toString() === user._id.toString())
    const permission = isOwner ? 'edit' : member?.permission || 'view'

    res.json({ 
      success: true, 
      project: {
        ...project.toObject(),
        userPermission: permission
      }
    })
  } catch (error) {
    console.error('Get project error:', error)
    res.status(500).json({ error: 'Failed to fetch project' })
  }
})

// Invite user to project
router.post('/:projectId/invite', auth, async (req: AuthRequest, res) => {
  try {
    const { projectId } = req.params
    const { email, permission } = req.body
    const userUid = req.user!.uid

    // Find user by Firebase UID
    const user = await User.findOne({ firebaseUid: userUid }) as IUser | null
    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    const project = await Project.findOne({
      _id: projectId,
      owner: user._id
    })

    if (!project) {
      return res.status(404).json({ error: 'Project not found or access denied' })
    }

    // Check if user is already a member
    const existingMember = project.members.find(m => 
      m.user.toString() === user._id.toString()
    )
    
    if (existingMember) {
      return res.status(400).json({ error: 'User is already a member of this project' })
    }

    // Check if invite already exists
    const existingInvite = project.invites.find(invite => 
      invite.email === email && invite.status === 'pending'
    )
    
    if (existingInvite) {
      return res.status(400).json({ error: 'Invite already exists for this user' })
    }

    // Add invite
    project.invites.push({
      email,
      permission: permission || 'view',
      invitedBy: user._id,
      invitedAt: new Date(),
      status: 'pending'
    })

    await project.save()
    res.json({ success: true, message: 'Invite sent successfully' })
  } catch (error) {
    console.error('Send invite error:', error)
    res.status(500).json({ error: 'Failed to send invite' })
  }
})

// Accept/decline invite
router.post('/invites/:inviteId/:action', auth, async (req: AuthRequest, res) => {
  try {
    const { inviteId, action } = req.params
    const userEmail = req.user!.email
    const userUid = req.user!.uid

    // Find user by Firebase UID
    const user = await User.findOne({ firebaseUid: userUid }) as IUser | null
    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    if (!['accept', 'decline'].includes(action)) {
      return res.status(400).json({ error: 'Invalid action' })
    }

    const project = await Project.findOne({
      'invites._id': inviteId,
      'invites.email': userEmail,
      'invites.status': 'pending'
    })

    if (!project) {
      return res.status(404).json({ error: 'Invite not found' })
    }

    const invite = project.invites.find(inv => inv._id.toString() === inviteId)
    if (!invite) {
      return res.status(404).json({ error: 'Invite not found' })
    }

    if (action === 'accept') {
      // Add user to members
      project.members.push({
        user: user._id,
        permission: invite.permission,
        joinedAt: new Date()
      })
    }

    // Update invite status
    invite.status = action === 'accept' ? 'accepted' : 'declined'
    
    // Remove invite
    project.invites = project.invites.filter(inv => inv._id.toString() !== inviteId)

    await project.save()
    res.json({ success: true, message: `Invite ${action}ed successfully` })
  } catch (error) {
    console.error('Handle invite error:', error)
    res.status(500).json({ error: 'Failed to handle invite' })
  }
})

// Update project file
router.put('/:projectId/files/:filePath(*)', auth, async (req: AuthRequest, res) => {
  try {
    const { projectId, filePath } = req.params
    const { content, language } = req.body
    const userUid = req.user!.uid

    // Find user by Firebase UID
    const user = await User.findOne({ firebaseUid: userUid }) as IUser | null
    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    const project = await Project.findOne({
      _id: projectId,
      $or: [
        { owner: user._id },
        { 'members.user': user._id }
      ]
    })

    if (!project) {
      return res.status(404).json({ error: 'Project not found or access denied' })
    }

    // Check if user has edit permission
    const isOwner = project.owner.toString() === user._id.toString()
    const member = project.members.find(m => m.user.toString() === user._id.toString())
    const hasEditPermission = isOwner || member?.permission === 'edit'

    if (!hasEditPermission) {
      return res.status(403).json({ error: 'Edit permission required' })
    }

    // Find and update file
    const fileIndex = project.files.findIndex(f => f.path === filePath)
    if (fileIndex === -1) {
      return res.status(404).json({ error: 'File not found' })
    }

    project.files[fileIndex].content = content
    if (language) {
      project.files[fileIndex].language = language
    }
    project.files[fileIndex].updatedAt = new Date()

    await project.save()
    res.json({ success: true, message: 'File updated successfully' })
  } catch (error) {
    console.error('Update file error:', error)
    res.status(500).json({ error: 'Failed to update file' })
  }
})

export default router
