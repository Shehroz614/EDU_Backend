import { Schema, model } from 'mongoose';
import {
  REPORT_TITLE_TEXT_MIN_LIMIT,
  REPORT_TITLE_TEXT_MAX_LIMIT,
  REPORT_DESCRIPTION_TEXT_MIN_LIMIT,
  REPORT_DESCRIPTION_TEXT_MAX_LIMIT,
} from '@constants/index';
import Report from '@edugram/types/support/report';

const ReportSchema: Schema = new Schema<Report>(
  {
    title: {
      type: String,
      required: [true, 'Report title cannot be empty'],
      trim: true,
      minLength: [
        REPORT_TITLE_TEXT_MIN_LIMIT,
        `Report title must be at-least ${REPORT_TITLE_TEXT_MIN_LIMIT} characters long`,
      ],
      maxLength: [
        REPORT_TITLE_TEXT_MAX_LIMIT,
        `Report title cannot be more than ${REPORT_TITLE_TEXT_MAX_LIMIT} characters long`,
      ],
    },
    description: {
      type: String,
      required: [true, 'Report description cannot be empty'],
      minLength: [
        REPORT_DESCRIPTION_TEXT_MIN_LIMIT,
        `Report description must be at-least ${REPORT_DESCRIPTION_TEXT_MIN_LIMIT} characters long`,
      ],
      maxLength: [
        REPORT_DESCRIPTION_TEXT_MAX_LIMIT,
        `Report description cannot be more than ${REPORT_DESCRIPTION_TEXT_MAX_LIMIT} characters long`,
      ],
    },
    user: {
      type: String,
      ref: 'User',
      required: [true, 'Report submitting user cannot be empty'],
    },
    type: {
      type: String,
      enum: [
        'contentIssues',
        'technicalIssues',
        'courseNavigation',
        'uiUxProblems',
        'accountIssues',
        'commentForumIssues',
        'paymentIssues',
        'mobileAppProblems',
        'performanceIssues',
        'featureRequest',
        'legalConcern',
        'other',
      ],
    },
    relatedItem: {
      itemType: {
        type: String,
      },
      itemId: {
        type: String,
      },
    },
  },
  { timestamps: true },
);
ReportSchema.set('toJSON', {
  virtuals: true,
});
export default model<Report>('Report', ReportSchema);
