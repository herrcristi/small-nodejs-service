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
   * schema post email
   */
  it('should validate post schema for email', async () => {
    // email is required
    delete postReq.email;
    let res = EventsService.Validators.Post.validate(postReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"email" is required');

    // email is number
    postReq.email = 1;
    res = EventsService.Validators.Post.validate(postReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"email" must be a string');

    // email is null
    postReq.email = null;
    res = EventsService.Validators.Post.validate(postReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"email" must be a string');

    // email empty
    postReq.email = '';
    res = EventsService.Validators.Post.validate(postReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"email" is not allowed to be empty');

    // email not valid
    postReq.email = 'email';
    res = EventsService.Validators.Post.validate(postReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"email" must be a valid email');
  }).timeout(10000);

  /**
   * schema post firstName
   */
  it('should validate post schema for firstName', async () => {
    // firstName is required
    delete postReq.firstName;
    let res = EventsService.Validators.Post.validate(postReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"firstName" is required');

    // firstName is number
    postReq.firstName = 1;
    res = EventsService.Validators.Post.validate(postReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"firstName" must be a string');

    // firstName is null
    postReq.firstName = null;
    res = EventsService.Validators.Post.validate(postReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"firstName" must be a string');

    // firstName empty
    postReq.firstName = '';
    res = EventsService.Validators.Post.validate(postReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"firstName" is not allowed to be empty');
  }).timeout(10000);

  /**
   * schema post lastName
   */
  it('should validate post schema for lastName', async () => {
    // lastName is required
    delete postReq.lastName;
    let res = EventsService.Validators.Post.validate(postReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"lastName" is required');

    // lastName is number
    postReq.lastName = 1;
    res = EventsService.Validators.Post.validate(postReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"lastName" must be a string');

    // lastName is null
    postReq.lastName = null;
    res = EventsService.Validators.Post.validate(postReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"lastName" must be a string');

    // lastName empty
    postReq.lastName = '';
    res = EventsService.Validators.Post.validate(postReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"lastName" is not allowed to be empty');
  }).timeout(10000);

  /**
   * schema post address
   */
  it('should validate post schema for address', async () => {
    // address is required
    delete postReq.address;
    let res = EventsService.Validators.Post.validate(postReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"address" is required');

    // address is number
    postReq.address = 1;
    res = EventsService.Validators.Post.validate(postReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"address" must be a string');

    // address is null
    postReq.address = null;
    res = EventsService.Validators.Post.validate(postReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"address" must be a string');

    // address empty
    postReq.address = '';
    res = EventsService.Validators.Post.validate(postReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"address" is not allowed to be empty');
  }).timeout(10000);

  /**
   * schema post phoneNumber
   */
  it('should validate post schema for phoneNumber', async () => {
    // phoneNumber is number
    postReq.phoneNumber = 1;
    res = EventsService.Validators.Post.validate(postReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"phoneNumber" must be a string');

    // phoneNumber is null
    postReq.phoneNumber = null;
    res = EventsService.Validators.Post.validate(postReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"phoneNumber" must be a string');

    // phoneNumber empty
    postReq.phoneNumber = '';
    res = EventsService.Validators.Post.validate(postReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"phoneNumber" is not allowed to be empty');

    // phoneNumber not valid
    postReq.phoneNumber = 'phoneNumber';
    res = EventsService.Validators.Post.validate(postReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('fails to match the required pattern');
  }).timeout(10000);

  /**
   * schema post birthday
   */
  it('should validate post schema for birthday', async () => {
    // birthday is required
    delete postReq.birthday;
    let res = EventsService.Validators.Post.validate(postReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"birthday" is required');

    // birthday is number
    postReq.birthday = 1;
    res = EventsService.Validators.Post.validate(postReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"birthday" must be a valid date');

    // birthday is null
    postReq.birthday = null;
    res = EventsService.Validators.Post.validate(postReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"birthday" must be a valid date');

    // birthday empty
    postReq.birthday = '';
    res = EventsService.Validators.Post.validate(postReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"birthday" must be in ISO 8601 date format');

    // birthday not valid
    postReq.birthday = 'birthday';
    res = EventsService.Validators.Post.validate(postReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"birthday" must be in ISO 8601 date format');

    // birthday not valid
    postReq.birthday = '01-1908';
    res = EventsService.Validators.Post.validate(postReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"birthday" must be in ISO 8601 date format');

    // birthday valid
    postReq.birthday = '1980';
    res = EventsService.Validators.Post.validate(postReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error).to.not.exist;
  }).timeout(10000);

  /**
   * schema post status
   */
  it('should validate post schema for status', async () => {
    // status must be a string
    postReq.status = 1;
    let res = EventsService.Validators.Post.validate(postReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"status" must be one of [pending, active, disabled]');

    // status null
    postReq.status = null;
    res = EventsService.Validators.Post.validate(postReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"status" must be one of [pending, active, disabled]');

    // status empty
    postReq.status = '';
    res = EventsService.Validators.Post.validate(postReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"status" must be one of [pending, active, disabled]');

    // status invalid value
    postReq.status = 'some value';
    res = EventsService.Validators.Post.validate(postReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"status" must be one of [pending, active, disabled]');

    // status value
    postReq.status = EventsConstants.Status.Active;
    res = EventsService.Validators.Post.validate(postReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error).to.not.exist;
  }).timeout(10000);

  /**
   * schema post schools
   */
  it('should validate post schema for schools', async () => {
    // schools must be a string
    postReq.schools = 1;
    let res = EventsService.Validators.Post.validate(postReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"schools" must be an array');

    // schools null
    postReq.schools = null;
    res = EventsService.Validators.Post.validate(postReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"schools" must be an array');

    // schools empty allowed
    postReq.schools = [];
    res = EventsService.Validators.Post.validate(postReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error).to.not.exist;

    // schools invalid value
    postReq.schools = ['some value'];
    res = EventsService.Validators.Post.validate(postReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"schools[0]" must be of type object');

    // schools id is required
    postReq.schools = [{}];
    res = EventsService.Validators.Post.validate(postReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"schools[0].id" is required');

    // schools id must be a string
    postReq.schools = [{ id: 1 }];
    res = EventsService.Validators.Post.validate(postReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"schools[0].id" must be a string');

    // schools empty
    postReq.schools = [{ id: '' }];
    res = EventsService.Validators.Post.validate(postReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"schools[0].id" is not allowed to be empty');

    // schools roles is required
    postReq.schools = [{ id: 'id1' }];
    res = EventsService.Validators.Post.validate(postReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"schools[0].roles" is required');

    // schools roles must be an array
    postReq.schools = [{ id: 'id1', roles: 1 }];
    res = EventsService.Validators.Post.validate(postReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"schools[0].roles" must be an array');

    // schools roles must have 1 el
    postReq.schools = [{ id: 'id1', roles: [] }];
    res = EventsService.Validators.Post.validate(postReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"schools[0].roles" does not contain 1 required value(s)');

    // schools roles must be strings
    postReq.schools = [{ id: 'id1', roles: [{}] }];
    res = EventsService.Validators.Post.validate(postReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"schools[0].roles[0]" must be a string');

    // schools roles must be strings
    postReq.schools = [{ id: 'id1', roles: [''] }];
    res = EventsService.Validators.Post.validate(postReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"schools[0].roles[0]" is not allowed to be empty');
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

  /**
   * schema put
   * is the same as post - add only the extra cases
   */
  it('should validate put schema', async () => {
    // nothing is required
    let putReq = {};
    let res = EventsService.Validators.Put.validate(putReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error).to.not.exist;

    // other params
    putReq = {
      extra: 1,
    };
    res = EventsService.Validators.Put.validate(putReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"extra" is not allowed');
  }).timeout(10000);

  /**
   * schema patch
   * is the same as post - add only the extra cases
   */
  it('should validate patch schema set', async () => {
    // nothing is required
    let patchReq = {};
    let res = EventsService.Validators.Patch.validate(patchReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error).to.not.exist;

    // other params
    patchReq = {
      extra: 1,
    };
    res = EventsService.Validators.Patch.validate(patchReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"extra" is not allowed');

    // set must be an object
    patchReq = {
      set: 1,
    };
    res = EventsService.Validators.Patch.validate(patchReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"set" must be of type object');

    // set empty is allowed
    patchReq = {
      set: {},
    };
    res = EventsService.Validators.Patch.validate(patchReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error).to.not.exist;
  }).timeout(10000);

  /**
   * schema patch.unset
   */
  it('should validate patch schema unset', async () => {
    // unset must be an object
    let patchReq = {
      unset: 1,
    };
    res = EventsService.Validators.Patch.validate(patchReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"unset" must be an array');

    // unset empty is allowed
    patchReq = {
      unset: [],
    };
    res = EventsService.Validators.Patch.validate(patchReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error).to.not.exist;

    // unset invalid
    patchReq = {
      unset: ['extra'],
    };
    res = EventsService.Validators.Patch.validate(patchReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"unset[0]" must be [phoneNumber]');
  }).timeout(10000);

  /**
   * schema patch.add
   */
  it('should validate patch schema add', async () => {
    // add must be an object
    let patchReq = {
      add: 1,
    };
    res = EventsService.Validators.Patch.validate(patchReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"add" must be of type object');

    // add empty is allowed
    patchReq = {
      add: {},
    };
    res = EventsService.Validators.Patch.validate(patchReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error).to.not.exist;

    // add extra
    patchReq = {
      add: {
        extra: 1,
      },
    };
    res = EventsService.Validators.Patch.validate(patchReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"add.extra" is not allowed');

    // add schools
    patchReq = {
      add: {
        schools: 1,
      },
    };
    res = EventsService.Validators.Patch.validate(patchReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"add.schools" must be an array');

    // add schools empty
    patchReq = {
      add: {
        schools: [{}],
      },
    };
    res = EventsService.Validators.Patch.validate(patchReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('add.schools[0].id" is required');

    // add schools roles req
    patchReq = {
      add: {
        schools: [
          {
            id: 'id1',
          },
        ],
      },
    };
    res = EventsService.Validators.Patch.validate(patchReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"add.schools[0].roles" is required');

    // add schools roles
    patchReq = {
      add: {
        schools: [
          {
            id: 'id1',
            roles: [],
          },
        ],
      },
    };
    res = EventsService.Validators.Patch.validate(patchReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"add.schools[0].roles" does not contain 1 required value(s)');
  }).timeout(10000);

  /**
   * schema patch.remove
   */
  it('should validate patch schema remove', async () => {
    // remove must be an object
    let patchReq = {
      remove: 1,
    };
    res = EventsService.Validators.Patch.validate(patchReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"remove" must be of type object');

    // remove empty is allowed
    patchReq = {
      remove: {},
    };
    res = EventsService.Validators.Patch.validate(patchReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error).to.not.exist;

    // remove extra
    patchReq = {
      remove: {
        extra: 1,
      },
    };
    res = EventsService.Validators.Patch.validate(patchReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"remove.extra" is not allowed');

    // remove schools
    patchReq = {
      remove: {
        schools: 1,
      },
    };
    res = EventsService.Validators.Patch.validate(patchReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"remove.schools" must be an array');

    // remove schools empty
    patchReq = {
      remove: {
        schools: [{}],
      },
    };
    res = EventsService.Validators.Patch.validate(patchReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('remove.schools[0].id" is required');

    // remove schools roles req
    patchReq = {
      remove: {
        schools: [
          {
            id: 'id1',
          },
        ],
      },
    };
    res = EventsService.Validators.Patch.validate(patchReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai.expect(res.error.details[0].message).to.include('"remove.schools[0].roles" is required');

    // remove schools roles
    patchReq = {
      remove: {
        schools: [
          {
            id: 'id1',
            roles: [],
          },
        ],
      },
    };
    res = EventsService.Validators.Patch.validate(patchReq);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);
    chai
      .expect(res.error.details[0].message)
      .to.include('"remove.schools[0].roles" does not contain 1 required value(s)');
  }).timeout(10000);
});
