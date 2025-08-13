import express from 'express'
import { authenticateToken, AuthRequest } from '../middleware/auth'
import { Project, IProject, IProjectInvite } from '../models/Project'
import { User } from '../models/User'
import mongoose from 'mongoose'

const router = express.Router()

// Get all projects for user (owned + member of)
router.get('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!._id

    // Find projects where user is owner or member
    const projects = await Project.find({
      $or: [
        { owner: userId },
        { 'members.user': userId }
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
router.get('/invites', authenticateToken, async (req: AuthRequest, res) => {
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
router.post('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { name, description, isPublic } = req.body
    const userId = req.user!._id

    const project = new Project({
      name,
      description,
      owner: userId,
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
router.get('/:projectId', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { projectId } = req.params
    const userId = req.user!._id

    const project = await Project.findOne({
      _id: projectId,
      $or: [
        { owner: userId },
        { 'members.user': userId },
        { isPublic: true }
      ]
    })
    .populate('owner', 'name email avatar')
    .populate('members.user', 'name email avatar')

    if (!project) {
      return res.status(404).json({ error: 'Project not found or access denied' })
    }

    // Check user permission
    const isOwner = project.owner._id.toString() === userId.toString()
    const member = project.members.find(m => m.user._id.toString() === userId.toString())
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
router.post('/:projectId/invite', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { projectId } = req.params
    const { email, permission } = req.body
    const userId = req.user!._id

    const project = await Project.findOne({
      _id: projectId,
      owner: userId
    })

    if (!project) {
      return res.status(404).json({ error: 'Project not found or not authorized' })
    }

    // Check if user is already a member
    const existingMember = project.members.find(m => 
      m.user.toString() === userId.toString()
    )
    
    // Check if invite already exists
    const existingInvite = project.invites.find(i => 
      i.email === email && i.status === 'pending'
    )

    if (existingMember) {
      return res.status(400).json({ error: 'User is already a member' })
    }

    if (existingInvite) {
      return res.status(400).json({ error: 'Invite already sent' })
    }

    const invite: IProjectInvite = {
      email,
      permission: permission || 'view',
      invitedBy: userId,
      invitedAt: new Date(),
      status: 'pending'
    }

    project.invites.push(invite)
    await project.save()

    res.json({ success: true, message: 'Invite sent successfully' })
  } catch (error) {
    console.error('Invite user error:', error)
    res.status(500).json({ error: 'Failed to send invite' })
  }
})

// Accept/decline invite
router.post('/invites/:inviteId/:action', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { inviteId, action } = req.params
    const userEmail = req.user!.email
    const userId = req.user!._id

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

    const invite = project.invites.id(inviteId)
    if (!invite) {
      return res.status(404).json({ error: 'Invite not found' })
    }

    if (action === 'accept') {
      // Add user to members
      project.members.push({
        user: userId,
        permission: invite.permission,
        joinedAt: new Date()
      })
      invite.status = 'accepted'
    } else {
      invite.status = 'declined'
    }

    await project.save()

    res.json({ 
      success: true, 
      message: `Invite ${action}ed successfully` 
    })
  } catch (error) {
    console.error('Handle invite error:', error)
    res.status(500).json({ error: 'Failed to handle invite' })
  }
})

// Update project file
router.put('/:projectId/files/:filePath(*)', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { projectId, filePath } = req.params
    const { content, language } = req.body
    const userId = req.user!._id

    const project = await Project.findOne({
      _id: projectId,
      $or: [
        { owner: userId },
        { 'members.user': userId }
      ]
    })

    if (!project) {
      return res.status(404).json({ error: 'Project not found' })
    }

    // Check if user has edit permission
    const isOwner = project.owner.toString() === userId.toString()
    const member = project.members.find(m => m.user.toString() === userId.toString())
    const hasEditPermission = isOwner || member?.permission === 'edit'

    if (!hasEditPermission) {
      return res.status(403).json({ error: 'Edit permission required' })
    }

    const decodedPath = `/${filePath}`
    let file = project.files.find(f => f.path === decodedPath)

    if (file) {
      file.content = content
      if (language) file.language = language
      file.updatedAt = new Date()
    } else {
      // Create new file
      project.files.push({
        name: filePath.split('/').pop() || 'untitled',
        path: decodedPath,
        content,
        language: language || 'javascript',
        createdAt: new Date(),
        updatedAt: new Date()
      })
    }

    await project.save()

    res.json({ success: true, message: 'File updated successfully' })
  } catch (error) {
    console.error('Update file error:', error)
    res.status(500).json({ error: 'Failed to update file' })
  }
})

export default router
