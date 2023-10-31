import { Schema, model } from 'mongoose';
import UserVerificationRequest from '@edugram/types/user/userVerificationRequest';

const UserVerificationRequestSchema: Schema = new Schema<UserVerificationRequest>(
  {
    user: {
      type: String,
      ref: 'User',
      required: [true, '`{PATH}` is required'],
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    verifiedBy: {
      type: String,
      ref: 'User',
    },
    verifiedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);
UserVerificationRequestSchema.set('toJSON', {
  virtuals: true,
});
export default model<UserVerificationRequest>('User_Verification_Request', UserVerificationRequestSchema);
