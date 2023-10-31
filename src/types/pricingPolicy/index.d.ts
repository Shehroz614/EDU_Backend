import { Document } from 'mongoose';
import User from '@edugram/types/user';
import Course from '@edugram/types/course';

interface PricingPolicy extends Document {
  code: string;
  type: 'smartPrice' | 'discount' | 'override';
  valueType: 'fixed' | 'percentage';
  value: number;
  initialValue?: number;
  courses?: Course[_id][];
  excludedCourses?: Course[_id][];
  courseTargetMode?: 'Version' | 'Course';
  targetCourseVersion?: number[];
  users?: User[_id][];
  excludedUsers?: User[_id][];
  isAutoApplicable: boolean;
  isActive: boolean;
  allowGlobalDiscounts: boolean;
  allowCourseDiscounts: boolean;
  allowDiscountsForGifts: boolean;
  showOriginalPrice: boolean;
  maxUsage: number | null;
  startDate?: Date;
  expiryDate?: Date;
  createdBy: User[_id];
}
export default PricingPolicy;
