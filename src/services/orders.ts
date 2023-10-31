import models from '@models/index';
import Order from '@edugram/types/order';
import HTTPError from '@errors/HTTPError';
import User from '@edugram/types/user';
import { Types } from 'mongoose';
import Transaction from '@edugram/types/order/transaction';
import generateInvoice from '@helpers/generateInvoice';

/**
 * Get order
 * @param orderId
 * @param userId
 */
const getOrder = (orderId: string, userId: string | null) =>
  new Promise<Order>(async (resolve, reject) => {
    try {
      const shortCourseObjectFields = models.Course.getFieldsByImportanceLevel(1, '$$course', 'object', true);
      const shortCourseVersionObjectFields = models.Course.getVersionFieldsByImportanceLevel(
        1,
        '$$version.v',
        'object',
        true,
        false,
      );
      const authorProjectFields = models.User.getAuthorFields();
      const order: Order[] = (await models.Order.aggregate([
        {
          $match: {
            _id: new Types.ObjectId(orderId),
            user: userId || null,
          },
        },
        {
          $limit: 1,
        },
        {
          $lookup: {
            from: 'transactions',
            localField: 'transactions',
            foreignField: '_id',
            as: 'transactions',
            pipeline: [
              {
                $project: {
                  _id: 1,
                  amount: 1,
                  discount: 1,
                  coupons: 1,
                  status: 1,
                  gatewayId: 1,
                },
              },
            ],
          },
        },
        {
          $lookup: {
            from: 'users',
            localField: 'user',
            foreignField: '_id',
            as: 'user',
            pipeline: [
              {
                $project: {
                  first_name: 1,
                  last_name: 1,
                },
              },
            ],
          },
        },
        {
          $addFields: {
            user: { $arrayElemAt: ['$user', 0] },
          },
        },
        {
          $lookup: {
            from: 'courses',
            localField: 'items',
            foreignField: '_id',
            pipeline: [
              {
                $match: {
                  liveVersion: { $gt: 0 },
                },
              },
            ],
            as: 'items',
          },
        },
        {
          $project: {
            _id: 1,
            items: {
              $map: {
                input: '$items',
                as: 'course',
                in: {
                  $let: {
                    vars: {
                      version: {
                        $arrayElemAt: [
                          {
                            $filter: {
                              input: { $objectToArray: '$$course.versions' },
                              as: 'versions',
                              cond: { $eq: ['$$versions.v.version', '$$course.liveVersion'] },
                              limit: 1,
                            },
                          },
                          0,
                        ],
                      },
                    },
                    in: {
                      ...shortCourseObjectFields,
                      ...shortCourseVersionObjectFields,
                    },
                  },
                },
              },
            },
            itemType: 1,
            status: 1,
            transactions: 1,
            giftDetails: 1,
            user: 1,
            createdAt: 1,
          },
        },
        {
          $lookup: {
            from: 'users',
            localField: 'items.author',
            foreignField: '_id',
            as: 'author',
            pipeline: [
              {
                $project: authorProjectFields,
              },
            ],
          },
        },
        {
          $addFields: {
            'items.author': { $arrayElemAt: ['$author', 0] },
          },
        },
        {
          $project: {
            author: 0,
          },
        },
      ])) as Order[];
      if (!order[0]) {
        reject(new HTTPError(404, 'Order not found'));
        return;
      }
      resolve(order[0]);
    } catch (err) {
      console.log(err);
      reject(err);
    }
  });

/**
 * Get all user orders
 * @param userId
 */
const getOrders = (userId: string) =>
  new Promise(async (resolve, reject) => {
    try {
      const user: User = (await models.User.findOne({ _id: userId })) as User;
      if (!user) {
        reject(new HTTPError(404, 'User not found'));
        return;
      }

      const shortCourseObjectFields = models.Course.getFieldsByImportanceLevel(1, '$$course', 'object', true);
      const shortCourseVersionObjectFields = models.Course.getVersionFieldsByImportanceLevel(
        1,
        '$$version.v',
        'object',
        true,
        false,
      );
      const authorProjectFields = models.User.getAuthorFields();
      const orders: Order[] = (await models.Order.aggregate([
        {
          $match: {
            user: userId,
          },
        },
        {
          $sort: {
            updatedAt: -1,
          },
        },
        {
          $lookup: {
            from: 'transactions',
            localField: 'transactions',
            foreignField: '_id',
            as: 'transactions',
            pipeline: [
              {
                $project: {
                  _id: 1,
                  amount: 1,
                  discount: 1,
                  coupons: 1,
                  status: 1,
                  gatewayId: 1,
                },
              },
            ],
          },
        },
        {
          $lookup: {
            from: 'users',
            localField: 'user',
            foreignField: '_id',
            as: 'user',
            pipeline: [
              {
                $project: {
                  first_name: 1,
                  last_name: 1,
                },
              },
            ],
          },
        },
        {
          $addFields: {
            user: { $arrayElemAt: ['$user', 0] },
          },
        },
        {
          $lookup: {
            from: 'courses',
            localField: 'items',
            foreignField: '_id',
            pipeline: [
              {
                $match: {
                  liveVersion: { $gt: 0 },
                },
              },
            ],
            as: 'items',
          },
        },
        {
          $project: {
            _id: 1,
            items: {
              $map: {
                input: '$items',
                as: 'course',
                in: {
                  $let: {
                    vars: {
                      version: {
                        $arrayElemAt: [
                          {
                            $filter: {
                              input: { $objectToArray: '$$course.versions' },
                              as: 'versions',
                              cond: { $eq: ['$$versions.v.version', '$$course.liveVersion'] },
                              limit: 1,
                            },
                          },
                          0,
                        ],
                      },
                    },
                    in: {
                      ...shortCourseObjectFields,
                      ...shortCourseVersionObjectFields,
                    },
                  },
                },
              },
            },
            itemType: 1,
            status: 1,
            transactions: 1,
            giftDetails: 1,
            user: 1,
            createdAt: 1,
          },
        },
        {
          $lookup: {
            from: 'users',
            localField: 'items.author',
            foreignField: '_id',
            as: 'author',
            pipeline: [
              {
                $project: authorProjectFields,
              },
            ],
          },
        },
        {
          $addFields: {
            'items.author': { $arrayElemAt: ['$author', 0] },
          },
        },
        {
          $project: {
            author: 0,
          },
        },
      ])) as Order[];
      resolve(orders);
    } catch (err) {
      console.log(err);
      reject(err);
    }
  });

/**
 * Create a new Order
 * @param data
 */
const createOrder = (data: {
  userId?: string | null;
  items: string[];
  itemType: 'Course';
  giftDetails?: any;
  isGuest: boolean;
  guestCheckoutDetails?: { first_name: string; last_name: string; email: string };
}) =>
  new Promise(async (resolve, reject) => {
    try {
      const { userId, items, itemType, giftDetails = null, guestCheckoutDetails } = data;
      const orderData: any = {
        items,
        itemType,
        giftDetails,
      };
      if (items?.length > 0 && itemType) {
        if (!giftDetails) {
          if (itemType === 'Course') {
            const isOwnCourse = await models.User.exists({
              _id: userId,
              $or: [{ my_courses: { $in: items } }, { purchased_courses: { $in: items } }],
            });
            if (isOwnCourse) {
              reject(new HTTPError(409, 'Some courses cannot be purchased'));
              return;
            }
          }
        }
      }
      if (!userId) {
        orderData.isGuest = true;
        orderData.userDetails = guestCheckoutDetails;
        if (giftDetails) {
          orderData.giftDetails.senderDetails = {
            name: `${guestCheckoutDetails?.first_name} ${guestCheckoutDetails?.last_name}`,
            email: guestCheckoutDetails?.email,
          };
        }
      } else {
        orderData.user = userId;
        if (giftDetails) {
          const userData: User = (await models.User.findOne({ _id: userId })) as User;
          orderData.giftDetails.senderDetails = {
            name: `${userData.first_name} ${userData.last_name}`,
            email: userData.email,
          };
        }
      }

      const order: Order = await models.Order.create(orderData);
      resolve(order);
    } catch (err) {
      console.log(err);
      reject(err);
    }
  });

/**
 * Update Order details
 * @param data
 */
const updateOrder = (data: { orderId: string }) =>
  new Promise(async (resolve, reject) => {
    try {
      const { orderId } = data;
      const order: Order = (await models.Order.findOne({ _id: orderId })) as Order;
      resolve(order);
    } catch (err) {
      console.log(err);
      reject(err);
    }
  });

/**
 * Get transaction
 * @param transactionId
 */
const getTransaction = (transactionId: string) =>
  new Promise<Transaction>(async (resolve, reject) => {
    try {
      if (!transactionId) {
        reject(new HTTPError(400, 'Transaction ID is required'));
        return;
      }
      const transaction = await models.Transaction.findOne({ _id: transactionId }).populate(['orderId', 'user']);
      if (!transaction) {
        reject(new HTTPError(404, 'Transaction not found'));
        return;
      }
      resolve(transaction);
    } catch (err) {
      console.log(err);
      reject(err);
    }
  });

/**
 * Get downloadable invoice
 * @param orderId
 * @param userId
 */
const getInvoice = (orderId: string, userId: string | null) =>
  new Promise<Buffer>(async (resolve, reject) => {
    try {
      const transaction: Transaction = (await models.Transaction.findOne({
        orderId,
        user: userId || null,
        status: 'success',
      }).populate(['orderId', 'user'])) as Transaction;
      if (!transaction) {
        reject(new HTTPError(404, 'Transaction not found'));
        return;
      }
      const invoice = await generateInvoice(transaction);
      resolve(invoice);
    } catch (err) {
      console.log(err);
      reject(err);
    }
  });

export default {
  getOrder,
  getOrders,
  createOrder,
  updateOrder,
  getTransaction,
  getInvoice,
};
