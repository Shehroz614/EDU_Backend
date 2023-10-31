import { Schema, model } from 'mongoose';
import LectureProgress from '@edugram/types/course/progress/lecture';

const LectureProgressSchema: Schema = new Schema<LectureProgress>(
  {
    // time watched
    watchTime: {
      type: Number,
      default: 0,
    },
    done: {
      type: Boolean,
      default: false,
    },
    courseId: {
      type: Schema.Types.ObjectId,
      ref: 'Course',
    },
    lectureId: {
      type: Schema.Types.ObjectId,
      ref: 'Lecture',
    },
    user: {
      type: String,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  },
);
LectureProgressSchema.set('toJSON', { virtuals: true });

export default model<LectureProgress>('Lecture_progress', LectureProgressSchema);
