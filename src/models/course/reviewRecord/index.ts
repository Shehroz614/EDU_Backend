import { Schema, model } from 'mongoose';
import ReviewRecord from '@edugram/types/course/reviewRecord';

const schema: Schema = new Schema<ReviewRecord>(
  {
    course: {
      type: Schema.Types.ObjectId,
      ref: 'Course',
      required: true,
    },
    version: {
      type: Number,
      required: true,
    },
    reviewNote: {
      type: String,
      required: true,
    },
    contactEmail: {
      type: String,
      required: true,
    },
    authorId: {
      type: String,
      ref: 'User',
      required: true,
    },
    completed: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ['pendingReview', 'inReview', 'rejected', 'approved', 'released', 'cancelled'],
      default: 'pendingReview',
    },
    comment: {
      type: String,
      default: null,
    },
    reviewerId: {
      type: String,
      ref: 'User',
      default: null,
    },
  },
  { timestamps: true },
);

export default model<ReviewRecord>('Review_record', schema);
