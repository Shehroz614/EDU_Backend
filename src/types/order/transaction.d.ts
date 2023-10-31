import { Document } from 'mongoose';
import Order from '@edugram/types/order/index';
import PricingPolicy from '@edugram/types/pricingPolicy';
import User from '../user';
import Coupon from './coupon';
import Course from '../course';

interface Transaction extends Document {
  user: User[_id];
  userDetails: {
    first_name: string;
    last_name: string;
    email: string;
  };
  amount: number;
  discount: number;
  status: 'pending' | 'success' | 'failed';
  coupons: Coupon[_id][];
  items: Object[];
  discounts: PricingPolicy[_id][];
  itemType: 'Course';
  gatewayId: string;
  orderId: Order[_id];
}
export default Transaction;
