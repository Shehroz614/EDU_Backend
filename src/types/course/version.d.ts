import ReviewRecord from '@edugram/types/course/reviewRecord';
import Category from '@edugram/types/category';
import Coupon from '@edugram/types/order/coupon';
import Section from '@edugram/types/course/material/section';
import LectureContent from '@edugram/types/course/material/lecture/content';
import PricingPolicy from '@edugram/types/pricingPolicy';

interface Version {
  title?: string;
  version: number;
  status: 'draft' | 'inReview' | 'rejected' | 'approved' | 'online';
  level: 'all' | 'beginner' | 'intermediate' | 'expert';
  ageLimit: 'noLimit' | 'over4' | 'over7' | 'over12' | 'over16' | 'over18';
  category?: Category[_id];
  subCategory?: Category[_id];
  subSubCategory?: Category[_id];
  languages?: string[];
  subtitles?: string[];
  shortCourseDescription?: string;
  description?: string;
  priceType: 'smart' | 'custom';
  price: number;
  minPrice?: number;
  salePrice: number;
  whatYouWillLearn?: string[];
  requirements?: string[];
  presentationalVideo?: LectureContent[_id];
  presentationalImage?: string;
  aboutAuthor?: string;
  keywords?: string[];
  coupons: Coupon[_id][];
  pricingPolicies: PricingPolicy[_id][];
  course_materials: {
    sections: Section[_id][];
  };
  totalTime: number;
  totalLectures: number;
  timestamps?: any[];
  reviewRecord: ReviewRecord[_id];
}
export default Version;
