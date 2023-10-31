import { Document } from 'mongoose';
import Lecture from '@edugram/types/course/material/lecture';

interface Section extends Document {
  title: string;
  description?: string;
  lectures: Lecture[];
}
export default Section;
