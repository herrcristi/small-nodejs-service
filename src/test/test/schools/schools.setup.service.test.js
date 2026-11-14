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
});
