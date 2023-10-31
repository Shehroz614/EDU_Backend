import { Express } from 'express';
import models from '@models/index';
import HTTPError from '@errors/HTTPError';
import User from '@edugram/types/user';
import Course from '@edugram/types/course';
import ShortCourse from '@edugram/types/course/shortCourse';
import getSecret from '@helpers/fetchAWSSecret';
import Oracle from '@services/oracle';
import UserVerificationRequest from '@edugram/types/user/userVerificationRequest';
import { isEmpty } from '@middlewares/miniLodash';
import CourseService from './courses';

/**
 * Update Profile
 * @param userId
 * @param data
 */
const updateProfile = (userId: string, data: User) =>
  new Promise<User>(async (resolve, reject) => {
    try {
      const user: User = (await models.User.findById(userId)) as User;
      if (!user) {
        reject(new HTTPError(404, 'User not found'));
        return;
      }
      user.set(data);
      await user.save();
      resolve(user);
    } catch (err) {
      console.log(err);
      reject(err);
    }
  });

/**
 * Update Avatar
 * @param userId
 * @param file
 */
const updateAvatar = (userId: string, file: Express.Multer.File) =>
  new Promise<User>(async (resolve, reject) => {
    try {
      const user: User = (await models.User.findById(userId)) as User;
      if (!user) {
        reject(new HTTPError(404, 'User not found'));
        return;
      }
      if (!file) {
        reject(new HTTPError(400, 'Avatar file is required'));
      }

      const path = `user-storage/${userId}/avatar/${file.originalname}`;
      await Oracle.putObject(path, file.buffer);
      const imageUrl = await Oracle.generateUrl(path);
      user.set({
        avatar: imageUrl,
      });
      await user.save();
      resolve(user);
    } catch (err) {
      console.log(err);
      reject(err);
    }
  });

/**
 * Get courses where user is the author
 * @param userId
 */
const getOwnCourses = (userId: string) =>
  new Promise<Course[]>(async (resolve, reject) => {
    try {
      const user: User = (await models.User.findById(userId)) as User;
      if (!user) {
        reject(new HTTPError(404, 'User not found'));
        return;
      }

      const today = new Date();
      const shortCourseObjectFields = models.Course.getFieldsByImportanceLevel(1, 1, 'object', false);
      const shortCourseVersionObjectFields = models.Course.getVersionFieldsByImportanceLevel(
        1,
        '$$filteredVersions.v',
        'object',
        true,
        false,
      );
      const authorProjectFields = models.User.getAuthorFields();

      const courses: Course[] = await models.Course.aggregate([
        {
          $match: {
            author: userId,
          },
        },
        {
          $sort: {
            createdAt: -1,
          },
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
            versions: {
              $map: {
                input: {
                  $slice: [{ $objectToArray: '$versions' }, -3],
                },
                as: 'filteredVersions',
                in: {
                  ...shortCourseVersionObjectFields,
                },
              },
            },
          },
        },
        // Apply Pricing Policies
        {
          $unwind: '$versions',
        },
        {
          $lookup: {
            from: 'pricing_policies',
            let: { pricingPoliciesId: { $ifNull: ['$versions.pricingPolicies', []] }, authorId: '$author._id' },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $in: ['$_id', '$$pricingPoliciesId'] },
                      { $eq: ['$type', 'override'] },
                      { $eq: ['$isActive', true] },
                      { $lte: ['$startDate', today] },
                      { $gte: ['$expiryDate', today] },
                      { $eq: ['$createdBy', '$$authorId'] },
                    ],
                  },
                },
              },
            ],
            as: 'versions.pricingPolicies',
          },
        },
        {
          $addFields: {
            'versions.pricingPolicies': { $arrayElemAt: ['$versions.pricingPolicies', 0] },
          },
        },
        {
          $addFields: {
            'versions.price': {
              $cond: {
                if: { $eq: ['$versions.pricingPolicies.showOriginalPrice', false] },
                then: { $multiply: ['$versions.pricingPolicies.value', 100] },
                else: {
                  $cond: {
                    if: {
                      $and: [
                        { $ne: ['$versions.pricingPolicies.initialValue', null] },
                        { $gt: ['$versions.pricingPolicies.initialValue', 0] },
                      ],
                    },
                    then: { $multiply: ['$versions.pricingPolicies.initialValue', 100] },
                    else: '$versions.price',
                  },
                },
              },
            },
            'versions.salePrice': {
              $cond: {
                if: { $eq: ['$versions.pricingPolicies.showOriginalPrice', true] },
                then: { $multiply: ['$versions.pricingPolicies.value', 100] },
                else: '$versions.salePrice',
              },
            },
          },
        },
        {
          $project: {
            'versions.pricingPolicies': 0,
          },
        },
        {
          $group: {
            _id: '$_id',
            author: { $first: '$author' },
            ratingQty: { $first: '$ratingQty' },
            rating: { $first: '$rating' },
            versions: { $push: '$versions' },
          },
        },
        {
          $addFields: {
            versions: {
              $arrayToObject: {
                $map: {
                  input: '$versions',
                  as: 'version',
                  in: {
                    k: { $toString: '$$version.version' },
                    v: '$$version',
                  },
                },
              },
            },
          },
        },
      ]);
      resolve(courses);
    } catch (err) {
      console.log(err);
      reject(err);
    }
  });

/**
 * Get courses -  my_courses, purchased_courses, wishlist, in_cart
 * @param userId
 * @param type
 */
const getCourses = (
  userId: string,
  type: 'my_courses' | 'purchased_courses' | 'wishlist' | 'in_cart' | 'saved_items',
) =>
  new Promise<ShortCourse[] | { courses: ShortCourse[]; progress: {} }>(async (resolve, reject) => {
    try {
      const types = new Set(['my_courses', 'purchased_courses', 'wishlist', 'in_cart', 'saved_items']);
      if (!types.has(type)) {
        reject(new HTTPError(400, 'Invalid type'));
        return;
      }
      const user: User = (await models.User.findById(userId)) as User;
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

      const query: User[] = (await models.User.aggregate([
        {
          $match: {
            _id: userId,
          },
        },
        {
          $lookup: {
            from: 'courses',
            localField: type,
            foreignField: '_id',
            pipeline: [
              {
                $match: {
                  liveVersion: { $gt: 0 },
                },
              },
            ],
            as: type,
          },
        },
        {
          $project: {
            [type]: {
              $map: {
                input: `$${type}`,
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
          },
        },
        {
          $lookup: {
            from: 'users',
            localField: `${type}.author`,
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
            [`${type}.author`]: { $arrayElemAt: ['$author', 0] },
          },
        },
        // Final Project
        {
          $project: {
            author: 0,
          },
        },
      ])) as any;

      // @ts-ignore
      const courses: ShortCourse[] = query[0]?.[type] || [];
      let response: any = courses;
      if (type === 'purchased_courses') {
        const progress = {};
        // eslint-disable-next-line no-restricted-syntax
        for (const c of courses) {
          // @ts-ignore
          progress[c._id] = await CourseService.getProgress({ userId, courseId: c._id });
        }
        response = {
          courses,
          progress,
        };
      }
      resolve(response);
    } catch (err) {
      console.log(err);
      reject(err);
    }
  });

/**
 * Add to courses -  wishlist | in_cart
 * @param data
 */
const addToCourses = (data: {
  courseId: string;
  userId: string;
  type: 'my_courses' | 'wishlist' | 'in_cart' | 'saved_items';
}) =>
  new Promise<ShortCourse[]>(async (resolve, reject) => {
    try {
      const types = new Set(['my_courses', 'wishlist', 'in_cart', 'saved_items']);
      const { courseId, userId, type } = data;
      if (!types.has(type)) {
        reject(new HTTPError(400, 'Invalid type'));
        return;
      }

      const [isCourseReal, user]: [isCourseReal: boolean, user: User] = await Promise.all([
        models.Course.exists({
          _id: courseId,
        }) as any as boolean,
        models.User.findOne({
          _id: userId,
          [type]: { $ne: courseId },
          $and: [{ my_courses: { $nin: [courseId] } }, { purchased_courses: { $nin: [courseId] } }],
        }).select([type]) as never as User,
      ]);
      if (!isCourseReal) {
        reject(new HTTPError(403, 'Course not found'));
        return;
      }
      if (!user) {
        reject(new HTTPError(409, 'Cannot add this course'));
        return;
      }
      user[type].push(courseId);
      await user.save();
      const response = (await getCourses(userId, type)) as ShortCourse[];
      resolve(response);
    } catch (err) {
      console.log(err);
      reject(err);
    }
  });

/**
 * Update courses with new items -  wishlist | in_cart
 * @param data
 */
const updateCourses = (data: { courses: string[]; userId: string; type: 'wishlist' | 'in_cart' | 'saved_items' }) =>
  new Promise<ShortCourse[]>(async (resolve, reject) => {
    try {
      const types = new Set(['wishlist', 'in_cart', 'saved_items']);
      const { courses, userId, type } = data;
      if (!types.has(type)) {
        reject(new HTTPError(400, 'Invalid type!'));
        return;
      }
      const user: User = (await models.User.findOne({ _id: userId })
        .select([type, 'my_courses', 'purchased_courses'])
        .populate(type)) as User;
      if (!user) {
        reject(new HTTPError(404, 'User not found'));
        return;
      }

      let newCourses: string[] = courses.filter((c) => c !== null);
      newCourses = [...user[type].map((i: Course) => i._id.toString()), ...newCourses];
      newCourses = [...new Set(newCourses)];

      // eslint-disable-next-line no-restricted-syntax
      for (const course of newCourses) {
        const isCourseReal = await models.Course.exists({
          _id: course,
        });
        if (!isCourseReal) {
          reject(new HTTPError(404, 'Course not found'));
          return;
        }

        if (user.my_courses?.includes(course) || user.purchased_courses?.includes(course)) {
          newCourses = newCourses.filter((n) => n !== course);
        }
      }

      user[type] = newCourses;
      await user.save();
      const response = (await getCourses(userId, type)) as ShortCourse[];
      resolve(response);
    } catch (err) {
      console.log(err);
      reject(err);
    }
  });

/**
 * Delete from courses -  wishlist | in_cart
 * @param data
 * @returns {Promise<unknown>}
 */
const deleteFromCourses = (data: {
  courseId: string;
  userId: string;
  type: 'wishlist' | 'in_cart' | 'saved_items';
}): Promise<unknown> =>
  new Promise<void>(async (resolve, reject) => {
    try {
      const types = new Set(['wishlist', 'in_cart', 'saved_items']);
      const { courseId, userId, type } = data;
      if (!types.has(type)) {
        reject(new HTTPError(400, 'Invalid type'));
        return;
      }
      const user: User = (await models.User.findById(userId)) as User;
      if (!user) {
        reject(new HTTPError(404, 'User not found'));
        return;
      }

      await models.User.updateOne({ _id: userId, [type]: courseId }, { $pull: { [type]: courseId } });
      resolve();
    } catch (err) {
      console.log(err);
      reject(err);
    }
  });

/**
 * Get Author Profile details
 * @param userId
 */
const getAuthorDetails = (userId: string) =>
  new Promise(async (resolve, reject) => {
    try {
      const user: User = (await models.User.findOne({ _id: userId })) as User;
      if (!user) {
        reject(new HTTPError(404, 'User not found'));
        return;
      }

      const courses = await models.Course.aggregate([
        {
          $match: {
            author: userId,
          },
        },
        {
          $group: {
            _id: null,
            avgRating: { $avg: '$rating' },
            avgStudentsQty: { $avg: '$studentsQty' },
          },
        },
      ]);

      resolve({
        firstName: user.first_name,
        lastName: user.last_name,
        avatar: user.avatar,
        averageRating: Math.ceil(courses[0].avgRating),
        totalStudents: Math.ceil(courses[0].avgStudentsQty),
        totalCourses: user.my_courses.length,
      });
    } catch (err) {
      console.log(err);
    }
  });

const getAuthorPublicFileURL = (userId: string, file: string) =>
  new Promise(async (resolve, reject) => {
    try {
      const user: User = (await models.User.findOne({ _id: userId })) as User;
      if (!user) {
        reject(new HTTPError(404, 'User not found'));
      }
      if (!file) {
        reject(new HTTPError(400, 'File is required'));
        return;
      }

      const today = new Date();
      const expiry = new Date(today);
      expiry.setHours(expiry.getHours() + 2);
      const path = `user-storage/${userId}/intro`;
      const response = await Oracle.createPreAuthenticatedRequest(path, file, expiry, 'ObjectWrite');

      if (isEmpty(response.url)) {
        reject(new HTTPError(500, 'Something went wrong'));
        return;
      }
      resolve(response);
    } catch (err) {
      console.log(err);
      reject(err);
    }
  });

const updateAuthorIntroVideo = (userId: string, file: string) =>
  new Promise(async (resolve, reject) => {
    try {
      const user: User = (await models.User.findOne({ _id: userId })) as User;
      if (!user) {
        reject(new HTTPError(404, 'User not found'));
      }
      if (!file) {
        reject(new HTTPError(400, 'File is required'));
        return;
      }
      const path = `user-storage/${userId}/intro/${file}`;
      const isFileReal = await Oracle.isFileReal(path);
      if (!isFileReal) {
        reject(new HTTPError(404, 'Media not found'));
        return;
      }
      const videoURL = await Oracle.generateUrl(path);
      user.set({
        introductoryVideo: videoURL,
      });
      await user.save();
      resolve(user);
    } catch (err) {
      console.log(err);
      reject(err);
    }
  });

/**
 * Get Stripe connect supported countries
 * @param userId
 */
const getAuthorVerificationSupportedCountries = (userId: string) =>
  new Promise(async (resolve, reject) => {
    try {
      const PaymentsConfig = JSON.parse(process.env.PG_CONFIG as string);
      // eslint-disable-next-line global-require
      const stripe = require('stripe')(PaymentsConfig.STRIPE_SECRET_KEY);

      const countrySpecs: any[] = [];

      const fetchCountryList = async (starting_after: string | null = null): Promise<void> => {
        const query: { limit: number; starting_after?: string } = { limit: 100 };

        if (starting_after) {
          query.starting_after = starting_after;
        }

        const list = await stripe.countrySpecs.list(query);
        countrySpecs.push(...list.data);

        if (list.has_more) {
          const lastItem = list.data[list.data.length - 1];
          await fetchCountryList(lastItem.id);
        }
      };

      await fetchCountryList();

      const formattedList = countrySpecs.map((i: any) => i.id);
      resolve(formattedList);
    } catch (err) {
      console.log(err);
      reject(err);
    }
  });

/**
 * Get Author verification status from stripe
 * @param userId
 */
const getAuthorVerificationStatus = (userId: string) =>
  new Promise(async (resolve, reject) => {
    try {
      const PaymentsConfig = JSON.parse((await getSecret('PG')) as string);
      // eslint-disable-next-line global-require
      const stripe = require('stripe')(PaymentsConfig.STRIPE_SECRET_KEY);
      const user: User = (await models.User.findOne({ _id: userId })) as User;
      if (!user) {
        reject(new HTTPError(404, 'User not found'));
      }
      let account: any = {};
      if (user.stripeConnectedAccountId) {
        const stripeAccount = await stripe.accounts.retrieve(user.stripeConnectedAccountId);
        const verificationRequest: UserVerificationRequest | null = await models.UserVerificationRequest.findOne({
          user: userId,
        });
        account = {
          stripe: {
            country: stripeAccount.country,
            requirements: stripeAccount.requirements,
          },
          edugram: {
            submitted: !!verificationRequest,
            submittedAt: verificationRequest?.createdAt || null,
            verified: verificationRequest?.isVerified || null,
            verifiedAt: verificationRequest?.verifiedAt || null,
          },
        };
      } else {
        account = {
          stripe: {},
          edugram: {
            submitted: false,
            submittedAt: false,
            verified: false,
            verifiedAt: false,
          },
        };
      }
      resolve(account);
    } catch (err) {
      console.log(err);
      reject(err);
    }
  });

/**
 * Create author verification session with stripe
 * @param userId
 * @param country
 */
const createAuthorVerificationSession = (userId: string, country: string) =>
  new Promise(async (resolve, reject) => {
    try {
      const PaymentsConfig = JSON.parse((await getSecret('PG')) as string);
      // eslint-disable-next-line global-require
      const stripe = require('stripe')(PaymentsConfig.STRIPE_SECRET_KEY);
      const user: User = (await models.User.findOne({ _id: userId })) as User;
      if (!user) {
        reject(new HTTPError(404, 'User not found'));
        return;
      }

      let account;
      if (user.stripeConnectedAccountId) {
        account = await stripe.accounts.retrieve(user.stripeConnectedAccountId);
      } else {
        let caps: any = {
          transfers: {
            requested: true,
          },
          card_payments: {
            requested: true,
          },
        };
        if (country === 'US') {
          caps = {
            ...caps,
            tax_reporting_us_1099_k: {
              requested: true,
            },
            tax_reporting_us_1099_misc: {
              requested: true,
            },
          };
        }
        account = await stripe.accounts.create({
          type: 'custom',
          email: user.email,
          country,
          capabilities: caps,
        });
        user.stripeConnectedAccountId = account.id;
      }

      const accountSession = await stripe.accountLinks.create({
        account: account.id,
        refresh_url: `${
          process.env.IsProduction === 'true' ? 'https://edugram.io' : 'https://dev.edugram.io'
        }/author/verification`,
        return_url: `${
          process.env.IsProduction === 'true' ? 'https://edugram.io' : 'https://dev.edugram.io'
        }/author/verification`,
        type: 'account_onboarding',
        collect: 'currently_due',
      });

      await user.save();
      resolve(accountSession);
    } catch (err) {
      console.log(err);
      reject(err);
    }
  });

/**
 * Create author verification session with stripe
 * @param userId
 */
const resetAuthorVerificationSession = (userId: string) =>
  new Promise<void>(async (resolve, reject) => {
    try {
      const user: User = (await models.User.findOne({ _id: userId })) as User;
      if (!user) {
        reject(new HTTPError(404, 'User not found'));
      }
      user.stripeConnectedAccountId = null;
      await user.save();
      resolve();
    } catch (err) {
      console.log(err);
      reject(err);
    }
  });

/**
 * Submit request for author's verification
 * @param userId
 */
const requestAuthorVerification = (userId: string) =>
  new Promise<UserVerificationRequest>(async (resolve, reject) => {
    try {
      const user: User = (await models.User.findOne({ _id: userId })) as User;
      if (!user) {
        reject(new HTTPError(404, 'User not found'));
      }
      const verificationRequest = await models.UserVerificationRequest.create({
        user: userId,
      });
      resolve(verificationRequest);
    } catch (err) {
      console.log(err);
      reject(err);
    }
  });

export default {
  updateProfile,
  updateAvatar,
  getOwnCourses,
  getCourses,
  addToCourses,
  updateCourses,
  deleteFromCourses,
  getAuthorDetails,
  getAuthorPublicFileURL,
  updateAuthorIntroVideo,
  getAuthorVerificationSupportedCountries,
  getAuthorVerificationStatus,
  createAuthorVerificationSession,
  resetAuthorVerificationSession,
  requestAuthorVerification,
};
