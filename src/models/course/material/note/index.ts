import { Schema, model } from 'mongoose';
import Note from '@edugram/types/course/material/note/note';
import limits from '@constants/limits';

const NoteSchema: Schema = new Schema<Note>(
  {
    title: {
      type: String,
      canUserEdit: true,
      set(value: string) {
        return value.replace(/\s+/g, ' ').trim();
      },
      required: [true, 'Note title is required'],
      maxlength: [limits.course.note.title.max, '{PATH} cannot be above {MAXLENGTH} characters'],
    },
    description: {
      type: String,
      maxlength: [limits.course.note.description.max, '{PATH} cannot be above {MAXLENGTH} characters'],
    },
    courseId: {
      type: Schema.Types.ObjectId,
      ref: 'Course',
      required: [true, 'Course Id is required'],
      immutable: true,
      select: false,
    },
    lectureId: {
      type: Schema.Types.ObjectId,
      ref: 'Lecture',
      required: [true, 'Lecture ID is required'],
      immutable: true,
      select: true,
    },
    user: {
      type: String,
      ref: 'User',
      required: [true, 'User is required'],
      immutable: true,
    },
  },
  {
    timestamps: true,
  },
);

export default model<Note>('Note', NoteSchema);
