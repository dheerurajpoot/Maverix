import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ILeaveType extends Document {
  name: string;
  description?: string;
  maxDays?: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const LeaveTypeSchema: Schema = new Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
    },
    description: {
      type: String,
    },
    maxDays: {
      type: Number,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Register the model, reusing existing if available
// In Next.js, we need to check if model exists to avoid OverwriteModelError
let LeaveType: Model<ILeaveType>;
try {
  // Try to get existing model first
  LeaveType = mongoose.models.LeaveType as Model<ILeaveType>;
  
  // If model doesn't exist, create it
  if (!LeaveType) {
    LeaveType = mongoose.model<ILeaveType>('LeaveType', LeaveTypeSchema);
  }
} catch (error) {
  // If there's an error (like schema mismatch), clear and recreate
  if (mongoose.models.LeaveType) {
    delete mongoose.models.LeaveType;
    if ((mongoose as any).modelSchemas && (mongoose as any).modelSchemas.LeaveType) {
      delete (mongoose as any).modelSchemas.LeaveType;
    }
  }
  LeaveType = mongoose.model<ILeaveType>('LeaveType', LeaveTypeSchema);
}

export default LeaveType;

