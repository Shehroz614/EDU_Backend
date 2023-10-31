import { Document } from 'mongoose';
import Course from '../course';
import User from '../user';

interface Coupon extends Document {
  code: string;
  discount: number;
  type: 'fixed' | 'percentage';
  expiry?: Date;
  course?: Course[_id][];
  users?: User[_id][];
}
export default Coupon;
