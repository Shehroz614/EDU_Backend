import { Schema, model, Model } from 'mongoose';
import Course from '@edugram/types/course';
import Version from './version';

interface CourseModel extends Model<Course> {
  normalizeDataForPatch(): Object;

  // eslint-disable-next-line no-unused-vars
  getFieldsByImportanceLevel(level: number, value: number | string, type: string, includeKeyInValue: boolean): Object;
  getVersionFieldsByImportanceLevel(
    // eslint-disable-next-line no-unused-vars
    level: number,
    // eslint-disable-next-line no-unused-vars
    value: number | string,
    // eslint-disable-next-line no-unused-vars
    type: string,
    // eslint-disable-next-line no-unused-vars
    includeKeyInValue: boolean,
    // eslint-disable-next-line no-unused-vars
    includeVersionTag: boolean,
  ): Object;
  getAllFieldsForProject(
    // eslint-disable-next-line no-unused-vars
    exclude: string[],
    // eslint-disable-next-line no-unused-vars
    value: number | string,
    // eslint-disable-next-line no-unused-vars
    type: string,
    // eslint-disable-next-line no-unused-vars
    includeKeyInValue: boolean,
  ): Object;
  getVersionAllFieldsForProject(
    // eslint-disable-next-line no-unused-vars
    exclude: string[],
    // eslint-disable-next-line no-unused-vars
    value: number | string,
    // eslint-disable-next-line no-unused-vars
    type: string,
    // eslint-disable-next-line no-unused-vars
    includeKeyInValue: boolean,
    // eslint-disable-next-line no-unused-vars
    includeVersionTag: boolean,
  ): Object;
}

const CourseSchema = new Schema<Course, CourseModel>(
  {
    draftVersion: {
      type: Number,
      default: 1,
      levelImportance: 2,
    },
    liveVersion: {
      type: Number,
      default: null,
      levelImportance: 2,
    },
    author: {
      type: String,
      ref: 'User',
      required: true,
      immutable: true,
      levelImportance: 1,
    },
    ratingQty: {
      type: Number,
      default: 0,
      levelImportance: 1,
    },
    rating: {
      type: Number,
      default: 0,
      levelImportance: 1,
    },
    ratingBrakeDown: {
      type: [{ type: Number }],
      default: [0, 0, 0, 0, 0],
    },
    studentsQty: {
      type: Number,
      default: 0,
    },
    courseReviews: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Review',
      },
    ],
    selectedReview: {
      type: Schema.Types.ObjectId,
      ref: 'Review',
      canUserEdit: true,
    },
    QA: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Question',
      },
    ],
    announcements: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Announcement',
      },
    ],
    versions: {
      type: Map,
      of: Version,
    },
    meta: {
      title: {
        type: String,
      },
      description: {
        type: Object,
      },
      shortDescription: {
        type: String,
      },
      ageLimit: {
        type: String,
      },
      level: {
        type: String,
      },
      category: {
        type: String,
      },
      subCategory: {
        type: String,
      },
      subSubCategory: {
        type: String,
      },
      keywords: {
        type: [{ type: String }],
      },
      whatYouWillLearn: {
        type: [{ type: String }],
      },
      price: {
        type: Number,
      },
      author: {
        type: String,
      },
      totalLectures: {
        type: Number,
      },
      totalTime: {
        type: Number,
      },
      languages: {
        type: [
          {
            type: String,
          },
        ],
      },
    },
  },
  { timestamps: true },
);

CourseSchema.set('toJSON', {
  virtuals: true,
});
CourseSchema.statics = {
  normalizeDataForPatch(patch) {
    Object.keys(patch).forEach((fieldName) => {
      // @ts-ignore
      if (!Version.tree[fieldName]?.canUserEdit === true) {
        delete patch[fieldName];
      }
    });

    return patch;
  },
  getFieldsByImportanceLevel(level = 1, v = 1, type = 'array', includeKeyInValue = false) {
    const fields: any[] | {} = type === 'array' ? [] : {};
    if (type === 'array') {
      // @ts-ignore
      fields.push('_id');
    } else if (type === 'object') {
      // @ts-ignore
      fields._id = includeKeyInValue ? `${v}._id` : v;
    }
    // @ts-ignore
    // eslint-disable-next-line no-restricted-syntax
    for (const [key, value]: [string, any] of Object.entries(CourseSchema.tree)) {
      // @ts-ignore
      if (value.levelImportance <= level) {
        if (type === 'array') {
          // @ts-ignore
          fields.push(key);
        } else if (type === 'object') {
          // @ts-ignore
          fields[key] = includeKeyInValue ? `${v}.${key}` : v;
        }
      }
    }
    return fields;
  },
  getVersionFieldsByImportanceLevel(
    level = 1,
    v = 1,
    type = 'array',
    includeKeyInValue = false,
    includeVersionTag = false,
  ) {
    const fields: any[] | {} = type === 'array' ? [] : {};
    // @ts-ignore
    // eslint-disable-next-line no-restricted-syntax
    for (const [key, value]: [string, any] of Object.entries(Version.tree)) {
      // @ts-ignore
      if (value.levelImportance <= level) {
        if (type === 'array') {
          // @ts-ignore
          fields.push(includeVersionTag ? `versions.${key}` : key);
        } else if (type === 'object') {
          // @ts-ignore
          fields[includeVersionTag ? `versions.${key}` : key] = includeKeyInValue ? `${v}.${key}` : v;
        }
      }
    }
    return fields;
  },
  getAllFieldsForProject(exclude: string[] = [], v: number | string, type = 'array', includeKeyInValue = false) {
    const fields: any[] | {} = type === 'array' ? [] : {};
    if (type === 'array') {
      // @ts-ignore
      fields.push('_id');
    } else if (type === 'object') {
      // @ts-ignore
      fields._id = includeKeyInValue ? `${v}._id` : v;
    }
    // @ts-ignore
    // eslint-disable-next-line no-restricted-syntax
    for (const [key, value]: [string, any] of Object.entries(CourseSchema.tree)) {
      // @ts-ignore
      if (!exclude.includes(key)) {
        if (type === 'array') {
          // @ts-ignore
          fields.push(key);
        } else if (type === 'object') {
          // @ts-ignore
          fields[key] = includeKeyInValue ? `${v}.${key}` : v;
        }
      }
    }
    return fields;
  },
  getVersionAllFieldsForProject(
    exclude: string[],
    v: number | string,
    type = 'array',
    includeKeyInValue = false,
    includeVersionTag = false,
  ) {
    const fields: any[] | {} = type === 'array' ? [] : {};
    // @ts-ignore
    // eslint-disable-next-line no-restricted-syntax
    for (const [key, value]: [string, any] of Object.entries(Version.tree)) {
      // @ts-ignore
      if (!exclude.includes(key)) {
        if (type === 'array') {
          // @ts-ignore
          fields.push(includeVersionTag ? `versions.${key}` : key);
        } else if (type === 'object') {
          // @ts-ignore
          fields[includeVersionTag ? `versions.${key}` : key] = includeKeyInValue ? `${v}.${key}` : v;
        }
      }
    }
    return fields;
  },
  getAllLookupSchema(asSingleEntity: boolean = false) {
    const fields: any[] = [];
    // @ts-ignore
    // eslint-disable-next-line no-restricted-syntax
    for (const [key, value]: [string, any] of Object.entries(CourseSchema.tree)) {
      // @ts-ignore
      // eslint-disable-next-line no-prototype-builtins
      if (value.hasOwnProperty('ref')) {
        fields.push({
          $lookup: {
            // @ts-ignore
            from: `${value.ref.toLowerCase()}s`,
            localField: key,
            foreignField: '_id',
            as: key,
          },
        });
        if (asSingleEntity) {
          fields.push({
            $addFields: {
              [key]: { $arrayElemAt: [`$${key}`, 0] },
            },
          });
        }
      }
    }
    return fields;
  },
  getVersionAllLookupSchema(asSingleEntity: boolean = false) {
    const fields: any[] = [];
    // @ts-ignore
    // eslint-disable-next-line no-restricted-syntax
    for (const [key, value]: [string, any] of Object.entries(Version.tree)) {
      // @ts-ignore
      // eslint-disable-next-line no-prototype-builtins
      if (value.hasOwnProperty('ref')) {
        fields.push({
          $lookup: {
            // @ts-ignore
            from: `${value.ref.toLowerCase()}s`,
            localField: key,
            foreignField: '_id',
            as: key,
          },
        });
        if (asSingleEntity) {
          fields.push({
            $addFields: {
              [key]: { $arrayElemAt: [`$${key}`, 0] },
            },
          });
        }
      }
    }
    return fields;
  },
};

export default model<Course, CourseModel>('Course', CourseSchema);
