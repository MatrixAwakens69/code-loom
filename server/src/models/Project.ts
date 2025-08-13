import mongoose, { Document, Schema } from 'mongoose'

export interface IProjectMember {
  user: mongoose.Types.ObjectId
  permission: 'view' | 'edit'
  joinedAt: Date
}

export interface IProjectInvite {
  email: string
  permission: 'view' | 'edit'
  invitedBy: mongoose.Types.ObjectId
  invitedAt: Date
  status: 'pending' | 'accepted' | 'declined'
}

export interface IProjectFile {
  name: string
  path: string
  content: string
  language: string
  createdAt: Date
  updatedAt: Date
}

export interface IProject extends Document {
  name: string
  description?: string
  owner: mongoose.Types.ObjectId
  members: IProjectMember[]
  invites: IProjectInvite[]
  files: IProjectFile[]
  isPublic: boolean
  createdAt: Date
  updatedAt: Date
}

const projectMemberSchema = new Schema<IProjectMember>({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  permission: {
    type: String,
    enum: ['view', 'edit'],
    default: 'view'
  },
  joinedAt: {
    type: Date,
    default: Date.now
  }
})

const projectInviteSchema = new Schema<IProjectInvite>({
  email: {
    type: String,
    required: true
  },
  permission: {
    type: String,
    enum: ['view', 'edit'],
    default: 'view'
  },
  invitedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  invitedAt: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'declined'],
    default: 'pending'
  }
})

const projectFileSchema = new Schema<IProjectFile>({
  name: {
    type: String,
    required: true
  },
  path: {
    type: String,
    required: true
  },
  content: {
    type: String,
    default: ''
  },
  language: {
    type: String,
    default: 'javascript'
  }
}, {
  timestamps: true
})

const projectSchema = new Schema<IProject>({
  name: {
    type: String,
    required: true
  },
  description: {
    type: String
  },
  owner: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  members: [projectMemberSchema],
  invites: [projectInviteSchema],
  files: [projectFileSchema],
  isPublic: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
})

export const Project = mongoose.model<IProject>('Project', projectSchema)
