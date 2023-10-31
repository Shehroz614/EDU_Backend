import { Document } from 'mongoose';
import Course from '@edugram/types/course';

interface Note extends Document {
  title: string;
  courseId: Course[_id];
  lectureId: any;
  user: User[_id];
  description: string;
}
export default Note;
