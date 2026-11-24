const _ = require('lodash');
const assert = require('assert');
const chai = require('chai');
const sinon = require('sinon');
const Joi = require('joi');

const ReferencesUtils = require('../../utils/base-service.references.utils.js');
const DbOpsUtils = require('../../utils/db-ops.utils.js');

describe('Base Service', function () {
  const _ctx = { reqID: 'testReq', lang: 'en', service: 'Service' };
  const config = {
    serviceName: 'service',
    schema: Joi.object().keys({
      name: Joi.string().min(1).max(64),
      description: Joi.string().min(0).max(1024).allow(null),
    }),
    collection: 'collection',
    references: [
      {
        fieldName: 'target',
        service: { getAllByIDs: () => {} },
        projection: null /*default*/,
      },
      {
        fieldName: 'inner.target',
        service: { getAllByIDs: () => {} },
        projection: null /*default*/,
      },
    ],
    fillReferences: false,
  };

  before(async function () {});

  beforeEach(async function () {});

  afterEach(async function () {
    sinon.restore();
  });

  after(async function () {});

  /**
   * populate with success simple field
   */
  it('should call populate with success simple field', async () => {
    const objs = [
      {
        id: 'id1',
        name: 'name1',
        target: 'targetID1',
      },
      {
        id: 'id2',
        name: 'name2',
        target: {
          id: 'targetID2',
        },
      },
      {
        id: 'id3',
        name: 'name3',
        target: ['targetID3'],
      },
      {
        id: 'id4',
        name: 'name4',
        target: [
          {
            id: 'targetID4',
          },
        ],
      },
    ];

    sinon.stub(config.references[0].service, 'getAllByIDs').callsFake((ids, projection) => {
      console.log(`\nrest service called with ids ${JSON.stringify(ids)} and projection ${JSON.stringify(projection)}`);
      chai.expect(ids).to.deep.equal(['targetID1', 'targetID2', 'targetID3', 'targetID4']);
      chai
        .expect(projection)
        .to.deep.equal({ _id: 0, id: 1, name: 1, type: 1, status: 1, createdTimestamp: 1, modifiedCount: 1 });

      return {
        status: 200,
        value: [
          { id: 'targetID1', name: 't1' },
          { id: 'targetID2', name: 't2' },
          { id: 'targetID3', name: 't3' },
          { id: 'targetID4', name: 't4' },
        ],
      };
    });

    // call
    let res = await ReferencesUtils.populate(config.references[0], objs, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(config.references[0].service.getAllByIDs.callCount).to.equal(1);
    chai.expect(res).to.deep.equal({
      status: 200,
      value: [
        {
          id: 'id1',
          name: 'name1',
          target: {
            id: 'targetID1',
            name: 't1',
          },
        },
        {
          id: 'id2',
          name: 'name2',
          target: {
            id: 'targetID2',
            name: 't2',
          },
        },
        {
          id: 'id3',
          name: 'name3',
          target: [
            {
              id: 'targetID3',
              name: 't3',
            },
          ],
        },
        {
          id: 'id4',
          name: 'name4',
          target: [
            {
              id: 'targetID4',
              name: 't4',
            },
          ],
        },
      ],
    });
  }).timeout(10000);

  /**
   * populate takes the target written by the same request from the answer of its write (writtenTarget, only the fields
   * of the projection): it is not read again (a secondary may not have it yet); the other targets are read
   */
  it('should call populate with the target written by the request without reading it', async () => {
    const objs = [
      { id: 'id1', name: 'name1', target: 'targetID1' },
      { id: 'id2', name: 'name2', target: 'targetID2' },
    ];
    const written = { id: 'targetID1', name: 'North School', status: 'pending', settings: { removedMembers: 'keep' } };

    // stub: the other target
    const stubRead = sinon
      .stub(config.references[0].service, 'getAllByIDs')
      .resolves({ status: 200, value: [{ id: 'targetID2', name: 'South School' }] });

    // call
    const res = await ReferencesUtils.populate(config.references[0], objs, _ctx, written);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check: only the other target was read, on the primary (it may have been written just before)
    chai.expect(stubRead.callCount).to.equal(1);
    chai.expect(stubRead.firstCall.args[0]).to.deep.equal(['targetID2']);
    chai.expect(stubRead.firstCall.args[3]).to.deep.equal({ readPreference: DbOpsUtils.Constants.ReadPrimary });

    // check: the written target, with the fields of the projection only
    chai.expect(res.value[0].target).to.deep.equal({ id: 'targetID1', name: 'North School', status: 'pending' });
    chai.expect(res.value[1].target).to.deep.equal({ id: 'targetID2', name: 'South School' });

    // case: the only target was written by the request: nothing is read
    const onlyWritten = [{ id: 'id3', name: 'name3', target: 'targetID1' }];
    await ReferencesUtils.populate(config.references[0], onlyWritten, _ctx, written);
    chai.expect(stubRead.callCount).to.equal(1);

    // case: a written target that no reference points to: the targets are read
    const others = [{ id: 'id4', name: 'name4', target: 'targetID2' }];
    await ReferencesUtils.populate(config.references[0], others, _ctx, written);
    chai.expect(stubRead.callCount).to.equal(2);
    chai.expect(stubRead.secondCall.args[0]).to.deep.equal(['targetID2']);
  }).timeout(10000);

  /**
   * a reference with translated fields (translations: user.status): the object gets the translations of its referenced
   * object with it (_lang_en.target.status), so it is searched in the language of the UI
   */
  it('should call populate with the translations of the referenced object', async () => {
    const configRef = { ...config.references[0], translations: ['status'] };
    const objs = [{ id: 'id1', name: 'name1', target: 'targetID1' }];

    // stub: the target
    sinon
      .stub(configRef.service, 'getAllByIDs')
      .resolves({ status: 200, value: [{ id: 'targetID1', name: 'Jane Smith', status: 'disabled' }] });

    // call
    const res = await ReferencesUtils.populate(configRef, objs, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check: the target, with the translations of its status
    chai.expect(res.value[0]).to.deep.equal({
      id: 'id1',
      name: 'name1',
      target: { id: 'targetID1', name: 'Jane Smith', status: 'disabled' },
      '_lang_en.target.status': 'Disabled',
      '_lang_ro.target.status': 'Dezactivat',
    });
  }).timeout(10000);

  /**
   * populate with success multi field
   */
  it('should call populate with success multi field', async () => {
    const objs = [
      {
        id: 'id5',
        name: 'name5',
        inner: {
          // inner is object
          target: 'targetID5',
        },
      },
      {
        id: 'id6',
        name: 'name6',
        inner: [
          // inner is array
          {
            target: 'targetID6',
          },
        ],
      },
      {
        id: 'id7',
        name: 'name7',
        inner: 'inner', // inner is string, has no target
      },
    ];

    sinon.stub(config.references[1].service, 'getAllByIDs').callsFake((ids, projection) => {
      console.log(`\nrest service called with ids ${JSON.stringify(ids)} and projection ${JSON.stringify(projection)}`);
      chai.expect(ids).to.deep.equal(['targetID5', 'targetID6']);
      chai
        .expect(projection)
        .to.deep.equal({ _id: 0, id: 1, name: 1, type: 1, status: 1, createdTimestamp: 1, modifiedCount: 1 });

      return {
        status: 200,
        value: [
          { id: 'targetID5', name: 't5' },
          { id: 'targetID6', name: 't6' },
        ],
      };
    });

    // call
    let res = await ReferencesUtils.populate(config.references[1], objs, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(config.references[1].service.getAllByIDs.callCount).to.equal(1);
    chai.expect(res).to.deep.equal({
      status: 200,
      value: [
        {
          id: 'id5',
          name: 'name5',
          inner: {
            target: {
              id: 'targetID5',
              name: 't5',
            },
          },
        },
        {
          id: 'id6',
          name: 'name6',
          inner: [
            {
              target: {
                id: 'targetID6',
                name: 't6',
              },
            },
          ],
        },
        {
          id: 'id7',
          name: 'name7',
          inner: 'inner',
        },
      ],
    });
  }).timeout(10000);

  /**
   * populate with success - skipping empty
   */
  it('should call populate with success - skipping empty', async () => {
    const objs = [
      {
        id: 'id1',
        name: 'name1',
        target: [],
      },
    ];

    sinon.stub(config.references[0].service, 'getAllByIDs').callsFake((ids, projection) => {
      console.log(`\nrest service called with ids ${JSON.stringify(ids)} and projection ${JSON.stringify(projection)}`);
      chai.expect(ids).to.deep.equal([]);
      chai.expect(projection).to.deep.equal({ id: 1, name: 1 });

      return {
        status: 200,
        value: [],
      };
    });

    // call
    let res = await ReferencesUtils.populate(config.references[0], objs, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(config.references[0].service.getAllByIDs.callCount).to.equal(0);
    chai.expect(res).to.deep.equal({
      status: 200,
      value: objs,
    });
  }).timeout(10000);

  /**
   * populate fail
   */
  it('should call populate and fail', async () => {
    const objs = [
      {
        id: 'id4',
        name: 'name4',
        target: [
          {
            id: 'targetID4',
          },
        ],
      },
    ];

    let refConfig = _.cloneDeep(config.references[0]);
    refConfig.projection = { id: 1, name: 1 };

    sinon.stub(refConfig.service, 'getAllByIDs').callsFake((ids, projection) => {
      console.log(`\nrest service called with ids ${JSON.stringify(ids)} and projection ${JSON.stringify(projection)}`);
      chai.expect(ids).to.deep.equal(['targetID4']);
      chai.expect(projection).to.deep.equal({ _id: 0, id: 1, name: 1 });

      return {
        status: 500,
        error: { message: 'Test error message', error: new Error('Test error').toString() },
      };
    });

    // call
    let res = await ReferencesUtils.populate(refConfig, objs, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(refConfig.service.getAllByIDs.callCount).to.equal(1);
    chai.expect(res).to.deep.equal({
      status: 500,
      error: {
        message: 'Test error message',
        error: 'Error: Test error',
      },
    });
  }).timeout(10000);

  /**
   * populate with success skipping null and not all found
   */
  it('should call populate with success skipping null and not all found', async () => {
    const objs = [
      {
        id: 'id1',
        name: 'name1',
        target: null,
      },
      {
        id: 'id2',
        name: 'name2',
        target: {
          // no id
        },
      },
      {
        id: 'id3',
        name: 'name3',
        target: ['targetID3'],
      },
      {
        id: 'id4',
        name: 'name4',
        target: [
          {
            id: 'targetID4',
          },
        ],
      },
      {
        id: 'id1',
        name: 'name1',
        target: 5, // number
      },
    ];

    sinon.stub(config.references[0].service, 'getAllByIDs').callsFake((ids, projection) => {
      console.log(`\nrest service called with ids ${JSON.stringify(ids)} and projection ${JSON.stringify(projection)}`);
      chai.expect(ids).to.deep.equal(['targetID3', 'targetID4']);
      chai
        .expect(projection)
        .to.deep.equal({ _id: 0, id: 1, name: 1, type: 1, status: 1, createdTimestamp: 1, modifiedCount: 1 });

      return {
        status: 200,
        value: [
          //  nothing is found
        ],
      };
    });

    // call
    let res = await ReferencesUtils.populate(config.references[0], objs, _ctx);
    console.log(`\nTest returned: ${JSON.stringify(res, null, 2)}\n`);

    // check
    chai.expect(config.references[0].service.getAllByIDs.callCount).to.equal(1);
    chai.expect(res).to.deep.equal({
      status: 200,
      value: [
        {
          id: 'id1',
          name: 'name1',
          target: null,
        },
        {
          id: 'id2',
          name: 'name2',
          target: null,
        },
        {
          id: 'id3',
          name: 'name3',
          target: [],
        },
        {
          id: 'id4',
          name: 'name4',
          target: [],
        },
        {
          id: 'id1',
          name: 'name1',
          target: null,
        },
      ],
    });
  }).timeout(10000);
});
