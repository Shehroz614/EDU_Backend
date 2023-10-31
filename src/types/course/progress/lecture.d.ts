import { Document } from 'mongoose';
import Lecture from '@edugram/types/course/material/lecture';
import Course from '@edugram/types/course';
import User from '@edugram/types/user';

interface LectureProgress extends Document {
  watchTime: number;
  done: boolean;
  lectureId: Lecture[_id];
  courseId: Course[_id];
  user: User[_id];
}
export default LectureProgress;
