// User Model
import User from '@models/user';
import UserVerificationRequest from '@models/user/verificationRequest';
// Order models
import Order from '@models/order';
import Coupon from '@models/order/coupon';
import Transaction from '@models/order/transaction';
import Gift from '@models/gift';
// Category Model
import Category from '@models/category';
// Support Model
import Report from '@models/support/report';
// Course models
import Course from '@models/course';
import ReviewRecord from '@models/course/reviewRecord';
import LectureContent from '@models/course/material/lecture/content';
import LectureProgress from '@models/course/progress/lecture';
import CourseProgress from '@models/course/progress/course';
import Resource from '@models/course/material/resource';
import Review from '@models/course/review/review';
import Like from '@models/course/review/like';
import SearchQuery from '@models/search/searchQuery';
import Note from '@models/course/material/note';
// Setting
import Setting from '@models/setting';
import PricingPolicy from '@models/pricingPolicy';
// Announcements
import Announcement from '@models/announcement';

export default {
  User,
  UserVerificationRequest,
  Course,
  LectureContent,
  LectureProgress,
  Category,
  Review,
  Like,
  Resource,
  ReviewRecord,
  CourseProgress,
  Note,
  Coupon,
  Transaction,
  Order,
  Report,
  Gift,
  SearchQuery,
  Setting,
  PricingPolicy,
  Announcement,
};
