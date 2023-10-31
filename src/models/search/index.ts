import { Schema, model } from 'mongoose';
import Search from '@edugram/types/search';

const SearchSchema: Schema = new Schema<Search>(
  {
    text: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { timestamps: true },
);
SearchSchema.set('toJSON', { virtuals: true });

export default model<Search>('Search', SearchSchema);
