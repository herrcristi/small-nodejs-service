const sinon = require('sinon');
const chai = require('chai');
const supertest = require('supertest');

const EmailsUtils = require('../../../core/utils/emails.utils.js');

const TestConstants = require('../../test-constants.js');
const UsersAuthConstants = require('../../../services/users-auth/users-auth.constants.js');
const UsersAuthSetupService = require('../../../services/users-auth/users-auth.setup.service.js');
const SchoolsSetupService = require('../../../services/schools/schools.setup.service.js');
const UsersService = require('../../../services/users/users.service.js');
const SchoolsService = require('../../../services/schools/schools.service.js');
const SchoolsConstants = require('../../../services/schools/schools.constants.js');
const UsersConstants = require('../../../services/users/users.constants.js');
const StudentsConstants = require('../../../services/students/students.constants.js');
const ProfessorsConstants = require('../../../services/professors/professors.constants.js');
const AdminsConstants = require('../../../services/admins/admins.constants.js');
const ClassesConstants = require('../../../services/classes/classes.constants.js');

const EventsDatabase = require('../../../services/events/events.database.js');
const SchoolsDatabase = require('../../../services/schools/schools.database.js');
const UsersDatabase = require('../../../services/users/users.database.js');
const UsersAuthDatabase = require('../../../services/users-auth/users-local-auth.database.js');
const UsersAuthSessionsDatabase = require('../../../services/users-auth/users-auth.sessions.database.js');
const AdminsDatabase = require('../../../services/admins/admins.database.js');
const StudentsDatabase = require('../../../services/students/students.database.js');
const ProfessorsDatabase = require('../../../services/professors/professors.database.js');
const ClassesDatabase = require('../../../services/classes/classes.database.js');
const LocationsDatabase = require('../../../services/locations/locations.database.js');
const GroupsDatabase = require('../../../services/groups/groups.database.js');
const SchedulesDatabase = require('../../../services/schedules/schedules.database.js');

/**
 * the flows of the accounts through the API, with the database: the first portal admin, login, the validation of the
 * requests, logout, signup of a school, invite, the remove of a role and the role given again, the delete of an
 * account and its invitation again, the setting of the removed members, the expiry of the invitations
 * only the emails are captured (their links are followed); the sessions, the tokens and the notifications are real
 */
describe('Users Auth Functional', function () {
  const _ctx = { reqID: 'Test-Users-Auth', lang: 'en' };
  const portalID = () => process.env.SMALL_API_PORTAL_SCHOOL_ID;
  const Password = 'Garden#Path42';
  const AuthPath = UsersAuthConstants.ApiPath;

  // the people of the flows
  const portalAdminEmail = 'portal.admin@testdomain.test';
  const schoolAdminEmail = 'sarah.wilson@testdomain.test';
  const studentEmail = 'jane.smith@testdomain.test';
  const otherStudentEmail = 'john.brown@testdomain.test';

  // the emails sent: { to, subject, body }
  let mails = [];

  /**
   * a request to the API, with the session cookie and the school (x-tenant-id) when given
   */
  const api = async (method, url, { cookie, tenant, body, headers } = {}) => {
    let request = supertest(TestConstants.WebServer)[method](url).set('Origin', TestConstants.WebServer);
    if (cookie) {
      request = request.set('Cookie', cookie);
    }
    if (tenant) {
      request = request.set('x-tenant-id', tenant);
    }
    for (const name in headers || {}) {
      request = request.set(name, headers[name]);
    }
    if (body) {
      request = request.send(body);
    }
    return await request;
  };

  /**
   * the token of the last setup / reset link sent to an email
   */
  const linkToken = async (email) => {
    // the emails are sent without waiting for them
    await new Promise((resolve) => setTimeout(resolve, 50));
    const mail = mails.filter((item) => item.to === email).pop();
    chai.expect(mail, `an email to ${email}`).to.exist;
    // the link is in the html of the email: its & is written &amp;
    const match = /#type=[^&]+&amp;token=([^"'<\s&]+)/.exec(mail.body);
    chai.expect(match, `a link in the email to ${email}`).to.exist;
    return decodeURIComponent(match[1]);
  };

  /**
   * the person sets its password with the link of its email
   */
  const setPassword = async (email) => {
    const token = await linkToken(email);
    const r = await api('put', `${AuthPath}/reset-token/password`, {
      headers: { 'x-reset-token': token },
      body: { password: Password },
    });
    chai.expect(r.status, `set the password of ${email}`).to.equal(200);
  };

  /**
   * login: the answer and the session cookie
   */
  const login = async (email, password = Password) => {
    const r = await api('post', `${AuthPath}/login`, { body: { username: email, password } });
    const setCookie = (r.headers['set-cookie'] || []).find((item) => item.startsWith(UsersAuthConstants.AuthToken));
    const cookie = setCookie?.split(';')[0];
    return { r, cookie };
  };

  /**
   * the first portal admin: the portal school, the bootstrap invites the configured email, the password, the login
   */
  const startPortal = async () => {
    await SchoolsSetupService.init();
    process.env.SMALL_API_PORTAL_ADMIN_EMAIL = portalAdminEmail;
    await UsersAuthSetupService.init();
    delete process.env.SMALL_API_PORTAL_ADMIN_EMAIL;
    await setPassword(portalAdminEmail);
    const { r, cookie } = await login(portalAdminEmail);
    chai.expect(r.status, 'login of the portal admin').to.equal(200);
    return cookie;
  };

  /**
   * a school signed up by the portal admin, and its first admin logged in: { schoolID, adminCookie }
   */
  const startSchool = async (portalCookie) => {
    const body = { email: schoolAdminEmail, school: { name: 'North High School', description: 'North campus' } };
    const rSignup = await api('post', `${AuthPath}/signup`, { cookie: portalCookie, tenant: portalID(), body });
    chai.expect(rSignup.status, 'signup').to.equal(201);
    const rSchools = await api('get', `${SchoolsConstants.ApiPath}?name=${encodeURIComponent('North High School')}`, {
      cookie: portalCookie,
      tenant: portalID(),
    });
    const schoolID = rSchools.body.data[0].id;

    await setPassword(schoolAdminEmail);
    const { cookie } = await login(schoolAdminEmail);
    return { schoolID, adminCookie: cookie };
  };

  /**
   * an invite into the school, then the person sets its password and logs in: its cookie
   */
  const joinSchool = async (adminCookie, schoolID, email, role) => {
    const body = { email, school: { role } };
    const rInvite = await api('post', `${AuthPath}/invite`, { cookie: adminCookie, tenant: schoolID, body });
    chai.expect(rInvite.status, `invite ${email}`).to.equal(200);
    await setPassword(email);
    const { cookie } = await login(email);
    return cookie;
  };

  /**
   * the record of a person in a list of the school (students, professors, admins), as its admin sees it
   */
  const recordOf = async (apiPath, adminCookie, schoolID, email) => {
    const r = await api('get', `${apiPath}?limit=100`, { cookie: adminCookie, tenant: schoolID });
    chai.expect(r.status, `list ${apiPath}`).to.equal(200);
    return r.body.data.find((item) => item.user?.email === email);
  };

  /**
   * remove everything the flows wrote: the collections of every school, the schools, the users, the logins, the
   * sessions and the events
   */
  const cleanup = async () => {
    const schools = await (await SchoolsDatabase.collection(_ctx)).find({}).toArray();
    for (const school of schools) {
      const schoolCtx = { ..._ctx, tenantID: school.id };
      for (const database of [
        EventsDatabase,
        AdminsDatabase,
        StudentsDatabase,
        ProfessorsDatabase,
        ClassesDatabase,
        LocationsDatabase,
        GroupsDatabase,
        SchedulesDatabase,
      ]) {
        await (await database.collection(schoolCtx)).deleteMany();
      }
    }
    for (const database of [SchoolsDatabase, UsersDatabase, UsersAuthDatabase, UsersAuthSessionsDatabase]) {
      await (await database.collection(_ctx)).deleteMany();
    }
    await (await EventsDatabase.collection(_ctx)).deleteMany();
  };

  before(async function () {});

  beforeEach(async function () {
    // a clean database; the emails are captured (and reported as sent)
    await cleanup();
    mails = [];
    sinon.stub(EmailsUtils, 'sendEmail').callsFake(async (to, subject, body) => {
      mails.push({ to, subject, body });
      return { status: 200, value: { messageID: `message-${mails.length}` } };
    });
  });

  afterEach(async function () {
    sinon.restore();
    delete process.env.SMALL_API_PORTAL_ADMIN_EMAIL;
    await cleanup();
  });

  after(async function () {});

  /**
   * login, the validation of every request by its session, logout
   */
  it('should log in, validate the requests of the session and log out', async () => {
    // the first portal admin (the bootstrap invited it, it set its password)
    const cookie = await startPortal();

    // check: the session works (me, and a route of the portal school)
    const rMe = await api('get', `${AuthPath}/me`, { cookie });
    chai.expect(rMe.status).to.equal(200);
    chai.expect(rMe.body.schools.map((school) => school.id)).to.deep.equal([portalID()]);
    const rSchools = await api('get', SchoolsConstants.ApiPath, { cookie, tenant: portalID() });
    chai.expect(rSchools.status).to.equal(200);

    // check: refused without the session, or with a school that is not its own
    chai.expect((await api('get', SchoolsConstants.ApiPath, { tenant: portalID() })).status).to.equal(401);
    const otherSchool = TestConstants.Schools[0].id;
    chai.expect((await api('get', ClassesConstants.ApiPath, { cookie, tenant: otherSchool })).status).to.equal(401);

    // case: a wrong password
    const rWrong = await login(portalAdminEmail, 'Wrong#Pass99');
    chai.expect(rWrong.r.status).to.equal(401);
    chai.expect(rWrong.cookie).to.equal(undefined);

    // call: logout
    const rLogout = await api('post', `${AuthPath}/logout`, { cookie });
    chai.expect(rLogout.status).to.equal(200);

    // check: the session is ended
    chai.expect((await api('get', `${AuthPath}/me`, { cookie })).status).to.equal(401);
    chai.expect((await api('get', SchoolsConstants.ApiPath, { cookie, tenant: portalID() })).status).to.equal(401);
  }).timeout(30000);

  /**
   * signup: the school is pending until its first admin logs in, the admin sets its password with the link
   */
  it('should sign up a school that its first admin activates at the first login', async () => {
    // the portal admin signs up the school
    const portalCookie = await startPortal();
    const body = { email: schoolAdminEmail, school: { name: 'North High School', description: 'North campus' } };
    const rSignup = await api('post', `${AuthPath}/signup`, { cookie: portalCookie, tenant: portalID(), body });

    // check: created, the setup email sent, the school pending
    chai.expect(rSignup.status).to.equal(201);
    const query = `${SchoolsConstants.ApiPath}?name=${encodeURIComponent('North High School')}`;
    let rSchools = await api('get', query, { cookie: portalCookie, tenant: portalID() });
    const school = rSchools.body.data[0];
    chai.expect(school.status).to.equal('pending');

    // call: the first admin sets its password and logs in
    await setPassword(schoolAdminEmail);
    const { r, cookie } = await login(schoolAdminEmail);

    // check: the school is active, the admin is a member and an active admin
    chai.expect(r.status).to.equal(200);
    chai.expect(r.body.schools[0]).to.include({ id: school.id, status: 'active' });
    rSchools = await api('get', query, { cookie: portalCookie, tenant: portalID() });
    chai.expect(rSchools.body.data[0].status).to.equal('active');
    const admin = await recordOf(AdminsConstants.ApiPath, cookie, school.id, schoolAdminEmail);
    chai.expect(admin.user.status).to.equal('active');
  }).timeout(30000);

  /**
   * invite: a new member is pending until it sets its password and logs in
   */
  it('should invite a member that joins with the setup link', async () => {
    // a school with its admin
    const portalCookie = await startPortal();
    const { schoolID, adminCookie } = await startSchool(portalCookie);

    // call: the admin invites a student
    const body = { email: studentEmail, school: { role: 'student' } };
    const rInvite = await api('post', `${AuthPath}/invite`, { cookie: adminCookie, tenant: schoolID, body });

    // check: the setup email, the student pending
    chai.expect(rInvite.status).to.equal(200);
    let student = await recordOf(StudentsConstants.ApiPath, adminCookie, schoolID, studentEmail);
    chai.expect(student.user.status).to.equal('pending');

    // call: the student sets its password and logs in
    await setPassword(studentEmail);
    const { r, cookie } = await login(studentEmail);

    // check: active, a member of the school that reads its classes
    chai.expect(r.status).to.equal(200);
    student = await recordOf(StudentsConstants.ApiPath, adminCookie, schoolID, studentEmail);
    chai.expect(student.user.status).to.equal('active');
    const rClasses = await api('get', ClassesConstants.ApiPath, { cookie, tenant: schoolID });
    chai.expect(rClasses.status).to.equal(200);
  }).timeout(30000);

  /**
   * the remove of a role keeps the record as a trace (the default setting); the role given again makes it active
   */
  it('should remove a role, keep the trace, and give the role back', async () => {
    // a school, its admin, and a student who joined
    const portalCookie = await startPortal();
    const { schoolID, adminCookie } = await startSchool(portalCookie);
    let studentCookie = await joinSchool(adminCookie, schoolID, studentEmail, 'student');
    const student = await recordOf(StudentsConstants.ApiPath, adminCookie, schoolID, studentEmail);

    // call: the admin deletes the student (its role in the school)
    const rDelete = await api('delete', `${StudentsConstants.ApiPath}/${student.id}`, {
      cookie: adminCookie,
      tenant: schoolID,
    });
    chai.expect(rDelete.status).to.equal(200);

    // check: a trace, removed; the user is not a member anymore
    let trace = await recordOf(StudentsConstants.ApiPath, adminCookie, schoolID, studentEmail);
    chai.expect(trace.user.status).to.equal('removed');
    const rClasses = await api('get', ClassesConstants.ApiPath, { cookie: studentCookie, tenant: schoolID });
    chai.expect(rClasses.status).to.equal(401);
    const rLogin = await login(studentEmail);
    chai.expect(rLogin.r.body.schools).to.deep.equal([]);

    // check: without a school it still reads and changes its profile
    studentCookie = rLogin.cookie;
    const ownPath = `${UsersConstants.ApiPath}/${student.id}`;
    chai.expect((await api('get', ownPath, { cookie: studentCookie })).status).to.equal(200);
    const rProfile = await api('put', ownPath, { cookie: studentCookie, body: { name: 'Jane Mary Smith' } });
    chai.expect(rProfile.status).to.equal(200);

    // call: the admin invites it again as a student (an active user: the invitation)
    const body = { email: studentEmail, school: { role: 'student' } };
    const rInvite = await api('post', `${AuthPath}/invite`, { cookie: adminCookie, tenant: schoolID, body });
    chai.expect(rInvite.status).to.equal(200);

    // check: the trace is a student again, with the new name, and the school is offered again
    trace = await recordOf(StudentsConstants.ApiPath, adminCookie, schoolID, studentEmail);
    chai.expect(trace.user.status).to.equal('active');
    chai.expect(trace.user.name).to.equal('Jane Mary Smith');
    const rAgain = await login(studentEmail);
    chai.expect(rAgain.r.body.schools.map((school) => school.id)).to.deep.equal([schoolID]);
  }).timeout(30000);

  /**
   * the delete of an account keeps its traces (deleted); an invitation creates it again, the roles given again are
   * active, the others stay traces
   */
  it('should delete an account, keep its traces, and create it again by an invitation', async () => {
    // a school, its admin, and a member who is student and professor
    const portalCookie = await startPortal();
    const { schoolID, adminCookie } = await startSchool(portalCookie);
    const memberCookie = await joinSchool(adminCookie, schoolID, studentEmail, 'student');
    const body = { email: studentEmail, school: { role: 'professor' } };
    chai
      .expect((await api('post', `${AuthPath}/invite`, { cookie: adminCookie, tenant: schoolID, body })).status)
      .to.equal(200);

    // call: the member deletes its account
    const rDelete = await api('delete', AuthPath, { cookie: memberCookie });
    chai.expect(rDelete.status).to.equal(200);

    // check: the session is ended, the login is refused, the records are traces marked deleted
    chai.expect((await api('get', `${AuthPath}/me`, { cookie: memberCookie })).status).to.equal(401);
    chai.expect((await login(studentEmail)).r.status).to.equal(401);
    let student = await recordOf(StudentsConstants.ApiPath, adminCookie, schoolID, studentEmail);
    let professor = await recordOf(ProfessorsConstants.ApiPath, adminCookie, schoolID, studentEmail);
    chai.expect(student.user.status).to.equal('deleted');
    chai.expect(professor.user.status).to.equal('deleted');

    // call: the admin invites it again, only as a student
    const again = { email: studentEmail, school: { role: 'student' } };
    const rInvite = await api('post', `${AuthPath}/invite`, { cookie: adminCookie, tenant: schoolID, body: again });

    // check: a new user (a new id): both traces of the school are linked to it, and stay deleted until it logs in
    chai.expect(rInvite.status).to.equal(200);
    const newStudent = await recordOf(StudentsConstants.ApiPath, adminCookie, schoolID, studentEmail);
    professor = await recordOf(ProfessorsConstants.ApiPath, adminCookie, schoolID, studentEmail);
    chai.expect(newStudent.id).to.not.equal(student.id);
    chai.expect(newStudent.user.id).to.equal(newStudent.id);
    chai.expect(professor.id).to.equal(newStudent.id);
    chai.expect(newStudent.user.status).to.equal('deleted');

    // call: it sets its password and logs in
    await setPassword(studentEmail);
    const { r } = await login(studentEmail);

    // check: the student is active, the professor is still a trace
    chai.expect(r.status).to.equal(200);
    student = await recordOf(StudentsConstants.ApiPath, adminCookie, schoolID, studentEmail);
    professor = await recordOf(ProfessorsConstants.ApiPath, adminCookie, schoolID, studentEmail);
    chai.expect(student.user.status).to.equal('active');
    chai.expect(professor.user.status).to.equal('deleted');
  }).timeout(30000);

  /**
   * a deleted account invited again by its school while it is active by another school: its traces are linked to it
   * and the role given again is active at once; a deleted account invited again that never logs in: its invitation
   * expires, its traces stay deleted
   */
  it('should link the traces of a deleted account to an active user, and keep them when an invitation expires', async () => {
    // a school with a member who is student and professor, who deletes its account
    const portalCookie = await startPortal();
    const { schoolID, adminCookie } = await startSchool(portalCookie);
    const memberCookie = await joinSchool(adminCookie, schoolID, studentEmail, 'student');
    const professorBody = { email: studentEmail, school: { role: 'professor' } };
    await api('post', `${AuthPath}/invite`, { cookie: adminCookie, tenant: schoolID, body: professorBody });
    chai.expect((await api('delete', AuthPath, { cookie: memberCookie })).status).to.equal(200);

    // call: it signs up another school as its first admin (a new user, active), then its first school invites it again
    const signup = { email: studentEmail, school: { name: 'South High School', description: 'South campus' } };
    const rSignup = await api('post', `${AuthPath}/signup`, { cookie: portalCookie, tenant: portalID(), body: signup });
    chai.expect(rSignup.status).to.equal(201);
    await setPassword(studentEmail);
    chai.expect((await login(studentEmail)).r.status).to.equal(200);
    const again = { email: studentEmail, school: { role: 'student' } };
    const rInvite = await api('post', `${AuthPath}/invite`, { cookie: adminCookie, tenant: schoolID, body: again });
    chai.expect(rInvite.status).to.equal(200);

    // check: the traces have the id of the active user; the student is active at once, the professor stays deleted
    const users = await UsersDatabase.collection(_ctx);
    const user = await users.findOne({ email: studentEmail });
    const student = await recordOf(StudentsConstants.ApiPath, adminCookie, schoolID, studentEmail);
    const professor = await recordOf(ProfessorsConstants.ApiPath, adminCookie, schoolID, studentEmail);
    chai.expect(student.id).to.equal(user.id);
    chai.expect(professor.id).to.equal(user.id);
    chai.expect(student.user.status).to.equal('active');
    chai.expect(professor.user.status).to.equal('deleted');

    // call: another deleted account (its student trace) invited again, that never logs in: its invitation expires
    const otherCookie = await joinSchool(adminCookie, schoolID, otherStudentEmail, 'student');
    chai.expect((await api('delete', AuthPath, { cookie: otherCookie })).status).to.equal(200);
    const otherAgain = { email: otherStudentEmail, school: { role: 'student' } };
    await api('post', `${AuthPath}/invite`, { cookie: adminCookie, tenant: schoolID, body: otherAgain });
    await users.updateOne({ email: otherStudentEmail }, { $set: { createdTimestamp: '2026-01-01T10:00:00.000Z' } });
    const cleanupCtx = {
      reqID: 'Test-Users-Auth-Cleanup',
      lang: 'en',
      tenantID: portalID(),
      userID: 'cleanup pending',
      username: 'cleanup pending',
    };
    const res = await UsersService.deleteExpiredPending(cleanupCtx);

    // check: the user is removed again, its trace stays, deleted
    chai.expect(res.value.length).to.equal(1);
    chai.expect(await users.findOne({ email: otherStudentEmail })).to.equal(null);
    const otherTrace = await recordOf(StudentsConstants.ApiPath, adminCookie, schoolID, otherStudentEmail);
    chai.expect(otherTrace.user.status).to.equal('deleted');
  }).timeout(30000);

  /**
   * the setting of the school deletes the records of the removed members (and their places in the groups)
   */
  it('should delete the records of the removed members by the setting of the school', async () => {
    // a school, its admin, a student in a group
    const portalCookie = await startPortal();
    const { schoolID, adminCookie } = await startSchool(portalCookie);
    await joinSchool(adminCookie, schoolID, studentEmail, 'student');
    const student = await recordOf(StudentsConstants.ApiPath, adminCookie, schoolID, studentEmail);
    const rGroup = await api('post', '/api/v1/groups', {
      cookie: adminCookie,
      tenant: schoolID,
      body: { name: 'Group A', students: [{ id: student.id }] },
    });
    chai.expect(rGroup.status).to.equal(201);

    // call: the admin chooses to delete the removed members, then removes the student
    const settingsPath = `${SchoolsConstants.ApiPath}/${schoolID}/settings`;
    const settings = { removedMembers: 'delete' };
    const rSettings = await api('put', settingsPath, { cookie: adminCookie, tenant: schoolID, body: settings });
    chai.expect(rSettings.status).to.equal(200);
    const rRead = await api('get', settingsPath, { cookie: adminCookie, tenant: schoolID });
    chai.expect(rRead.body).to.deep.equal(settings);
    const rDelete = await api('delete', `${StudentsConstants.ApiPath}/${student.id}`, {
      cookie: adminCookie,
      tenant: schoolID,
    });
    chai.expect(rDelete.status).to.equal(200);

    // check: no record, and not in the group anymore
    chai.expect(await recordOf(StudentsConstants.ApiPath, adminCookie, schoolID, studentEmail)).to.equal(undefined);
    const rGroupAfter = await api('get', `/api/v1/groups/${rGroup.body.id}`, { cookie: adminCookie, tenant: schoolID });
    chai.expect(rGroupAfter.body.students).to.deep.equal([]);

    // check: the settings of another school can not be read or changed by this admin
    const otherPath = `${SchoolsConstants.ApiPath}/${portalID()}/settings`;
    chai.expect((await api('get', otherPath, { cookie: adminCookie, tenant: schoolID })).status).to.equal(403);
  }).timeout(30000);

  /**
   * the invitations that were not used in time are removed, with what they left (the pending record, the login)
   */
  it('should remove the invitations that were not used in time', async () => {
    // a school, its admin, a student that joined and one that never did
    const portalCookie = await startPortal();
    const { schoolID, adminCookie } = await startSchool(portalCookie);
    await joinSchool(adminCookie, schoolID, studentEmail, 'student');
    const body = { email: otherStudentEmail, school: { role: 'student' } };
    chai
      .expect((await api('post', `${AuthPath}/invite`, { cookie: adminCookie, tenant: schoolID, body })).status)
      .to.equal(200);

    // stub: the invitation was sent long ago (older than the expiry)
    const users = await UsersDatabase.collection(_ctx);
    await users.updateOne({ email: otherStudentEmail }, { $set: { createdTimestamp: '2026-01-01T10:00:00.000Z' } });

    // call: the cleanup (it runs regularly)
    const cleanupCtx = {
      reqID: 'Test-Users-Auth-Cleanup',
      lang: 'en',
      tenantID: portalID(),
      userID: 'cleanup pending',
      username: 'cleanup pending',
    };
    const res = await UsersService.deleteExpiredPending(cleanupCtx);

    // check: only the expired one, with its record and its login; the other student is untouched
    chai.expect(res.value.length).to.equal(1);
    chai.expect(await users.findOne({ email: otherStudentEmail })).to.equal(null);
    chai.expect(await (await UsersAuthDatabase.collection(_ctx)).findOne({ id: otherStudentEmail })).to.equal(null);
    chai
      .expect(await recordOf(StudentsConstants.ApiPath, adminCookie, schoolID, otherStudentEmail))
      .to.equal(undefined);
    const student = await recordOf(StudentsConstants.ApiPath, adminCookie, schoolID, studentEmail);
    chai.expect(student.user.status).to.equal('active');
  }).timeout(30000);

  /**
   * what no logged-in user did is in the events too, with the user that did it: the start (the setup user: the portal
   * school, the invitation of the first portal admin) and the removal of a signup and of an invitation that were not
   * used in time (the pending cleanup user)
   */
  it('should keep the events of the start and of the removal of what was not used in time', async () => {
    // the start: the portal school (the events without a school) and its first portal admin (the portal school)
    const portalCookie = await startPortal();
    const globalEvents = await EventsDatabase.collection(_ctx);
    const portalEvents = await EventsDatabase.collection({ ..._ctx, tenantID: portalID() });
    const setupUser = { id: 'setup', username: 'setup' };
    const schoolsStart = await globalEvents.find({ messageID: 'schools.post', user: setupUser }).toArray();
    chai.expect(schoolsStart.map((event) => event.target.name)).to.deep.equal(['Portal School']);
    const usersStart = await portalEvents.find({ messageID: 'users.post', user: setupUser }).toArray();
    chai.expect(usersStart.length).to.equal(1);

    // a signup that nobody logged in to, older than the expiry (the school and its first admin)
    const body = { email: schoolAdminEmail, school: { name: 'North High School', description: 'North campus' } };
    const rSignup = await api('post', `${AuthPath}/signup`, { cookie: portalCookie, tenant: portalID(), body });
    chai.expect(rSignup.status).to.equal(201);
    const createdLongAgo = { $set: { createdTimestamp: '2026-01-01T10:00:00.000Z' } };
    await (await SchoolsDatabase.collection(_ctx)).updateOne({ name: 'North High School' }, createdLongAgo);
    await (await UsersDatabase.collection(_ctx)).updateOne({ email: schoolAdminEmail }, createdLongAgo);

    // call: the cleanups (they run regularly, with the portal school and the pending cleanup user)
    const cleanupCtx = {
      reqID: 'Test-Users-Auth-Cleanup',
      lang: 'en',
      tenantID: portalID(),
      userID: 'cleanup pending',
      username: 'cleanup pending',
    };
    chai.expect((await SchoolsService.deleteExpiredPending(cleanupCtx)).value.length).to.equal(1);
    chai.expect((await UsersService.deleteExpiredPending(cleanupCtx)).value.length).to.equal(1);

    // check: the expired school and the expired user are in the events of the portal school, by the cleanup user
    const removedFilter = { messageID: { $in: ['schools.expire', 'users.delete'] } };
    const removedEvents = await portalEvents.find(removedFilter).toArray();
    chai.expect(removedEvents.map((event) => event.messageID)).to.have.members(['schools.expire', 'users.delete']);
    const cleanupUser = { id: 'cleanup pending', username: 'cleanup pending' };
    chai.expect(removedEvents.map((event) => event.user)).to.deep.equal([cleanupUser, cleanupUser]);
  }).timeout(30000);

  /**
   * a portal admin can remove its own role; the start invites the configured portal admin again
   */
  it('should let a portal admin remove its own role and invite the configured one again at the start', async () => {
    // the first portal admin
    const cookie = await startPortal();
    const rMe = await api('get', `${AuthPath}/me`, { cookie });

    // call: it removes its own portal-admin role
    const rRemove = await api('patch', `${AuthPath}/school/user/${rMe.body.userID}`, {
      cookie,
      tenant: portalID(),
      body: { remove: { roles: ['portal-admin'] } },
    });

    // check: removed, it is not a portal admin anymore
    chai.expect(rRemove.status).to.equal(200);
    chai.expect((await api('get', SchoolsConstants.ApiPath, { cookie, tenant: portalID() })).status).to.equal(401);

    // call: the next start (no active portal admin)
    process.env.SMALL_API_PORTAL_ADMIN_EMAIL = portalAdminEmail;
    const invited = await UsersAuthSetupService.init();

    // check: invited again (an active user: the invitation), a portal admin again
    chai.expect(invited).to.equal(true);
    chai.expect(mails.pop().to).to.equal(portalAdminEmail);
    const { cookie: cookieAgain } = await login(portalAdminEmail);
    chai
      .expect((await api('get', SchoolsConstants.ApiPath, { cookie: cookieAgain, tenant: portalID() })).status)
      .to.equal(200);

    // check: the next start does nothing (an active portal admin)
    chai.expect(await UsersAuthSetupService.init()).to.equal(false);
  }).timeout(30000);
});
