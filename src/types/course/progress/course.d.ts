import { Document } from 'mongoose';
import Lecture from '@edugram/types/course/material/lecture';
import Course from '@edugram/types/course';
import User from '@edugram/types/user';

interface CourseProgress extends Document {
  lastLectureId: Lecture[_id];
  courseId: Course[_id];
  user: User[_id];
}
export default CourseProgress;
