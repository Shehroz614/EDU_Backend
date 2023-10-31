import { Schema, model } from 'mongoose';
import SearchQuery from '@edugram/types/search/searchQuery';
import User from '@edugram/types/user';

const SearchSchema: Schema = new Schema<SearchQuery>(
  {
    text: {
      type: String,
      required: true,
      trim: true,
    },
    userId: {
        type: String,
        required: false,
        trim: true,
      }
  },
  { timestamps: true },
);
SearchSchema.set('toJSON', { virtuals: true });

export default model<SearchQuery>('SearchQuery', SearchSchema);
