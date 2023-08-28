const _ = require('lodash');
const mocha = require('mocha');
const assert = require('assert');
const sinon = require('sinon');
const chai = require('chai');
const chaiHttp = require('chai-http');
chai.use(chaiHttp);

const TestConstants = require('../../test-constants.js');
const EventsConstants = require('../../../services/events/events.constants.js');
const EventsService = require('../../../services/events/events.service.js');

describe('Events Service', function () {
  const _ctx = { reqID: 'testReq', lang: 'en', service: 'Events' };
  let postReq = {};

  before(async function () {});

  beforeEach(async function () {
    const testEvents = _.cloneDeep(TestConstants.Events);
    const testEvent = testEvents[0];

    // valid post req
    postReq = {
      ...testEvent,
    };
    delete postReq.id;
    delete postReq.type;
    delete postReq.name;
    delete postReq.createdTimestamp;
    delete postReq._lang_en;
  });

  afterEach(async function () {
    sinon.restore();
  });

  after(async function () {});

  /**
   * schema for post
   */
  it('should validate post schema with success', async () => {
    // call
    let res = EventsService.Validators.Post.validate(postReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(res.error).to.not.exists;
  }).timeout(10000);

  /**
   * schema post severity
   */
  it('should validate post schema for email', async () => {
    // severity is required
    delete postReq.severity;
    let res = EventsService.Validators.Post.validate(postReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"severity" is required');

    // severity is number
    postReq.severity = 1;
    res = EventsService.Validators.Post.validate(postReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"severity" must be one of [info, warning, critical]');

    // severity is null
    postReq.severity = null;
    res = EventsService.Validators.Post.validate(postReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"severity" must be one of [info, warning, critical]');

    // severity empty
    postReq.severity = '';
    res = EventsService.Validators.Post.validate(postReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"severity" must be one of [info, warning, critical]');

    // severity not valid
    postReq.severity = 'severity';
    res = EventsService.Validators.Post.validate(postReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"severity" must be one of [info, warning, critical]');
  }).timeout(10000);

  /**
   * schema post messageID
   */
  it('should validate post schema for messageID', async () => {
    // messageID is required
    delete postReq.messageID;
    let res = EventsService.Validators.Post.validate(postReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"messageID" is required');

    // messageID is number
    postReq.messageID = 1;
    res = EventsService.Validators.Post.validate(postReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"messageID" must be a string');

    // messageID is null
    postReq.messageID = null;
    res = EventsService.Validators.Post.validate(postReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"messageID" must be a string');

    // messageID empty
    postReq.messageID = '';
    res = EventsService.Validators.Post.validate(postReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"messageID" is not allowed to be empty');
  }).timeout(10000);

  /**
   * schema post target
   */
  it('should validate post schema for target', async () => {
    // target is required
    let target = _.cloneDeep(postReq.target);

    delete postReq.target;
    let res = EventsService.Validators.Post.validate(postReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"target" is required');

    // target.id is required
    postReq.target = _.cloneDeep(target);
    delete postReq.target.id;
    res = EventsService.Validators.Post.validate(postReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"target.id" is required');

    // target.name is required
    postReq.target = _.cloneDeep(target);
    delete postReq.target.name;
    res = EventsService.Validators.Post.validate(postReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"target.name" is required');

    // target.type is required
    postReq.target = _.cloneDeep(target);
    delete postReq.target.type;
    res = EventsService.Validators.Post.validate(postReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"target.type" is required');

    // target is number
    postReq.target = 1;
    res = EventsService.Validators.Post.validate(postReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"target" must be of type object');

    // target is null
    postReq.target = null;
    res = EventsService.Validators.Post.validate(postReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"target" must be of type object');

    // target.id is number
    postReq.target = _.cloneDeep(target);
    postReq.target.id = 1;
    res = EventsService.Validators.Post.validate(postReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"target.id" must be a string');

    // target.id is null
    postReq.target = _.cloneDeep(target);
    postReq.target.id = null;
    res = EventsService.Validators.Post.validate(postReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"target.id" must be a string');

    // target.id empty
    postReq.target = _.cloneDeep(target);
    postReq.target.id = '';
    res = EventsService.Validators.Post.validate(postReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"target.id" is not allowed to be empty');

    // target.name is number
    postReq.target = _.cloneDeep(target);
    postReq.target.name = 1;
    res = EventsService.Validators.Post.validate(postReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"target.name" must be a string');

    // target.name is null
    postReq.target = _.cloneDeep(target);
    postReq.target.name = null;
    res = EventsService.Validators.Post.validate(postReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"target.name" must be a string');

    // target.name empty
    postReq.target = _.cloneDeep(target);
    postReq.target.name = '';
    res = EventsService.Validators.Post.validate(postReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"target.name" is not allowed to be empty');

    // target.type is number
    postReq.target = _.cloneDeep(target);
    postReq.target.type = 1;
    res = EventsService.Validators.Post.validate(postReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"target.type" must be a string');

    // target.type is null
    postReq.target = _.cloneDeep(target);
    postReq.target.type = null;
    res = EventsService.Validators.Post.validate(postReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"target.type" must be a string');

    // target.type empty
    postReq.target = _.cloneDeep(target);
    postReq.target.type = '';
    res = EventsService.Validators.Post.validate(postReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"target.type" is not allowed to be empty');
  }).timeout(10000);

  /**
   * schema post user
   */
  it('should validate post schema for user', async () => {
    // user is required
    let user = _.cloneDeep(postReq.user);

    delete postReq.user;
    let res = EventsService.Validators.Post.validate(postReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"user" is required');

    // user.id is required
    postReq.user = _.cloneDeep(user);
    delete postReq.user.id;
    res = EventsService.Validators.Post.validate(postReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"user.id" is required');

    // user.name is required
    postReq.user = _.cloneDeep(user);
    delete postReq.user.name;
    res = EventsService.Validators.Post.validate(postReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"user.name" is required');

    // user is number
    postReq.user = 1;
    res = EventsService.Validators.Post.validate(postReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"user" must be of type object');

    // user is null
    postReq.user = null;
    res = EventsService.Validators.Post.validate(postReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"user" must be of type object');

    // user.id is number
    postReq.user = _.cloneDeep(user);
    postReq.user.id = 1;
    res = EventsService.Validators.Post.validate(postReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"user.id" must be a string');

    // user.id is null
    postReq.user = _.cloneDeep(user);
    postReq.user.id = null;
    res = EventsService.Validators.Post.validate(postReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"user.id" must be a string');

    // user.id empty
    postReq.user = _.cloneDeep(user);
    postReq.user.id = '';
    res = EventsService.Validators.Post.validate(postReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"user.id" is not allowed to be empty');

    // user.name is number
    postReq.user = _.cloneDeep(user);
    postReq.user.name = 1;
    res = EventsService.Validators.Post.validate(postReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"user.name" must be a string');

    // user.name is null
    postReq.user = _.cloneDeep(user);
    postReq.user.name = null;
    res = EventsService.Validators.Post.validate(postReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"user.name" must be a string');

    // user.name empty
    postReq.user = _.cloneDeep(user);
    postReq.user.name = '';
    res = EventsService.Validators.Post.validate(postReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"user.name" is not allowed to be empty');
  }).timeout(10000);

  /**
   * schema post args
   */
  it('should validate post schema for args', async () => {
    // args must be an array
    postReq.args = 1;
    let res = EventsService.Validators.Post.validate(postReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"args" must be an array');

    // args null
    postReq.args = null;
    res = EventsService.Validators.Post.validate(postReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"args" must be an array');

    // args empty allowed
    postReq.args = [];
    res = EventsService.Validators.Post.validate(postReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error).to.not.exist;

    // args invalid value
    postReq.args = [{}];
    res = EventsService.Validators.Post.validate(postReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"args[0]" must be a string');

    // args empty
    postReq.args = [''];
    res = EventsService.Validators.Post.validate(postReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"args[0]" is not allowed to be empty');
  }).timeout(10000);

  /**
   * schema post extra
   */
  it('should validate post schema for extra', async () => {
    // extra is not allowed
    postReq.extra = 1;
    let res = EventsService.Validators.Post.validate(postReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"extra" is not allowed');
  }).timeout(10000);
});
