import mongoose, { Schema, Document, Model } from 'mongoose';
// Import LeaveType to ensure it's registered before Leave model uses it
import '@/models/LeaveType';

export interface ILeave extends Document {
  userId: mongoose.Types.ObjectId;
  leaveType: mongoose.Types.ObjectId; // Reference to LeaveType
  days: number; // Number of days
  remainingDays?: number; // Remaining days for allotted leaves (deducted when approved)
  carryForward?: boolean; // Whether this leave is carried forward from previous year
  startDate: Date;
  endDate: Date;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  approvedBy?: mongoose.Types.ObjectId;
  approvedAt?: Date;
  rejectionReason?: string;
  allottedBy?: mongoose.Types.ObjectId; // Admin/HR who allotted this leave
  allottedAt?: Date; // When the leave was allotted
  createdAt: Date;
  updatedAt: Date;
}

const LeaveSchema: Schema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    leaveType: {
      type: Schema.Types.ObjectId,
      ref: 'LeaveType',
      required: true,
    },
    days: {
      type: Number,
      required: true,
      min: 1,
    },
    remainingDays: {
      type: Number,
      min: 0,
    },
    carryForward: {
      type: Boolean,
      default: false,
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    reason: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    approvedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    approvedAt: {
      type: Date,
    },
    rejectionReason: {
      type: String,
    },
    allottedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    allottedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Force recompilation of the model to ensure schema changes take effect
// This is necessary when changing from enum to ObjectId reference
let Leave: Model<ILeave>;
if (mongoose.models.Leave) {
  // Delete the old model to force recompilation with new schema
  delete mongoose.models.Leave;
  // Only delete from modelSchemas if it exists
  if ((mongoose as any).modelSchemas && (mongoose as any).modelSchemas.Leave) {
    delete (mongoose as any).modelSchemas.Leave;
  }
}
Leave = mongoose.model<ILeave>('Leave', LeaveSchema);

export default Leave;

