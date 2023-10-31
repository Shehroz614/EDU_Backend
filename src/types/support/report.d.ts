import { Document } from 'mongoose';

interface Report extends Document {
  title: string;
  description: string;
  user: string;
  type?:
    | 'legalConcern'
    | 'featureRequest'
    | 'contentIssues'
    | 'technicalIssues'
    | 'courseNavigation'
    | 'uiUxProblems'
    | 'accountIssues'
    | 'commentForumIssues'
    | 'paymentIssues'
    | 'mobileAppProblems'
    | 'performanceIssues'
    | 'other';
  relatedItem?: {
    itemType: string;
    itemId: string;
  };
}
export default Report;
