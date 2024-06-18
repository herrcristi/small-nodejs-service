/**
 * Users service
 */
const mailer = require('nodemailer');
const CommonUtils = require('../../core/utils/common.utils');

const Private = {
  // will be initialized on init
  Transporter: null,

  FromSender: null,
  ToSender: null,
};

const Public = {
  /**
   * init
   */
  init: async () => {
    const config = JSON.parse(process.env.SMTP_CONFIG);

    Private.FromSender = config.from;
    Private.ToSender = config.to; // override to for dev purposes

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
      if (!r) {
        throw new Error('Email setup verified failed');
      }

      console.log(`\nEmail inited successfully ${r}`);
    } catch (e) {
      console.log(`\nFailed to init email sender: ${JSON.stringify(e.message || e)}`);
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

      // override to for dev purposes
      if (CommonUtils.isDebug() && Private.ToSender) {
        msg.to = Private.ToSender;
      }

      let r = await Private.Transporter.sendMail(msg);

      console.log(`\nEmail sent to: ${to}. MessageID: ${r.messageId}`);
      return {
        status: 200,
        value: {
          messageID: r.messageId,
        },
      };
    } catch (e) {
      const msg = `Failed to send email to: ${to}`;
      console.log(`\n${msg}. ${e.stack}`);
      return {
        status: 500,
        error: { message: msg, error: new Error(msg) },
      };
    }
  },
};

module.exports = {
  ...Public,
};
