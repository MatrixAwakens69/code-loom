import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
  firebaseUid: string;
  email: string;
  name: string;
  avatar?: string;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>({
  firebaseUid: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  avatar: {
    type: String,
    default: undefined
  }
}, {
  timestamps: true
});

// Create index for faster queries
userSchema.index({ firebaseUid: 1 });
userSchema.index({ email: 1 });

export const User = mongoose.model<IUser>('User', userSchema);
