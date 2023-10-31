import { Document } from 'mongoose';
import User from '@edugram/types/user';
import Course from '@edugram/types/course';

interface Review extends Document {
  title: string;
  review?: string;
  likes: User[_id][];
  dislikes: User[_id][];
  rating: number;
  course: Course[_id];
  user: User[_id];
  responses: {
    user: User[_id];
    response: string;
  }[];
}
export default Review;
