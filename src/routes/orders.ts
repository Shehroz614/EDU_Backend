import express, { Request, Response, NextFunction } from 'express';
import admin from 'firebase-admin';
import OrdersService from '@services/orders';
import isAuth from '@middlewares/isAuth';
import { isEmpty } from '@middlewares/miniLodash';
import HTTPError from '@errors/HTTPError';

const router = express.Router();

/**
 * Get orders
 */
router.get('/', isAuth, async (req: Request, res: Response, next: NextFunction) => {
  /**
   * #swagger.tags = ['Orders']
     #swagger.responses[409] = {
       schema: {
          $ref: '#/definitions/order/properties/409'
       }
     }
     #swagger.responses[500] = {
       schema: {
          $ref: '#/definitions/order/properties/500'
      }
     }
   */
  try {
    const userId = req?.userData?.uid as string;
    if (!userId) {
      next(new HTTPError(400, 'User ID is required'));
      return;
    }
    const orders = await OrdersService.getOrders(userId);
    res.send(orders);
  } catch (err) {
    next(err);
  }
});

/**
 * Create Order
 * @since v1.0
 */
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  /**
   * #swagger.tags = ['Orders']
     #swagger.responses[409] = {
        schema: {
          $ref: '#/definitions/order/properties/409'
        }
     }
     #swagger.responses[500] = {
        schema: {
          $ref: '#/definitions/order/properties/500'
        }
     }
   */
  try {
    let userId = null;
    if (!isEmpty(req?.headers?.authorization?.split(' ')[1])) {
      const token = req?.headers?.authorization?.split(' ')[1] as string;
      userId = (await admin.auth().verifyIdToken(token)).uid;
    }

    const { items, itemType, giftDetails = null, isGuest, guestCheckoutDetails = null } = req.body;

    const order = await OrdersService.createOrder({
      userId,
      items,
      itemType,
      giftDetails,
      isGuest,
      guestCheckoutDetails,
    });
    res.send(order);
  } catch (err) {
    next(err);
  }
});

/**
 * Get Order Details
 * @since v1.0
 */
router.get('/:orderId', async (req: Request, res: Response, next: NextFunction) => {
  /**
   * #swagger.tags = ['Orders']
     #swagger.responses[200] = {
        schema: {
          $ref: '#/definitions/order/properties/OrderDetails'
        }
     }
     #swagger.responses[500] = {
        schema: {
          $ref: '#/definitions/order/properties/500'
        }
     }
   */
  try {
    let userId = null;
    if (!isEmpty(req?.headers?.authorization?.split(' ')[1])) {
      const token = req?.headers?.authorization?.split(' ')[1] as string;
      userId = (await admin.auth().verifyIdToken(token)).uid;
    }
    const { orderId } = req.params;
    const order = await OrdersService.getOrder(orderId, userId);
    res.send(order);
  } catch (err) {
    next(err);
  }
});

router.get('/:orderId/invoice', async (req: Request, res: Response, next: NextFunction) => {
  /**
   * #swagger.tags = ['Orders']
     #swagger.responses[500] = {
        schema: {
        $ref: '#/definitions/order/properties/500'
     }
     }
   */
  try {
    let userId = null;
    if (!isEmpty(req?.headers?.authorization?.split(' ')[1])) {
      const token = req?.headers?.authorization?.split(' ')[1] as string;
      userId = (await admin.auth().verifyIdToken(token)).uid;
    }
    const { orderId } = req.params;
    const invoice = await OrdersService.getInvoice(orderId, userId);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="Invoice-#${orderId}.pdf"`);
    res.send(invoice);
  } catch (err) {
    next(err);
  }
});

export default router;
