const chai = require('chai');
const sinon = require('sinon');

const TestConstants = require('../../test-constants.js');
const SchoolsConstants = require('../../../services/schools/schools.constants.js');
const SchoolsRest = require('../../../services/rest/schools.rest.js');
const SchoolsSetupService = require('../../../services/schools/schools.setup.service.js');

describe('Schools Setup Service', function () {
  afterEach(function () {
    sinon.restore();
  });

  /**
   * test that the portal school is created if it does not exist
   */
  it('creates the configured portal school when it is missing', async () => {
    sinon.stub(SchoolsRest, 'getOne').resolves({ status: 404, error: { message: 'Not found' } });
    const stubPost = sinon
      .stub(SchoolsRest, 'post')
      .resolves({ status: 201, value: { id: TestConstants.PortalSchoolID } });

    const result = await SchoolsSetupService.init();

    chai.expect(result).to.equal(true);
    chai.expect(stubPost.calledOnce).to.equal(true);
    chai.expect(stubPost.firstCall.args[0]).to.deep.equal({
      id: TestConstants.PortalSchoolID,
      name: 'Portal School',
      status: SchoolsConstants.Status.Active,
      description: 'Portal organization',
    });
  });

  /**
   * test that the portal school is not rewritten if it already exists and is active
   */
  it('does not rewrite an existing active portal school', async () => {
    sinon.stub(SchoolsRest, 'getOne').resolves({
      status: 200,
      value: { id: TestConstants.PortalSchoolID, status: SchoolsConstants.Status.Active },
    });
    const stubPost = sinon.stub(SchoolsRest, 'post');

    const result = await SchoolsSetupService.init();

    chai.expect(result).to.equal(true);
    chai.expect(stubPost.called).to.equal(false);
  });

  /**
   * test that it fails if the portal school is not active
   */
  it('fails startup if the portal school is not active', async () => {
    sinon.stub(SchoolsRest, 'getOne').resolves({
      status: 200,
      value: { id: TestConstants.PortalSchoolID, status: SchoolsConstants.Status.Disabled },
    });

    try {
      await SchoolsSetupService.init();
      chai.assert.fail('Expected setup to reject');
    } catch (error) {
      chai.expect(error.message).to.equal('Portal school must remain active');
    }
  });

  /**
   * test that it fails if the portal school cannot be loaded
   */
  it('fails startup if loading the portal school fails', async () => {
    sinon.stub(SchoolsRest, 'getOne').resolves({ status: 500, error: { message: 'db down' } });
    const stubPost = sinon.stub(SchoolsRest, 'post');

    let error = null;
    try {
      await SchoolsSetupService.init();
    } catch (e) {
      error = e;
    }
    chai.expect(error?.message).to.equal('db down');
    chai.expect(stubPost.called).to.equal(false);

    // without a message
    SchoolsRest.getOne.resolves({ status: 500, error: {} });
    try {
      await SchoolsSetupService.init();
    } catch (e) {
      error = e;
    }
    chai.expect(error?.message).to.equal('Failed to load portal school');
  });

  /**
   * test that it fails if the portal school cannot be created
   */
  it('fails startup if creating the portal school fails', async () => {
    sinon.stub(SchoolsRest, 'getOne').resolves({ status: 404, error: { message: 'Not found' } });
    const stubPost = sinon.stub(SchoolsRest, 'post').resolves({ status: 400, error: { message: 'bad school' } });

    let error = null;
    try {
      await SchoolsSetupService.init();
    } catch (e) {
      error = e;
    }
    chai.expect(error?.message).to.equal('bad school');

    // without a message
    stubPost.resolves({ status: 500, error: {} });
    try {
      await SchoolsSetupService.init();
    } catch (e) {
      error = e;
    }
    chai.expect(error?.message).to.equal('Failed to create portal school');
  });
});
