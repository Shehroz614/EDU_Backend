import models from '@models/index';
import HTTPError from '@errors/HTTPError';
import Coupon from '@edugram/types/order/coupon';
import Transaction from '@edugram/types/order/transaction';
import Order from '@edugram/types/order';
import getSecret from '@helpers/fetchAWSSecret';
import PricingPolicy from '@edugram/types/pricingPolicy';
import Setting from '@edugram/types/setting';
import generateInvoice from '@helpers/generateInvoice';
import sendMail from '@helpers/sendMail';
import CoursesService from './courses';
import GiftService from './gifting';

/**
 * Check if coupons exists
 * @param code
 */
const couponExists = (code: string) =>
  new Promise<boolean>(async (resolve, reject) => {
    try {
      const coupon: boolean = (await models.Coupon.exists({ code })) as never as boolean;
      resolve(coupon);
    } catch (err) {
      console.log(err);
      reject(err);
    }
  });

/**
 * Create a new coupon
 * @param data
 */
const addCoupon = (data: {
  code: string;
  discount: number;
  type?: Coupon['type'];
  expiry: string;
  courseId?: string;
}) =>
  new Promise<Coupon>(async (resolve, reject) => {
    try {
      const doesExists = await couponExists(data.code);
      if (doesExists) {
        reject(new HTTPError(400, 'A coupon with the same code/name already exists'));
        return;
      }
      const coupon = await models.Coupon.create(data);
      await coupon.save();
      resolve(coupon);
    } catch (err) {
      console.log(err);
      reject(err);
    }
  });

/**
 * Delete Coupon
 * @param couponId
 */
const deleteCoupon = (couponId: string) =>
  new Promise<void>(async (resolve, reject) => {
    try {
      await models.Coupon.deleteOne({ _id: couponId });
      resolve();
    } catch (err) {
      console.log(err);
      reject(err);
    }
  });

/**
 * Check coupons validity
 * @param code
 * @param items
 * @param userId
 */
const checkDiscount = (code: string, items: string[], userId?: string | null, isGiftOrder: boolean = false) =>
  new Promise<PricingPolicy>(async (resolve, reject) => {
    try {
      const today = new Date();
      const policy: PricingPolicy = (await models.PricingPolicy.findOne({
        code,
        type: 'discount',
        courses: { $in: items },
        isActive: true,
        isAutoApplicable: false,
        startDate: { $lte: today },
        expiryDate: { $gte: today },
      })) as PricingPolicy;
      if (!policy) {
        reject(new HTTPError(404, 'Invalid discount code'));
        return;
      }
      if ((items.length > 0 && policy.courses) || (items.length > 0 && policy.excludedCourses)) {
        if (!items.some((i) => policy.courses?.includes(i)) || items.some((i) => policy.excludedCourses?.includes(i))) {
          reject(new HTTPError(403, 'You cannot avail this discount'));
          return;
        }
      }
      if (userId) {
        if (
          ((policy.users?.length as number) > 0 && !policy.users?.includes(userId)) ||
          ((policy.excludedUsers?.length as number) > 0 && !policy.excludedUsers?.includes(userId))
        ) {
          reject(new HTTPError(403, 'You cannot avail this discount'));
          return;
        }
      }
      if (isGiftOrder && !policy.allowDiscountsForGifts) {
        reject(new HTTPError(403, 'You cannot avail this discount'));
        return;
      }
      resolve(policy);
    } catch (err) {
      console.log(err);
      reject(err);
    }
  });

const checkout = (data: {
  items: string[];
  currency: string;
  discounts: string[];
  itemType: string;
  userId?: string | null;
  orderId: string;
  guestCheckoutDetails?: { first_name: string; last_name: string; email: string };
}) =>
  new Promise(async (resolve, reject) => {
    try {
      const PaymentsConfig = JSON.parse((await getSecret('PG')) as string);
      // eslint-disable-next-line global-require
      const stripe = require('stripe')(PaymentsConfig.STRIPE_SECRET_KEY);

      const { items, currency, discounts, itemType, userId, orderId, guestCheckoutDetails } = data;

      const basePriceQuery: Setting = (await models.Setting.findOne({ name: 'courseBasePrice' }).lean()) as Setting;
      const basePrice = basePriceQuery?.value;

      let priceSum: number = 0;
      let discountSum: number = 0;
      const courses: any[] = [];
      const today = new Date();

      // cross verify min/baseprice against PPD/PPP

      // eslint-disable-next-line no-restricted-syntax
      for (const item of items) {
        if (itemType === 'Course') {
          const course: any = await CoursesService.getLiveVersion(item, true);
          let coursePricingPolicy;
          let courseDiscountApplied = false;
          if (course) {
            // if smart price then apply platform's pricing policy or else author's pricing policy is already applied
            if (course.priceType === 'smart') {
              // Get admin pricing policy
              coursePricingPolicy = await models.PricingPolicy.findOne({
                courses: { $in: [course._id] },
                $or: [{ targetCourseVersion: { $in: [course.version] } }, { courseTargetMode: 'Course' }],
                isActive: true,
                startDate: { $lte: today },
                expiryDate: { $gte: today },
                createdBy: { $ne: course.author._id },
              }).sort({ updatedAt: -1 });
              if (coursePricingPolicy) {
                const priceLimit = course.minPrice > basePrice ? course.minPrice : basePrice;
                if (coursePricingPolicy.value > priceLimit) {
                  if (coursePricingPolicy.showOriginalPrice) {
                    course.salePrice = coursePricingPolicy.value * 100;
                  } else {
                    course.price = coursePricingPolicy.value * 100;
                    course.salePrice = null;
                  }
                }
              }
            }
            if (discounts && discounts.length > 0) {
              // process applied discounts
              const discountPolicy: PricingPolicy | null = await models.PricingPolicy.findOne({
                _id: { $in: [discounts] },
                courses: { $in: [course._id] },
                isActive: true,
                isAutoApplicable: false,
                startDate: { $lte: today },
                expiryDate: { $gte: today },
              }).sort({ updatedAt: -1 });
              if (discountPolicy) {
                if (
                  ((coursePricingPolicy?.allowCourseDiscounts || true) &&
                    discountPolicy.createdBy === course.author._id) ||
                  coursePricingPolicy?.allowGlobalDiscounts ||
                  true
                ) {
                  if (discountPolicy.valueType === 'fixed') {
                    const discount = discountPolicy.value * 100;
                    course.discount = discount;
                  } else {
                    const discount = discountPolicy.value;
                    course.discount = (+discount / 100) * (+course.salePrice || +course.price) * 100;
                  }
                  courseDiscountApplied = true;
                }
              }
            } else if (!courseDiscountApplied && coursePricingPolicy?.allowGlobalDiscounts) {
              // process auto applicable platform discounts
              const discountPolicy: PricingPolicy | null = await models.PricingPolicy.findOne({
                courses: { $in: [course._id] },
                $or: [{ targetCourseVersion: { $in: [course.version] } }, { courseTargetMode: 'Course' }],
                isAutoApplicable: true,
                isActive: true,
                startDate: { $lte: today },
                expiryDate: { $gte: today },
                createdBy: { $ne: course.author._id },
              }).sort({ updatedAt: -1 });
              if (discountPolicy) {
                if (discountPolicy.valueType === 'fixed') {
                  const discount = discountPolicy.value * 100;
                  course.discount = discount;
                } else {
                  const discount = discountPolicy.value;
                  course.discount = (+discount / 100) * (+course.salePrice || +course.price) * 100;
                }
                courseDiscountApplied = true;
                discounts.push(discountPolicy.code);
              }
            } else if (!courseDiscountApplied && (coursePricingPolicy?.allowCourseDiscounts || true)) {
              // process auto applicable author discounts
              const discountPolicy: PricingPolicy | null = await models.PricingPolicy.findOne({
                courses: { $in: [course._id] },
                $or: [{ targetCourseVersion: { $in: [course.version] } }, { courseTargetMode: 'Course' }],
                isAutoApplicable: true,
                isActive: true,
                startDate: { $lte: today },
                expiryDate: { $gte: today },
                createdBy: course.author._id,
              }).sort({ updatedAt: -1 });
              console.log(discountPolicy);
              if (discountPolicy) {
                if (discountPolicy.valueType === 'fixed') {
                  const discount = discountPolicy.value * 100;
                  course.discount = discount;
                } else {
                  const discount = discountPolicy.value;
                  course.discount = (+discount / 100) * (+course.salePrice || +course.price) * 100;
                }
                courseDiscountApplied = true;
                discounts.push(discountPolicy.code);
              }
            }
            courses.push(course);
          }
        }
      }

      courses?.forEach((item) => {
        const price = item.salePrice || item.price;
        const discount = +item.discount || 0;
        discountSum += discount;
        priceSum += +price;
      });

      let paymentIntent;

      if (Number.isNaN(priceSum) || priceSum === 0) {
        paymentIntent = { id: null };
      } else {
        const intentData = {
          amount: priceSum - discountSum,
          currency,
          automatic_payment_methods: { enabled: true },
          metadata: {
            items: items.join(','),
            itemType,
            orderId,
          },
        };
        if (!userId) {
          // @ts-ignore
          intentData.metadata.userData = guestCheckoutDetails;
        } else {
          // @ts-ignore
          intentData.metadata.user = userId;
        }
        paymentIntent = await stripe.paymentIntents.create(intentData);
      }

      const transactionData = {
        user: userId,
        amount: priceSum,
        discount: discountSum,
        status: Number.isNaN(priceSum) || priceSum === 0 ? 'success' : 'pending',
        discounts,
        gatewayId: paymentIntent.id,
        itemType,
        items: courses.map((c) => ({
          _id: c._id,
          title: c.title,
          author: c.author,
          price: c.price,
          salePrice: c.salePrice,
          discount: c.discount,
          presentationalImage: c.presentationalImage,
        })),
        orderId,
      };
      if (!userId) {
        // @ts-ignore
        transactionData.userDetails = guestCheckoutDetails;
      } else {
        transactionData.user = userId;
      }

      const transaction = await models.Transaction.create(transactionData);
      await transaction.save();
      await models.User.updateOne({ _id: userId }, { $push: { transactions: transaction._id } });
      await models.Order.updateOne({ _id: orderId }, { $push: { transactions: transaction._id } });
      if (Number.isNaN(priceSum) || priceSum === 0) {
        const order: Order = (await models.Order.findOne({ _id: orderId }).populate('giftDetails')) as Order;
        // Send order confirmation/invoice
        const fetchedTransaction: Transaction = (await models.Transaction.findOne({
          _id: transaction._id,
        }).populate(['orderId', 'user'])) as Transaction;

        const invoice = await generateInvoice(fetchedTransaction);
        await sendMail(fetchedTransaction.user ? fetchedTransaction.user.email : order.userDetails.email, {
          subject: `Edugram.io - Order #${order._id}`,
          html: 'Order invoice',
          attachments: [
            {
              content: invoice.toString('base64'),
              filename: `invoice-${order._id}.pdf`,
              type: 'application/pdf',
              disposition: 'attachment',
              content_id: order._id,
            },
          ],
        });

        if (itemType === 'Course') {
          if (order.giftDetails?.recipientDetails?.email) {
            await GiftService.createGift(order);
          } else if (userId) {
            await models.User.updateOne(
              { _id: userId },
              {
                $push: { purchased_courses: { $each: items } },
                $pull: {
                  wishlist: { $in: items },
                  in_cart: { $in: items },
                },
              },
            );
          }
        }
        order.status = 'success';
        await order.save();
        reject(new HTTPError(201, 'Payment not required'));
      } else {
        resolve({
          client_secret: paymentIntent.client_secret,
        });
      }
    } catch (err) {
      console.log(err);
      reject(err);
    }
  });

/**
 * Validate Transaction
 * @param request
 */
const validatePurchase = (request: any) =>
  new Promise<void>(async (resolve, reject) => {
    try {
      let event = request.body;
      const PaymentsConfig = JSON.parse((await getSecret('PG')) as string);
      // eslint-disable-next-line global-require
      const stripe = require('stripe')(PaymentsConfig.STRIPE_SECRET_KEY);
      const endpointSecret: string = PaymentsConfig.STRIPE_ENDPOINT_SECRET;

      if (endpointSecret) {
        const signature = request.headers['stripe-signature'];
        try {
          event = stripe.webhooks.constructEvent(request.body, signature, endpointSecret);
        } catch (err) {
          reject(new HTTPError(500, 'Webhook signature verification failed'));
          return;
        }
      }
      if (event.type === 'payment_intent.succeeded' || event.type === 'payment_intent.payment_failed') {
        const paymentIntent = event.data.object;
        const transaction: Transaction = (await models.Transaction.findOne({
          gatewayId: paymentIntent.id,
        }).populate(['orderId', 'user'])) as Transaction;
        const order: Order = (await models.Order.findOne({ _id: transaction.orderId._id }).populate(
          'giftDetails',
        )) as Order;
        transaction.status = paymentIntent.status === 'succeeded' ? 'success' : 'failed';
        order.status = paymentIntent.status === 'succeeded' ? 'success' : 'failed';

        if (paymentIntent.status === 'succeeded') {
          // Send confirmation & invoice mail
          const invoice = await generateInvoice(transaction);
          await sendMail(transaction.user ? transaction.user.email : order.userDetails.email, {
            subject: `Edugram.io - Order #${order._id}`,
            html: 'Order invoice',
            attachments: [
              {
                content: invoice.toString('base64'),
                filename: `invoice-${order._id}.pdf`,
                type: 'application/pdf',
                disposition: 'attachment',
                content_id: order._id,
              },
            ],
          });

          if (transaction.itemType === 'Course') {
            if (order.giftDetails?.recipientDetails?.email) {
              await GiftService.createGift(order);
            } else if (transaction) {
              if (transaction.user) {
                await models.User.updateOne(
                  { _id: transaction.user },
                  {
                    $push: { purchased_courses: { $each: transaction.items.map((i: any) => i._id) } },
                    $pull: {
                      wishlist: { $in: transaction.items.map((i: any) => i._id) },
                      in_cart: { $in: transaction.items.map((i: any) => i._id) },
                    },
                  },
                );
              }
            }
          }
        }
        await transaction.save();
        await order.save();
      }
      resolve();
    } catch (err) {
      console.log(err);
      reject(err);
    }
  });

export default {
  checkout,
  validatePurchase,
  checkDiscount,
  couponExists,
  addCoupon,
  deleteCoupon,
};
