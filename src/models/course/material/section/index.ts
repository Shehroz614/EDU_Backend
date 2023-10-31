import { Schema } from 'mongoose';
import LectureSchema from '@models/course/material/lecture';
import Section from '@edugram/types/course/material/section';
import limits from '@constants/limits';

const SectionSchema: Schema = new Schema<Section>(
  {
    title: {
      type: String,
      required: [true, 'Section title is required'],
      maxlength: [limits.course.section.title.max, '{PATH} cannot be above {MAXLENGTH} characters'],
      set(value: string) {
        return value.replace(/\s+/g, ' ').trim();
      },
    },
    description: {
      type: String,
      default: null,
      maxlength: [limits.course.section.description.max, '{PATH} cannot be above {MAXLENGTH} characters'],
    },
    lectures: [LectureSchema],
  },
  {
    strict: true,
  },
);
SectionSchema.set('toJSON', { virtuals: true });

export default SectionSchema;
