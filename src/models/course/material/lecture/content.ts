import { Schema, model } from 'mongoose';
import LectureContent from '@edugram/types/course/material/lecture/content';
import course from '../../index';

const LectureContentSchema: Schema = new Schema<LectureContent>(
  {
    content: {
      type: String,
      select: false,
    },
    name: {
      type: String,
      required: [true, 'Lecture name/title is required'],
    },
    type: {
      type: String,
      enum: {
        values: ['video', 'text', 'test'],
        message: 'Invalid Content type',
      },
      required: true,
    },
    // todo - revisit select
    public: {
      url: {
        type: String,
        select: true,
      },
      is_public: {
        type: Boolean,
        default: false,
        // select: false,
      },
      // select: false,
    },
    duration: {
      type: Number,
      default: 0,
    },
    course: {
      type: Schema.Types.ObjectId,
      ref: 'Course',
      required: true,
      select: false,
    },
    author: {
      type: String,
      ref: 'User',
      required: true,
      select: false,
    },
  },
  {
    timestamps: true,
  },
);

export default model<LectureContent>('Lecture_content', LectureContentSchema);
