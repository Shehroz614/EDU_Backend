import { Document } from 'mongoose';
import Transaction from '../order/transaction';
import Course from '../course';

interface User extends Document {
  email: string;
  avatar: string;
  first_name: string;
  last_name: string;
  date_of_birth?: string;
  city?: string;
  country?: string;
  website?: string;
  email_subscription: boolean;
  socials?: { name: string; url: string }[];
  language?: string;
  rank?: string;
  wishlist: Course[_id][];
  my_courses: Course[_id][];
  in_cart: Course[_id][];
  saved_items: Course[_id][];
  purchased_courses: Course[_id][];
  completed_courses: Course[_id][];
  transactions: Transaction[_id][];
  reviews: any[];
  search_history: Any[];
  visited_courses: Course[_id][];
  notifications: Any[];
  messages: Any[];
  payment_methods: Any[];
  website_preferences: Any[];
  isAuthor: Boolean;
  isAuthorVerified: Boolean;
  stripeConnectedAccountId?: string | null;
  introduction?: string;
  introductoryVideo?: string;
  tosAcceptedAt: Date | null;
}
export default User;
