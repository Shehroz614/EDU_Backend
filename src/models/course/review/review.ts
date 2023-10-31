import { Schema, model } from 'mongoose';
import Review from '@edugram/types/course/review/review';

const ReviewSchema: Schema = new Schema<Review>(
  {
    title: {
      type: String,
      trim: true,
      canUserEdit: true,
    },
    review: {
      type: String,
      canUserEdit: true,
    },
    likes: [
      {
        type: String,
        ref: 'User',
      },
    ],
    dislikes: [
      {
        type: String,
        ref: 'User',
      },
    ],
    rating: {
      type: Number,
      required: true,
      canUserEdit: true,
      min: 1,
      max: 5,
    },
    course: {
      type: Schema.Types.ObjectId,
      ref: 'Course',
      required: true,
      immutable: true,
      select: false,
    },
    user: {
      type: String,
      ref: 'User',
      required: true,
      immutable: true,
    },
    responses: {
      type: [
        {
          user: {
            type: String,
            ref: 'User',
            required: true,
          },
          response: {
            type: String,
            required: true,
          },
        },
      ],
    },
  },
  {
    timestamps: true,
  },
);

ReviewSchema.index({ author: 1, course: 1 }, { unique: true });
ReviewSchema.statics = {
  normalizeDataForPatch(patch) {
    Object.keys(patch).forEach((fieldName) => {
      // @ts-ignore
      if (!ReviewSchema.tree[fieldName]?.canUserEdit) {
        delete patch[fieldName];
      }
    });

    return patch;
  },
};
ReviewSchema.set('toJSON', { virtuals: true });

export default model('Review', ReviewSchema);
