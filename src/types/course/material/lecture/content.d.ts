import { Document } from 'mongoose';
import Course from '@edugram/types/course';
import User from '@edugram/types/user';

interface LectureContent extends Document {
  content: string;
  name: string;
  type: 'video' | 'text' | 'audio';
  public?: {
    url: string;
    is_public: boolean;
  };
  duration: number;
  course: Course[_id];
  author: User[_id];
}
export default LectureContent;
