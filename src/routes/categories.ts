import express, { Request, Response, NextFunction } from 'express';
import CategoriesService from '@services/categories';
import isAuth from '@middlewares/isAuth';
import { Types } from 'mongoose';
import HTTPError from '@errors/HTTPError';

const router = express.Router();

/**
 * Get all categories
 * @since v1.0
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  /**
   * #swagger.tags = ['Categories']
   */
  try {
    const language = req.headers['accept-language'];
    const filter = {
      parent: null,
    };
    const query = {
      populate: [
        {
          path: 'children',
          populate: {
            path: 'children',
            populate: { path: 'children' },
          },
        },
      ],
      lean: true,
    };
    const categories = await CategoriesService.find(filter, query);
    res.send(categories);
  } catch (err) {
    next(err);
  }
});
/**
 * Create Category
 * @since v1.0
 */
router.post('/', isAuth, async (req: Request, res: Response, next: NextFunction) => {
  /**
   * #swagger.tags = ['Categories']
   */
  try {
    const data = req.body;
    const category = await CategoriesService.create(data);
    res.send(category);
  } catch (err) {
    console.log(err);
    next(err);
  }
});
/**
 * Get category
 * @since v1.0
 */
router.get('/:category', async (req: Request, res: Response, next: NextFunction) => {
  /**
   * #swagger.tags = ['Categories']
   */
  try {
    const { category } = req.params;
    const language = req.headers['accept-language'];
    if (!category) {
      next(new HTTPError(400, 'Category ID/Name is required'));
      return;
    }
    const filter = Types.ObjectId.isValid(category) ? { _id: category } : { 'locales.en': category };
    const response = await CategoriesService.find(filter, {
      populate: [
        {
          path: 'children',
          populate: {
            path: 'children',
            populate: { path: 'children' },
          },
        },
      ],
      lean: true,
    });
    res.send(response[0]);
  } catch (err) {
    next(err);
  }
});
/**
 * Add sub-category as children
 * @since v1.0
 */
router.patch('/:categoryId', isAuth, async (req: Request, res: Response, next: NextFunction) => {
  /**
   * #swagger.tags = ['Categories']
   */
  try {
    const { categoryId } = req.params;
    const data = req.body;
    if (!categoryId) {
      next(new HTTPError(400, 'Category ID is required'));
      return;
    }
    const category = await CategoriesService.update({ categoryId, ...data });
    res.send(category);
  } catch (err) {
    next(err);
  }
});
/**
 * Delete category
 * @since v1.0
 */
router.delete('/:categoryId', isAuth, async (req: Request, res: Response, next: NextFunction) => {
  /**
   * #swagger.tags = ['Categories']
   */
  try {
    const { categoryId } = req.params;
    if (!categoryId) {
      next(new HTTPError(400, 'Category ID is required'));
      return;
    }
    /**
     * Disabled logic due to admin role detection
     */
    return;
    // eslint-disable-next-line no-unreachable
    await CategoriesService.remove(categoryId);
    res.status(200);
  } catch (err) {
    next(err);
  }
});

export default router;
