import { Schema, model } from 'mongoose';
import Announcement from '@edugram/types/announcement';

const AnnouncementSchema: Schema = new Schema<Announcement>(
  {
    description: {
      type: String,
      required: [true, '`{PATH}` is required'],
    },
    actionLink: {
      type: String,
    },
    isClosable: {
      type: Boolean,
      default: true,
    },
    isActive: {
      type: Boolean,
      default: false,
    },
    createdBy: {
      type: String,
      ref: 'User',
    },
  },
  { timestamps: true },
);

AnnouncementSchema.set('toJSON', {
  virtuals: true,
});

export default model<Announcement>('Announcement', AnnouncementSchema);
