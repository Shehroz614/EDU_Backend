import express, { Request, Response, NextFunction } from 'express';
import PaymentsService from '@services/payments';
import HTTPError from '@errors/HTTPError';
import { isEmpty } from '@middlewares/miniLodash';
import admin from 'firebase-admin';

const router = express.Router();

/**
 * Cart Checkout
 * @since v1.0
 */
router.post('/checkout', async (req: Request, res: Response, next: NextFunction) => {
  /**
   * #swagger.tags = ['Payments']
     #swagger.responses[200] = {
        schema: {
          client_secret: ''
        }
     }
     #swagger.responses[201] = {
        schema: {
          $ref: '#/definitions/payment/properties/201'
        }
     }
     #swagger.responses[500] = {
        schema: {
          $ref: '#/definitions/payment/properties/500'
        }
     }
   */
  try {
    let userId = null;
    if (!isEmpty(req?.headers?.authorization?.split(' ')[1])) {
      const token = req?.headers?.authorization?.split(' ')[1] as string;
      userId = (await admin.auth().verifyIdToken(token)).uid;
    }

    const { items, discounts, currency, itemType, orderId } = req.body;
    const response = await PaymentsService.checkout({ items, currency, discounts, itemType, userId, orderId });
    res.send(response);
  } catch (err) {
    next(err);
  }
});

/**
 * Stripe Webhook
 * @since v1.0
 */
router.post(
  '/validate',
  express.raw({ type: 'application/json' }),
  async (req: Request, res: Response, next: NextFunction) => {
    /**
     * #swagger.ignore = true
     * #swagger.tags = ['Payments']
     * #swagger.summary = 'For webhook usage only'
     */
    try {
      await PaymentsService.validatePurchase(req);
      res.sendStatus(200);
    } catch (err) {
      next(err);
    }
  },
);

/**
 * Check Discount
 * @since v1.0
 */
router.post('/discount', async (req: Request, res: Response, next: NextFunction) => {
  /**
   * #swagger.tags = ['Payments']
     #swagger.responses[200] = {
        schema: {
          $ref: '#/definitions/coupon/properties/CouponDetails'
        }
     }
     #swagger.responses[500] = {
        schema: {
          $ref: '#/definitions/coupon/properties/500'
        }
     }
   */
  try {
    let userId = null;
    if (!isEmpty(req?.headers?.authorization?.split(' ')[1])) {
      const token = req?.headers?.authorization?.split(' ')[1] as string;
      userId = (await admin.auth().verifyIdToken(token)).uid;
    }
    const { isGiftOrder } = req.query;
    const { code, items } = req.body;
    const discount = await PaymentsService.checkDiscount(code, items, userId as string, isGiftOrder === 'true');
    if (!discount) {
      next(new HTTPError(403, 'Invalid or Expired discount code'));
      return;
    }
    res.send(discount);
  } catch (err) {
    next(err);
  }
});

export default router;
