import models from '@models/index';
import HTTPError from '@errors/HTTPError';
import Gift from '@edugram/types/order/gift';
import User from '@edugram/types/user';
import { Types } from 'mongoose';
import sendMail from '@helpers/sendMail';
import { GIFT_RECIPIENT_INTIMATION, GIFT_REDEEM_INTIMATION } from '@constants/mailTemplates';
import dayjs from 'dayjs';

const { v4: uuid } = require('uuid');

/**
 * Get Gift Details
 * @param orderId
 */
const getGift = (orderId: string) =>
  new Promise<Gift>(async (resolve, reject) => {
    try {
      const gift = (await models.Gift.aggregate([
        {
          $match: {
            orderId: new Types.ObjectId(orderId),
          },
        },
        {
          $project: {
            _id: 1,
            message: 1,
            items: 1,
            itemType: 1,
            senderDetails: 1,
            isAnonymous: 1,
            recipient: 1,
            redeemedAt: 1,
          },
        },
      ])) as any as Gift[];

      if (!gift || gift.length === 0) {
        reject(new HTTPError(404, 'Gifted Item not found'));
        return;
      }

      const shortCourseObjectFields = models.Course.getFieldsByImportanceLevel(1, 1, 'object', false);
      const shortCourseVersionObjectFields = models.Course.getVersionFieldsByImportanceLevel(
        1,
        '$$version.v',
        'object',
        true,
        false,
      );
      const authorProjectFields = models.User.getAuthorFields();

      const courseIds = gift[0].items.map((i) => new Types.ObjectId(i));
      const courses = await models.Course.aggregate([
        {
          $match: { _id: { $in: courseIds } },
        },
        {
          $lookup: {
            from: 'users',
            localField: 'author',
            foreignField: '_id',
            as: 'author',
            pipeline: [{ $project: authorProjectFields }],
          },
        },
        {
          $addFields: {
            author: { $arrayElemAt: ['$author', 0] },
          },
        },
        {
          $project: {
            ...shortCourseObjectFields,
            liveVersion: {
              $let: {
                vars: {
                  version: {
                    $arrayElemAt: [
                      {
                        $filter: {
                          input: { $objectToArray: '$versions' },
                          cond: {
                            $eq: ['$$this.v.version', '$liveVersion'],
                          },
                        },
                      },
                      0,
                    ],
                  },
                },
                in: {
                  ...shortCourseVersionObjectFields,
                },
              },
            },
          },
        },
        {
          $replaceRoot: {
            newRoot: {
              $mergeObjects: ['$$ROOT', '$liveVersion'],
            },
          },
        },
        {
          $project: {
            liveVersion: 0,
          },
        },
      ]);
      gift[0].items = courses;
      resolve(gift[0]);
    } catch (err) {
      console.log(err);
      reject(err);
    }
  });

/**
 * Create Gift
 * @param data
 */
const createGift = (data: any) =>
  new Promise<Gift>(async (resolve, reject) => {
    try {
      const gift = (await models.Gift.create({
        code: uuid(),
        message: data.giftDetails.message,
        scheduled: data.giftDetails.scheduled,
        scheduledAt: data.giftDetails.scheduledAt,
        sender: data.isGuest ? null : data.user,
        senderIsGuest: data.isGuest,
        senderDetails: data.giftDetails.senderDetails,
        recipient: data.giftDetails.recipientDetails,
        isAnonymous: data.giftDetails.isAnonymous,
        items: data.items,
        itemType: data.itemType,
        orderId: data._id,
      })) as Gift;
      const shortCourseObjectFields = models.Course.getFieldsByImportanceLevel(1, 1, 'object', false);
      const shortCourseVersionObjectFields = models.Course.getVersionFieldsByImportanceLevel(
        1,
        '$$version.v',
        'object',
        true,
        false,
      );
      const authorProjectFields = models.User.getAuthorFields();

      const courseIds = data.items.map((i: any) => new Types.ObjectId(i));
      const courses = await models.Course.aggregate([
        {
          $match: { _id: { $in: courseIds } },
        },
        {
          $lookup: {
            from: 'users',
            localField: 'author',
            foreignField: '_id',
            as: 'author',
            pipeline: [{ $project: authorProjectFields }],
          },
        },
        {
          $addFields: {
            author: { $arrayElemAt: ['$author', 0] },
          },
        },
        {
          $project: {
            ...shortCourseObjectFields,
            liveVersion: {
              $let: {
                vars: {
                  version: {
                    $arrayElemAt: [
                      {
                        $filter: {
                          input: { $objectToArray: '$versions' },
                          cond: {
                            $eq: ['$$this.v.version', '$liveVersion'],
                          },
                        },
                      },
                      0,
                    ],
                  },
                },
                in: {
                  ...shortCourseVersionObjectFields,
                },
              },
            },
          },
        },
        {
          $replaceRoot: {
            newRoot: {
              $mergeObjects: ['$$ROOT', '$liveVersion'],
            },
          },
        },
        {
          $project: {
            liveVersion: 0,
          },
        },
      ]);
      await sendMail(data.giftDetails.recipientDetails.email, {
        subject: 'Edugram.io - Gifted Course received',
        template_id: GIFT_RECIPIENT_INTIMATION,
        dynamic_template_data: {
          name: data.giftDetails.recipientDetails.name,
          home_url: process.env.IsProduction === 'true' ? 'https://edugram.io' : 'https://dev.edugram.io',
          redeem_url: `${process.env.IsProduction === 'true' ? 'https://edugram.io' : 'https://dev.edugram.io'}/gift/${
            data._id
          }`,
          courses,
        },
      });

      resolve(gift);
    } catch (err) {
      console.log(err);
      reject(err);
    }
  });

/**
 * Redeem gift
 * @param data
 */
const redeemGift = (data: { orderId: string; userId: string }) =>
  new Promise<void>(async (resolve, reject) => {
    try {
      const { orderId, userId } = data;
      if (!orderId) {
        reject(new HTTPError(400, 'Order ID is required'));
        return;
      }
      const [giftDetails, user]: [Gift, User] = await Promise.all([
        (await models.Gift.findOne({ orderId, redeemedAt: null }).populate({
          path: 'sender',
          select: 'first_name last_name email', // Specify the fields you want to include from the 'sender' document
        })) as Gift,
        (await models.User.findOne({ _id: userId })) as User,
      ]);
      if (!giftDetails) {
        reject(new HTTPError(404, 'Gifted Item not found'));
        return;
      }
      if (giftDetails.recipient.email !== user.email) {
        reject(new HTTPError(403, 'You cannot redeem this gifted item(s)'));
        return;
      }
      if (giftDetails.itemType === 'Course') {
        user.purchased_courses = [...user.purchased_courses, ...giftDetails.items];
      }

      giftDetails.redeemedAt = new Date();
      giftDetails.redeemedBy = userId;

      const shortCourseVersionObjectFields = models.Course.getVersionFieldsByImportanceLevel(
        1,
        '$$version.v',
        'object',
        true,
        false,
      );
      const courseIds = giftDetails.items.map((i: any) => new Types.ObjectId(i));
      const courses = await models.Course.aggregate([
        {
          $match: { _id: { $in: courseIds } },
        },
        {
          $project: {
            liveVersion: {
              $let: {
                vars: {
                  version: {
                    $arrayElemAt: [
                      {
                        $filter: {
                          input: { $objectToArray: '$versions' },
                          cond: {
                            $eq: ['$$this.v.version', '$liveVersion'],
                          },
                        },
                      },
                      0,
                    ],
                  },
                },
                in: {
                  ...shortCourseVersionObjectFields,
                },
              },
            },
          },
        },
        {
          $replaceRoot: {
            newRoot: {
              $mergeObjects: ['$$ROOT', '$liveVersion'],
            },
          },
        },
        {
          $project: {
            liveVersion: 0,
          },
        },
      ]);

      await sendMail(giftDetails.sender ? giftDetails.sender.email : giftDetails.senderDetails.email, {
        subject: 'Edugram.io - Gifted Course was redeemed',
        template_id: GIFT_REDEEM_INTIMATION,
        dynamic_template_data: {
          name: giftDetails.sender
            ? `${giftDetails.sender.first_name} ${giftDetails.sender.last_name}`
            : giftDetails.senderDetails.name,
          recipient_name: giftDetails.recipient.name,
          redeemed_at: dayjs(giftDetails.redeemedAt).format('DD/MM/YYYY'),
          courses: courses.map((c: any) => c.title)?.join(', '),
          home_url: process.env.IsProduction === 'true' ? 'https://edugram.io' : 'https://dev.edugram.io',
        },
      });
      await user.save();
      await giftDetails.save();
      resolve();
    } catch (err) {
      console.log(err);
      reject(err);
    }
  });

export default {
  getGift,
  createGift,
  redeemGift,
};
