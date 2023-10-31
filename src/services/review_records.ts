import models from '@models/index';
import HTTPError from '@errors/HTTPError';
import ReviewRecord from '@edugram/types/course/reviewRecord';

/**
 * Find One Review-record
 * @param filter
 */
const findOne = (filter: any) =>
  new Promise<ReviewRecord>(async (resolve, reject) => {
    try {
      const reviewRecord: ReviewRecord = (await models.ReviewRecord.findOne(filter).populate('course')) as ReviewRecord;
      resolve(reviewRecord);
    } catch (err) {
      console.log(err);
      reject(err);
    }
  });

/**
 * Create new Review-record
 * @param data
 */
const create = (data: {
  course: string;
  version: number;
  reviewNote: string;
  contactEmail: string;
  authorId: string;
}) =>
  new Promise<ReviewRecord>(async (resolve, reject) => {
    try {
      const { course, version, reviewNote, contactEmail, authorId } = data;
      const reviewRecord: ReviewRecord = (await models.ReviewRecord.create({
        reviewNote,
        contactEmail,
        authorId,
        course,
        version,
      })) as ReviewRecord;
      resolve(reviewRecord);
    } catch (err) {
      console.log(err);
      reject(err);
    }
  });

/**
 * Update Review-record
 * @param query
 * @param updateData
 */
const update = (query: any, updateData: any) =>
  new Promise<ReviewRecord>(async (resolve, reject) => {
    try {
      const response: ReviewRecord = (await models.ReviewRecord.updateOne(query, updateData, {
        returnDocument: 'after',
      })) as never as ReviewRecord;
      resolve(response);
    } catch (err) {
      console.log(err);
      reject(err);
    }
  });

/**
 * Get Review-records
 * @param filter
 * @param userInfo
 */
const getRecords = (filter: any, userInfo: any) =>
  new Promise<ReviewRecord[]>(async (resolve, reject) => {
    try {
      if (userInfo.userId) {
        const existingRecord: ReviewRecord[] = await models.ReviewRecord.find({
          ...filter,
          authorId: userInfo.userId,
        }).populate('course');
        resolve(existingRecord);
      }
      // else if (false) {
      //     // TODO - INVOKE admin detection
      //     const existingRecord = await models.ReviewRecords.find(filter);
      //     resolve(existingRecord);
      // }
    } catch (err) {
      console.log(err);
      reject(err);
    }
  });

const getPendingRecord = (
  data: { courseId: string; userId: string; versionNumber?: string },
  includeRejected: boolean = false,
) =>
  new Promise<ReviewRecord | boolean>(async (resolve, reject) => {
    try {
      const { courseId, userId, versionNumber } = data;
      const filter: { course: string; authorId: string; version?: string } = { course: courseId, authorId: userId };
      if (versionNumber) {
        filter.version = versionNumber;
      }
      const existingRecord: ReviewRecord[] = await models.ReviewRecord.find(filter)
        .sort({ _id: -1 })
        .limit(1)
        .populate('course');
      if (existingRecord.length === 1) {
        if (existingRecord[0].authorId === userId) {
          if (includeRejected) {
            if (
              existingRecord[0].completed === false ||
              (existingRecord[0].completed === true && existingRecord[0].status === 'approved') ||
              (existingRecord[0].completed === true && existingRecord[0].status === 'rejected')
            ) {
              resolve(existingRecord[0]);
            }
          } else if (
            existingRecord[0].completed === false ||
            (existingRecord[0].completed === true && existingRecord[0].status === 'approved')
          ) {
            resolve(existingRecord[0]);
          }
        }
      }
      resolve(false);
    } catch (err) {
      console.log(err);
      reject(err);
    }
  });

/**
 * Get Active Review-records
 */
const getActiveRecords = () =>
  new Promise<ReviewRecord[]>(async (resolve, reject) => {
    try {
      const reviewRecords: ReviewRecord[] = await models.ReviewRecord.find({
        completed: false,
      }).populate('course');
      resolve(reviewRecords);
    } catch (err) {
      console.log(err);
      reject(err);
    }
  });

/**
 * Start Review
 * @param data
 */
const startReview = (data: { reviewRecordId: string; adminId: string }) =>
  new Promise<ReviewRecord>(async (resolve, reject) => {
    try {
      const { reviewRecordId, adminId } = data;
      const response: ReviewRecord = await update(
        { _id: reviewRecordId },
        {
          reviewerId: adminId,
          status: 'In Review',
        },
      );
      // TODO - Send Notification to author;
      resolve(response);
    } catch (err) {
      console.log(err);
      reject(err);
    }
  });

/**
 * Approve Review
 * @param data
 */
const approve = (data: { reviewRecordId: string; adminId: string }) =>
  new Promise<ReviewRecord>(async (resolve, reject) => {
    try {
      const { reviewRecordId, adminId } = data;
      const response: ReviewRecord = await update(
        { _id: reviewRecordId },
        {
          reviewerId: adminId,
          status: 'approved',
          completed: true,
        },
      );
      // TODO - Send Notification to author;
      resolve(response);
    } catch (err) {
      console.log(err);
      reject(err);
    }
  });

/**
 * Reject Review
 * @param data
 */
const reject = (data: { reviewRecordId: string; rejectionReason: string; adminId: string }) =>
  new Promise<ReviewRecord>(async (resolve, _reject) => {
    try {
      const { reviewRecordId, adminId } = data;
      const response: ReviewRecord = await update(
        { _id: reviewRecordId },
        {
          reviewerId: adminId,
          status: 'rejected',
          completed: true,
        },
      );
      resolve(response);
    } catch (err) {
      console.log(err);
      _reject(err);
    }
  });

/**
 * Cancel Review
 * @param reviewRecordId
 */
const cancel = (reviewRecordId: string) =>
  new Promise<ReviewRecord>(async (resolve, _reject) => {
    try {
      const reviewRecord: ReviewRecord = await findOne({ _id: reviewRecordId });
      if (!reviewRecord) {
        _reject(new HTTPError(404, 'Review record not found'));
        return;
      }

      if (['rejected', 'approved', 'released', 'cancelled'].includes(reviewRecord.status)) {
        _reject(new HTTPError(400, `Cannot cancel review record at ${reviewRecord.status}`));
        return;
      }
      reviewRecord.status = 'cancelled';
      await reviewRecord.save();
      resolve(reviewRecord);
    } catch (err) {
      console.log(err);
      _reject(err);
    }
  });

export default {
  findOne,
  create,
  update,
  getRecords,
  getPendingRecord,
  getActiveRecords,
  startReview,
  approve,
  reject,
  cancel,
};
