import { Document } from 'mongoose';
import User from '@edugram/types/user';
import Course from '@edugram/types/course';
import Order from '@edugram/types/order/index';

interface Gift extends Document {
  code: string;
  message: string;
  scheduled: boolean;
  scheduledAt: Date;
  sender: User[_id];
  senderIsGuest: boolean;
  senderDetails: {
    email: String;
    name: String;
  };
  isAnonymous: boolean;
  recipient: {
    email: String;
    name: String;
  };
  items: Course[_id][];
  itemType: 'Course';
  orderId: Order[_id];
  redeemedBy: User[_id];
  redeemedAt?: Date;
}
export default Gift;
