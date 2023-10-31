import { Schema } from 'mongoose';
import Category from '@models/category';
import SectionSchema from '@models/course/material/section';
import limits from '@constants/limits';
import Version from '@edugram/types/course/version';

/*
  canUserEdit:
    we use this field for function that recognized fields which user
    can edit, it is needed for better data validation when course updating

  levelImportance:
    we use this field for function that return fields for short course
    object
*/

const VersionSchema: Schema = new Schema<Version>(
  {
    title: {
      type: String,
      trim: true,
      canUserEdit: true,
      levelImportance: 1,
      default: null,
      maxlength: [limits.course.title.max, '{PATH} cannot be above {MAXLENGTH} characters'],
    },
    version: {
      type: Number,
      default: 1,
      levelImportance: 1,
    },
    status: {
      type: String,
      enum: ['draft', 'inReview', 'rejected', 'approved', 'online'],
      default: 'draft',
      levelImportance: 1,
      set(status: string) {
        // @ts-ignore
        this._previousStatus = this.status;
        return status;
      },
    },
    level: {
      type: String,
      enum: ['all', 'beginner', 'intermediate', 'expert'],
      default: 'all',
      canUserEdit: true,
      levelImportance: 1,
    },
    ageLimit: {
      type: String,
      enum: ['noLimit', 'over4', 'over7', 'over12', 'over16', 'over18'],
      default: 'noLimit',
      canUserEdit: true,
      levelImportance: 1,
    },
    category: {
      type: Schema.Types.ObjectId,
      ref: 'Category',
      canUserEdit: true,
    },
    subCategory: {
      type: Schema.Types.ObjectId,
      ref: 'Category',
      canUserEdit: true,
    },
    subSubCategory: {
      type: Schema.Types.ObjectId,
      ref: 'Category',
      canUserEdit: true,
    },
    languages: {
      type: [String],
      enum: [
        'ab',
        'aa',
        'af',
        'ak',
        'sq',
        'am',
        'ar',
        'an',
        'hy',
        'as',
        'av',
        'ae',
        'ay',
        'az',
        'bm',
        'ba',
        'eu',
        'be',
        'bn',
        'bh',
        'bi',
        'bs',
        'br',
        'bg',
        'my',
        'ca',
        'km',
        'ch',
        'ce',
        'ny',
        'zh',
        'cu',
        'cv',
        'kw',
        'co',
        'cr',
        'hr',
        'cs',
        'da',
        'dv',
        'nl',
        'dz',
        'en',
        'eo',
        'et',
        'ee',
        'fo',
        'fj',
        'fi',
        'fr',
        'ff',
        'gd',
        'gl',
        'lg',
        'ka',
        'de',
        'ki',
        'el',
        'kl',
        'gn',
        'gu',
        'ht',
        'ha',
        'he',
        'hz',
        'hi',
        'ho',
        'hu',
        'is',
        'io',
        'ig',
        'id',
        'ia',
        'ie',
        'iu',
        'ik',
        'ga',
        'it',
        'ja',
        'jv',
        'kn',
        'kr',
        'ks',
        'kk',
        'rw',
        'kv',
        'kg',
        'ko',
        'kj',
        'ku',
        'ky',
        'lo',
        'la',
        'lv',
        'lb',
        'li',
        'ln',
        'lt',
        'lu',
        'mk',
        'mg',
        'ms',
        'ml',
        'mt',
        'gv',
        'mi',
        'mr',
        'mh',
        'ro',
        'mn',
        'na',
        'nv',
        'nd',
        'ng',
        'ne',
        'se',
        'no',
        'nb',
        'nn',
        'ii',
        'oc',
        'oj',
        'or',
        'om',
        'os',
        'pi',
        'pa',
        'ps',
        'fa',
        'pl',
        'pt',
        'qu',
        'rm',
        'rn',
        'ru',
        'sm',
        'sg',
        'sa',
        'sc',
        'sr',
        'sn',
        'sd',
        'si',
        'sk',
        'sl',
        'so',
        'st',
        'nr',
        'es',
        'su',
        'sw',
        'ss',
        'sv',
        'tl',
        'ty',
        'tg',
        'ta',
        'tt',
        'te',
        'th',
        'bo',
        'ti',
        'to',
        'ts',
        'tn',
        'tr',
        'tk',
        'tw',
        'ug',
        'uk',
        'ur',
        'uz',
        've',
        'vi',
        'vo',
        'wa',
        'cy',
        'fy',
        'wo',
        'xh',
        'yi',
        'yo',
        'za',
        'zu',
      ],
      canUserEdit: true,
      levelImportance: 1,
    },
    subtitles: {
      type: [
        {
          type: String,
        },
      ],
      canUserEdit: true,
    },
    shortCourseDescription: {
      type: String,
      trim: true,
      canUserEdit: true,
      levelImportance: 1,
      default: null,
      minlength: [limits.course.shortDescription.min, '{PATH} cannot be below {MINLENGTH} characters'],
      maxlength: [limits.course.shortDescription.max, '{PATH} cannot be above {MAXLENGTH} characters'],
    },
    description: {
      type: String,
      default: null,
      canUserEdit: true,
      minlength: [limits.course.description.min, '{PATH} cannot be below {MINLENGTH} characters'],
      maxlength: [limits.course.description.max, '{PATH} cannot be above {MAXLENGTH} characters'],
    },
    priceType: {
      type: String,
      enum: ['smart', 'custom'],
      default: 'custom',
      canUserEdit: true,
      levelImportance: 2,
    },
    price: {
      type: Number,
      canUserEdit: true,
      levelImportance: 1,
      default: 0,
      min: [limits.course.price.min, '{PATH} cannot be below {MINLENGTH} characters'],
      max: [limits.course.price.max, '{PATH} cannot be above {MAXLENGTH} characters'],
    },
    minPrice: {
      type: Number,
      canUserEdit: true,
      levelImportance: 2,
    },
    salePrice: {
      type: Number,
      canUserEdit: true,
      levelImportance: 1,
    },
    whatYouWillLearn: {
      type: [
        {
          type: String,
          trim: true,
        },
      ],
      canUserEdit: true,
      levelImportance: 1,
      validate: {
        validator(array: string[]) {
          return array.length <= limits.course.whatYouWillLearn.limit.max;
        },
        message: `Maximum ${limits.course.whatYouWillLearn.limit.max} items are allowed`,
      },
    },
    requirements: {
      type: [
        {
          type: String,
          trim: true,
        },
      ],
      canUserEdit: true,
      validate: {
        validator(array: string[]) {
          return array.length <= limits.course.requirement.limit.max;
        },
        message: `Maximum ${limits.course.requirement.limit.max} items are allowed`,
      },
    },
    presentationalVideo: {
      type: Schema.Types.ObjectId,
      ref: 'Lecture_content',
      canUserEdit: true,
    },
    presentationalImage: {
      type: String,
      canUserEdit: true,
      levelImportance: 1,
    },
    aboutAuthor: {
      type: String,
      trim: true,
      canUserEdit: true,
      minlength: [limits.course.aboutAuthor.min, '{PATH} cannot be below {MINLENGTH} characters'],
      maxlength: [limits.course.aboutAuthor.max, '{PATH} cannot be above {MAXLENGTH} characters'],
    },
    keywords: {
      type: [
        {
          type: String,
          trim: true,
          lowercase: true,
          maxLength: limits.course.keyword.length.max,
        },
      ],
      canUserEdit: true,
      levelImportance: 1,
      validate: {
        validator(array: string[]) {
          return array.length <= limits.course.keyword.limit.max;
        },
        message: `Maximum ${limits.course.keyword.limit.max} items are allowed`,
      },
    },
    coupons: {
      type: [
        {
          type: Schema.Types.ObjectId,
          ref: 'Coupon',
        },
      ],
      // select: false,
      canUserEdit: true,
    },
    pricingPolicies: {
      type: [
        {
          type: Schema.Types.ObjectId,
          ref: 'Pricing_Policy',
        },
      ],
      // select: false,
      canUserEdit: true,
      levelImportance: 1,
    },
    course_materials: {
      sections: {
        type: [SectionSchema],
        default: [],
      },
      // select: false,
    },
    totalTime: {
      type: Number,
      levelImportance: 1,
      default: 0,
    },
    totalLectures: {
      type: Number,
      levelImportance: 1,
      default: 0,
    },
    timestamps: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Timestamp',
      },
    ],
    reviewRecord: {
      type: Schema.Types.ObjectId,
      ref: 'ReviewRecord',
      canUserEdit: true,
    },
  },
  {
    _id: false,
    timestamps: true,
  },
);

VersionSchema.pre<Version>('save', async function (next: any) {
  try {
    if (this.category) {
      const category = await Category.findById(this.category);
      if (!category) {
        next(new Error('Category does not exist'));
        return;
      }
    }
    if (this.category && this.subCategory) {
      const subCategory = await Category.findOne({
        _id: this.subCategory,
        parent: this.category,
      });
      if (!subCategory) {
        next(new Error('Invalid subcategory or it does not exist'));
        return;
      }
    }
    if (this.category && this.subCategory === null && this.subSubCategory) {
      next(new Error('Invalid subcategory'));
      return;
    }
    if (this.category && this.subCategory && this.subSubCategory) {
      const subSubCategory = await Category.findOne({
        _id: this.subSubCategory,
        parent: this.subCategory,
      });
      if (!subSubCategory) {
        next(new Error('Invalid subcategory or it does not exist'));
        return;
      }
    }

    next();
  } catch (err) {
    next(err);
  }
});

export default VersionSchema;
