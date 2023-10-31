import express, { Request, Response, NextFunction } from 'express';
import PricingPoliciesService from '@services/pricing_policies';
import isAuth from '@middlewares/isAuth';
import HTTPError from '@errors/HTTPError';

const router = express.Router();

/**
 * Create Pricing Policy
 * @since v1.0
 */
router.post('/', isAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req?.userData?.uid as string;
    const {
      code,
      type,
      valueType,
      value,
      courses,
      excludedCourses,
      courseTargetMode,
      targetCourseVersion,
      users,
      excludedUsers,
      isAutoApplicable,
      isActive,
      startDate,
      allowGlobalDiscounts,
      allowCourseDiscounts,
      allowDiscountsForGifts,
      showOriginalPrice,
      maxUsage,
      expiryDate,
    } = req.body;
    const policy = await PricingPoliciesService.createPolicy({
      code,
      type,
      valueType,
      value,
      courses,
      excludedCourses,
      courseTargetMode,
      targetCourseVersion: [targetCourseVersion],
      users,
      excludedUsers,
      isAutoApplicable,
      isActive,
      startDate,
      allowGlobalDiscounts,
      allowCourseDiscounts,
      allowDiscountsForGifts,
      showOriginalPrice,
      maxUsage,
      expiryDate,
      createdBy: userId,
    });
    res.send(policy);
  } catch (err) {
    next(err);
  }
});

/**
 * get Pricing Policy
 * @since v1.0
 */
router.get('/:policyId', isAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req?.userData?.uid as string;
    const { policyId } = req.params;
    const policy = await PricingPoliciesService.getPolicy(policyId);
    res.send(policy);
  } catch (err) {
    next(err);
  }
});

export default router;
