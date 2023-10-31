import express, { Request, Response, NextFunction } from 'express';
import isAuth from '@middlewares/isAuth';
import CoursesService from '@services/courses';

const router = express.Router();

/**
 * Get Pricing Policy
 * @since v1.0
 */
router.get(
  '/courses/:courseId/:courseVersion/pricing-policies',
  isAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    /**
     * #swagger.tags = ['Courses']
     #swagger.responses[500] = {
          schema: {
            $ref: '#/definitions/course/properties/500'
          }
       }
     */
    try {
      const userId = req.userData?.uid as string;
      const { courseId, courseVersion: version } = req.params;
      const policies = await CoursesService.getPricingPolicies(courseId, version, userId);
      res.send(policies);
    } catch (err) {
      next(err);
    }
  },
);

/**
 * Add Pricing Policy
 * @since v1.0
 */
router.post(
  '/courses/:courseId/:courseVersion/pricing-policies',
  isAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    /**
     * #swagger.tags = ['Courses']
     #swagger.responses[500] = {
          schema: {
            $ref: '#/definitions/course/properties/500'
          }
       }
     */
    try {
      const userId = req.userData?.uid as string;
      const { courseId, courseVersion: version } = req.params;
      const {
        type,
        code,
        valueType,
        value,
        initialValue,
        isAutoApplicable,
        isActive,
        allowCourseDiscounts,
        allowDiscountsForGifts,
        showOriginalPrice,
        maxUsage,
        startDate,
        expiryDate,
      } = req.body;
      const policies = await CoursesService.addPricingPolicy(courseId, version, userId, {
        type,
        code,
        valueType,
        value,
        initialValue,
        isAutoApplicable,
        isActive,
        allowCourseDiscounts,
        allowDiscountsForGifts,
        showOriginalPrice,
        maxUsage,
        startDate,
        expiryDate,
      });
      res.send(policies);
    } catch (err) {
      next(err);
    }
  },
);

/**
 * Update Pricing Policy
 * @since v1.0
 */
router.patch(
  '/courses/:courseId/:courseVersion/pricing-policies/:policyId',
  isAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.userData?.uid as string;
      const { courseId, courseVersion: version, policyId } = req.params;
      const {
        type,
        code,
        valueType,
        value,
        initialValue,
        isAutoApplicable,
        isActive,
        allowCourseDiscounts,
        allowDiscountsForGifts,
        showOriginalPrice,
        maxUsage,
        startDate,
        expiryDate,
      } = req.body;
      const policies = await CoursesService.updatePricingPolicy(courseId, version, userId, policyId, {
        type,
        code,
        valueType,
        value,
        initialValue,
        isAutoApplicable,
        isActive,
        allowCourseDiscounts,
        allowDiscountsForGifts,
        showOriginalPrice,
        maxUsage,
        startDate,
        expiryDate,
      });
      res.send(policies);
    } catch (err) {
      next(err);
    }
  },
);

/**
 * Delete Pricing Policy
 * @since v1.0
 */
router.delete(
  '/courses/:courseId/:courseVersion/pricing-policies/:policyId',
  isAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    /**
     * #swagger.tags = ['Courses']
       #swagger.responses[500] = {
          schema: {
            $ref: '#/definitions/course/properties/500'
          }
       }
     */
    try {
      const userId = req.userData?.uid as string;
      const { courseId, courseVersion: version, policyId } = req.params;
      const policies = await CoursesService.deletePricingPolicy(courseId, version, userId, policyId);
      res.send(policies);
    } catch (err) {
      next(err);
    }
  },
);

export default router;
