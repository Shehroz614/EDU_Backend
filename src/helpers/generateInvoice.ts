import PDFDocument from 'pdfkit';
import path from 'path';
import Transaction from '@edugram/types/order/transaction';
import getSecret from '@helpers/fetchAWSSecret';
import dayjs from 'dayjs';

const generateInvoice = async (transaction: Transaction) =>
  new Promise<Buffer>(async (resolve, reject) => {
    try {
      const PaymentsConfig = JSON.parse((await getSecret('PG')) as string);
      // eslint-disable-next-line global-require
      const stripe = require('stripe')(PaymentsConfig.STRIPE_SECRET_KEY);
      const items = transaction.items.map((i: any) => ({
        title: i.title,
        quantity: 1,
        price: (i.salePrice || i.price) / 100,
        discount: i.discount / 100 || 0,
      }));

      let paymentIntent;
      if (transaction.gatewayId) {
        paymentIntent = await stripe.paymentIntents.retrieve(transaction.gatewayId, {
          expand: ['payment_method'],
        });
      }

      let userDetails;

      if (transaction.amount > 0) {
        userDetails = {
          name: paymentIntent.payment_method.billing_details.name,
          email: paymentIntent.payment_method.billing_details.email,
          address: {
            line1: paymentIntent.payment_method.billing_details.address.line1,
            line2: `${paymentIntent.payment_method.billing_details.address.city}, ${paymentIntent.payment_method.billing_details.address.state} - ${paymentIntent.payment_method.billing_details.address.postal_code}, ${paymentIntent.payment_method.billing_details.address.country}`,
          },
        };
      } else {
        userDetails = {
          name: transaction.user
            ? `${transaction.user.first_name} ${transaction.user.last_name}`
            : `${transaction.orderId.userDetails.first_name} ${transaction.orderId.userDetails.first_name}`,
          email: transaction.user ? transaction.user.email : transaction.orderId.userDetails.email,
          address: {
            line1: 'N/A',
            line2: 'N/A',
          },
        };
      }

      const margin = 60;
      const doc = new PDFDocument({ size: 'A4', margin });
      // HEADER
      doc.image(path.join(__dirname, '..', 'assets/images', 'edugram-logo.png'), margin, margin - 5, {
        width: 220,
        height: 49.5,
      });
      doc.fontSize(12);
      doc.font('Helvetica-Bold');
      doc.text('Edugram Inc.', margin, margin, { align: 'right' });
      doc.fontSize(11);
      doc.font('Helvetica');
      doc.text('2093 PHILADELPHIA PIKE #2088', { align: 'right' });
      doc.text('CLAYMONT, DE, 19703', { align: 'right' });
      doc.text('United States', { align: 'right' });

      doc.moveTo(margin, 135);
      doc.lineTo(doc.page.width - margin, 135);
      doc.stroke();

      doc.fontSize(12);
      doc.font('Helvetica-Bold');
      doc.text('Bill to', margin, 160, { align: 'left' });
      doc.fontSize(11);
      doc.font('Helvetica');
      doc.text(userDetails.name, { align: 'left' });
      doc.text(userDetails.email, { align: 'left' });
      doc.text(userDetails.address.line1, { align: 'left' });
      doc.text(userDetails.address.line2, { align: 'left' });

      doc.fontSize(12);
      doc.font('Helvetica-Bold');
      doc.text('Receipt Date', margin, 160, { align: 'right' });
      doc.fontSize(11);
      doc.font('Helvetica');
      doc.text(dayjs().format('dddd, MMM DD, YYYY'), { align: 'right' });
      doc.text(' ', { align: 'right' });
      doc.fontSize(12);
      doc.font('Helvetica-Bold');
      doc.text('Receipt No', { align: 'right' });
      doc.fontSize(11);
      doc.font('Helvetica');
      doc.text(transaction.orderId._id, { align: 'right' });

      doc.fontSize(12);
      doc.font('Helvetica-Bold');
      doc.text('Payment Method:', margin, 240, { align: 'left' });
      doc.fontSize(11);
      doc.font('Helvetica');
      doc.text(
        paymentIntent
          ? `${paymentIntent.payment_method.card?.brand?.toUpperCase()} - ${paymentIntent.payment_method.card?.last4}`
          : 'N/A',
        margin + 110,
        240,
        {
          align: 'left',
        },
      );

      // ITEMS TABLE
      doc.moveTo(margin, 275);
      doc.lineTo(doc.page.width - margin, 275);
      doc.stroke();

      doc.fontSize(12);
      doc.font('Helvetica-Bold');
      doc.text('Item', margin + 10, 290);
      doc.text('Quantity', margin + 180, 290);
      doc.text('Price', margin + 260, 290);
      doc.text('Discount', margin + 320, 290);
      doc.text('Amount', margin + 400, 290);

      doc.moveTo(margin, 315);
      doc.lineTo(doc.page.width - margin, 315);
      doc.stroke();

      // ITEM
      let yPosition = 330;
      let subTotal = 0;
      let totalDiscount = 0;
      let totalAmount = 0;

      items.forEach((item) => {
        const { title, quantity, price, discount } = item;
        subTotal += price;
        const amount = quantity * price - discount;
        totalDiscount += discount;
        totalAmount += amount;

        doc.fontSize(11);
        doc.font('Helvetica');
        const itemNameHeight = doc.heightOfString(title, { width: 170 });
        const rowHeight = Math.max(20, itemNameHeight);

        doc.text(title, margin + 10, yPosition, { width: 160, height: rowHeight });
        doc.text(quantity, margin + 180, yPosition);
        doc.text(`$${price}`, margin + 260, yPosition);
        doc.text(`$${discount}`, margin + 320, yPosition);
        doc.text(`$${amount}`, margin + 400, yPosition);

        doc.moveTo(margin, yPosition + rowHeight + 15);
        doc.lineTo(doc.page.width - margin, yPosition + rowHeight + 15);
        doc.stroke();

        yPosition += 40 + rowHeight;
      });

      doc.fontSize(12);
      doc.font('Helvetica-Bold');
      doc.text('SUB TOTAL', margin + 260, yPosition);
      doc.fontSize(14);
      doc.text(`$${subTotal}`, margin + 400, yPosition);

      doc.fontSize(11);
      doc.font('Helvetica');
      doc.text('Tax VAT (18%)', margin + 260, yPosition + 35);
      doc.fontSize(14);
      doc.text('N/A', margin + 400, yPosition + 35);

      doc.fontSize(11);
      doc.text('Discount', margin + 260, yPosition + 70);
      doc.fontSize(14);
      doc.text(`$${totalDiscount}`, margin + 400, yPosition + 70);

      doc.moveTo(margin, yPosition + 105);
      doc.lineTo(doc.page.width - margin, yPosition + 105);
      doc.stroke();

      doc.fontSize(12);
      doc.font('Helvetica-Bold');
      doc.text('Total Paid', margin + 260, yPosition + 130);
      doc.fontSize(14);
      doc.text(`$${totalAmount}`, margin + 400, yPosition + 130);

      // FOOTER
      doc.fontSize(14);
      doc.font('Helvetica');
      doc.text('edugram.io', margin, doc.page.height - 90, { align: 'center' });

      const buffers: Buffer[] = [];
      doc.on('data', (chunk: any) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.end();
    } catch (err) {
      console.log(err);
      reject(err);
    }
  });
export default generateInvoice;
