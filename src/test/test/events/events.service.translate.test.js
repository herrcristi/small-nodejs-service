const path = require('path');
const _ = require('lodash');
const assert = require('assert');
const sinon = require('sinon');
const chai = require('chai');
const supertest = require('supertest');

const TranslationsUtils = require('../../../core/utils/translations.utils.js');

const TestConstants = require('../../test-constants.js');
const EventsService = require('../../../services/events/events.service.js');

describe('Events Service', function () {
  const _ctx = { reqID: 'testReq', lang: 'en', service: 'Events' };

  before(async function () {});

  beforeEach(async function () {});

  afterEach(async function () {
    sinon.restore();
  });

  after(async function () {});

  /**
   * translate with success
   */
  /**
   * translate with success
   */
  it('should do translate with success', async () => {
    const testEvents = _.cloneDeep(TestConstants.Events);
    const testEvent = testEvents[0];
    testEvent.args = ['other'];

    // stub
    let stubString = sinon.stub(TranslationsUtils, 'string');
    stubString.onCall(0).callsFake((string, ctx, args) => {
      console.log(`\nTranslationsUtils.string called`);
      console.log(`\nargs=${JSON.stringify(args, null, 2)}\n`);

      chai.expect(args).to.equal(undefined);
      return {};
    });
    stubString.onCall(1).callsFake((string, ctx, args) => {
      console.log(`\nTranslationsUtils.string called`);
      console.log(`\nargs=${JSON.stringify(args, null, 2)}\n`);

      // {target} the target, {user} the user; an argument that is not a JSON object has no named details
      chai.expect(args).to.deep.equal({ target: 'GitHub University', user: 'big.ben@testdomain.test' });
      return {};
    });

    let stubAddTranslations = sinon.stub(TranslationsUtils, 'addTranslations').callsFake((obj, translations) => {
      console.log(`\nTranslationsUtils.addTranslations called\n`);
      return {};
    });

    // call
    let res = await EventsService.translate(testEvent, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stubString.callCount).to.equal(2);
    chai.expect(stubAddTranslations.callCount).to.equal(1);
  }).timeout(10000);

  /**
   * translate with success - obj with no args
   */
  it('should do translate with success', async () => {
    const testEvents = _.cloneDeep(TestConstants.Events);
    const testEvent = testEvents[0];
    delete testEvent.args;

    // stub
    let stubString = sinon.stub(TranslationsUtils, 'string');
    stubString.onCall(0).callsFake((string, ctx, args) => {
      console.log(`\nTranslationsUtils.string called`);
      console.log(`\nargs=${JSON.stringify(args, null, 2)}\n`);

      chai.expect(args).to.equal(undefined);
      return {};
    });
    stubString.onCall(1).callsFake((string, ctx, args) => {
      console.log(`\nTranslationsUtils.string called`);
      console.log(`\nargs=${JSON.stringify(args, null, 2)}\n`);

      chai.expect(args).to.deep.equal({ target: 'GitHub University', user: 'big.ben@testdomain.test' });
      return {};
    });

    let stubAddTranslations = sinon.stub(TranslationsUtils, 'addTranslations').callsFake((obj, translations) => {
      console.log(`\nTranslationsUtils.addTranslations called\n`);
      return {};
    });

    // call
    let res = await EventsService.translate(testEvent, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(stubString.callCount).to.equal(2);
    chai.expect(stubAddTranslations.callCount).to.equal(1);
  }).timeout(10000);

  /**
   * the real messages (an earlier test replaces the loaded strings)
   */
  const loadStrings = async () => {
    for (const lang of ['en', 'ro']) {
      const file = path.join(__dirname, `../../../translations/${lang}.json`);
      await TranslationsUtils.initStrings(lang, file, _ctx);
    }
  };

  /**
   * the details of an event are named arguments of its message
   */
  it('should translate a message with the details of the event', async () => {
    await loadStrings();

    // a failed invite, with its details
    const event = {
      severity: 'info',
      messageID: 'users-auth.invite.failed',
      target: { id: 'john.doe@testdomain.test', name: 'john.doe@testdomain.test' },
      user: { id: 'admin1', username: 'admin@testdomain.test' },
      args: [JSON.stringify({ school: 'School One', reason: 'Not found', set: { status: 'disabled' }, list: [1] })],
    };

    // call
    const res = await EventsService.translate(event, _ctx);

    // check: the target, the user and the details are in the message
    chai
      .expect(res['_lang_en.message'])
      .to.equal(
        "The invitation of 'john.doe@testdomain.test' to 'School One' by 'admin@testdomain.test' failed: Not found"
      );

    // a nested detail by its path
    const status = await EventsService.translate(
      { ...event, messageID: 'users.patchStatus', target: { name: 'John Doe' } },
      _ctx
    );
    chai
      .expect(status['_lang_en.message'])
      .to.equal("The status of user 'John Doe' was changed to 'disabled' by 'admin@testdomain.test'");
  }).timeout(10000);

  /**
   * only the JSON objects of the arguments give named details (not a text, null, a list, or deeper than 3 levels)
   */
  it('should take the named details only from the JSON objects of the arguments', async () => {
    await loadStrings();

    // a text, null, a list, and an object with a value too deep and a status
    const deep = { a: { b: { c: { d: { e: 'too deep' } } } }, status: 'active' };
    const event = {
      messageID: 'users.putStatus',
      target: { name: 'John Doe' },
      user: { username: 'admin@testdomain.test' },
      args: [JSON.stringify('text'), 'null', JSON.stringify([1]), JSON.stringify(deep)],
    };

    // call
    const res = await EventsService.translate(event, _ctx);

    // check: only the status is used
    chai
      .expect(res['_lang_en.message'])
      .to.equal("The status of user 'John Doe' was changed to 'active' by 'admin@testdomain.test'");
  }).timeout(10000);

  /**
   * every event raised by the services has a message (the id is never shown as it is)
   */
  it('should have a message for every event of the services', async () => {
    await loadStrings();

    // the event ids: the operations of every service, then the special ones
    const ids = [];
    for (const service of [
      'schools',
      'users',
      'admins',
      'students',
      'professors',
      'classes',
      'locations',
      'groups',
      'schedules',
    ]) {
      for (const action of ['post', 'delete', 'put', 'patch']) {
        ids.push(`${service}.${action}`);
      }
    }
    ids.push('users.putEmail', 'users.putStatus', 'users.patchStatus', 'users.patchSchool', 'users.activate');
    ids.push('schools.activate', 'schools.settings', 'schools.expire');
    for (const service of ['admins', 'students', 'professors']) {
      for (const action of ['restore', 'remove', 'relink', 'accountDeleted']) {
        ids.push(`${service}.${action}`);
      }
    }
    for (const action of ['login', 'post', 'delete', 'putPassword', 'patchPassword', 'putID', 'patchID']) {
      ids.push(`users-auth.${action}`);
    }
    for (const action of ['invite', 'invite.failed', 'signup', 'signup.failed', 'reset-password', 'putResetPassword']) {
      ids.push(`users-auth.${action}`);
    }

    // each id has a message
    for (const id of ids) {
      const res = await EventsService.translate(
        { messageID: id, target: { name: 'x' }, user: { username: 'y' } },
        _ctx
      );
      chai.expect(res['_lang_en.message'], id).to.not.equal(id);

      // the target and the user are filled in every language (no placeholder is left)
      for (const lang of ['en', 'ro']) {
        chai.expect(res[`_lang_${lang}.message`], `${lang} ${id}`).to.not.match(/\{(target|user|0|1)\}/);
      }
    }
  }).timeout(10000);
});
