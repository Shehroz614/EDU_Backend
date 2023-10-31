// eslint-disable-next-line import/no-extraneous-dependencies
import swaggerAutogen from 'swagger-autogen';
import Schema403 from './definitions/403';
import Schema500 from './definitions/500';
import GiftSchema from './definitions/gift';
import OrderSchema from './definitions/order';
import CouponSchema from './definitions/coupon';
import PaymentSchema from './definitions/payment';
import UserSchema from './definitions/user';

const doc = {
  info: {
    title: 'Edugram API',
    description: 'Edugram Backend API',
  },
  // eslint-disable-next-line no-undef
  host: process.env.IsProduction === 'true' ? 'berlin.edugram.io' : 'katowice.edugram.io',
  schemes: ['https'],
  definitions: {
    course: {
      ShortCourseDetails: {},
      CourseDetails: {},
      500: Schema500,
    },
    coupon: {
      CouponDetails: CouponSchema.CouponDetails,
      400: CouponSchema[400],
      403: CouponSchema[403],
      404: CouponSchema[404],
      500: Schema500,
    },
    order: {
      OrderDetails: OrderSchema.OrderDetails,
      409: OrderSchema[409],
      500: Schema500,
    },
    payment: {
      201: PaymentSchema[201],
      500: Schema500,
    },
    gift: {
      GiftDetails: GiftSchema.GiftDetails,
      400: GiftSchema[400],
      403: Schema403,
      404: GiftSchema[404],
      500: Schema500,
    },
    user: {
      400: UserSchema[400],
      404: UserSchema[404],
      500: Schema500,
    },
  },
};

const outputFile = './swagger.json';
const endpointsFiles = ['../routes/index'];
swaggerAutogen()(outputFile, endpointsFiles, doc);
