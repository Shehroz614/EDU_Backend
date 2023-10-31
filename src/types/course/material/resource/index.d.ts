import { Document } from 'mongoose';
import User from '@edugram/types/user';
import Course from '@edugram/types/course';
import Lecture from '@edugram/types/course/material/lecture';

interface Resource extends Document {
  key: string;
  name: string;
  lectures: Lecture[_id];
  course: Course[_id];
  author: User[_id];
}
export default Resource;
