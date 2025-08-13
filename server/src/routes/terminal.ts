import express from 'express'
import { spawn, ChildProcess } from 'child_process'
import { auth, AuthRequest } from '../middleware/auth'
import { Project } from '../models/Project'
import path from 'path'
import fs from 'fs'

const router = express.Router()

// Store running processes for each project
const projectProcesses = new Map<string, ChildProcess>()

// Execute command in terminal
router.post('/execute', auth, async (req: AuthRequest, res) => {
  try {
    const projectId = req.params.projectId
    const { command, cwd } = req.body
    const userUid = req.user!.uid

    // Verify user has access to project
    const project = await Project.findOne({
      _id: projectId,
      $or: [
        { owner: userUid },
        { 'members.user': userUid }
      ]
    })

    if (!project) {
      return res.status(404).json({ error: 'Project not found or access denied' })
    }

    // Stop any existing process for this project
    const existingProcess = projectProcesses.get(projectId)
    if (existingProcess) {
      existingProcess.kill('SIGTERM')
      projectProcesses.delete(projectId)
    }

    // Create project directory if it doesn't exist
    const projectDir = path.join(process.cwd(), 'projects', projectId)
    if (!fs.existsSync(projectDir)) {
      fs.mkdirSync(projectDir, { recursive: true })
    }

    // Execute command
    const childProcess = spawn(command, [], {
      cwd: cwd || projectDir,
      shell: true,
      stdio: ['pipe', 'pipe', 'pipe']
    })

    // Store process reference
    projectProcesses.set(projectId, childProcess)

    let output = ''
    let errorOutput = ''

    // Capture stdout
    childProcess.stdout?.on('data', (data) => {
      output += data.toString()
    })

    // Capture stderr
    childProcess.stderr?.on('data', (data) => {
      errorOutput += data.toString()
    })

    // Handle process completion
    childProcess.on('close', (code) => {
      projectProcesses.delete(projectId)
      
      const fullOutput = output + (errorOutput ? '\n' + errorOutput : '')
      const exitCode = code || 0
      
      // Get current working directory from the project directory
      const newCwd = projectDir
      
      res.json({
        success: true,
        output: fullOutput,
        exitCode,
        newCwd
      })
    })

    // Handle process errors
    childProcess.on('error', (error) => {
      projectProcesses.delete(projectId)
      res.status(500).json({
        success: false,
        error: `Failed to execute command: ${error.message}`,
        exitCode: 1
      })
    })

    // Set timeout for long-running commands
    setTimeout(() => {
      if (childProcess && !childProcess.killed) {
        childProcess.kill('SIGTERM')
        projectProcesses.delete(projectId)
        res.status(408).json({
          success: false,
          error: 'Command execution timed out',
          exitCode: 124
        })
      }
    }, 30000) // 30 second timeout

  } catch (error) {
    console.error('Terminal execute error:', error)
    res.status(500).json({ error: 'Failed to execute command' })
  }
})

// Stop running command
router.post('/stop', auth, async (req: AuthRequest, res) => {
  try {
    const projectId = req.params.projectId
    const userUid = req.user!.uid

    // Verify user has access to project
    const project = await Project.findOne({
      _id: projectId,
      $or: [
        { owner: userUid },
        { 'members.user': userUid }
      ]
    })

    if (!project) {
      return res.status(404).json({ error: 'Project not found or access denied' })
    }

    // Stop the process
    const childProcess = projectProcesses.get(projectId)
    if (childProcess) {
      childProcess.kill('SIGTERM')
      projectProcesses.delete(projectId)
      res.json({ success: true, message: 'Command stopped' })
    } else {
      res.json({ success: true, message: 'No running command to stop' })
    }

  } catch (error) {
    console.error('Terminal stop error:', error)
    res.status(500).json({ error: 'Failed to stop command' })
  }
})

// Get terminal status
router.get('/status', auth, async (req: AuthRequest, res) => {
  try {
    const projectId = req.params.projectId
    const userUid = req.user!.uid

    // Verify user has access to project
    const project = await Project.findOne({
      _id: projectId,
      $or: [
        { owner: userUid },
        { 'members.user': userUid }
      ]
    })

    if (!project) {
      return res.status(404).json({ error: 'Project not found or access denied' })
    }

    const isRunning = projectProcesses.has(projectId)
    const childProcess = projectProcesses.get(projectId)
    
    res.json({
      success: true,
      isRunning,
      pid: childProcess?.pid
    })

  } catch (error) {
    console.error('Terminal status error:', error)
    res.status(500).json({ error: 'Failed to get terminal status' })
  }
})

export default router
