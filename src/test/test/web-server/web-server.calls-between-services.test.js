const _ = require('lodash');
const assert = require('assert');
const sinon = require('sinon');
const chai = require('chai');

const DbOpsUtils = require('../../../core/utils/db-ops.utils.js');
const RestCommsUtils = require('../../../core/utils/rest-communications.utils.js');

const SchoolsService = require('../../../services/schools/schools.service.js');
const UsersService = require('../../../services/users/users.service.js');
const UsersAuthService = require('../../../services/users-auth/users-auth.service.js');
const StudentsService = require('../../../services/students/students.service.js');
const ProfessorsService = require('../../../services/professors/professors.service.js');
const AdminsService = require('../../../services/admins/admins.service.js');
const EventsService = require('../../../services/events/events.service.js');

const SchoolsRest = require('../../../services/rest/schools.rest.js');
const UsersRest = require('../../../services/rest/users.rest.js');
const UsersAuthRest = require('../../../services/rest/users-auth.rest.js');
const ClassesRest = require('../../../services/rest/classes.rest.js');
const GroupsRest = require('../../../services/rest/groups.rest.js');
const LocationsRest = require('../../../services/rest/locations.rest.js');
const SchedulesRest = require('../../../services/rest/schedules.rest.js');
const StudentsRest = require('../../../services/rest/students.rest.js');
const ProfessorsRest = require('../../../services/rest/professors.rest.js');
const AdminsRest = require('../../../services/rest/admins.rest.js');
const EventsRest = require('../../../services/rest/events.rest.js');

/**
 * the calls between services over REST (the services in separate processes): each one reaches the route of the other
 * service (the CORS check lets the url of the api through, a public route takes the service token instead of a
 * cookie), and the options of its read go with it
 */
describe('Calls between services', function () {
  const _ctx = { reqID: 'testReq', lang: 'en', tenantID: 'school1', userID: 'user1', username: 'jane@testdomain.test' };
  const primary = { readPreference: DbOpsUtils.Constants.ReadPrimary };
  let localConfig = null;

  before(async function () {});

  beforeEach(async function () {
    // every call over HTTP, to the test server (no service in the same process)
    localConfig = await RestCommsUtils.getConfig();
    await RestCommsUtils.init({ ...localConfig, local: {} });
  });

  afterEach(async function () {
    sinon.restore();
    await RestCommsUtils.init(localConfig);
  });

  after(async function () {});

  /**
   * the user of a login or of an invite, read by email (an internal route): on the primary, as asked by users-auth
   */
  it('should read the user by email over REST with the options of the caller', async () => {
    // stub: the read of the users service
    const user = { id: 'user1', email: 'jane.smith@testdomain.test' };
    const stubRead = sinon.stub(DbOpsUtils, 'getAll').resolves({ status: 200, value: [user] });
    sinon.stub(DbOpsUtils, 'getAllCount').resolves({ status: 200, value: 1 });

    // call
    const res = await UsersRest.getOneByEmail(user.email, { id: 1, email: 1 }, _ctx, primary);

    // check: found, read on the primary
    chai.expect(res.status).to.equal(200);
    chai.expect(res.value).to.deep.equal(user);
    chai.expect(stubRead.firstCall.args[3]).to.deep.equal(primary);
  }).timeout(10000);

  /**
   * the targets of the references (populateReferences): every service is read by ids on its list route (the users on
   * their internal one), on the primary as asked by the caller
   */
  it('should read the targets of the references of every service over REST on the primary', async () => {
    // stub: the reads of the services
    const found = [{ id: 'id1', name: 'Name' }];
    const stubRead = sinon.stub(DbOpsUtils, 'getAll').resolves({ status: 200, value: found });
    sinon.stub(DbOpsUtils, 'getAllCount').resolves({ status: 200, value: 1 });

    const services = { SchoolsRest, UsersRest, ClassesRest, GroupsRest, LocationsRest, SchedulesRest };
    Object.assign(services, { StudentsRest, ProfessorsRest, AdminsRest, EventsRest });
    for (const name in services) {
      // call
      stubRead.resetHistory();
      const res = await services[name].getAllByIDs(['id1'], { id: 1, name: 1 }, _ctx, primary);

      // check: found, read on the primary
      chai.expect(res.status, name).to.equal(200);
      chai.expect(res.value, name).to.deep.equal(found);
      chai.expect(stubRead.firstCall.args[3], name).to.deep.equal(primary);
    }
  }).timeout(10000);

  /**
   * the school of users-auth (get one, the rollback of a signup) and of the members (the settings, on the primary):
   * the public routes of the schools take the call of a service
   */
  it('should call the public routes of the schools over REST', async () => {
    // stub: the reads and the delete of the schools service
    const school = { id: 'school1', name: 'North School', settings: { removedMembers: 'delete' } };
    const stubRead = sinon.stub(DbOpsUtils, 'getOne').resolves({ status: 200, value: school });
    const stubDelete = sinon.stub(SchoolsService, 'delete').resolves({ status: 200, value: { id: school.id } });

    // call
    const resGet = await SchoolsRest.getOne(school.id, { id: 1, name: 1 }, _ctx);
    const resSettings = await SchoolsRest.getSettings(school.id, _ctx);
    const resDelete = await SchoolsRest.delete(school.id, _ctx);

    // check: answered, the settings read on the primary
    chai.expect(resGet.status).to.equal(200);
    chai.expect(resGet.value.id).to.equal(school.id);
    chai.expect(resSettings.status).to.equal(200);
    chai.expect(resSettings.value).to.deep.equal({ removedMembers: 'delete', classmates: 'show' });
    chai.expect(stubRead.secondCall.args[4]).to.deep.equal(primary);
    chai.expect(resDelete.status).to.equal(200);
    chai.expect(stubDelete.firstCall.args[0]).to.equal(school.id);
  }).timeout(10000);

  /**
   * the other calls between services (the internal routes): each one reaches the function of the other service
   */
  it('should call the internal routes of the other services over REST', async () => {
    // stub: the functions of the services
    const ok = { status: 200, value: { id: 'id1' } };
    const calls = [
      ['SchoolsRest.post', SchoolsService, 'post', () => SchoolsRest.post({ name: 'North School' }, _ctx)],
      ['SchoolsRest.activate', SchoolsService, 'activate', () => SchoolsRest.activate('school1', _ctx)],
      ['UsersRest.post', UsersService, 'post', () => UsersRest.post({ email: 'jane@testdomain.test' }, _ctx)],
      ['UsersRest.delete', UsersService, 'delete', () => UsersRest.delete('user1', _ctx)],
      ['UsersRest.activate', UsersService, 'activate', () => UsersRest.activate('user1', _ctx)],
      ['UsersRest.putEmail', UsersService, 'putEmail', () => UsersRest.putEmail('user1', { email: 'j@t.test' }, _ctx)],
      ['UsersRest.patchSchool', UsersService, 'patchSchool', () => UsersRest.patchSchool('user1', { add: {} }, _ctx)],
      ['UsersRest.getPortalAdmins', UsersService, 'getPortalAdminsForReq', () => UsersRest.getPortalAdmins('', _ctx)],
      ['StudentsRest.relinkTraces', StudentsService, 'relinkTraces', () => StudentsRest.relinkTraces({}, _ctx)],
      ['ProfessorsRest.relinkTraces', ProfessorsService, 'relinkTraces', () => ProfessorsRest.relinkTraces({}, _ctx)],
      ['AdminsRest.relinkTraces', AdminsService, 'relinkTraces', () => AdminsRest.relinkTraces({}, _ctx)],
      ['StudentsRest.notification', StudentsService, 'notification', () => StudentsRest.notification({}, _ctx)],
      ['EventsRest.post', EventsService, 'post', () => EventsRest.post({ name: 'login' }, _ctx)],
      ['UsersAuthRest.post', UsersAuthService, 'post', () => UsersAuthRest.post({ username: 'j@t.test' }, _ctx)],
      [
        'UsersAuthRest.validate',
        UsersAuthService,
        'validate',
        () => UsersAuthRest.validate({ method: 'GET', route: '/api/v1/classes', token: 'token' }, _ctx),
      ],
    ];

    for (const [name, service, fn, call] of calls) {
      // stub
      const stub = sinon.stub(service, fn).resolves(ok);

      // call
      const res = await call();

      // check: the function of the other service answered
      chai.expect(res.status, name).to.equal(200);
      chai.expect(stub.callCount, name).to.equal(1);
    }
  }).timeout(10000);
});
