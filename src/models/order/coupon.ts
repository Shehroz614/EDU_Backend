import { Schema, model } from 'mongoose';
import { isDateNotMoreThanNMonthsInFuture } from '@helpers/index';
import { COUPON_CODE_MIN_LIMIT, COUPON_CODE_MAX_LIMIT, COUPON_CODE_MONTH_LIMIT } from '@constants/index';
import Coupon from '@edugram/types/order/coupon';

const CouponSchema: Schema = new Schema<Coupon>(
  {
    code: {
      type: String,
      required: [true, 'Coupon code cannot be empty'],
      set(value: string) {
        return value.replace(/\s+/g, ' ').trim().toLowerCase();
      },
      minLength: [COUPON_CODE_MIN_LIMIT, `Coupon code must be at-least ${COUPON_CODE_MIN_LIMIT} characters long`],
      maxLength: [COUPON_CODE_MAX_LIMIT, `Coupon code cannot be more than ${COUPON_CODE_MAX_LIMIT} characters long`],
      validate: {
        validator(v: string) {
          // eslint-disable-next-line no-useless-escape
          return /[`!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~]/.test(v);
        },
        message: 'Invalid Coupon code format',
      },
    },
    discount: {
      type: Number,
      min: 1,
      required: [true, 'Coupon discount value cannot be empty'],
    },
    type: {
      type: String,
      enum: ['fixed', 'percentage'],
      default: 'fixed',
    },
    expiry: {
      type: Date,
      required: [true, 'Coupon expiry value cannot be empty'],
      validate: {
        validator(v: string) {
          return isDateNotMoreThanNMonthsInFuture(v, COUPON_CODE_MONTH_LIMIT);
        },
        message: `Coupon code's max validity cannot be more than ${COUPON_CODE_MONTH_LIMIT} months`,
      },
    },
    course: {
      type: Schema.Types.ObjectId,
      ref: 'Course',
    },
    users: {
      type: [
        {
          type: Schema.Types.ObjectId,
          ref: 'User',
        },
      ],
    },
  },
  { timestamps: true },
);
CouponSchema.set('toJSON', { virtuals: true });

export default model<Coupon>('Coupon', CouponSchema);
