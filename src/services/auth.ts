import models from '@models/index';
import User from '@edugram/types/user';

/**
 * Get User
 * @param userId
 */
const login = (userId: string) =>
  new Promise<User>(async (resolve, reject) => {
    try {
      const user: User = (await models.User.findById(userId).lean()) as User;
      resolve(user);
    } catch (err) {
      console.log(err);
      reject(err);
    }
  });

/**
 * Create user
 * @description Returns Existing user if exists or Creates a new one
 * @param userRecord
 * @param userData
 */
const register = (
  userRecord: { uid: string; email: string },
  userData: { first_name: string; last_name: string; email_subscription: boolean },
) =>
  new Promise<User>(async (resolve, reject) => {
    try {
      const user: User = (await models.User.findById(userRecord.uid).lean()) as User;
      if (user) {
        resolve(user);
        return;
      }
      const newUser = new models.User({
        _id: userRecord.uid,
        email: userRecord.email,
        first_name: userData.first_name || '',
        last_name: userData.last_name || '',
        email_subscription: userData.email_subscription,
        tosAcceptedAt: new Date(),
      });
      await newUser.save();
      resolve(newUser);
    } catch (err) {
      console.log(err);
      reject(err);
    }
  });

export default {
  login,
  register,
};
