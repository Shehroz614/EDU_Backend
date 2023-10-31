// @ts-nocheck
import { Types } from 'mongoose';
import models from '@models/index';
import { isEmpty, isEqual, omit } from '@middlewares/miniLodash';
import HTTPError from '@errors/HTTPError';
import ShortCourse from '@edugram/types/course/shortCourse';
import Course from '@edugram/types/course';
import Review from '@edugram/types/course/review/review';
import User from '@edugram/types/user';
import CourseProgress from '@edugram/types/course/progress/course';
import LectureProgress from '@edugram/types/course/progress/lecture';
import LectureContent from '@edugram/types/course/material/lecture/content';
import Version from '@edugram/types/course/version';
import Resource from '@edugram/types/course/material/resource';
import Lecture from '@edugram/types/course/material/lecture';
import Section from '@edugram/types/course/material/section';
import generateMultiResURLs from '@helpers/multiResURLGenerator';
import generateFakeRatings from '@helpers/generateFakeRatings';
import Note from '@edugram/types/course/material/note/note';
import excludeVersionsCompareFields from '@constants/versionsCompare';
import sendMail from '@helpers/sendMail';
import PaymentsService from './payments';
import PricingPoliciesService from './pricing_policies';
import ReviewRecordsServices from './review_records';
import OracleService from './oracle';

const constants = require('../constants');

/**
 * Helper: Find last approved course version
 * @param course
 */
const findLastApprovedVersion = (course: Course) => {
  const versions = [...course.versions.values()].reverse();
  if (versions.some((version) => version.status === 'online' || version.status === 'approved')) {
    for (let i = 0; i < versions.length; i++) {
      if (versions[i].status === 'approved' || versions[i].status === 'online') {
        // @ts-ignore
        return versions[i]._doc;
      }
    }
  } else {
    // @ts-ignore
    return versions[0]._doc;
  }
  return false;
};

/**
 * Helper - Check if user has access to course
 * @param courseId
 * @param userId
 * @param includePurchasedCourses
 */
const checkUserAccess = (courseId: string, userId: string, includePurchasedCourses: boolean = false) =>
  new Promise<User | false>(async (resolve, reject) => {
    try {
      const query = {
        _id: userId,
      };
      if (includePurchasedCourses) {
        query.$or = [{ my_courses: { $in: [courseId] } }, { purchased_courses: { $in: [courseId] } }];
      } else {
        query.my_courses = { $in: [courseId] };
      }
      const user: User = (await models.User.findOne(query)) as User;
      resolve(user);
    } catch (err) {
      console.log(err);
      reject(err);
    }
  });

/**
 * Helper - Course post release hook
 * @param course
 */
const postReleaseHook = (course: Course) =>
  new Promise(async (resolve, reject) => {
    try {
      await course.populate([
        { path: 'author', select: ['first_name', 'last_name'] },
        {
          path: 'versions.$*.course_materials.sections.lectures.content',
          select: ['type', 'content'],
        },
      ]);
      // Meta Update Stage
      const version = course.liveVersion.toString();
      course.meta = {
        title: course.versions.get(version).title,
        description: course.versions.get(version).description,
        shortDescription: course.versions.get(version).shortCourseDescription,
        ageLimit: course.versions.get(version).ageLimit,
        level: course.versions.get(version).level,
        category: course.versions.get(version).category || null,
        subCategory: course.versions.get(version).subCategory || null,
        subSubCategory: course.versions.get(version).subSubCategory || null,
        keywords: course.versions.get(version).keywords,
        whatYouWillLearn: course.versions.get(version).whatYouWillLearn,
        price: course.versions.get(version).price,
        author: `${course.author.first_name} ${course.author.last_name}`,
        totalLectures: course.versions.get(version).totalLectures,
        totalTime: course.versions.get(version).totalTime,
        languages: course.versions.get(version).languages,
      };
      // TODO - REMOVE THIS IN FUTURE
      const fakeRatings = generateFakeRatings();
      course.studentsQty = fakeRatings.total_students;
      course.rating = fakeRatings.weighted_average.toFixed(2);
      course.ratingBrakeDown = [
        fakeRatings.five_star,
        fakeRatings.four_star,
        fakeRatings.three_star,
        fakeRatings.two_star,
        fakeRatings.one_star,
      ];

      const currentVersion = course.versions.get(version);
      currentVersion.course_materials.sections.forEach((section) => {
        section.lectures.forEach(async (lecture) => {
          if (lecture?.content?.type === 'video') {
            const mediaFlows = await OracleService.listMediaFlows();
            // eslint-disable-next-line no-restricted-syntax
            for (const flow of mediaFlows) {
              if (flow.freeformTags.type === 'transcode') {
                const doesExist = await OracleService.isFileReal(
                  `content-storage/courses/${course._id}/private/videos/${flow.freeformTags.resolution}/${lecture.content.content}/index.mp4`,
                );
                if (!doesExist) {
                  await OracleService.createMediaFlowJob(
                    flow.id,
                    `content-storage/courses/${course._id}/private/videos`,
                    lecture.content.content,
                    flow.freeformTags.resolution,
                  );
                }
              } else {
                console.log(flow);
                await OracleService.createMediaFlowJob(
                  flow.id,
                  `content-storage/courses/${course._id}/private/videos`,
                  lecture.content.content,
                  'subtitles',
                );
              }
            }
          }
        });
      });

      // calculate
      resolve();
    } catch (err) {
      console.log(err);
      reject(err);
    }
  });

// NEW API FUNCTIONS
const find = (filter: { sort?: object; skip: number; limit: number; categories: any }) =>
  new Promise(async (resolve, reject) => {
    try {
      const { sort, skip, limit, categories } = filter;
      const courses = await models.Course.find({
        ...categories,
      })
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .select(shortCourseObjectFields)
        .populate({
          path: 'author',
          select: ['first_name', 'last_name'],
        })
        .lean();

      resolve(courses);
    } catch (err) {
      console.log(err);
      reject(err);
    }
  });

/**
 * Find Course by ID
 * @param id
 * @param userId
 * @param query
 */
const findById = (id: string, userId: string | null = null, query: any | null = null) =>
  new Promise<Course>(async (resolve, reject) => {
    try {
      const filter: any = { _id: id };
      if (userId) filter.author = userId;
      const courseQuery = models.Course.findOne(filter);
      if (query) {
        const { lean, select, populate = [] } = query;
        if (populate) {
          populate.forEach((item: any) => {
            courseQuery.populate(item);
          });
        }
        if (select) {
          courseQuery.select(select);
        }
        if (lean) {
          courseQuery.lean();
        }
      }
      const course = await courseQuery.exec();
      if (!course) {
        reject(new HTTPError(404, 'Course not found!'));
        return;
      }
      resolve(course);
    } catch (err) {
      console.log(err);
      reject(err);
    }
  });

const exists = (filter: any) =>
  new Promise<boolean>(async (resolve, reject) => {
    try {
      const isCourseReal = await models.Course.exists(filter);
      resolve(isCourseReal);
    } catch (err) {
      console.log(err);
      reject(err);
    }
  });

/**
 * Get Courses
 * @description Returns an array of Live Courses in short format
 * @param search
 * @param filters
 * @param sort
 * @param limit
 * @param page
 */
const getCourses = (
  search: string | null = null,
  filters: string | null = null,
  sort: string | null = null,
  limit: number = 100,
  page: number = 0,
) =>
  new Promise<{ courses: ShortCourse[]; totalCount: number }>(async (resolve, reject) => {
    try {
      let aggr: any[] = [];
      if (filters) {
        const parsedFilters = JSON.parse(filters);
        const and: any[] = [{ liveVersion: { $gt: 0 } }];
        const or: any[] = [];
        Object.keys(parsedFilters).forEach((f: string) => {
          const filter = parsedFilters[f];
          switch (f) {
            case 'rating':
              if (parseInt(filter, 10) >= 1 && parseInt(filter, 10) <= 5) {
                and.push({
                  rating: { $gte: parseInt(filter, 10) },
                });
              }
              break;
            case 'price':
              if (filter.min) {
                and.push({
                  'meta.price': { $gte: parseInt(filter.min, 10) },
                });
              }
              if (filter.max) {
                and.push({
                  'meta.price': { $lte: parseInt(filter.max, 10) },
                });
              }
              break;
            case 'duration':
              if (filter.min) {
                and.push({
                  'meta.totalTime': { $gte: parseInt(filter.min, 10) },
                });
              }
              if (filter.max) {
                and.push({
                  'meta.totalTime': { $lte: parseInt(filter.max, 10) },
                });
              }
              break;
            case 'language':
              if (filter.length > 0) {
                and.push({
                  'meta.languages': { $in: filter },
                });
              }
              break;
            case 'level':
              if (filter.length > 0) {
                and.push({
                  'meta.level': { $in: filter },
                });
              }
              break;
            case 'ageLimit':
              if (filter.length > 0) {
                and.push({
                  'meta.ageLimit': { $in: filter },
                });
              }
              break;
            case 'category':
              if (filter.length > 0) {
                or.push({
                  'meta.category': { $in: filter.map((_f: string) => new Types.ObjectId(_f)) },
                });
              }
              break;
            case 'subCategory':
              if (filter.length > 0) {
                or.push({
                  'meta.subCategory': { $in: filter.map((_f: string) => new Types.ObjectId(_f)) },
                });
              }
              break;
            case 'topic':
              if (filter.length > 0) {
                or.push({
                  'meta.subSubCategory': { $in: filter.map((_f: string) => new Types.ObjectId(_f)) },
                });
              }
              break;
            default:
              break;
          }
        });
        if (or.length > 0) {
          and.unshift({
            $or: or,
          });
        }
        aggr.unshift({
          $match: {
            $and: and,
          },
        });
      } else {
        aggr.unshift({
          $match: {
            liveVersion: { $gt: 0 },
          },
        });
      }
      if (search) {
        aggr.unshift({
          $search: {
            compound: {
              should: [
                {
                  autocomplete: {
                    query: search.toString(),
                    path: 'meta.title',
                    fuzzy: {
                      maxEdits: 2,
                      prefixLength: 3,
                    },
                  },
                },
                {
                  text: {
                    query: search.toString(),
                    path: 'meta.description',
                  },
                },
                {
                  text: {
                    query: search.toString(),
                    path: 'meta.shortDescription',
                  },
                },
                {
                  text: {
                    query: search.toString(),
                    path: 'meta.keywords',
                  },
                },
                {
                  text: {
                    query: search.toString(),
                    path: 'meta.whatYouWillLearn',
                  },
                },
              ],
            },
          },
        });
      }
      if (sort) {
        aggr.push({
          $sort: JSON.parse(sort),
        });
      }
      const filterOnlyQuery: any[] = [
        ...aggr,
        {
          $count: 'totalCount',
        },
      ];
      aggr.splice(1, 0, { $skip: limit * page }, { $limit: limit });

      const today = new Date();
      const shortCourseObjectFields = models.Course.getFieldsByImportanceLevel(1, 1, 'object', false);
      const shortCourseVersionObjectFields = models.Course.getVersionFieldsByImportanceLevel(
        1,
        '$$version.v',
        'object',
        true,
        false,
      );
      const authorProjectFields = models.User.getAuthorFields();

      aggr = [
        ...aggr,
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
        // Apply Pricing Policies
        {
          $lookup: {
            from: 'pricing_policies',
            let: { pricingPoliciesId: { $ifNull: ['$pricingPolicies', []] }, authorId: '$author._id' },
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
            as: 'pricingPolicies',
          },
        },
        {
          $addFields: {
            pricingPolicies: { $arrayElemAt: ['$pricingPolicies', 0] },
          },
        },
        {
          $addFields: {
            price: {
              $cond: {
                if: { $eq: ['$pricingPolicies.showOriginalPrice', false] },
                then: { $multiply: ['$pricingPolicies.value', 100] },
                else: {
                  $cond: {
                    if: {
                      $and: [
                        { $ne: ['$pricingPolicies.initialValue', null] },
                        { $gt: ['$pricingPolicies.initialValue', 0] },
                      ],
                    },
                    then: { $multiply: ['$pricingPolicies.initialValue', 100] },
                    else: '$price',
                  },
                },
              },
            },
            salePrice: {
              $cond: {
                if: { $eq: ['$pricingPolicies.showOriginalPrice', true] },
                then: { $multiply: ['$pricingPolicies.value', 100] },
                else: '$salePrice',
              },
            },
          },
        },
        // Final project
        {
          $project: {
            liveVersion: 0,
            pricingPolicies: 0,
          },
        },
      ];
      const courses: ShortCourse[] = await models.Course.aggregate(aggr);
      const totalCount = await models.Course.aggregate(filterOnlyQuery);

      resolve({ courses, totalCount: totalCount[0]?.totalCount || 0 });
    } catch (err) {
      console.log(err);
      reject(err);
    }
  });

/**
 * Get Course filters
 * @since v1.0
 */
const getFilters = () =>
  new Promise(async (resolve, reject) => {
    try {
      const filtersData = await models.Course.aggregate([
        {
          $lookup: {
            from: 'categories',
            localField: 'meta.category',
            foreignField: '_id',
            as: 'categories',
            pipeline: [{ $project: { _id: 1, name: 1 } }],
          },
        },
        {
          $lookup: {
            from: 'categories',
            localField: 'meta.subCategory',
            foreignField: '_id',
            as: 'subCategories',
            pipeline: [{ $project: { _id: 1, name: 1 } }],
          },
        },
        {
          $lookup: {
            from: 'categories',
            localField: 'meta.subSubCategory',
            foreignField: '_id',
            as: 'subSubCategories',
            pipeline: [{ $project: { _id: 1, name: 1 } }],
          },
        },
        {
          $group: {
            _id: null,
            minPrice: { $max: { $min: ['$meta.price', 0] } },
            maxPrice: { $max: '$meta.price' },
            minDuration: { $max: { $min: ['$meta.totalTime', 0] } },
            maxDuration: { $max: '$meta.totalTime' },
            minRating: { $max: { $min: ['$rating', 0] } },
            maxRating: { $max: '$rating' },
            categories: { $addToSet: { $arrayElemAt: ['$categories', 0] } },
            subCategories: { $addToSet: { $arrayElemAt: ['$subCategories', 0] } },
            subSubCategories: { $addToSet: { $arrayElemAt: ['$subSubCategories', 0] } },
            languages: { $addToSet: '$meta.languages' },
            levels: { $addToSet: '$meta.level' },
            ageLimits: { $addToSet: '$meta.ageLimit' },
          },
        },
        {
          $project: {
            _id: 0,
            price: {
              min: '$minPrice',
              max: '$maxPrice',
            },
            duration: {
              min: '$minDuration',
              max: '$maxDuration',
            },
            rating: {
              min: '$minRating',
              max: '$maxRating',
            },
            categories: 1,
            subCategories: 1,
            subSubCategories: 1,
            languages: { $reduce: { input: '$languages', initialValue: [], in: { $setUnion: ['$$value', '$$this'] } } },
            levels: 1,
            ageLimits: 1,
          },
        },
      ]);
      resolve(filtersData[0]);
    } catch (err) {
      console.log(err);
      reject(err);
    }
  });

/**
 * Create new Course
 * @param author
 */
const create = (author: string) =>
  new Promise<Course>(async (resolve, reject) => {
    try {
      const user: User = await models.User.findOne({ _id: author });
      if (!user) {
        reject(new HTTPError(404, 'User not found'));
        return;
      }
      if (!user.isAuthor) {
        reject(new HTTPError(403, 'User is not permitted to create a course'));
        return;
      }
      if (user.isAuthor && !user.isAuthorVerified && user.my_courses.length >= 1) {
        reject(new HTTPError(403, 'Author verification is required'));
        return;
      }

      const draftCourses = await models.Course.find({
        author,
        draftVersion: null,
      });

      if (draftCourses.length >= 5) {
        reject(new HTTPError(403, 'Cannot create more than 5 draft courses'));
        return;
      }
      const course = await models.Course.create({
        author,
        versions: {
          1: {},
        },
      });
      await course.populate({
        path: 'author',
        select: ['first_name', 'last_name'],
      });
      await course.save();
      const response = await findById(course._id, author, {
        populate: [
          {
            path: 'versions.$*.course_materials.sections.lectures.content',
            select: ['type', 'duration'],
          },
          {
            path: 'versions.$*.course_materials.sections.lectures.resources',
            select: ['_id', 'name'],
          },
          {
            path: 'versions.$*.presentationalVideo',
            select: '+public +url',
          },
          { path: 'versions.$*.coupons' },
          {
            path: 'author',
            select: ['first_name', 'last_name'],
          },
        ],
        select: '+versions.$*.coupons',
        lean: true,
      });
      resolve(response);
    } catch (err) {
      console.log(err);
      reject(err);
    }
  });

/**
 * Delete Review
 * @param data
 */
const deleteCourse = (data: { courseId: string; userId: string }) =>
  new Promise<void>(async (resolve, reject) => {
    try {
      const { courseId, userId } = data;
      const course: Course = await findById(courseId, userId, {
        populate: [
          {
            path: 'versions.$*.course_materials.sections.lectures.content',
            select: ['type', 'duration'],
          },
          {
            path: 'versions.$*.course_materials.sections.lectures.resources',
            select: ['_id', 'name'],
          },
        ],
      });
      if (!course) {
        reject(new HTTPError(404, 'Course not found!'));
        return;
      }
      const user: User | boolean = await checkUserAccess(courseId, userId, false);
      if (!user) {
        reject(new HTTPError(400, 'You cannot delete this course'));
        return;
      }
      if (course.liveVersion) {
        reject(new HTTPError(400, 'You cannot delete live course'));
        return;
      }

      // TODO - check for implementation errors
      // const draftVersion = course.versions.get(course.draftVersion.toString());
      // for (const section of draftVersion.course_materials.sections) {
      //   for (const l of section.lectures) {
      //     const lecture: LectureContent = (await models.LectureContent.findById(l.content)
      //       .select('+content')
      //       .lean()) as LectureContent;
      //     for (const r of l.resources) {
      //       await OracleService.deleteObject(`content-storage/courses/${courseId}/private/resources/${r.name}`);
      //       await models.Resource.deleteOne({ _id: resourceId });
      //     }
      //     if (lecture?.type === 'video') {
      //       await OracleService.deleteObject(`content-storage/courses/${courseId}/private/videos/${lecture.content}`);
      //     }
      //     await models.LectureContent.deleteOne({ _id: lecture._id });
      //   }
      // }
      user.my_courses = user.my_courses.filter((i) => !i.equals(courseId));
      await models.Course.deleteOne({ _id: courseId });
      await user.save();
      resolve();
    } catch (err) {
      console.log(err);
      reject(err);
    }
  });

/**
 * Get Course version
 * @param courseId
 * @param versionNumber
 * @param userId
 * @param query
 */
const getCourseVersion = (courseId: string, versionNumber: string, userId: string, query: any) =>
  new Promise<Version>(async (resolve, reject) => {
    try {
      const course = await findById(courseId, userId, query);
      if (!course) {
        reject(new HTTPError(404, 'Course not found!'));
        return;
      }
      const version = course.versions[versionNumber];
      if (!version) {
        reject(new HTTPError(404, "Course doesn't exists"));
        return;
      }
      const { versions, ...trimmedCourse } = course;
      resolve({
        ...trimmedCourse,
        ...version,
      });
    } catch (err) {
      console.log(err);
      reject(err);
    }
  });

/**
 * Get Course draft version
 * @param courseId
 * @param userId
 */
const getDraftVersion = (courseId: string, userId: string) =>
  new Promise(async (resolve, reject) => {
    try {
      const doesExists = await exists({
        _id: courseId,
        author: userId,
      });
      if (!doesExists) {
        reject(new HTTPError(404, 'Course not found!'));
        return;
      }

      const courseObjectFields = models.Course.getAllFieldsForProject(['meta', 'versions'], 1, 'object', false);
      const courseVersionObjectFields = models.Course.getVersionAllFieldsForProject(
        ['coupons'],
        '$$version.v',
        'object',
        true,
        false,
      );
      const authorProjectFields = models.User.getAuthorFields();

      const course = await models.Course.aggregate([
        {
          $match: {
            _id: new Types.ObjectId(courseId),
            author: userId,
          },
        },
        // Populate Author
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
        // Replace Root with draft version
        {
          $project: {
            ...courseObjectFields,
            draftVersion: {
              $let: {
                vars: {
                  version: {
                    $arrayElemAt: [
                      {
                        $filter: {
                          input: { $objectToArray: '$versions' },
                          cond: {
                            $eq: ['$$this.v.version', '$draftVersion'],
                          },
                        },
                      },
                      0,
                    ],
                  },
                },
                in: {
                  ...courseVersionObjectFields,
                },
              },
            },
          },
        },
        {
          $replaceRoot: {
            newRoot: {
              $mergeObjects: ['$$ROOT', '$draftVersion'],
            },
          },
        },
        // Populate Presentational Video
        {
          $lookup: {
            from: 'lecture_contents',
            localField: 'presentationalVideo',
            foreignField: '_id',
            as: 'presentationalVideo',
            pipeline: [{ $project: { public: 1 } }],
          },
        },
        // Populate Categories
        {
          $lookup: {
            from: 'categories',
            localField: 'category',
            foreignField: '_id',
            as: 'category',
            pipeline: [{ $project: { children: 0 } }],
          },
        },
        {
          $addFields: {
            category: { $arrayElemAt: ['$category', 0] },
          },
        },
        // Populate Sub Categories
        {
          $lookup: {
            from: 'categories',
            localField: 'subCategory',
            foreignField: '_id',
            as: 'subCategory',
            pipeline: [{ $project: { children: 0 } }],
          },
        },
        {
          $addFields: {
            subCategory: { $arrayElemAt: ['$subCategory', 0] },
          },
        },
        // Populate Sub Categories
        {
          $lookup: {
            from: 'categories',
            localField: 'subSubCategory',
            foreignField: '_id',
            as: 'subSubCategory',
            pipeline: [{ $project: { children: 0 } }],
          },
        },
        {
          $addFields: {
            subSubCategory: { $arrayElemAt: ['$subSubCategory', 0] },
          },
        },
        // Final Projection
        {
          $project: {
            liveVersion: 0,
            draftVersion: 0,
          },
        },
      ]);
      resolve(course[0]);
    } catch (err) {
      console.log(err);
      reject(err);
    }
  });

/**
 * Get Course live version
 * @param courseId
 * @param isInternal
 */
const getLiveVersion = (courseId: string, isInternal: boolean = false) =>
  new Promise(async (resolve, reject) => {
    try {
      const doesExists = await exists({ _id: courseId, liveVersion: { $gt: 0 } });
      if (!doesExists) {
        reject(new HTTPError(404, 'Course not found!'));
      }

      const today = new Date();
      const courseObjectFields = models.Course.getAllFieldsForProject(['meta', 'versions'], 1, 'object', false);
      const versionExcludes: string[] = ['coupons', 'reviewRecord'];
      if (!isInternal) {
        versionExcludes.push('minPrice', 'priceType');
      }
      const courseVersionObjectFields = models.Course.getVersionAllFieldsForProject(
        versionExcludes,
        '$$version.v',
        'object',
        true,
        false,
      );
      const authorProjectFields = models.User.getAuthorFields();

      const course = await models.Course.aggregate([
        {
          $match: {
            _id: new Types.ObjectId(courseId),
          },
        },
        // Populate Author
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
        // Replace Root with Live Version
        {
          $project: {
            ...courseObjectFields,
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
                  ...courseVersionObjectFields,
                },
              },
            },
          },
        },
        // Populate Preview Lecture contents
        {
          $lookup: {
            from: 'lecture_contents',
            localField: 'liveVersion.course_materials.sections.lectures.content',
            foreignField: '_id',
            as: 'populatedContent',
            pipeline: [
              {
                $project: {
                  _id: 1,
                  duration: 1,
                  type: 1,
                },
              },
            ],
          },
        },
        {
          $addFields: {
            'liveVersion.course_materials.sections': {
              $map: {
                input: '$liveVersion.course_materials.sections',
                as: 'section',
                in: {
                  $mergeObjects: [
                    '$$section',
                    {
                      lectures: {
                        $map: {
                          input: '$$section.lectures',
                          as: 'lecture',
                          in: {
                            _id: '$$lecture._id',
                            title: '$$lecture.title',
                            preview: '$$lecture.preview',
                            type: '$$lecture.type',
                            resources: '$$lecture.resources',
                            content: {
                              $arrayElemAt: [
                                '$populatedContent',
                                {
                                  $indexOfArray: ['$populatedContent._id', '$$lecture.content'],
                                },
                              ],
                            },
                          },
                        },
                      },
                    },
                  ],
                },
              },
            },
          },
        },
        {
          $unset: 'populatedContent',
        },
        {
          $replaceRoot: {
            newRoot: {
              $mergeObjects: ['$$ROOT', '$liveVersion'],
            },
          },
        },
        // Apply Pricing Policies
        {
          $lookup: {
            from: 'pricing_policies',
            let: { pricingPoliciesId: { $ifNull: ['$pricingPolicies', []] }, authorId: '$author._id' },
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
            as: 'pricingPolicies',
          },
        },
        {
          $addFields: {
            pricingPolicies: { $arrayElemAt: ['$pricingPolicies', 0] },
          },
        },
        {
          $addFields: {
            price: {
              $cond: {
                if: { $eq: ['$pricingPolicies.showOriginalPrice', false] },
                then: { $multiply: ['$pricingPolicies.value', 100] },
                else: {
                  $cond: {
                    if: {
                      $and: [
                        { $ne: ['$pricingPolicies.initialValue', null] },
                        { $gt: ['$pricingPolicies.initialValue', 0] },
                      ],
                    },
                    then: { $multiply: ['$pricingPolicies.initialValue', 100] },
                    else: '$price',
                  },
                },
              },
            },
            salePrice: {
              $cond: {
                if: { $eq: ['$pricingPolicies.showOriginalPrice', true] },
                then: { $multiply: ['$pricingPolicies.value', 100] },
                else: '$salePrice',
              },
            },
          },
        },
        // Populate Presentational Video
        {
          $lookup: {
            from: 'lecture_contents',
            localField: 'presentationalVideo',
            foreignField: '_id',
            as: 'presentationalVideo',
            pipeline: [{ $project: { public: 1 } }],
          },
        },
        // Populate Categories
        {
          $lookup: {
            from: 'categories',
            localField: 'category',
            foreignField: '_id',
            as: 'category',
            pipeline: [{ $project: { children: 0 } }],
          },
        },
        {
          $addFields: {
            category: { $arrayElemAt: ['$category', 0] },
          },
        },
        // Populate Sub Categories
        {
          $lookup: {
            from: 'categories',
            localField: 'subCategory',
            foreignField: '_id',
            as: 'subCategory',
            pipeline: [{ $project: { children: 0 } }],
          },
        },
        {
          $addFields: {
            subCategory: { $arrayElemAt: ['$subCategory', 0] },
          },
        },
        // Populate Sub Categories
        {
          $lookup: {
            from: 'categories',
            localField: 'subSubCategory',
            foreignField: '_id',
            as: 'subSubCategory',
            pipeline: [{ $project: { children: 0 } }],
          },
        },
        {
          $addFields: {
            subSubCategory: { $arrayElemAt: ['$subSubCategory', 0] },
          },
        },
        // Final Projection
        {
          $project: {
            liveVersion: 0,
            draftVersion: 0,
            pricingPolicies: 0,
          },
        },
      ]);
      resolve(course[0]);
    } catch (err) {
      console.log(err);
      reject(err);
    }
  });

/**
 * Create new draft version
 * @param courseId
 * @param userId
 */
const createDraftVersion = (courseId, userId) =>
  new Promise(async (resolve, reject) => {
    try {
      const user: User = await models.User.findOne({ _id: userId });
      if (!user) {
        reject(new HTTPError(404, 'User not found'));
        return;
      }
      if (user.isAuthor && !user.isAuthorVerified && user.my_courses.length >= 1) {
        reject(new HTTPError(403, 'Author verification is required'));
        return;
      }
      const course = await findById(courseId, userId, {
        select: '+versions.$*.coupons',
      });
      if (course.draftVersion !== null && [...course.versions.values()].some((version) => version.status === 'draft')) {
        reject(new HTTPError(400, 'Draft version already exists'));
        return;
      }
      const lastVersion = findLastApprovedVersion(course);
      const draft = {
        ...lastVersion,
        version: lastVersion.version + 1,
        status: 'draft',
      };
      course.versions.set(draft.version.toString(), draft);
      course.draftVersion = draft.version;

      await course.save();
      const newCourse = await findById(courseId, userId, {
        populate: [
          {
            path: 'versions.$*.course_materials.sections.lectures.content',
            select: ['type', 'duration'],
          },
          {
            path: 'versions.$*.course_materials.sections.lectures.resources',
            select: ['_id', 'name'],
          },
          {
            path: 'versions.$*.presentationalVideo',
            select: '+public +url',
          },
          { path: 'versions.$*.coupons' },
          {
            path: 'author',
            select: ['first_name', 'last_name'],
          },
        ],
        select: '+versions.$*.coupons',
        lean: true,
      });
      resolve(newCourse);
    } catch (err) {
      console.log(err);
      reject(err);
    }
  });

/**
 * Update Version
 * @param data
 */
const patchVersion = (data) =>
  new Promise(async (resolve, reject) => {
    try {
      const { userId, courseId, versionNumber, updated_fields } = data;
      const course = await findById(courseId, userId);
      if (!course) {
        reject(new HTTPError(404, 'Course not found!'));
        return;
      }
      let patchData: any = models.Course.normalizeDataForPatch(updated_fields);
      if (isEmpty(patchData)) {
        reject(new HTTPError(400, 'Nothing to update'));
        return;
      }
      const version = course.versions.get(versionNumber);
      if (!version) {
        reject(new HTTPError(404, 'Course version not found'));
        return;
      }
      if (
        !Object.prototype.hasOwnProperty.call(patchData, 'price') ||
        !Object.prototype.hasOwnProperty.call(patchData, 'minPrice') ||
        !Object.prototype.hasOwnProperty.call(patchData, 'priceType')
      ) {
        if (version.status !== 'draft') {
          reject(new HTTPError(400, `Unable to make changes to ${version.status} version`));
          return;
        }
      }

      if (version.status === 'online') {
        patchData = {
          price: patchData.price,
          minPrice: patchData.minPrice,
          priceType: patchData.priceType,
        };
        course.meta.price = patchData.price;
      }
      version.set(patchData);
      await course.save();
      resolve(patchData);
    } catch (err) {
      console.log(err);
      reject(err);
    }
  });

/**
 * Create new section
 * @param dataForCreation
 */
const createSection = (dataForCreation: {
  userId: string;
  courseId: string;
  versionNumber: string;
  data: { title: string; description?: string };
}) =>
  new Promise(async (resolve, reject) => {
    try {
      const { userId, courseId, versionNumber, data } = dataForCreation;
      const course = await findById(courseId, userId, {
        populate: [
          {
            path: 'versions.$*.course_materials.sections.lectures.content',
            select: ['type', 'duration'],
          },
        ],
      });
      if (!course) {
        reject(new HTTPError(404, 'Course not found!'));
        return;
      }
      const version = course.versions.get(versionNumber);
      if (!version) {
        reject(new HTTPError(404, 'Course version not found'));
        return;
      }

      // @ts-ignore
      const section = version.course_materials.sections.create(data);
      version.course_materials.sections.push(section);
      await course.save();
      resolve(section);
    } catch (err) {
      console.log(err);
      reject(err);
    }
  });

/**
 * Update section
 * @param dataForPatch
 */
const patchSection = (dataForPatch: {
  userId: string;
  courseId: string;
  versionNumber: string;
  sectionId: string;
  data: any;
}) =>
  new Promise<Section>(async (resolve, reject) => {
    try {
      const { userId, courseId, versionNumber, sectionId, data } = dataForPatch;
      const course = await findById(courseId, userId, {
        populate: [
          {
            path: 'versions.$*.course_materials.sections.lectures.content',
            select: ['type', 'duration'],
          },
        ],
      });
      if (!course) {
        reject(new HTTPError(404, 'Course not found!'));
        return;
      }
      const version = course.versions.get(versionNumber);
      if (!version) {
        reject(new HTTPError(404, 'Course version not found'));
        return;
      }
      // @ts-ignore
      const section = version.course_materials.sections.id(sectionId);
      section.set(data);
      await course.save();
      resolve(section);
    } catch (err) {
      console.log(err);
      reject(err);
    }
  });

/**
 * Delete Section
 * @param dataForDelete
 */
const deleteSection = (dataForDelete: { userId: string; courseId: string; versionNumber: string; sectionId: string }) =>
  new Promise<void>(async (resolve, reject) => {
    try {
      const { userId, courseId, versionNumber, sectionId } = dataForDelete;
      const course = await findById(courseId, userId, {
        populate: [
          {
            path: 'versions.$*.course_materials.sections.lectures.content',
            select: ['type', 'duration'],
          },
        ],
      });
      if (!course) {
        reject(new HTTPError(404, 'Course not found!'));
        return;
      }
      const isSectionBeingUsed = [...course.versions.values()].some(
        (v) => v.status !== 'draft' && v.course_materials && v.course_materials.sections.id(sectionId),
      );
      if (isSectionBeingUsed) {
        reject(new HTTPError(403, 'Section is in use, cannot delete this Section'));
        return;
      }
      const version = course.versions.get(versionNumber);
      if (!version) {
        reject(new HTTPError(404, 'Course version not found'));
        return;
      }
      // @ts-ignore
      const section = version.course_materials.sections.id(sectionId);
      // perform side effects
      let sectionTotalTime = 0;
      // eslint-disable-next-line no-restricted-syntax
      for (const l of section.lectures) {
        const lecture: LectureContent = (await models.LectureContent.findById(l.content)
          .select('+content')
          .lean()) as LectureContent;
        sectionTotalTime += +lecture.duration;
        if (lecture.type === 'video') {
          await OracleService.deleteObject(`content-storage/courses/${courseId}/private/videos/${lecture.content}`);
        }
        await models.LectureContent.deleteOne({ _id: lecture._id });
      }
      version.totalLectures = +version.totalLectures - section.lectures.length;
      version.totalTime = +version.totalTime - sectionTotalTime;
      version.course_materials.sections = version.course_materials.sections.filter(
        (s) => s._id.toString() !== sectionId,
      );
      await course.save();
      resolve();
    } catch (err) {
      console.log(err);
      reject(err);
    }
  });

/**
 * Update Section's order
 * @param data
 */
const sectionsPermutation = (data: { userId: string; courseId: string; versionNumber: string; sections: Section[] }) =>
  new Promise<Section[]>(async (resolve, reject) => {
    try {
      const { userId, courseId, versionNumber, sections } = data;
      const course = await findById(courseId, userId, {
        populate: [
          {
            path: 'versions.$*.course_materials.sections.lectures.content',
            select: ['type', 'duration'],
          },
        ],
      });
      if (!course) {
        reject(new HTTPError(404, 'Course not found!'));
        return;
      }
      const version = course.versions.get(versionNumber);
      if (!version) {
        reject(new HTTPError(404, 'Course version not found'));
        return;
      }
      const oldSections = version.course_materials.sections;
      if (sections.length !== oldSections.length) {
        reject(new HTTPError(400, 'Invalid sections array!'));
        return;
      }

      const newSections = [];
      for (let i = 0; i < sections.length; i++) {
        const currentSection = oldSections.find((section) => section._id.toString() === sections[i]);
        if (!currentSection) {
          reject(new HTTPError(400, 'Invalid sections array!'));
          return;
        }
        newSections.push(currentSection);
      }

      version.course_materials.sections = newSections;
      await course.save();
      resolve(newSections);
    } catch (err) {
      console.log(err);
      reject(err);
    }
  });

/**
 * Create Lecture
 * @param dataForCreation
 */
const createLecture = (dataForCreation: {
  userId: string;
  courseId: string;
  versionNumber: string;
  sectionId: string;
  data: any;
}) =>
  new Promise<Lecture>(async (resolve, reject) => {
    try {
      const { userId, courseId, versionNumber, sectionId, data } = dataForCreation;
      const course = await findById(courseId, userId, {
        populate: [
          {
            path: 'versions.$*.course_materials.sections.lectures.content',
            select: ['type', 'duration'],
          },
        ],
      });
      if (!course) {
        reject(new HTTPError(404, 'Course not found!'));
        return;
      }
      const version = course.versions.get(versionNumber);
      if (!version) {
        reject(new HTTPError(404, 'Course version not found'));
        return;
      }
      // @ts-ignore
      const section = version.course_materials.sections.id(sectionId);
      const lecture = section.lectures.create(data);
      section.lectures.push(lecture);
      version.totalLectures = version.totalLectures ? +version.totalLectures + 1 : 1;
      version.totalTime = version.totalTime ? +version.totalTime + +data.duration : +data.duration;
      await course.save();
      resolve(lecture);
    } catch (err) {
      console.log(err);
      reject(err);
    }
  });

/**
 * Create Lecture with retry
 * @description workaround for concurrency
 * @param dataForCreation
 * @param maxRetries
 * @param retryDelay
 */
const createLectureWithRetry = async (
  dataForCreation: {
    userId: string;
    courseId: string;
    versionNumber: string;
    sectionId: string;
    data: any;
  },
  maxRetries: number,
  retryDelay: number,
): Promise<Lecture> => {
  let retries = 0;
  while (retries < maxRetries) {
    try {
      return await createLecture(dataForCreation);
    } catch (err) {
      console.error(err);
      retries++;
      if (retries < maxRetries) {
        console.log(`Retrying in ${retryDelay} milliseconds...`);
        // eslint-disable-next-line no-promise-executor-return
        await new Promise((resolve) => setTimeout(resolve, retryDelay));
      }
    }
  }
  throw new HTTPError(500, 'Failed to create lecture');
};

/**
 * Update Lecture
 * @param dataForPatch
 */
const patchLecture = (dataForPatch: {
  userId: string;
  courseId: string;
  versionNumber: string;
  sectionId: string;
  lectureId: string;
  data: any;
}) =>
  new Promise<Lecture>(async (resolve, reject) => {
    try {
      const { userId, courseId, versionNumber, sectionId, lectureId, data } = dataForPatch;
      const course = await findById(courseId, userId, {
        populate: [
          {
            path: 'versions.$*.course_materials.sections.lectures.content',
            select: ['type', 'duration'],
          },
        ],
      });
      if (!course) {
        reject(new HTTPError(404, 'Course not found!'));
        return;
      }
      const version = course.versions.get(versionNumber);
      if (!version) {
        reject(new HTTPError(404, 'Course version not found'));
        return;
      }
      // @ts-ignore
      const section = version.course_materials.sections.id(sectionId);
      const lecture = section.lectures.id(lectureId);
      lecture.set(data);
      await course.save();
      resolve(lecture);
    } catch (err) {
      console.log(err);
      reject(err);
    }
  });

/**
 * Delete Lecture
 * @param dataForDelete
 */
const deleteLecture = (dataForDelete: {
  userId: string;
  courseId: string;
  versionNumber: string;
  sectionId: string;
  lectureId: string;
}) =>
  new Promise<void>(async (resolve, reject) => {
    try {
      const { userId, courseId, versionNumber, sectionId, lectureId } = dataForDelete;
      const course = await findById(courseId, userId, {
        populate: [
          {
            path: 'versions.$*.course_materials.sections.lectures.content',
            select: ['type', 'duration', 'content'],
          },
        ],
      });
      if (!course) {
        reject(new HTTPError(404, 'Course not found!'));
        return;
      }
      const version = course.versions.get(versionNumber);
      const isLectureBeingUsed = [...course.versions.values()].some(
        (v) =>
          v.status !== 'draft' &&
          v.course_materials &&
          v.course_materials.sections &&
          v.course_materials.sections.some(
            (section) => section.lectures && section.lectures.some((lecture) => lecture.id === lectureId),
          ),
      );
      if (isLectureBeingUsed) {
        reject(new HTTPError(403, 'Lecture is in use, cannot delete this Lecture'));
        return;
      }
      if (!version) {
        reject(new HTTPError(404, 'Course version not found'));
        return;
      }
      // @ts-ignore
      const section = version.course_materials.sections.id(sectionId);
      const lecture = section.lectures.id(lectureId);
      if (lecture.content.type === 'video') {
        await OracleService.deleteObject(
          `content-storage/courses/${courseId}/private/videos/${lecture.content.content}`,
        );
      }
      await models.LectureContent.deleteOne({ _id: lecture.content._id });
      version.totalLectures = +version.totalLectures - 1;
      version.totalTime = +version.totalTime - +lecture.content.duration;
      section.lectures = section.lectures.filter((l: Lecture) => l._id.toString() !== lectureId);
      await course.save();
      resolve();
    } catch (err) {
      console.log(err);
      reject(err);
    }
  });

/**
 * Update Lectures order
 * @param data
 */
const lecturePermutation = (data: { userId: string; courseId: string; versionNumber: string; sections: Section[] }) =>
  new Promise<Section[]>(async (resolve, reject) => {
    try {
      const { userId, courseId, versionNumber, sections } = data;

      const course = await findById(courseId, userId, {
        populate: [
          {
            path: 'versions.$*.course_materials.sections.lectures.content',
            select: ['type', 'duration'],
          },
        ],
      });
      if (!course) {
        reject(new HTTPError(404, 'Course not found!'));
        return;
      }
      const version = course.versions.get(versionNumber);
      if (!version) {
        reject(new HTTPError(404, 'Course version not found'));
        return;
      }
      const oldLectures = version.course_materials.sections.flatMap((section) => section.lectures);
      if (sections.length !== version.course_materials.sections.length) {
        reject(new HTTPError(400, 'Invalid sections array!'));
        return;
      }

      const newSections = [];
      // eslint-disable-next-line no-restricted-syntax
      for (const section of sections) {
        const newSection = version.course_materials.sections.find(
          (currentSection) => currentSection._id.toString() === section._id.toString(),
        );

        if (!newSection) {
          reject(new HTTPError(400, 'Invalid sections array!'));
          return;
        }

        const newLectures = [];
        // eslint-disable-next-line no-restricted-syntax
        for (const lecture of section.lectures) {
          const newLecture = oldLectures.find(
            (currentLecture) => currentLecture._id.toString() === lecture._id.toString(),
          );
          if (!newLecture) {
            reject(new HTTPError(400, 'Invalid lectures array!'));
            return;
          }
          newLectures.push(newLecture);
        }
        newSection.lectures = newLectures;
        newSections.push(newSection);
      }
      version.course_materials.sections = newSections;
      await course.save();
      resolve(newSections);
    } catch (err) {
      console.log(err);
      reject(err);
    }
  });

/**
 * Find Content by ID
 * @param data
 */
const findContentById = (data: {
  userId: string;
  courseId: string;
  versionNumber: string;
  contentId: string;
  sectionId: string;
  lectureId: string;
}) =>
  new Promise<Lecture>(async (resolve, reject) => {
    try {
      const { userId, courseId, versionNumber, sectionId, lectureId } = data;
      const [course, user] = await Promise.all([
        await findById(courseId, userId, {
          populate: [
            {
              path: 'versions.$*.course_materials.sections.lectures.content',
              select: ['type', 'duration', 'content'],
            },
          ],
        }),
        models.User.exists({
          _id: userId,
          purchased_courses: { $in: [courseId] },
        }),
      ]);
      if (!user) {
        reject(new HTTPError(403, 'You didnt buy this course!'));
        return;
      }
      if (!course) {
        reject(new HTTPError(404, 'Course not found!'));
        return;
      }

      const version = course.versions.get(versionNumber);
      if (!version) {
        reject(new HTTPError(404, 'Course version not found'));
        return;
      }

      // @ts-ignore
      const section = version.course_materials.sections.id(sectionId);
      const lecture = section.lectures.id(lectureId);
      const { content } = lecture;
      resolve(content);
    } catch (err) {
      console.log(err);
      reject(err);
    }
  });

/**
 * Find content by ID for author
 * @param userId
 * @param contentId
 */
const findContentByIdForAuthor = ({ userId, contentId }: { userId: string; contentId: string }) =>
  new Promise(async (resolve, reject) => {
    try {
      const content = await models.LectureContent.findOne({
        _id: contentId,
        author: userId,
      }).select(['+content']);
      if (!content) {
        reject(new HTTPError(404, 'Content not found!'));
        return;
      }
      resolve(content);
    } catch (err) {
      console.log(err);
      reject(err);
    }
  });

/**
 * Get Content
 * @param data
 */
const getContent = (data: {
  courseId: string;
  versionNumber: string;
  sectionId: string;
  lectureId: string;
  contentId: string;
  userId: string | null;
}) =>
  new Promise(async (resolve, reject) => {
    try {
      const { courseId, versionNumber, sectionId, lectureId, userId } = data;
      const course = await findById(courseId, null, {
        populate: [
          {
            path: 'versions.$*.course_materials.sections.lectures.content',
            select: ['type', 'duration', 'content'],
          },
        ],
      });
      if (!course) {
        reject(new HTTPError(404, 'Course not found!'));
        return;
      }
      const version = course.versions.get(versionNumber);
      if (!version) {
        reject(new HTTPError(404, 'Course version not found'));
        return;
      }
      // @ts-ignore
      const section = version.course_materials.sections.id(sectionId);
      const lecture = section.lectures.id(lectureId);
      if (lecture.preview) {
        if (lecture.content.type === 'video') {
          const urls = await generateMultiResURLs(
            `content-storage/courses/${courseId}/private/videos`,
            lecture.content.content,
          );
          resolve({
            ...lecture.content._doc,
            public: {
              ...lecture.content.public,
              urls,
            },
          });
          return;
        }
        resolve(lecture.content);
        return;
      }

      if (!userId) {
        reject(new HTTPError(403, 'Invalid access'));
        return;
      }
      const user = await models.User.exists({
        _id: userId,
        $or: [{ my_courses: { $in: [courseId] } }, { purchased_courses: { $in: [courseId] } }],
      });
      if (!user) {
        reject(new HTTPError(403, 'Invalid access'));
        return;
      }

      if (lecture.content.type === 'video') {
        const urls = await generateMultiResURLs(
          `content-storage/courses/${courseId}/private/videos`,
          lecture.content.content,
        );
        resolve({
          ...lecture.content._doc,
          public: {
            ...lecture.content.public,
            urls,
          },
        });
      }
      resolve(lecture.content);
    } catch (err) {
      console.log(err);
      reject(err);
    }
  });

/**
 * Create Lecture content
 * @param dataForCreation
 */
const createContent = (dataForCreation: {
  userId: string;
  courseId: string;
  content: string;
  type: 'video' | 'text' | 'audio';
  duration: number;
  public?: {
    url: string;
    is_public: boolean;
  };
  contentName: string;
}) =>
  new Promise<LectureContent>(async (resolve, reject) => {
    try {
      const { userId, courseId, content, type, duration, public: publicData, contentName } = dataForCreation;

      if (!courseId) {
        reject(new HTTPError(400, 'Invalid Course ID'));
        return;
      }
      if (!userId) {
        reject(new HTTPError(400, 'Invalid Author ID'));
        return;
      }
      const isCourseReal = await models.Course.exists({
        _id: courseId,
        author: userId,
      });
      if (!isCourseReal) {
        reject(new HTTPError(404, 'Course not found!'));
        return;
      }

      const newContent = new models.LectureContent({
        content,
        type,
        name: contentName,
        duration,
        course: courseId,
        author: userId,
        public: publicData,
      });
      await newContent.save();
      resolve(newContent);
    } catch (err) {
      console.log(err);
      reject(err);
    }
  });

/**
 * Add course lecture media
 * @param courseId
 * @param versionNumber
 * @param userId
 * @param file
 */
const addContentMedia = (courseId: string, versionNumber: string, userId: string, file: Express.Multer.File) =>
  new Promise(async (resolve, reject) => {
    try {
      if (!courseId) {
        reject(new HTTPError(400, 'Invalid Course ID'));
        return;
      }
      if (!userId) {
        reject(new HTTPError(400, 'Invalid Author ID'));
        return;
      }
      const isCourseReal = await models.Course.exists({
        _id: courseId,
        author: userId,
      });
      if (!isCourseReal) {
        reject(new HTTPError(404, 'Course not found!'));
      }

      const path = `content-storage/courses/${courseId}/private/images`;
      await OracleService.putObject(path, file.buffer);
      const mediaURL = await OracleService.generateUrl(path);
      resolve({ mediaURL });
    } catch (err) {
      console.log(err);
      reject(err);
    }
  });

/**
 * Update Text Content
 * @param dataForPatch
 */
const patchTextContent = (dataForPatch: {
  userId: string;
  contentId: string;
  contentName: string;
  content: string;
  duration: number;
}) =>
  new Promise<LectureContent>(async (resolve, reject) => {
    try {
      const { userId, contentId, contentName, content, duration } = dataForPatch;
      const updatedContent = await models.LectureContent.findOne({
        _id: contentId,
        author: userId,
      });
      if (!updatedContent) {
        reject(new HTTPError(404, 'Content not found'));
        return;
      }
      updatedContent.set({ content, duration, name: contentName });
      await updatedContent.save();
      resolve(updatedContent);
    } catch (err) {
      console.log(err);
      reject(err);
    }
  });

/**
 * Delete Content
 * @param dataForDelete
 */
// TODO - Revisit for security
const deleteContent = (dataForDelete: { userId: string; contentId: string }) =>
  new Promise<void>(async (resolve, reject) => {
    try {
      const { userId, contentId } = dataForDelete;
      const [content, isInUse] = await Promise.all([
        models.LectureContent.findOne({
          _id: contentId,
          author: userId,
        }).select(['_id']),
        models.Course.exists({
          'versions.course_materials.sections.lectures.content': contentId,
        }),
      ]);

      if (!content) {
        reject(new HTTPError(404, 'Content not found'));
        return;
      }
      if (isInUse) {
        reject(new HTTPError(400, 'Content is in use'));
        return;
      }
      await models.LectureContent.deleteOne({ _id: contentId });
      resolve();
    } catch (err) {
      console.log(err);
      reject(err);
    }
  });

/**
 * Delete Content By Name
 * @param data
 */
const deleteContentByName = (data: { courseId: string; versionNumber: string; userId: string; contentName: string }) =>
  new Promise<void>(async (resolve, reject) => {
    try {
      const { courseId, versionNumber, userId, contentName } = data;
      const course = await findById(courseId, userId, {
        populate: [
          {
            path: 'versions.$*.course_materials.sections.lectures.content',
            select: ['type', 'duration', 'content', 'name'],
          },
        ],
      });
      const lectureContent = await models.LectureContent.findOne({ course: courseId, name: contentName }).select(
        '+content',
      );

      console.log(lectureContent);
      if (!course) {
        reject(new HTTPError(404, 'Course not found!'));
        return;
      }
      if (!lectureContent) {
        reject(new HTTPError(404, 'Content not found!'));
        return;
      }

      const version = course.versions.get(versionNumber);
      const isLectureBeingUsed = [...course.versions.values()].some(
        (v) =>
          v.status !== 'draft' &&
          v.course_materials &&
          v.course_materials.sections &&
          v.course_materials.sections.some(
            (section) => section.lectures && section.lectures.some((lecture) => lecture.content.name === contentName),
          ),
      );
      if (isLectureBeingUsed) {
        reject(new HTTPError(403, 'Content is in use, cannot delete this content'));
        return;
      }
      if (!version) {
        reject(new HTTPError(404, 'Course version not found'));
        return;
      }

      if (lectureContent.type === 'video') {
        await OracleService.deleteObject(
          `content-storage/courses/${courseId}/private/videos/${lectureContent.content}`,
        );
      }
      await models.LectureContent.deleteOne({ name: contentName });
      await course.save();
      resolve();
    } catch (err) {
      console.log(err);
      reject(err);
    }
  });

/**
 * Link Lecture With Lecture Content
 * @param data
 */
const linkLectureToContent = (data: {
  userId: string;
  courseId: string;
  versionNumber: string;
  sectionId: string;
  lectureId: string;
  contentId: string;
}) =>
  new Promise<void>(async (resolve, reject) => {
    try {
      const { userId, courseId, versionNumber, sectionId, lectureId, contentId } = data;
      const [course, isContentReal] = await Promise.all([
        await findById(courseId, userId, {
          populate: [
            {
              path: 'versions.$*.course_materials.sections.lectures.content',
              select: ['type', 'duration'],
            },
          ],
          // TODO - Revisit
          // select: ['versions.$*.version', 'versions.$*.status', 'versions.$*._id', 'versions.$*.course_materials'],
        }),
        models.LectureContent.exists({
          _id: contentId,
          author: userId,
        }),
      ]);
      if (!isContentReal) {
        reject(new HTTPError(404, 'Content not found!'));
        return;
      }
      const version = course.versions.get(versionNumber);
      if (!version) {
        reject(new HTTPError(404, 'Course version not found'));
        return;
      }
      // @ts-ignore
      const section = version.course_materials.sections.id(sectionId);
      const lecture = section.lectures.id(lectureId);
      lecture.content = contentId;

      await course.save();
      resolve();
    } catch (err) {
      console.log(err);
      reject(err);
    }
  });

/**
 * Link lecture with retry
 * @description workaround for concurrency
 * @param data
 * @param maxRetries
 * @param retryDelay
 */
const linkLectureToContentWithRetry = async (
  data: {
    userId: string;
    courseId: string;
    versionNumber: string;
    sectionId: string;
    lectureId: string;
    contentId: string;
  },
  maxRetries: number,
  retryDelay: number,
): Promise<Lecture> => {
  let retries = 0;
  while (retries < maxRetries) {
    try {
      return await linkLectureToContent(data);
    } catch (err) {
      console.error(err);
      retries++;
      if (retries < maxRetries) {
        console.log(`Retrying in ${retryDelay} milliseconds...`);
        // eslint-disable-next-line no-promise-executor-return
        await new Promise((resolve) => setTimeout(resolve, retryDelay));
      }
    }
  }
  throw new HTTPError(500, 'Failed to link lecture');
};

/**
 * Create Resource
 * @param data
 */
const createResource = (data: { courseId: string; userId: string; contentName: string; fileName: string }) =>
  new Promise<Resource>(async (resolve, reject) => {
    try {
      const { courseId, userId, contentName, fileName } = data;
      const isCourseReal = await exists({
        _id: courseId,
        author: userId,
      });
      if (!isCourseReal) {
        reject(new HTTPError(404, 'Course not found!'));
        return;
      }
      const newResource = new models.Resource({
        key: fileName,
        name: contentName,
        course: courseId,
        author: userId,
      });
      await newResource.save();
      resolve(newResource);
    } catch (err) {
      console.log(err);
      reject(err);
    }
  });

/**
 * Delete Resource
 * @param data
 */
// TODO - Revisit for security
const deleteResource = (data: { courseId: string; versionNumber: string; userId: string; resourceId: string }) =>
  new Promise<void>(async (resolve, reject) => {
    try {
      const { courseId, versionNumber, userId, resourceId } = data;
      const [course, resource, isInUse] = await Promise.all([
        findById(courseId),
        models.Resource.findOne({ _id: resourceId, author: userId }).select('+key'),
        models.Course.exists({
          'versions.$*.course_materials.sections.lectures.resources': resourceId,
        }),
      ]);

      if (!course) {
        reject(new HTTPError(404, 'Course not found!'));
        return;
      }
      const version = course.versions.get(versionNumber);
      if (!version) {
        reject(new HTTPError(404, 'Course version not found'));
        return;
      }
      if (version.status !== 'draft') {
        reject(new HTTPError(400, `Unable to make changes to ${version.status} version`));
        return;
      }
      if (!resource) {
        reject(new HTTPError(404, 'Resource not found'));
        return;
      }
      if (isInUse) {
        reject(new HTTPError(400, 'Cant edit this course'));
        return;
      }
      // eslint-disable-next-line no-restricted-syntax
      for (const section of version.course_materials.sections) {
        // eslint-disable-next-line no-restricted-syntax
        for (const lecture of section.lectures) {
          const index = lecture.resources.indexOf(resourceId);
          if (index !== -1) {
            lecture.resources.splice(index, 1);
          }
        }
      }
      await course.save();
      await OracleService.deleteObject(`content-storage/courses/${courseId}/private/resources/${resource.key}`);
      await models.Resource.deleteOne({ _id: resourceId });
      resolve();
    } catch (err) {
      console.log(err);
      reject(err);
    }
  });

/**
 * Link Lecture to Resources
 * @param data
 */
const linkLectureToResource = (data: {
  userId: string;
  courseId: string;
  versionNumber: string;
  sectionId: string;
  lectureId: string;
  resourceId: string;
}) =>
  new Promise<void>(async (resolve, reject) => {
    try {
      const { userId, courseId, versionNumber, sectionId, lectureId, resourceId } = data;

      const [course, resource] = await Promise.all([
        await findById(courseId, userId, {
          populate: [
            {
              path: 'versions.$*.course_materials.sections.lectures.content',
              select: ['type', 'duration'],
            },
          ],
          // TODO - Revisit
          // select: ['versions.$*.version', 'versions.$*.status', 'versions.$*._id', 'versions.$*.course_materials'],
        }),
        models.Resource.findOne({
          _id: resourceId,
          author: userId,
        }).select(['_id', 'lectures']),
      ]);
      if (!course) {
        reject(new HTTPError(404, 'Course not found!'));
        return;
      }
      if (!resource) {
        reject(new HTTPError(404, 'Resource not found!'));
        return;
      }

      const version = course.versions.get(versionNumber);
      if (!version) {
        reject(new HTTPError(404, 'Course version not found'));
        return;
      }

      // @ts-ignore
      const section = version.course_materials.sections.id(sectionId);
      if (!section) {
        reject(new HTTPError(404, 'Section not found!'));
        return;
      }
      const lecture = section.lectures.id(lectureId);
      if (!lecture) {
        reject(new HTTPError(404, 'Lecture not found!'));
        return;
      }

      if (lecture.resources && lecture.resources.includes(resourceId)) {
        reject(new HTTPError(400, 'Resource has been already linked to lecture!'));
        return;
      }

      lecture.resources.push(resourceId);
      resource.lectures.push(lectureId);
      await Promise.all([course.save(), resource.save()]);

      resolve();
    } catch (err) {
      console.log(err);
      reject(err);
    }
  });

/**
 * Get Resource URL
 * @param courseId
 * @param resourceId
 * @param userId
 */
const getResourceURL = (courseId: string, resourceId: string, userId: string) =>
  new Promise(async (resolve, reject) => {
    try {
      const isCourseReal = await exists({ _id: courseId });
      if (!isCourseReal) {
        reject(new HTTPError(404, 'Course not found'));
        return;
      }
      const hasAccess = await checkUserAccess(courseId, userId, true);
      if (!hasAccess) {
        reject(new HTTPError(403, 'Invalid access'));
        return;
      }
      const resource: Resource = (await models.Resource.findOne({ _id: resourceId }).select('+key').lean()) as Resource;
      if (!resource) {
        reject(new HTTPError(404, 'Resource not found'));
        return;
      }

      const today = new Date();
      const expiry = new Date(today);
      expiry.setHours(expiry.getHours() + 2);
      const path = `content-storage/courses/${courseId}/private/resources`;

      const doesExist = await OracleService.isFileReal(`${path}/${resource.key}`);
      if (!doesExist) {
        reject(new HTTPError(404, 'File doesnt exists'));
        return;
      }

      const response = await OracleService.createPreAuthenticatedRequest(path, resource.key, expiry, 'ObjectRead');
      if (isEmpty(response.url)) {
        reject(new HTTPError(500, 'Something went wrong'));
        return;
      }

      resolve({
        ...resource,
        public: {
          url: response.url,
        },
      });
    } catch (err) {
      console.log(err);
      reject(err);
    }
  });

/**
 * Update Course coupons
 * @param courseId
 * @param versionNumber
 * @param coupon
 * @param userId
 */
const updateCoupons = (
  courseId: string,
  versionNumber: string,
  coupon: { code: string; discount: number; expiry: string },
  userId: string,
) =>
  new Promise<Version>(async (resolve, reject) => {
    try {
      const course = await findById(courseId, userId, { select: '+versions.$*.coupons' });
      if (!course) {
        reject(new HTTPError(404, 'Course not found!'));
        return;
      }
      const version = course.versions.get(versionNumber);
      if (!version) {
        reject(new HTTPError(404, 'Course version not found'));
        return;
      }

      const newCoupon = await PaymentsService.addCoupon({
        code: coupon.code,
        discount: coupon.discount,
        courseId,
        expiry: coupon.expiry,
      });

      version.coupons.push(newCoupon._id);
      await course.populate('versions.$*.coupons');
      await course.save();
      resolve(version);
    } catch (err) {
      console.log(err);
      reject(err);
    }
  });

/**
 * Delete Course coupon
 * @param courseId
 * @param versionNumber
 * @param couponId
 * @param userId
 */
const deleteCoupons = (courseId: string, versionNumber: string, couponId: string, userId: string) =>
  new Promise<Version>(async (resolve, reject) => {
    try {
      const course = await findById(courseId, userId, { select: '+versions.coupons' });
      if (!course) {
        reject(new HTTPError(404, 'Course not found!'));
        return;
      }
      const version = course.versions.get(versionNumber);
      if (!version) {
        reject(new HTTPError(404, 'Course version not found'));
        return;
      }

      version.coupons = version.coupons.filter((el) => el._id.toString() !== couponId);

      await PaymentsService.deleteCoupon(couponId);
      await course.populate('versions.$*.coupons');
      await course.save();
      resolve(version);
    } catch (err) {
      console.log(err);
      reject(err);
    }
  });

/**
 * Publish Course
 * @param data
 */
const publish = (data: {
  courseId: string;
  versionNumber: string;
  userId: string;
  reviewNote: string;
  contactEmail: string;
}) =>
  new Promise<Course>(async (resolve, reject) => {
    try {
      const { courseId, versionNumber, userId, reviewNote, contactEmail } = data;

      if (reviewNote?.length > constants.COURSE_REVIEW_NOTE_TEXT_LIMIT) {
        reject(
          new HTTPError(
            400,
            `Course's review note cannot be over ${constants.COURSE_REVIEW_NOTE_TEXT_LIMIT} characters`,
          ),
        );
        return;
      }

      const course: Course = await findById(courseId, userId);
      if (!course) {
        reject(new HTTPError(404, 'Course not found!'));
        return;
      }
      const version = course.versions.get(versionNumber);
      if (!version) {
        reject(new HTTPError(404, 'Course version not found'));
        return;
      }

      if (course.liveVersion) {
        const newVersion = omit(version.toObject(), excludeVersionsCompareFields);
        const oldVersion = omit(
          course.versions.get(course.liveVersion.toString()).toObject(),
          excludeVersionsCompareFields,
        );
        if (isEqual(oldVersion, newVersion)) {
          reject(new HTTPError(404, 'Course version is no different from the live version'));
          return;
        }
      }

      const reviewRecord = await ReviewRecordsServices.create({
        course: courseId,
        version: +versionNumber,
        reviewNote,
        contactEmail,
        authorId: userId,
      });

      version.reviewRecord = reviewRecord._id;
      version.status = 'inReview';
      course.draftVersion = null;
      await course.save();
      resolve(course);
    } catch (err) {
      console.log(err);
      reject(err);
    }
  });

/**
 * Cancel Course Review
 * @param data
 */
const cancelReview = (data: { courseId: string; versionNumber: string; userId: string }) =>
  new Promise(async (resolve, reject) => {
    try {
      const { courseId, versionNumber, userId } = data;
      const course = await findById(courseId, userId);
      if (!course) {
        reject(new HTTPError(404, 'Course not found!'));
        return;
      }
      const version = course.versions.get(versionNumber.toString());
      if (!version) {
        reject(new HTTPError(404, 'Course version not found'));
        return;
      }
      const reviewRecord = await ReviewRecordsServices.cancel(version.reviewRecord);
      if (!reviewRecord) {
        reject(new HTTPError(404, 'Review record not found'));
        return;
      }
      version.status = 'draft';
      course.draftVersion = version.version;
      await course.save();
      resolve(course);
    } catch (err) {
      console.log(err);
      reject(err);
    }
  });

/**
 * Release Course
 * @param data
 */
const releaseCourse = (data: { courseId: string; versionNumber: string; userId: string }) =>
  new Promise<Course>(async (resolve, reject) => {
    try {
      const { courseId, versionNumber, userId } = data;
      const user = await models.User.findOne({ _id: userId });
      const course = await findById(courseId, userId);
      const reviewRecord = await models.ReviewRecord.findOne({
        course: courseId,
        version: versionNumber,
      });
      if (!course) {
        reject(new HTTPError(404, 'Course not found!'));
        return;
      }
      const version = course.versions.get(versionNumber);
      if (!version) {
        reject(new HTTPError(404, 'Course version not found'));
        return;
      }

      if (!reviewRecord) {
        reject(new HTTPError(404, 'Review record not found'));
        return;
      }

      version.status = 'online';
      course.liveVersion = +versionNumber;
      if (course.draftVersion === +versionNumber) {
        course.draftVersion = null;
      }
      // Post Release Hook
      await postReleaseHook(course);
      await course.save();
      await reviewRecord.set({ status: 'released' });
      await reviewRecord.save();
      await sendMail([user.email, reviewRecord.contactEmail], {
        subject: 'Edugram.io - Course Published',
        html: 'Congratulations, Your course has been published',
      });
      resolve(course);
    } catch (err) {
      console.log(err);
      reject(err);
    }
  });

/**
 * Reject Course
 * @param data
 */
const rejectCourse = (data: { courseId: string; versionNumber: string; userId: string }) =>
  new Promise<Course>(async (resolve, reject) => {
    try {
      const { courseId, versionNumber, userId } = data;
      const user = await models.User.findOne({ _id: userId });
      const course = await findById(courseId, userId);
      const reviewRecord = await models.ReviewRecord.findOne({
        course: courseId,
        version: versionNumber,
      });
      if (!course) {
        reject(new HTTPError(404, 'Course not found!'));
        return;
      }
      const version = course.versions.get(versionNumber);
      if (!version) {
        reject(new HTTPError(404, 'Course version not found'));
        return;
      }

      if (!reviewRecord) {
        reject(new HTTPError(404, 'Review record not found'));
        return;
      }

      version.status = 'rejected';
      course.draftVersion = null;
      // Post Release Hook
      await course.save();
      await reviewRecord.set({ status: 'rejected' });
      await reviewRecord.save();
      await sendMail([user.email, reviewRecord.contactEmail], {
        subject: 'Edugram.io - Course Rejected',
        html: 'Congratulations, Your course has been rejected for publishing',
      });
      resolve(course);
    } catch (err) {
      console.log(err);
      reject(err);
    }
  });

/**
 * Get Reviews
 * @param courseId
 */
const getReviews = (courseId: string) =>
  new Promise<Review[]>(async (resolve, reject) => {
    try {
      const courseExists = await exists({ _id: courseId });
      if (!courseExists) {
        reject(new HTTPError(404, 'Course not found!'));
        return;
      }
      const reviews: Review = await models.Review.find({ course: courseId })
        .populate({ path: 'user', select: ['first_name', 'last_name'] })
        .populate({ path: 'responses.author', select: ['first_name', 'last_name'] });
      resolve(reviews);
    } catch (err) {
      console.log(err);
      reject(err);
    }
  });

/**
 * Add Review
 * @param data
 */
const addReview = (data: { courseId: string; title: string; review: string; rating: number; userId: string }) =>
  new Promise<Review>(async (resolve, reject) => {
    try {
      const { courseId, title, review, rating, userId } = data;
      const course: Course = await findById(courseId);
      if (!course) {
        reject(new HTTPError(404, 'Course not found!'));
        return;
      }
      const user: User | boolean = await checkUserAccess(courseId, userId, false);
      if (!user) {
        reject(new HTTPError(400, 'You cannot review this course'));
        return;
      }
      const reviewExists = await models.Review.exists({
        user: userId,
        courseId,
      });
      if (reviewExists) {
        reject(new HTTPError(400, 'You have already reviewed this course'));
        return;
      }
      const newReview = await models.Review.create({
        course: courseId,
        title,
        review,
        rating,
        user: userId,
      });
      await newReview.populate({ path: 'user', select: ['first_name', 'last_name'] });
      await newReview.save();
      await user.reviews?.push(newReview._id);
      await user.save();
      await course.courseReviews.push(newReview._id);
      await course.save();
      resolve(newReview);
    } catch (err) {
      console.log(err);
      reject(err);
    }
  });

/**
 * Update Review
 * @param data
 */
const updateReview = (data: { courseId: string; title: string; review: string; rating: number; userId: string }) =>
  new Promise<Review>(async (resolve, reject) => {
    try {
      const { courseId, title, review, rating, userId } = data;
      const courseExists = await exists({ _id: courseId });
      if (!courseExists) {
        reject(new HTTPError(404, 'Course not found!'));
        return;
      }
      const user: User | boolean = await checkUserAccess(courseId, userId, false);
      if (!user) {
        reject(new HTTPError(400, 'You cannot review this course'));
        return;
      }
      const reviewQuery = await models.Review.findOne({ author: userId, course: courseId })
        .populate({ path: 'user', select: ['first_name', 'last_name'] })
        .populate({ path: 'responses.user', select: ['first_name', 'last_name'] });
      if (!reviewQuery) {
        reject(new HTTPError(404, 'Review not found'));
        return;
      }
      if (title) reviewQuery.title = title;
      if (review) reviewQuery.review = review;
      if (rating) reviewQuery.rating = rating;
      await reviewQuery.save();
      resolve(reviewQuery);
    } catch (err) {
      console.log(err);
      reject(err);
    }
  });

/**
 * Delete Review
 * @param data
 */
const deleteReview = (data: { courseId: string; reviewId: string; userId: string }) =>
  new Promise<void>(async (resolve, reject) => {
    try {
      const { courseId, reviewId, userId } = data;
      const course: Course = await findById(courseId);
      if (!course) {
        reject(new HTTPError(404, 'Course not found!'));
        return;
      }
      const user: User | boolean = await checkUserAccess(courseId, userId, false);
      if (!user) {
        reject(new HTTPError(400, 'You cannot review this course'));
        return;
      }
      const reviewExists = await models.Review.exists({
        user: userId,
        course: courseId,
      });
      if (!reviewExists) {
        reject(new HTTPError(404, 'Review not found'));
        return;
      }
      await models.Review.deleteOne({ _id: reviewId });
      user.reviews = user.reviews.filter((i) => i !== reviewId);
      course.courseReviews = course.courseReviews.filter((i: Types.ObjectId) => !i.equals(reviewId));
      await user.save();
      await course.save();
      resolve();
    } catch (err) {
      console.log(err);
      reject(err);
    }
  });

/**
 * Add Review Like
 * @param data
 */
const addReviewLike = (data: { courseId: string; userId: string; reviewId: string }) =>
  new Promise<void>(async (resolve, reject) => {
    try {
      const { courseId, userId, reviewId } = data;
      const courseExists = await exists({ _id: courseId });
      if (!courseExists) {
        reject(new HTTPError(404, 'Course not found!'));
      }
      const review = await models.Review.findOne({ _id: reviewId });
      if (!review) {
        reject(new HTTPError(404, 'Review not found'));
        return;
      }
      if (review.likes.includes(userId)) {
        reject(new HTTPError(404, 'You have already liked the review'));
        return;
      }
      await review.likes.push(userId);
      await review.save();
      resolve();
    } catch (err) {
      console.log(err);
      reject(err);
    }
  });

/**
 * Remove Review Like;
 * @param data
 */
const removeReviewLike = (data: { courseId: string; userId: string; reviewId: string }) =>
  new Promise<void>(async (resolve, reject) => {
    try {
      const { courseId, userId, reviewId } = data;
      const courseExists = await exists({ _id: courseId });
      if (!courseExists) {
        reject(new HTTPError(404, 'Course not found!'));
        return;
      }
      const review = await models.Review.findOne({ _id: reviewId });
      if (!review) {
        reject(new HTTPError(404, 'Review not found'));
        return;
      }
      if (!review.likes.includes(userId)) {
        reject(new HTTPError(400, "You haven't liked this review yet"));
        return;
      }
      review.likes = review.likes.filter((i: string) => i !== userId);
      await review.save();
      resolve();
    } catch (err) {
      console.log(err);
      reject(err);
    }
  });

/**
 * Add Review Dislike
 * @param data
 */
const addReviewDislike = (data: { courseId: string; userId: string; reviewId: string }) =>
  new Promise<void>(async (resolve, reject) => {
    try {
      const { courseId, userId, reviewId } = data;
      const courseExists = await exists({ _id: courseId });
      if (!courseExists) {
        reject(new HTTPError(404, 'Course not found!'));
        return;
      }
      const review = await models.Review.findOne({ _id: reviewId });
      if (!review) {
        reject(new HTTPError(404, 'Review not found'));
        return;
      }
      if (review.dislikes.includes(userId)) {
        reject(new HTTPError(404, 'You have already disliked the review'));
        return;
      }
      await review.dislikes.push(userId);
      await review.save();
      resolve();
    } catch (err) {
      console.log(err);
      reject(err);
    }
  });

/**
 * Remove Review Dislike
 * @param data
 */
const removeReviewDislike = (data: { courseId: string; userId: string; reviewId: string }) =>
  new Promise<void>(async (resolve, reject) => {
    try {
      const { courseId, userId, reviewId } = data;
      const courseExists = await exists({ _id: courseId });
      if (!courseExists) {
        reject(new HTTPError(404, 'Course not found!'));
        return;
      }
      const review = await models.Review.findOne({ _id: reviewId });
      if (!review) {
        reject(new HTTPError(404, 'Review not found'));
        return;
      }
      if (!review.dislikes.includes(userId)) {
        reject(new HTTPError(400, "You haven't disliked this review yet"));
        return;
      }
      review.dislikes = review.dislikes.filter((i: string) => i !== userId);
      await review.save();
      resolve();
    } catch (err) {
      console.log(err);
      reject(err);
    }
  });

/**
 * Add Review comment
 * @param data
 */
const addReviewComment = (data: { courseId: string; reviewId: string; userId: string; comment: string }) =>
  new Promise<Review>(async (resolve, reject) => {
    try {
      const { courseId, reviewId, userId, comment } = data;
      const courseExists = await exists({ _id: courseId });
      if (!courseExists) {
        reject(new HTTPError(404, 'Course not found!'));
        return;
      }
      const review = await models.Review.findOne({ _id: reviewId });
      if (!review) {
        reject(new HTTPError(404, 'Review not found'));
        return;
      }
      review.responses.push({
        author: userId,
        response: comment,
      });
      await review.save();
      const response = await models.Review.populate(review, [
        { path: 'user', select: ['first_name', 'last_name'] },
        { path: 'responses.user', select: ['first_name', 'last_name'] },
      ]);
      resolve(response);
    } catch (err) {
      console.log(err);
      reject(err);
    }
  });

/**
 * Delete Review Comment
 * @param data
 */
const removeReviewComment = (data: { courseId: string; reviewId: string; userId: string; responseId: string }) =>
  new Promise<Review>(async (resolve, reject) => {
    try {
      const { courseId, reviewId, responseId } = data;
      const courseExists = await exists({ _id: courseId });
      if (!courseExists) {
        reject(new HTTPError(404, 'Course not found!'));
        return;
      }
      const review = await models.Review.findOne({ _id: reviewId });
      if (!review) {
        reject(new HTTPError(404, 'Review not found'));
        return;
      }
      review.responses = review.responses.filter((d: any) => !d._id.equals(responseId));
      await review.save();
      const response = await models.Review.populate(review, [
        { path: 'user', select: ['first_name', 'last_name'] },
        { path: 'responses.user', select: ['first_name', 'last_name'] },
      ]);
      resolve(response);
    } catch (err) {
      console.log(err);
      reject(err);
    }
  });

/**
 * Get Course study progress
 * @param data
 */
const getProgress = (data: { userId: string; courseId: string }) =>
  new Promise<{ lectures: LectureProgress[]; lastLectureId: string }>(async (resolve, reject) => {
    try {
      const { userId, courseId } = data;
      const [progresses, lastLecture] = await Promise.all([
        // search user progresses
        models.LectureProgress.find({
          user: userId,
          courseId,
        }).select(['lectureId', 'watchTime', 'done']),
        models.CourseProgress.findOne({
          user: userId,
          courseId,
        }).select(['lastLectureId']),
      ]);

      const courseProgress = {
        lectures: progresses,
        lastLectureId: lastLecture?.lastLectureId || null,
      };
      resolve(courseProgress);
    } catch (err) {
      console.log(err);
      reject(err);
    }
  });

/**
 * Update Course study progress
 * @param data
 */
const updateProgress = (data: { userId: string; courseId: string; lastLectureId: string }) =>
  new Promise<CourseProgress>(async (resolve, reject) => {
    try {
      const { userId, courseId, lastLectureId } = data;
      let updated_course_progress = await models.CourseProgress.findOne({
        courseId,
        user: userId,
      }).select(['lastLectureId']);

      if (!updated_course_progress) {
        // Create new Course_progress
        updated_course_progress = new models.CourseProgress({
          courseId,
          user: userId,
          lastLectureId,
        });
      } else {
        updated_course_progress.set({
          lastLectureId,
        });
      }

      await updated_course_progress.save();
      resolve(updated_course_progress);
    } catch (err) {
      console.log(err);
      reject(err);
    }
  });

/**
 * Update course lecture progress
 * @param data
 */
const updateLectureProgress = (data: {
  userId: string;
  courseId: string;
  lectureProgress: { lectureId: string; done: boolean; watchTime: number };
}) =>
  new Promise<LectureProgress>(async (resolve, reject) => {
    try {
      const { userId, courseId, lectureProgress } = data;
      const { lectureId, done, watchTime } = lectureProgress;
      if (!lectureId) {
        reject(new HTTPError(400, 'Lecture ID is required'));
      }

      let updated_lecture_progress = await models.LectureProgress.findOne({
        lectureId,
        courseId,
        user: userId,
      }).select(['done', 'watchTime', 'lecture']);

      if (!updated_lecture_progress) {
        updated_lecture_progress = new models.LectureProgress({
          courseId,
          lectureId,
          user: userId,
          watchTime,
          // eslint-disable-next-line
          done: done,
        });
      } else {
        // eslint-disable-next-line
        updated_lecture_progress.set({ done: done, watchTime });
      }
      await updated_lecture_progress.save();
      resolve(updated_lecture_progress);
    } catch (err) {
      console.log(err);
      reject(err);
    }
  });

const getNotes = (courseId: string, userId: string) =>
  new Promise<Note[]>(async (resolve, reject) => {
    try {
      const user: User | boolean = await checkUserAccess(courseId, userId, true);
      if (!user) {
        reject(new HTTPError(400, 'Invalid access'));
      }
      const notes: Note[] = await models.Note.find({
        courseId,
        user: userId,
      });
      resolve(notes);
    } catch (err) {
      console.log(err);
      reject(err);
    }
  });
/**
 * Create new note
 * @param data
 */
const createNote = (data: { title; description; courseId; lectureId; userId }) =>
  new Promise<Note>(async (resolve, reject) => {
    try {
      const { title, description, courseId, lectureId, userId } = data;
      const user: User | boolean = await checkUserAccess(courseId, userId, true);
      if (!user) {
        reject(new HTTPError(400, 'Invalid Access'));
      }

      const note: Note = await models.Note.create({
        title,
        description,
        courseId,
        lectureId,
        user: userId,
      });
      await note.save();
      resolve(note);
    } catch (err) {
      console.log(err);
      reject(err);
    }
  });

const updateNote = (courseId: string, noteId: string, userId: string, data: { title: string; description: string }) =>
  new Promise<Note>(async (resolve, reject) => {
    try {
      const user: User | boolean = await checkUserAccess(courseId, userId, true);
      if (!user) {
        reject(new HTTPError(400, 'Invalid Access'));
      }
      const note = await models.Note.findOne({
        _id: noteId,
        user: userId,
        courseId,
      });
      if (!note) {
        reject(new HTTPError(404, 'Note not found'));
        return;
      }
      note.set(data);
      await note.save();
      resolve(note);
    } catch (err) {
      console.log(err);
      reject(err);
    }
  });

const deleteNote = (courseId: string, noteId: string, userId: string) =>
  new Promise(async (resolve, reject) => {
    try {
      const user: User | boolean = await checkUserAccess(courseId, userId, true);
      if (!user) {
        reject(new HTTPError(400, 'Invalid Access'));
      }
      const note = await models.Note.exists({
        _id: noteId,
        user: userId,
        courseId,
      });
      if (!note) {
        reject(new HTTPError(404, 'Note not found'));
        return;
      }
      models.Note.deleteOne({
        _id: noteId,
      });
      resolve();
    } catch (err) {
      console.log(err);
      reject(err);
    }
  });

/**
 * Get Pricing Policies
 * @param courseId
 * @param versionNumber
 * @param userId
 */
const getPricingPolicies = (courseId: string, versionNumber: string, userId: string) =>
  new Promise(async (resolve, reject) => {
    try {
      const course = await findById(courseId, userId, {
        populate: [
          {
            path: 'versions.$*.pricingPolicies',
          },
        ],
      });
      if (!course) {
        reject(new HTTPError(404, 'Course not found!'));
        return;
      }
      const version = course.versions.get(versionNumber);
      if (!version) {
        reject(new HTTPError(404, 'Course version not found'));
        return;
      }
      resolve(version.pricingPolicies);
    } catch (err) {
      console.log(err);
      reject(err);
    }
  });

/**
 * Add Pricing Policy
 * @param courseId
 * @param versionNumber
 * @param userId
 * @param data
 */
const addPricingPolicy = (
  courseId: string,
  versionNumber: string,
  userId: string,
  data: {
    type: 'smartPrice' | 'discount' | 'override';
    code: string;
    valueType: 'fixed' | 'percentage';
    value: string;
    initialValue?: number;
    isAutoApplicable: boolean;
    isActive: boolean;
    allowCourseDiscounts: boolean;
    allowDiscountsForGifts: boolean;
    showOriginalPrice: boolean;
    maxUsage: string;
    startDate: Date | null;
    expiryDate: Date | null;
  },
) =>
  new Promise(async (resolve, reject) => {
    try {
      const course = await findById(courseId, userId, { select: '+versions.$*.pricingPolicies' });
      if (!course) {
        reject(new HTTPError(404, 'Course not found!'));
        return;
      }
      const version = course.versions.get(versionNumber);
      if (!version) {
        reject(new HTTPError(404, 'Course version not found'));
        return;
      }

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
      } = data;

      if (version.priceType === 'smart' && type === 'override') {
        reject(new HTTPError(400, 'Pricing policy cannot be created on Smart Price mode'));
        return;
      }

      const pricingPolicy = await PricingPoliciesService.createPolicy({
        code,
        type,
        valueType,
        value,
        initialValue,
        courses: [courseId],
        courseTargetMode: 'Version',
        targetCourseVersion: [versionNumber],
        isAutoApplicable,
        isActive,
        startDate,
        allowCourseDiscounts,
        allowDiscountsForGifts,
        showOriginalPrice,
        maxUsage,
        expiryDate,
        createdBy: userId,
      });

      version.pricingPolicies.push(pricingPolicy._id);
      await course.populate('versions.$*.pricingPolicies');
      await course.save();
      resolve(version.pricingPolicies);
    } catch (err) {
      console.log(err);
      reject(err);
    }
  });

/**
 * Update Pricing Policy
 * @param courseId
 * @param versionNumber
 * @param userId
 * @param policyId
 * @param data
 */
const updatePricingPolicy = (
  courseId: string,
  versionNumber: string,
  userId: string,
  policyId: string,
  data: {
    type: 'smartPrice' | 'discount' | 'override';
    code: string;
    valueType: 'fixed' | 'percentage';
    value: string;
    initialValue?: number;
    isAutoApplicable: boolean;
    isActive: boolean;
    allowCourseDiscounts: boolean;
    allowDiscountsForGifts: boolean;
    showOriginalPrice: boolean;
    maxUsage: string;
    startDate: Date | null;
    expiryDate: Date | null;
  },
) =>
  new Promise(async (resolve, reject) => {
    try {
      const course = await findById(courseId, userId, { select: '+versions.$*.pricingPolicies' });
      if (!course) {
        reject(new HTTPError(404, 'Course not found!'));
        return;
      }
      const version = course.versions.get(versionNumber);
      if (!version) {
        reject(new HTTPError(404, 'Course version not found'));
        return;
      }

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
      } = data;
      await PricingPoliciesService.updatePolicy(policyId, userId, {
        code,
        type,
        valueType,
        value,
        initialValue,
        courses: [courseId],
        courseTargetMode: 'Version',
        targetCourseVersion: [versionNumber],
        isAutoApplicable,
        isActive,
        startDate,
        allowCourseDiscounts,
        allowDiscountsForGifts,
        showOriginalPrice,
        maxUsage,
        expiryDate,
        createdBy: userId,
      });

      await course.populate('versions.$*.pricingPolicies');
      await course.save();
      resolve(version.pricingPolicies);
    } catch (err) {
      console.log(err);
      reject(err);
    }
  });

/**
 * Delete Pricing Policy
 * @param courseId
 * @param versionNumber
 * @param userId
 * @param policyId
 */
const deletePricingPolicy = (courseId: string, versionNumber: string, userId: string, policyId: string) =>
  new Promise(async (resolve, reject) => {
    try {
      const course = await findById(courseId, userId, { select: '+versions.$*.pricingPolicies' });
      if (!course) {
        reject(new HTTPError(404, 'Course not found!'));
        return;
      }
      const version = course.versions.get(versionNumber);
      if (!version) {
        reject(new HTTPError(404, 'Course version not found'));
        return;
      }

      version.coupons = version.pricingPolicies.filter((el) => el._id.toString() !== policyId);
      await PricingPoliciesService.deletePolicy(policyId, userId);
      await course.populate('versions.$*.pricingPolicies');
      await course.save();
      resolve(version.pricingPolicies);
    } catch (err) {
      console.log(err);
      reject(err);
    }
  });

export default {
  find,
  exists,
  findById,
  getCourses,
  getFilters,
  create,
  getCourseVersion,
  getLiveVersion,
  getDraftVersion,
  createDraftVersion,
  patchVersion,
  createSection,
  patchSection,
  deleteSection,
  sectionsPermutation,
  createLecture,
  createLectureWithRetry,
  patchLecture,
  deleteLecture,
  lecturePermutation,
  findContentById,
  findContentByIdForAuthor,
  getContent,
  createContent,
  addContentMedia,
  patchTextContent,
  deleteContent,
  deleteContentByName,
  linkLectureToContent,
  linkLectureToContentWithRetry,
  createResource,
  deleteResource,
  linkLectureToResource,
  getResourceURL,
  updateCoupons,
  deleteCoupons,
  publish,
  releaseCourse,
  rejectCourse,
  cancelReview,
  getReviews,
  addReview,
  updateReview,
  deleteReview,
  addReviewLike,
  removeReviewLike,
  addReviewDislike,
  removeReviewDislike,
  addReviewComment,
  removeReviewComment,
  getProgress,
  updateProgress,
  updateLectureProgress,
  getNotes,
  createNote,
  updateNote,
  deleteNote,
  getPricingPolicies,
  addPricingPolicy,
  updatePricingPolicy,
  deletePricingPolicy,
  deleteCourse,
};
