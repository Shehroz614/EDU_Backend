import { Document } from 'mongoose';
import User from '@edugram/types/user';

interface Announcement extends Document {
  description: string;
  actionLink?: string;
  isClosable: boolean;
  isActive: boolean;
  createdBy: User[_id];
}
export default Announcement;
