import express, { Request, Response, NextFunction } from 'express';
import sharp from 'sharp';
import multer from 'multer';
import UserService from '@services/user';
import isAuth from '@middlewares/isAuth';
import HTTPError from '@errors/HTTPError';
import models from '@models/index';

const router = express.Router();

/**
 * I have no idea where this is being used, i would remove this
 * @since v1.0
 */
router.post('/user', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { uid } = req.body;
    const user = await models.User.findById(uid);
    if (!user) {
      next(new HTTPError(404, 'User not found'));
      return;
    }
    res.json(user);
  } catch (err) {
    next(new HTTPError(500, 'Something went wrong'));
  }
});

/**
 * Update user profile
 * @since v1.0
 */
router.patch('/profile', isAuth, async (req: Request, res: Response, next: NextFunction) => {
  /**
   * #swagger.tags = ['User']
     #swagger.responses[500] = {
        schema: {
          $ref: '#/definitions/user/properties/500'
        }
     }
   */
  try {
    const userId = req?.userData?.uid as string;
    const data = req.body;
    const response = await UserService.updateProfile(userId, data);
    res.json(response);
  } catch (err) {
    next(err);
  }
});

/**
 * Update User Avatar
 * @since v1.0
 */
router.put('/avatar', [isAuth, multer().single('avatar')], async (req: Request, res: Response, next: NextFunction) => {
  /**
   * #swagger.tags = ['User']
     #swagger.responses[400] = {
        schema: {
          $ref: '#/definitions/user/properties/400'
        }
     }
     #swagger.responses[404] = {
        schema: {
          $ref: '#/definitions/user/properties/404'
        }
     }
     #swagger.responses[500] = {
        schema: {
          $ref: '#/definitions/user/properties/500'
        }
     }
   */
  try {
    const userId = req?.userData?.uid as string;
    const { file } = req;
    if (!file) {
      next(new HTTPError(400, 'Bad Request'));
      return;
    }

    const image = sharp(file.buffer);
    const metadata = await image.metadata();
    const { width, height } = metadata;

    if ((width && width > 512) || (height && height > 512)) {
      next(new HTTPError(400, 'Avatar dimensions cannot exceed 512x512 pixels'));
      return;
    }
    if (file.size > 500000) {
      next(new HTTPError(400, 'Avatar size cannot be more than 500KB'));
    }
    const response = await UserService.updateAvatar(userId, file);
    res.send(response);
  } catch (err) {
    next(err);
  }
});

/**
 * Get my courses purchased + published
 * @since v1.0
 */
router.get('/my-courses', isAuth, async (req: Request, res: Response, next: NextFunction) => {
  /**
   * #swagger.tags = ['User']
   */
  try {
    const userId = req?.userData?.uid as string;
    const courses = await UserService.getCourses(userId, 'purchased_courses');
    res.json(courses);
  } catch (err) {
    next(err);
  }
});

/**
 * Get user wishlist
 * @since v1.0
 */
router.get('/wishlist', isAuth, async (req: Request, res: Response, next: NextFunction) => {
  /**
   * #swagger.tags = ['User']
   */
  try {
    const userId = req?.userData?.uid as string;
    const courses = await UserService.getCourses(userId, 'wishlist');
    res.json(courses);
  } catch (err) {
    next(err);
  }
});

/**
 * Add course to wishlist
 * @since v1.0
 */
router.put('/wishlist', isAuth, async (req: Request, res: Response, next: NextFunction) => {
  /**
   * #swagger.tags = ['User']
   */
  try {
    const userId = req?.userData?.uid as string;
    const { courseId } = req.body;
    if (!courseId) {
      next(new HTTPError(400, 'Course ID is required'));
      return;
    }
    const wishlist = await UserService.addToCourses({ userId, courseId, type: 'wishlist' });
    res.json(wishlist);
  } catch (err) {
    next(err);
  }
});

/**
 * Add courses to wishlist
 * @since v1.0
 */
router.post('/wishlist', isAuth, async (req: Request, res: Response, next: NextFunction) => {
  /**
   * #swagger.tags = ['User']
   */
  try {
    const userId = req?.userData?.uid as string;
    const { courses } = req.body;
    if (!courses) {
      next(new HTTPError(400, 'Courses cannot be empty'));
      return;
    }
    const wishlist = await UserService.updateCourses({ userId, courses, type: 'wishlist' });
    res.json(wishlist);
  } catch (err) {
    next(err);
  }
});

/**
 * Delete course from wishlist
 * @since v1.0
 */
router.delete('/wishlist/:courseId', isAuth, async (req: Request, res: Response, next: NextFunction) => {
  /**
   * #swagger.tags = ['User']
   */
  try {
    const userId = req?.userData?.uid as string;
    const { courseId } = req.params;
    if (!courseId) {
      next(new HTTPError(400, 'Course ID is required'));
      return;
    }
    const wishlist = await UserService.deleteFromCourses({ courseId, userId, type: 'wishlist' });
    res.json(wishlist);
  } catch (err) {
    next(err);
  }
});

/**
 * Get user cart
 * @since v1.0
 */
router.get('/cart', isAuth, async (req: Request, res: Response, next: NextFunction) => {
  /**
   * #swagger.tags = ['User']
     #swagger.responses[500] = {
        schema: {
          $ref: '#/definitions/gift/properties/500'
        }
     }
   */
  try {
    const userId = req?.userData?.uid as string;
    const courses = await UserService.getCourses(userId, 'in_cart');
    res.json(courses);
  } catch (err) {
    next(err);
  }
});

/**
 * Add course to Cart
 * @since v1.0
 */
router.put('/cart', isAuth, async (req: Request, res: Response, next: NextFunction) => {
  /**
   * #swagger.tags = ['User']
   */
  try {
    const userId = req?.userData?.uid as string;
    const { courseId } = req.body;
    if (!courseId) {
      next(new HTTPError(400, 'Course ID is required'));
      return;
    }
    const in_cart = await UserService.addToCourses({ userId, courseId, type: 'in_cart' });
    res.json(in_cart);
  } catch (err) {
    next(err);
  }
});

/**
 * Add courses to Cart
 * @since v1.0
 */
router.post('/cart', isAuth, async (req: Request, res: Response, next: NextFunction) => {
  /**
   * #swagger.tags = ['User']
   */
  try {
    const userId = req?.userData?.uid as string;
    const { courses } = req.body;
    if (!courses) {
      next(new HTTPError(400, 'Courses cannot be empty'));
      return;
    }
    const in_cart = await UserService.updateCourses({ userId, courses, type: 'in_cart' });
    res.json(in_cart);
  } catch (err) {
    next(err);
  }
});

/**
 * Remove course from Cart
 * @since v1.0
 */
router.delete('/cart/:courseId', isAuth, async (req: Request, res: Response, next: NextFunction) => {
  /**
   * #swagger.tags = ['User']
   */
  try {
    const userId = req?.userData?.uid as string;
    const { courseId } = req.params;
    if (!courseId) {
      next(new HTTPError(400, 'Course ID is required'));
      return;
    }
    await UserService.deleteFromCourses({
      userId,
      courseId,
      type: 'in_cart',
    });
    res.json();
  } catch (err) {
    next(err);
  }
});

/**
 * Get user cart
 * @since v1.0
 */
router.get('/saved-items', isAuth, async (req: Request, res: Response, next: NextFunction) => {
  /**
   * #swagger.tags = ['User']
   #swagger.responses[500] = {
   schema: {
   $ref: '#/definitions/gift/properties/500'
   }
   }
   */
  try {
    const userId = req?.userData?.uid as string;
    const courses = await UserService.getCourses(userId, 'saved_items');
    res.json(courses);
  } catch (err) {
    next(err);
  }
});

/**
 * Add course to Cart
 * @since v1.0
 */
router.put('/saved-items', isAuth, async (req: Request, res: Response, next: NextFunction) => {
  /**
   * #swagger.tags = ['User']
   */
  try {
    const userId = req?.userData?.uid as string;
    const { courseId } = req.body;
    if (!courseId) {
      next(new HTTPError(400, 'Course ID is required'));
      return;
    }
    const in_cart = await UserService.addToCourses({ userId, courseId, type: 'saved_items' });
    res.json(in_cart);
  } catch (err) {
    next(err);
  }
});

/**
 * Add courses to Cart
 * @since v1.0
 */
router.post('/saved-items', isAuth, async (req: Request, res: Response, next: NextFunction) => {
  /**
   * #swagger.tags = ['User']
   */
  try {
    const userId = req?.userData?.uid as string;
    const { courses } = req.body;
    if (!courses) {
      next(new HTTPError(400, 'Courses cannot be empty'));
      return;
    }
    const in_cart = await UserService.updateCourses({ userId, courses, type: 'saved_items' });
    res.json(in_cart);
  } catch (err) {
    next(err);
  }
});

/**
 * Remove course from Cart
 * @since v1.0
 */
router.delete('/saved-items/:courseId', isAuth, async (req: Request, res: Response, next: NextFunction) => {
  /**
   * #swagger.tags = ['User']
   */
  try {
    const userId = req?.userData?.uid as string;
    const { courseId } = req.params;
    if (!courseId) {
      next(new HTTPError(400, 'Course ID is required'));
      return;
    }
    await UserService.deleteFromCourses({
      userId,
      courseId,
      type: 'saved_items',
    });
    res.json();
  } catch (err) {
    next(err);
  }
});

export default router;
