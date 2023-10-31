import { Document } from 'mongoose';
import Review from '@edugram/types/course/review/review';
import User from '@edugram/types/user';

interface Like extends Document {
  user: User[_id];
  review: Review[_id];
}
export default Like;
