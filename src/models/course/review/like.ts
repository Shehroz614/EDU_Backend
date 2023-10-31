import { Schema, model } from 'mongoose';
import Like from '@edugram/types/course/review/like';

const LikeSchema: Schema = new Schema<Like>(
  {
    user: {
      type: String,
      ref: 'User',
      required: true,
    },
    review: {
      type: Schema.Types.ObjectId,
      ref: 'Review',
      required: true,
    },
  },
  {
    timestamps: true,
  },
);
LikeSchema.index({ user: 1, review: 1 }, { unique: true });
LikeSchema.set('toJSON', { virtuals: true });

export default model<Like>('Like', LikeSchema);
