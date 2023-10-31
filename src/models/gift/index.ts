import { Schema, model, Types } from 'mongoose';
import Gift from '@edugram/types/order/gift';

const GiftSchema: Schema = new Schema<Gift>(
  {
    code: {
      type: String,
      required: [true, 'Gift code is required'],
    },
    message: {
      type: String,
    },
    scheduled: {
      type: Boolean,
      default: false,
    },
    scheduledAt: {
      type: Date,
    },
    sender: {
      type: String,
      ref: 'User',
    },
    senderIsGuest: {
      type: Boolean,
      default: false,
    },
    senderDetails: {
      email: {
        type: String,
        required: [true, "Recipient's Email address is required"],
      },
      name: {
        type: String,
        required: [true, "Recipient's Name is required"],
      },
    },
    isAnonymous: {
      type: Boolean,
      default: false,
    },
    recipient: {
      email: {
        type: String,
        required: [true, "Recipient's Email address is required"],
      },
      name: {
        type: String,
        required: [true, "Recipient's Name is required"],
      },
    },
    items: {
      type: [
        {
          type: String,
          refPath: 'itemType',
        },
      ],
    },
    itemType: {
      type: String,
      required: true,
      enum: ['Course'],
    },
    orderId: {
      type: Types.ObjectId,
      ref: 'Order',
    },
    redeemedBy: {
      type: String,
      ref: 'User',
    },
    redeemedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);
GiftSchema.set('toJSON', { virtuals: true });

export default model<Gift>('Gift', GiftSchema);
