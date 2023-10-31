import express, { Request, Response, NextFunction } from 'express';
import GiftService from '@services/gifting';
import isAuth from '@middlewares/isAuth';
import Gift from '@edugram/types/order/gift';
import HTTPError from '@errors/HTTPError';

const router = express.Router();

router.get('/:orderId', async (req: Request, res: Response, next: NextFunction) => {
  /**
   * #swagger.tags = ['Gifting']
     #swagger.responses[200] = {
        description: "Get gift details",
        schema: {
          $ref: '#/definitions/gift/properties/GiftDetails'
        }
     }
     #swagger.responses[400] = {
        schema: {
          $ref: '#/definitions/gift/properties/400'
        }
     }
     #swagger.responses[404] = {
        schema: {
          $ref: '#/definitions/gift/properties/404'
        }
     }
     #swagger.responses[500] = {
        schema: {
          $ref: '#/definitions/gift/properties/500'
        }
     }
   */
  try {
    const { orderId } = req.params;
    if (!orderId) {
      next(new HTTPError(400, 'Order ID is required'));
      return;
    }
    const response: Gift = await GiftService.getGift(orderId);
    res.send(response);
  } catch (err) {
    next(err);
  }
});

/**
 * Redeem Gift
 * @since v1.0
 */
router.post('/:orderId/redeem', isAuth, async (req: Request, res: Response, next: NextFunction) => {
  /**
   * #swagger.tags = ['Gifting']
     #swagger.responses[200] = {
        schema: {
          $ref: '#/definitions/gift/properties/404'
        }
     }
     #swagger.responses[400] = {
        schema: {
          $ref: '#/definitions/gift/properties/400'
        }
     }
     #swagger.responses[403] = {
        schema: {
          $ref: '#/definitions/gift/properties/403'
        }
     }
     #swagger.responses[404] = {
        schema: {
          $ref: '#/definitions/gift/properties/404'
        }
     }
     #swagger.responses[500] = {
        schema: {
          $ref: '#/definitions/gift/properties/500'
        }
     }
   */
  try {
    const userId = req?.userData?.uid as string;
    const { orderId } = req.params;
    if (!orderId) {
      next(new HTTPError(400, 'Order ID is required'));
      return;
    }
    const response = await GiftService.redeemGift({ orderId, userId });
    res.send(response);
  } catch (err) {
    next(err);
  }
});

export default router;
