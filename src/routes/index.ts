import express from 'express';

import Settings from '@routes/settings';
import auth from './auth';
import author from './author';
import categories from './categories';
import courses from './courses';
import orders from './orders';
import gifting from './gifting';
import payments from './payments';
import reviewRecords from './reviewRecords';
import search from './search';
import support from './support';
import user from './user';
import doc from './doc';
import PricingPolicies from './pricingPolicies';

const router = express.Router();

router.use('/', auth);
router.use('/api/education', courses);
router.use('/api/search', search);
router.use('/api/user', user);
router.use('/api/author', author);
router.use('/api/payments', payments);
router.use('/api/categories', categories);
router.use('/api/review-records', reviewRecords);
router.use('/api/support', support);
router.use('/api/orders', orders);
router.use('/api/gifting', gifting);
router.use('/api/doc', doc);
router.use('/api/pricing-policies', PricingPolicies);
router.use('/api/settings', Settings);

export default router;
