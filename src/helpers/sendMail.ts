import SendGrid from '@sendgrid/mail';
import getSecret from '@helpers/fetchAWSSecret';

const sendMail = (
  to: string | string[],
  data: {
    subject: string;
    html?: string;
    template_id?: string;
    dynamic_template_data?: any;
    attachments?: {
      content: string;
      filename: string;
      type: string;
      disposition: 'attachment';
      content_id: string | number;
    }[];
  },
) =>
  new Promise(async (resolve, reject) => {
    try {
      const SendGridConfig = JSON.parse((await getSecret('SENDGRID')) as string);
      SendGrid.setApiKey(SendGridConfig.SENDGRID_API_KEY);

      const msg: any = {
        to,
        from: {
          email: 'no-reply@edugram.io',
          name: 'Edugram.io',
        },
        replyTo: {
          email: 'support@edugram.io',
          name: 'Edugram.io',
        },
      };
      if (data.subject) {
        msg.subject = data.subject;
      }
      if (data.template_id) {
        msg.template_id = data.template_id;
        msg.dynamic_template_data = data.dynamic_template_data;
      } else {
        msg.html = data.html;
      }
      if (data.attachments) {
        msg.attachments = data.attachments;
      }

      SendGrid.send(msg)
        .then((response) => {
          resolve(response[0].statusCode);
        })
        .catch((error) => {
          console.error(error);
          reject(error);
        });
    } catch (err) {
      reject(err);
    }
  });

export default sendMail;
