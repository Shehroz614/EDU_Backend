import { Schema, model } from 'mongoose';
import Setting from '@edugram/types/setting';

const SettingSchema: Schema = new Schema<Setting>(
  {
    name: {
      type: String,
      required: [true, 'Setting name cannot be empty'],
    },
    value: {
      type: String,
      required: [true, 'Value cannot be empty'],
    },
    isPublic: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);
SettingSchema.set('toJSON', {
  virtuals: true,
});
export default model<Setting>('Setting', SettingSchema);
