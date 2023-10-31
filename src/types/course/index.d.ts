import { Document, Types } from 'mongoose';
import User from '@edugram/types/user';
import Version from '@edugram/types/course/version';

interface Course extends Document {
  draftVersion: number | null;
  liveVersion: number | null;
  author: User[_id];
  ratingQty: number;
  rating: number;
  studentsQty: number;
  courseReviews: any[];
  ratingBrakeDown: number[];
  selectedReview: any;
  QA: any[];
  announcements: any[];
  versions: Types.Map<Version>;
  meta: {
    title?: string;
    description?: Object;
    shortDescription?: string;
    keywords?: string[];
    whatYouWillLearn?: string[];
    category?: Object;
    subCategory?: Object;
    subSubCategory?: Object;
    price?: number;
    author?: string;
  };
}
export default Course;
