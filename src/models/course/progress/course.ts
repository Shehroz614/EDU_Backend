import { Schema, model } from 'mongoose';
import CourseProgress from '@edugram/types/course/progress/course';

const CourseProgressSchema: Schema = new Schema<CourseProgress>(
  {
    lastLectureId: {
      type: Schema.Types.ObjectId,
      ref: 'Lecture',
    },
    courseId: {
      type: Schema.Types.ObjectId,
      ref: 'Course',
      required: true,
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

CourseProgressSchema.set('toJSON', {
  virtuals: true,
});

export default model<CourseProgress>('Course_progress', CourseProgressSchema);
