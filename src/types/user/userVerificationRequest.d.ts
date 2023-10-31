import { Document } from 'mongoose';
import User from '@edugram/types/user/index';

interface UserVerificationRequest extends Document {
  user: User[_id];
  isVerified: boolean;
  verifiedBy: User[_id];
  verifiedAt: Date | null;
  createdAt: Date;
  updateAt: Date;
}
export default UserVerificationRequest;
