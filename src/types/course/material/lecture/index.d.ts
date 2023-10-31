import { Document } from 'mongoose';
import Resource from '@edugram/types/course/material/resource';
import LectureContent from './content';

interface Lecture extends Document {
  title: string;
  content: LectureContent[_id]; // should be content in the future
  preview: boolean;
  section_id?: string;
  resources?: Resource[_id][];
}
export default Lecture;
