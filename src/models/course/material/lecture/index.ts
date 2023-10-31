import { Schema, Model } from 'mongoose';
import { COURSE_LECTURE_TITLE_LIMIT } from '@constants/index';
import Lecture from '@edugram/types/course/material/lecture';

interface LectureModel extends Model<Lecture> {
  normalizeDataForPatch(): Object;
}

const LectureSchema = new Schema<Lecture, LectureModel>({
  title: {
    type: String,
    canUserEdit: true,
    required: [true, 'Lecture title is required'],
    maxLength: [COURSE_LECTURE_TITLE_LIMIT, '{PATH} cannot be above {MAXLENGTH} characters'],
    set(value: string) {
      return value.replace(/\s+/g, ' ').trim();
    },
  },
  content: {
    type: Schema.Types.ObjectId,
    ref: 'Lecture_content',
  },
  resources: {
    type: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Resource',
      },
    ],
    select: false,
  },
  preview: {
    type: Boolean,
    default: false,
    canUserEdit: true,
  },
});
LectureSchema.set('toJSON', { virtuals: true });
LectureSchema.statics = {
  normalizeDataForPatch() {
    // check each field name because some field user cant edit
    // Object.keys(patch).forEach((fieldName) => {
    //   if (!lectureSchema.tree[fieldName]?.canUserEdit == true) {
    //     // delete fiedls which absent in our schema and which user cant edit
    //     delete patch[fieldName];
    //   }
    // });
    // return patch;
  },
};

export default LectureSchema;
