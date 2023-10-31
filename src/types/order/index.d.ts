import { Document } from 'mongoose';
import Gift from '@edugram/types/order/gift';
import Transaction from './transaction';
import Course from '../course';
import User from '../user';

interface Order extends Document {
  user: User[_id];
  isGuest: boolean;
  userDetails: {
    first_name: string;
    last_name: string;
    email: string;
  };
  transactions: Transaction[_id][];
  status: 'success' | 'pending' | 'failed';
  items: Course[_id][];
  itemType: 'Course';
  giftDetails: {
    giftId?: Gift[_id];
    message: string;
    isAnonymous: boolean;
    senderDetails: {
      name: string;
      email: string;
    };
    recipientDetails: {
      name: string;
      email: string;
    };
    scheduled: boolean;
    scheduledAt: Date;
  };
  createdAt?: Date;
}
export default Order;
