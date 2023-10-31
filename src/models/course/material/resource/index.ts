import { Schema, model } from 'mongoose';
import Resource from '@edugram/types/course/material/resource';

const schema: Schema = new Schema<Resource>(
  {
    key: {
      type: String,
      select: false,
    },
    name: {
      type: String,
    },
    lectures: {
      type: [
        {
          type: Schema.Types.ObjectId,
        },
      ],
      select: false,
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
export default model<Resource>('Resource', schema);
