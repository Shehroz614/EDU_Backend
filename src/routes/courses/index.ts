import express from 'express';
import notes from '@routes/courses/notes';
import reviews from '@routes/courses/reviews';
import reviewRecords from '@routes/courses/reviewRecords';
import studyMaterials from '@routes/courses/studyMaterials';
import marketing from '@routes/courses/marketing';
import progress from '@routes/courses/progress';
import versions from '@routes/courses/versions';
import general from '@routes/courses/general';
import announcements from '@routes/courses/announcements';
import pricingPolicies from '@routes/courses/pricingPolicies';

const router = express.Router();

/**
 * Course general routes
 * @since v1.0
 */
router.use(general);

/**
 * Course progress routes
 * @since v1.0
 */
router.use(progress);

/**
 * Course review routes
 * @since v1.0
 */
router.use(reviews);

/**
 * Course notes routes
 * @since v1.0
 */
router.use(notes);

/**
 * Course announcements routes
 * @since v1.0
 */
router.use(announcements);

/**
 * Course version routes
 * @since v1.0
 */
router.use(versions);

/**
 * Course pricing policies routes
 * @since v1.0
 */
router.use(pricingPolicies);

/**
 * Course study materials routes
 * @since v1.0
 */
router.use(studyMaterials);

/**
 * Course marketing routes
 * @since v1,0
 */
router.use(marketing);

/**
 * Course review record routes
 * @since v1.0
 */
router.use(reviewRecords);

export default router;
