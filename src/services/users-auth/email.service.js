/**
 * Users service
 */
const mailer = require('nodemailer');
const commonUtils = require('../../core/utils/common.utils');

const Private = {
  // will be initialized on init
  Transporter: null,

  FromSender: null,
};

const Public = {
  /**
   * init
   */
  init: async () => {
    const config = JSON.parse(process.env.SMTP_CONFIG);
    Private.FromSender = config.from;

    Private.Transporter = mailer.createTransport({
      host: config.host,
      port: config.port,
      secureConnections: true,
      auth: {
        type: 'Regular',
        user: config.user,
        pass: config.password,
      },
    });

    try {
      let r = await Private.Transporter.verify();

      console.log(`\nEmail inited successfully ${r}`);
    } catch (e) {
      console.log(`\nFailed to init email sender: ${JSON.stringify(error)}`);
      Private.Transporter = null;
      process.exit(1);
    }
  },

  /**
   * send email
   */
  sendEmail: async (to, subject, body, _ctx) => {
    try {
      const msg = {
        from: Private.FromSender,
        to,
        subject,
        html: body,
      };

      if (commonUtils.isDebug()) {
        msg.to = msg.from;
      }

      let r = await Private.Transporter.sendMail(msg);

      console.log(`\nEmail sent to ${to}. ${r.messageId}`);
    } catch (e) {
      console.log(`\nFailed to send email to ${to}. ${e.stack}`);
    }
  },
};

module.exports = {
  ...Public,
};
