import { Document } from "mongoose";
import User from '@edugram/types/user';

interface SearchQuery extends Document {
    text: string,
    userId: User[_id]
};
export default SearchQuery
