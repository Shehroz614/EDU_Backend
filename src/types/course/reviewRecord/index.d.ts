import { Document } from 'mongoose';
import Course from '@edugram/types/course';
import User from '@edugram/types/user';

interface ReviewRecord extends Document {
  course: Course[_id];
  version: number;
  reviewNote: string;
  contactEmail: string;
  authorId: User[_id];
  completed: boolean;
  status: 'pendingReview' | 'inReview' | 'rejected' | 'approved' | 'released' | 'cancelled';
  comment?: string;
  reviewerId?: User[_id];
}
export default ReviewRecord;
