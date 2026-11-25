/**
 * Users auth agreements service: the legal documents that a user accepts to use its account
 * - the agreements (UsersAuthConstants.Agreements): terms (the end user license agreement and the terms and conditions)
 *   and privacy (the privacy policy, GDPR), each with a version (the effective date of its documents)
 * - the documents are src/translations/<lang>.legal.<name>.md, read once at the start: the operator details
 *   (SMALL_API_LEGAL_CONFIG) are filled in and the text is split into blocks (headings, paragraphs, lists), so a client
 *   shows them as text (never as html)
 * - a user accepts the current versions at the setup of its account (the link of its invitation), or later (an account
 *   created before the agreements, or a new version): until then its session can only accept them, read the current
 *   user, log out or delete its account (users-auth validate, the pseudo-role agreements-pending)
 * - the acceptance is kept on the user: agreements: { terms: { version, acceptedAt }, privacy: { version, acceptedAt } }
 */
const fs = require('fs');
const path = require('path');
const Joi = require('joi');

const CommonUtils = require('../../core/utils/common.utils.js');
const ConfigSettings = require('../config.settings.js');
const UsersRest = require('../rest/users.rest.js');
const UsersAuthConstants = require('./users-auth.constants.js');
const WebServerConstants = require('../../web-server/web-server.constants.js');

const Validators = {
  // the versions that the user read and accepted: all the agreements (each checkbox is checked)
  Accept: Joi.object()
    .keys(
      Object.fromEntries(
        Object.keys(UsersAuthConstants.Agreements).map((name) => [name, Joi.string().min(1).max(32).required()])
      )
    )
    .required(),
};

const Private = {
  // the documents by language and name: { en: { eula: { title, blocks } } }
  Documents: {},

  // the folder of the documents
  Folder: path.join(__dirname, '../../translations'),

  /**
   * the text with its placeholders filled in ({operatorName}); a placeholder without a value stays as it is
   */
  expand: (text, args) => {
    return text.replaceAll(/\{([A-Za-z]+)\}/g, (placeholder, key) =>
      Object.hasOwn(args, key) ? args[key] : placeholder
    );
  },

  /**
   * a document (markdown: '#' and '##' headings, '- ' list items, paragraphs separated by an empty line) as blocks:
   * { title, blocks: [ { type: 'h1' | 'h2' | 'p', text } | { type: 'ul', items: [ text ] } ] }; the lines of a
   * paragraph or of a list item are joined, the title is the first '#' heading
   */
  parse: (text) => {
    const blocks = [];
    let current = null; // the paragraph or the list being read
    const close = () => {
      current = null;
    };

    for (const rawLine of text.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line) {
        close();
        continue;
      }

      const heading = /^(#{1,2})\s+(.*)$/.exec(line);
      if (heading) {
        close();
        blocks.push({ type: heading[1].length === 1 ? 'h1' : 'h2', text: heading[2].trim() });
        continue;
      }

      const item = /^-\s+(.*)$/.exec(line);
      if (item) {
        if (current?.type !== 'ul') {
          current = { type: 'ul', items: [] };
          blocks.push(current);
        }
        current.items.push(item[1].trim());
        continue;
      }

      // the next line of a list item, or of a paragraph
      if (current?.type === 'ul') {
        current.items[current.items.length - 1] += ` ${line}`;
      } else if (current?.type === 'p') {
        current.text += ` ${line}`;
      } else {
        current = { type: 'p', text: line };
        blocks.push(current);
      }
    }

    const title = blocks.find((block) => block.type === 'h1')?.text || '';
    return { title, blocks };
  },

  /**
   * the language of the documents of a request: its language when there are documents in it, the default otherwise
   */
  getLanguage: (_ctx) => {
    return Private.Documents[_ctx?.lang] ? _ctx.lang : WebServerConstants.Languages[0];
  },

  /**
   * a version that is not the current one: the documents changed after the user read them
   */
  changed: () => {
    const msg = 'The documents were changed, read them again';
    return { status: 409, error: { message: msg, error: new Error(msg) } };
  },
};

const Public = {
  /**
   * read the documents of every language (at the start): the default language must have all of them (the start
   * fails otherwise), another language uses the default document for a missing one
   */
  init: async () => {
    const legal = ConfigSettings.getLegalSettings().value;
    const defaultLanguage = WebServerConstants.Languages[0];

    Private.Documents = {};
    for (const lang of WebServerConstants.Languages) {
      Private.Documents[lang] = {};
      for (const agreement of Object.values(UsersAuthConstants.Agreements)) {
        const args = {
          operatorName: legal.name,
          operatorAddress: legal.address,
          operatorEmail: legal.email,
          operatorCountry: legal.country,
          appUrl: process.env.SMALL_UI_URL || '',
          effectiveDate: agreement.version,
        };
        for (const document of agreement.documents) {
          const file = path.join(Private.Folder, `${lang}.legal.${document}.md`);
          if (!fs.existsSync(file) && lang !== defaultLanguage) {
            Private.Documents[lang][document] = Private.Documents[defaultLanguage][document];
            continue;
          }
          const text = fs.readFileSync(file).toString();
          Private.Documents[lang][document] = Private.parse(Private.expand(text, args));
        }
      }
    }

    console.log(`\n${UsersAuthConstants.ServiceName}: legal documents loaded`);
    return true;
  },

  /**
   * the agreements and their documents, in the language of the request (public: they are read before the account is
   * set up, and before the login)
   * returns { status, value: { language, agreements: [ { name, version, documents: [ { name, title, blocks } ] } ] } }
   */
  get: async (_ctx) => {
    const language = Private.getLanguage(_ctx);
    const agreements = Object.entries(UsersAuthConstants.Agreements).map(([name, agreement]) => ({
      name,
      version: agreement.version,
      documents: agreement.documents.map((document) => ({ name: document, ...Private.Documents[language][document] })),
    }));
    return { status: 200, value: { language, agreements } };
  },

  /**
   * the agreements that a user has not accepted in their current version (none: it can use its account)
   * user: { agreements?: { terms?: { version } } }
   * returns [ name ]
   */
  getPending: (user) => {
    return Object.entries(UsersAuthConstants.Agreements)
      .filter(([name, agreement]) => user?.agreements?.[name]?.version !== agreement.version)
      .map(([name]) => name);
  },

  /**
   * check the versions that a user accepted: all the agreements, each in its current version
   * objInfo: { terms: version, privacy: version }
   * returns { status, value: { terms: { version, acceptedAt }, privacy: { version, acceptedAt } } } (what is kept on
   * the user) or { status, error }: 400 (one is missing), 409 (a document changed after it was read)
   */
  check: (objInfo, _ctx) => {
    const v = Validators.Accept.validate(objInfo);
    if (v.error) {
      return CommonUtils.getSchemaValidationError(v, objInfo, _ctx);
    }

    const acceptedAt = new Date().toISOString();
    const agreements = {};
    for (const [name, agreement] of Object.entries(UsersAuthConstants.Agreements)) {
      if (v.value[name] !== agreement.version) {
        return Private.changed();
      }
      agreements[name] = { version: agreement.version, acceptedAt };
    }
    return { status: 200, value: agreements };
  },

  /**
   * keep the agreements accepted by a user (checked by check) on the user
   * returns { status, value } or { status, error }
   */
  save: async (userID, agreements, _ctx) => {
    return await UsersRest.putAgreements(userID, { agreements }, _ctx);
  },

  /**
   * the current user accepts the current versions of the agreements
   * objInfo: { terms: version, privacy: version }
   * returns { status, value: { agreementsPending: [] } } or { status, error }
   */
  accept: async (objInfo, _ctx) => {
    const rCheck = Public.check(objInfo, _ctx);
    if (rCheck.error) {
      return rCheck;
    }

    const r = await Public.save(_ctx.userID, rCheck.value, _ctx);
    if (r.error) {
      return r;
    }
    return { status: 200, value: { agreementsPending: Public.getPending({ agreements: rCheck.value }) } };
  },
};

module.exports = { ...Public };
