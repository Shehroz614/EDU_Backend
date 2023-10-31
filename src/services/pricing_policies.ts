import models from '@models/index';
import HTTPError from '@errors/HTTPError';
import PricingPolicy from '@edugram/types/pricingPolicy';

/**
 * Get Pricing Policy
 * @param policyId
 */
const getPolicy = (policyId: string) =>
  new Promise<PricingPolicy>(async (resolve, reject) => {
    try {
      if (!policyId) {
        reject(new HTTPError(400, 'Pricing policy ID is required'));
        return;
      }
      const policy: PricingPolicy = (await models.PricingPolicy.findOne({ _id: policyId })) as PricingPolicy;
      resolve(policy);
    } catch (err) {
      console.log(err);
      reject(err);
    }
  });

/**
 * Get Pricing Policy
 * @param courseId
 * @param version
 */
const getPoliciesByCourse = (courseId: string, version?: string) =>
  new Promise<PricingPolicy[]>(async (resolve, reject) => {
    try {
      if (!courseId) {
        reject(new HTTPError(400, 'Course ID is required'));
        return;
      }
      const query: any = { courses: { $in: [courseId] } };
      if (version) {
        query.courseTargetMode = 'Course';
        query.targetCourseVersion = {
          $in: [parseInt(version, 10)],
        };
      }
      const policies = await models.PricingPolicy.find(query);
      resolve(policies);
    } catch (err) {
      console.log(err);
      reject(err);
    }
  });

/**
 * Create Pricing Policy
 * @param data
 */
const createPolicy = (data: {
  code?: string;
  type: 'smartPrice' | 'discount' | 'override';
  valueType: 'fixed' | 'percentage';
  value: number;
  initialValue?: number;
  courses?: string[];
  excludedCourses?: string[];
  courseTargetMode?: 'Version' | 'Course';
  targetCourseVersion?: number[];
  users?: string[];
  excludedUsers?: string[];
  isAutoApplicable: boolean;
  isActive: boolean;
  startDate: Date;
  allowGlobalDiscounts?: boolean;
  allowCourseDiscounts?: boolean;
  allowDiscountsForGifts?: boolean;
  showOriginalPrice?: boolean;
  maxUsage?: number;
  expiryDate: Date;
  createdBy: string;
}) =>
  new Promise<PricingPolicy>(async (resolve, reject) => {
    try {
      if (data.type === 'discount' && data.courses && data.courses.length === 1) {
        const exists = await models.PricingPolicy.exists({ code: data.code, courses: { $eq: data.courses } });
        if (exists) {
          reject(new HTTPError(409, 'A Discount Policy with the same name already exists'));
          return;
        }
      }
      if (data.type === 'override' && data.isActive && data.courses) {
        const query: any = { courses: { $in: data.courses }, isActive: true };
        if (data.courseTargetMode === 'Version' && data.targetCourseVersion) {
          query.targetCourseVersion = { $in: data.targetCourseVersion };
        }
        const policies = await models.PricingPolicy.find(query);
        if (policies && policies.length > 0) {
          const policyIds = policies.map((policy) => policy._id);
          await models.PricingPolicy.updateMany({ _id: { $in: policyIds } }, { isActive: false });
        }
      }
      const policy: PricingPolicy = await models.PricingPolicy.create(data);
      resolve(policy);
    } catch (err) {
      console.log(err);
      reject(err);
    }
  });
/**
 * Update Pricing Policy
 * @param policyId
 * @param userId
 * @param data
 */
const updatePolicy = (
  policyId: string,
  userId: string,
  data: {
    code?: string;
    type: 'smartPrice' | 'discount' | 'override';
    valueType: 'fixed' | 'percentage';
    value: number;
    initialValue?: number;
    courses?: string[];
    excludedCourses?: string[];
    courseTargetMode?: 'Version' | 'Course';
    targetCourseVersion?: number[];
    users?: string[];
    excludedUsers?: string[];
    isAutoApplicable: boolean;
    isActive: boolean;
    startDate: Date;
    allowGlobalDiscounts?: boolean;
    allowCourseDiscounts?: boolean;
    allowDiscountsForGifts?: boolean;
    showOriginalPrice?: boolean;
    maxUsage?: number;
    expiryDate: Date;
    createdBy: string;
  },
) =>
  new Promise<PricingPolicy>(async (resolve, reject) => {
    try {
      const policy = await models.PricingPolicy.findOne({
        _id: policyId,
        createdBy: userId,
      });
      if (!policy) {
        reject(new HTTPError(403, 'Cannot update pricing policy'));
        return;
      }
      await policy.set(data);
      await policy.save();
      resolve(policy);
    } catch (err) {
      console.log(err);
      reject(err);
    }
  });

/**
 * Delete Pricing Policy
 * @param policyId
 * @param userId
 */
const deletePolicy = (policyId: string, userId: string) =>
  new Promise<void>(async (resolve, reject) => {
    try {
      const policy = await models.PricingPolicy.exists({
        _id: policyId,
        createdBy: userId,
      });
      if (!policy) {
        reject(new HTTPError(403, 'Cannot delete pricing policy'));
        return;
      }
      await models.PricingPolicy.deleteOne({
        _id: policyId,
      });
      resolve();
    } catch (err) {
      console.log(err);
      reject(err);
    }
  });

export default {
  getPolicy,
  getPoliciesByCourse,
  createPolicy,
  updatePolicy,
  deletePolicy,
};
