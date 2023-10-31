import models from '@models/index';
import HTTPError from '@errors/HTTPError';
import sendMail from '@helpers/sendMail';
import { SUPPORT_REPORT_A_PROBLEM } from '@constants/mailTemplates';
import User from '@edugram/types/user';
import Report from '@edugram/types/support/report';

const createReport = ({
  userId,
  title,
  description,
  type,
  relatedItem,
}: {
  userId: string;
  title: string;
  description: string;
  type: Report['type'];
  relatedItem: Report['relatedItem'];
}) =>
  new Promise<Report>(async (resolve, reject) => {
    try {
      const user: User = (await models.User.findOne({ _id: userId })) as User;
      if (!user) {
        reject(new HTTPError(404, 'User not found'));
        return;
      }
      const report: Report = await models.Report.create({
        title,
        description,
        type,
        relatedItem,
        user: userId,
      });
      await sendMail(user.email, {
        template_id: SUPPORT_REPORT_A_PROBLEM,
        subject: 'Edugram.io - Report received',
        dynamic_template_data: {
          name: `${user.first_name} ${user.last_name}`,
          home_url: process.env.IsProduction === 'true' ? 'https://edugram.io' : 'https://dev.edugram.io',
        },
      });
      resolve(report);
    } catch (err) {
      console.log(err);
      reject(err);
    }
  });

export default {
  createReport,
};
