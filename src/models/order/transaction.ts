import { Schema, model } from 'mongoose';
import Transaction from '@edugram/types/order/transaction';

const TransactionSchema: Schema = new Schema<Transaction>(
  {
    user: {
      type: String,
      ref: 'User',
    },
    userDetails: {
      first_name: {
        type: String,
      },
      last_name: {
        type: String,
      },
      email: {
        type: String,
      },
    },
    amount: {
      type: Number,
    },
    discount: {
      type: Number,
    },
    status: {
      type: String,
      enum: ['pending', 'success', 'failed'],
      default: 'pending',
    },
    coupons: {
      type: [
        {
          type: Schema.Types.ObjectId,
          ref: 'Coupon',
        },
      ],
    },
    items: {
      type: [
        {
          type: Object,
        },
      ],
    },
    discounts: {
      type: [
        {
          type: Schema.Types.ObjectId,
          ref: 'Pricing_Policy',
        },
      ],
    },
    itemType: {
      type: String,
      required: true,
      enum: ['Course'],
    },
    gatewayId: {
      type: String,
    },
    orderId: {
      type: Schema.Types.ObjectId,
      ref: 'Order',
    },
  },
  { timestamps: true },
);
TransactionSchema.set('toJSON', { virtuals: true });

export default model<Transaction>('Transaction', TransactionSchema);
