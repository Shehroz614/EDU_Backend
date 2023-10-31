import models from '@models/index';
import HTTPError from '@errors/HTTPError';
import Setting from '@edugram/types/setting';

/**
 * Get Setting by name
 * @param name
 * @param userId
 */
const getSetting = (name: string, userId?: string | null) =>
  new Promise<Setting>(async (resolve, reject) => {
    try {
      const query: any = { name };
      if (!userId) {
        query.isPublic = true;
      }
      const setting = await models.Setting.findOne(query);
      if (!setting) {
        reject(new HTTPError(404, 'Setting not found'));
        return;
      }
      resolve(setting);
    } catch (err) {
      console.log(err);
      reject(err);
    }
  });

export default {
  getSetting,
};
