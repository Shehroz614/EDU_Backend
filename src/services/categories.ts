import models from '@models/index';
import HTTPError from '@errors/HTTPError';
import { isEmpty } from '@middlewares/miniLodash';
import Category from '@edugram/types/category';

const find = (filter: any = {}, query: any = null) =>
  new Promise<Category[]>(async (resolve, reject) => {
    try {
      const categoriesQuery = models.Category.find(filter);
      if (query) {
        const { lean, select, populate = [] } = query;
        if (populate) {
          populate.forEach((item: any) => {
            categoriesQuery.populate(item);
          });
        }
        if (select) {
          categoriesQuery.select(select);
        }
        if (lean) {
          categoriesQuery.lean();
        }
      }
      const categories: Category[] = await categoriesQuery.exec();
      resolve(categories);
    } catch (err) {
      console.log(err);
      reject(err);
    }
  });
const findById = (id: string, query = null) =>
  new Promise<Category>(async (resolve, reject) => {
    try {
      const filter = { _id: id };
      const categoryQuery = models.Category.findOne(filter);
      if (query) {
        const { lean, select, populate = [] } = query;
        if (populate) {
          populate.forEach((item) => {
            categoryQuery.populate(item);
          });
        }
        if (select) {
          categoryQuery.select(select);
        }
        if (lean) {
          categoryQuery.lean();
        }
      }
      const category: Category = (await categoryQuery.exec()) as Category;
      if (!category) {
        reject(new HTTPError(404, 'Category not found!'));
        return;
      }
      resolve(category);
    } catch (err) {
      console.log(err);
      reject(err);
    }
  });
const create = (data: { name: string; parentCategoryId: string; subCategories: string[] }) =>
  new Promise<Category>(async (resolve, reject) => {
    try {
      const { name, parentCategoryId = null, subCategories = [] } = data;
      const category = await models.Category.create({
        name: { en: name },
        parent: parentCategoryId,
      });
      const subcategoriesArray = [];
      if (subCategories && subCategories.length > 0) {
        // eslint-disable-next-line no-restricted-syntax
        for (const item of subCategories) {
          const subCategory = await models.Category.create({
            name: { en: item },
            parent: category._id,
          });
          subcategoriesArray.push(subCategory);
        }
      }
      category.children = subcategoriesArray.map((item) => item._id);
      await category.save();
      category.children = subcategoriesArray;
      resolve(category);
    } catch (err) {
      console.log(err);
      reject(err);
    }
  });
const update = (updateData: any) =>
  new Promise<Category>(async (resolve, reject) => {
    try {
      const { categoryId, ...data } = updateData;
      if (isEmpty(data)) {
        reject(new HTTPError(400, 'Nothing to update'));
        return;
      }
      const category: Category = (await findById(categoryId)) as Category;
      if (data?.children) {
        if (category.children?.length > 0) {
          // eslint-disable-next-line no-restricted-syntax
          for (const item of category.children) {
            if (!data.children.includes(item)) {
              await update({
                categoryId: item,
                parent: null,
              });
            }
          }
        }
        // eslint-disable-next-line no-restricted-syntax
        for (const item of data.children) {
          if (!category.children.includes(item)) {
            await update({
              categoryId: item,
              parent: categoryId,
            });
          }
        }
      }
      category.set(data);
      await category.save();
      resolve(category);
    } catch (err) {
      console.log(err);
      reject(err);
    }
  });
const remove = (id: string) =>
  new Promise<void>(async (resolve, reject) => {
    try {
      const category: Category = (await findById(id)) as Category;
      if (!category) {
        reject(new HTTPError(400, 'Category not found!'));
        return;
      }
      // eslint-disable-next-line no-restricted-syntax
      for (const item of category.children) {
        await remove(item._id);
      }
      await models.Category.deleteOne({ _id: id });
      resolve();
    } catch (err) {
      console.log(err);
      reject(err);
    }
  });

export default {
  find,
  findById,
  create,
  update,
  remove,
};
