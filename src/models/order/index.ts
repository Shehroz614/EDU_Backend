import { Schema, model, Types } from 'mongoose';
import Order from '@edugram/types/order';

const OrderSchema: Schema = new Schema<Order>(
  {
    user: {
      type: String,
      ref: 'User',
    },
    isGuest: {
      type: Boolean,
      default: false,
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
    transactions: {
      type: [
        {
          type: Schema.Types.ObjectId,
          ref: 'Transaction',
        },
      ],
    },
    status: {
      type: String,
      enum: ['success', 'pending', 'failed'],
      default: 'pending',
    },
    items: {
      type: [
        {
          type: Types.ObjectId,
          refPath: 'itemType',
        },
      ],
      required: [true, 'Items are required'],
    },
    itemType: {
      type: String,
      required: [true, 'Item type is required'],
      enum: ['Course'],
    },
    giftDetails: {
      giftId: {
        type: Schema.Types.ObjectId,
        ref: 'Gift',
      },
      message: {
        type: String,
      },
      isAnonymous: {
        type: Boolean,
      },
      senderDetails: {
        name: {
          type: String,
        },
        email: {
          type: String,
        },
      },
      recipientDetails: {
        name: {
          type: String,
        },
        email: {
          type: String,
        },
      },
      scheduled: {
        type: Boolean,
      },
      scheduledAt: {
        type: Date,
      },
    },
  },
  { timestamps: true },
);
OrderSchema.set('toJSON', { virtuals: true });

export default model<Order>('Order', OrderSchema);
