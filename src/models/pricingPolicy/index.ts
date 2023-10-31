import { Schema, model } from 'mongoose';
import PricingPolicy from '@edugram/types/pricingPolicy';
import limits from '@constants/limits';
import { isDateNotMoreThanNMonthsInFuture } from '@helpers/index';

const PricingPolicySchema: Schema = new Schema<PricingPolicy>(
  {
    code: {
      type: String,
      required: [true, '{PATH} is required'],
      set(value: string) {
        return value.replace(/\s+/g, ' ').trim();
      },
      validate: {
        validator(v: string) {
          // @ts-ignore
          if (this.type === 'discount') {
            // eslint-disable-next-line no-useless-escape
            return /(?=[A-Za-z0-9@#$%^&+!=]+$)^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[@#$%^&+!=])(?=.{6,}).*$/.test(v);
          }
          return true;
        },
        message: 'Invalid Coupon code format',
      },
    },
    type: {
      type: String,
      enum: ['smartPrice', 'discount', 'override'],
      required: [true, '{PATH} is required'],
    },
    valueType: {
      type: String,
      enum: ['fixed', 'percentage'],
      default: 'fixed',
      required: [true, '{PATH} is required'],
    },
    value: {
      type: Number,
      required: [true, '{PATH} is required'],
      min: [limits.pricingPolicy.value.min, '{PATH} cannot be below {MIN} characters'],
    },
    initialValue: {
      type: Number,
      min: [limits.pricingPolicy.value.min, '{PATH} cannot be below {MIN} characters'],
    },
    courses: {
      type: [
        {
          type: Schema.Types.ObjectId,
          ref: 'Course',
        },
      ],
    },
    excludedCourses: {
      type: [
        {
          type: Schema.Types.ObjectId,
          ref: 'Course',
        },
      ],
    },
    courseTargetMode: {
      type: String,
      enum: ['Version', 'Course'],
      required: [true, '{PATH} is required'],
      default: 'Version',
    },
    targetCourseVersion: {
      type: [{ type: Number }],
    },
    users: {
      type: [
        {
          type: Schema.Types.ObjectId,
          ref: 'User',
        },
      ],
    },
    excludedUsers: {
      type: [
        {
          type: Schema.Types.ObjectId,
          ref: 'User',
        },
      ],
    },
    isAutoApplicable: {
      type: Boolean,
      default: false,
      required: [true, '{PATH} is required'],
    },
    isActive: {
      type: Boolean,
      default: true,
      required: [true, '{PATH} is required'],
    },
    allowGlobalDiscounts: {
      type: Boolean,
    },
    allowCourseDiscounts: {
      type: Boolean,
    },
    allowDiscountsForGifts: {
      type: Boolean,
    },
    showOriginalPrice: {
      type: Boolean,
      default: true,
    },
    maxUsage: {
      type: Number,
      default: null,
    },
    startDate: {
      type: Date,
      required: [true, '{PATH} is required'],
      validate: {
        validator(v: string): boolean {
          // @ts-ignore
          return new Date(this.expiryDate) >= new Date(v);
        },
        message: '{PATH} cannot be in the future than Expiry Date',
      },
    },
    expiryDate: {
      type: Date,
      required: [true, '{PATH} is required'],
      validate: {
        validator(v: string): boolean {
          return isDateNotMoreThanNMonthsInFuture(v, limits.pricingPolicy.expiryDate.limit.max);
        },
        message: `{PATH} cannot be more than ${limits.pricingPolicy.expiryDate.limit.max} months`,
      },
    },
    createdBy: {
      type: String,
      ref: 'User',
    },
  },
  { timestamps: true },
);
PricingPolicySchema.set('toJSON', {
  virtuals: true,
});
export default model<PricingPolicy>('Pricing_Policy', PricingPolicySchema);
