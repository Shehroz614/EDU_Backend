import { Schema, model } from 'mongoose';
import Category from '@edugram/types/category';

const CategorySchema: Schema = new Schema<Category>(
  {
    name: {
      type: Map,
      of: String,
    },
    parent: {
      type: Schema.Types.ObjectId,
      ref: 'Category',
      default: null,
    },
    children: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Category',
      },
    ],
  },
  { timestamps: false },
);

CategorySchema.set('toJSON', {
  virtuals: true,
});

export default model<Category>('Category', CategorySchema);
