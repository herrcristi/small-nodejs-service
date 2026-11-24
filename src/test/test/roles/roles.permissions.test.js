const sinon = require('sinon');
const chai = require('chai');

const RolesPermissions = require('../../../services/roles.permissions.js');
const StudentsRest = require('../../../services/rest/students.rest.js');
const ProfessorsRest = require('../../../services/rest/professors.rest.js');
const GroupsRest = require('../../../services/rest/groups.rest.js');
const SchedulesRest = require('../../../services/rest/schedules.rest.js');
const SchoolsRest = require('../../../services/rest/schools.rest.js');

/**
 * what a member sees of the school, by its roles in the school of the request (_ctx.roles, set only by the users-auth
 * middleware): a school admin everything, a professor and a student what concerns them, a member with both roles what
 * each of them sees
 */
describe('Roles Permissions', function () {
  const _ctx = { reqID: 'testReq', lang: 'en', tenantID: 'school1', userID: 'user1' };

  afterEach(async function () {
    sinon.restore();
  });

  /**
   * stub: the student record (its groups and schedules) and the schedules of its groups
   */
  const stubStudent = () => ({
    student: sinon
      .stub(StudentsRest, 'getOne')
      .resolves({ status: 200, value: { id: 'user1', groups: [{ id: 'g1' }], schedules: [{ id: 's1' }] } }),
    groups: sinon
      .stub(GroupsRest, 'getAllByIDs')
      .resolves({ status: 200, value: [{ id: 'g1', schedules: [{ id: 's1' }, { id: 's2' }] }] }),
  });

  /**
   * stub: the professor record (its schedules) and the groups of its schedules
   */
  const stubProfessor = () => ({
    professor: sinon
      .stub(ProfessorsRest, 'getOne')
      .resolves({ status: 200, value: { id: 'user1', schedules: [{ id: 's3' }, { id: 's4' }] } }),
    schedules: sinon.stub(SchedulesRest, 'getAllByIDs').resolves({
      status: 200,
      value: [
        { id: 's3', groups: [{ id: 'g3' }] },
        { id: 's4', groups: [{ id: 'g3' }, { id: 'g4' }] },
      ],
    }),
  });

  /**
   * a school admin, a portal admin and a call without roles (another service, the same process) see everything
   */
  it('should not restrict an admin and a call of a service', async () => {
    for (const roles of [['admin'], ['student', 'admin'], ['portal-admin'], undefined]) {
      const res = await RolesPermissions.getScope({ ..._ctx, roles });
      chai.expect(res, JSON.stringify(roles)).to.deep.equal({ status: 200, value: null });
    }

    // a list is not restricted without a scope, the details are seen
    const filter = { filter: { name: /a/i } };
    chai.expect(RolesPermissions.restrict(filter, null, 'students')).to.deep.equal({ filter: { name: /a/i } });
    chai.expect(RolesPermissions.canSee(null, 'schedules', 's9')).to.equal(true);
  });

  /**
   * a student: its groups, and its schedules (where it is listed, and the ones of its groups); it sees only itself in
   * the students, the professors of its schedules, its groups and its schedules
   */
  it('should give a student its groups and schedules', async () => {
    const stubs = stubStudent();

    // call
    const res = await RolesPermissions.getScope({ ..._ctx, roles: ['student'] });

    // check: its own record, then the schedules of its groups
    const student = { groupIDs: ['g1'], scheduleIDs: ['s1', 's2'] };
    const scope = { id: 'user1', professor: null, student, scheduleIDs: ['s1', 's2'], groupIDs: ['g1'] };
    chai.expect(res).to.deep.equal({ status: 200, value: scope });
    chai.expect(stubs.student.firstCall.args[0]).to.equal('user1');
    chai.expect(stubs.groups.firstCall.args[0]).to.deep.equal(['g1']);

    // check: the filters of the lists, the details it sees
    chai.expect(RolesPermissions.Filters.students(scope)).to.deep.equal({ id: 'user1' });
    chai.expect(RolesPermissions.Filters.professors(scope)).to.deep.equal({ 'schedules.id': { $in: ['s1', 's2'] } });
    chai.expect(RolesPermissions.Filters.groups(scope)).to.deep.equal({ id: { $in: ['g1'] } });
    chai.expect(RolesPermissions.Filters.schedules(scope)).to.deep.equal({ id: { $in: ['s1', 's2'] } });
    const filter = RolesPermissions.restrict({ filter: { name: /a/i } }, scope, 'students');
    chai.expect(filter.filter).to.deep.equal({ $and: [{ name: /a/i }, { id: 'user1' }] });
    chai.expect(RolesPermissions.canSee(scope, 'groups', 'g1')).to.equal(true);
    chai.expect(RolesPermissions.canSee(scope, 'groups', 'g2')).to.equal(false);
    chai.expect(RolesPermissions.canSee(scope, 'schedules', 's2')).to.equal(true);
    chai.expect(RolesPermissions.canSee(scope, 'schedules', 's3')).to.equal(false);

    // case: without groups (nothing else is read)
    stubs.student.resolves({ status: 200, value: { id: 'user1' } });
    const resAlone = await RolesPermissions.getScope({ ..._ctx, roles: ['student'] });
    chai.expect(resAlone.value.student).to.deep.equal({ groupIDs: [], scheduleIDs: [] });
    chai.expect(stubs.groups.callCount).to.equal(1);

    // case: no student record yet (nothing of its own), a failure of the reads
    stubs.student.resolves({ status: 404, error: { message: 'Not found' } });
    chai.expect((await RolesPermissions.getScope({ ..._ctx, roles: ['student'] })).value.groupIDs).to.deep.equal([]);
    stubs.student.resolves({ status: 500, error: { message: 'Database failure' } });
    chai.expect((await RolesPermissions.getScope({ ..._ctx, roles: ['student'] })).status).to.equal(500);
    stubs.student.resolves({ status: 200, value: { id: 'user1', groups: [{ id: 'g1' }] } });
    stubs.groups.resolves({ status: 500, error: { message: 'Database failure' } });
    chai.expect((await RolesPermissions.getScope({ ..._ctx, roles: ['student'] })).status).to.equal(500);
  });

  /**
   * a professor: its schedules and their groups; it sees only itself in the professors, the students of its schedules
   * (listed, or in a group of a schedule), the groups of its schedules
   */
  it('should give a professor its schedules and their groups', async () => {
    const stubs = stubProfessor();

    // call
    const res = await RolesPermissions.getScope({ ..._ctx, roles: ['professor'] });

    // check
    const professor = { scheduleIDs: ['s3', 's4'], groupIDs: ['g3', 'g4'] };
    const scope = { id: 'user1', professor, student: null, scheduleIDs: ['s3', 's4'], groupIDs: ['g3', 'g4'] };
    chai.expect(res).to.deep.equal({ status: 200, value: scope });
    chai.expect(stubs.schedules.firstCall.args[0]).to.deep.equal(['s3', 's4']);
    chai.expect(RolesPermissions.Filters.professors(scope)).to.deep.equal({ id: 'user1' });
    chai.expect(RolesPermissions.Filters.students(scope)).to.deep.equal({
      $or: [{ 'schedules.id': { $in: ['s3', 's4'] } }, { 'groups.id': { $in: ['g3', 'g4'] } }],
    });

    // case: without schedules (nothing else is read), no record, failures
    stubs.professor.resolves({ status: 200, value: { id: 'user1' } });
    chai.expect((await RolesPermissions.getScope({ ..._ctx, roles: ['professor'] })).value.groupIDs).to.deep.equal([]);
    chai.expect(stubs.schedules.callCount).to.equal(1);
    stubs.professor.resolves({ status: 404, error: { message: 'Not found' } });
    const resNone = await RolesPermissions.getScope({ ..._ctx, roles: ['professor'] });
    chai.expect(resNone.value.scheduleIDs).to.deep.equal([]);
    stubs.professor.resolves({ status: 500, error: { message: 'Database failure' } });
    chai.expect((await RolesPermissions.getScope({ ..._ctx, roles: ['professor'] })).status).to.equal(500);
    stubs.professor.resolves({ status: 200, value: { id: 'user1', schedules: [{ id: 's3' }] } });
    stubs.schedules.resolves({ status: 500, error: { message: 'Database failure' } });
    chai.expect((await RolesPermissions.getScope({ ..._ctx, roles: ['professor'] })).status).to.equal(500);
  });

  /**
   * a member with both roles sees what each of them sees: itself and the students of its schedules, itself and the
   * professors of its schedules as a student, the groups and the schedules of both; a member with none of these roles
   * sees nothing
   */
  it('should apply both roles of a professor that is also a student', async () => {
    stubStudent();
    stubProfessor();

    // call
    const res = await RolesPermissions.getScope({ ..._ctx, roles: ['student', 'professor'] });

    // check: the part of each role, and the groups and the schedules of both
    const scope = res.value;
    chai.expect(scope.professor).to.deep.equal({ scheduleIDs: ['s3', 's4'], groupIDs: ['g3', 'g4'] });
    chai.expect(scope.student).to.deep.equal({ groupIDs: ['g1'], scheduleIDs: ['s1', 's2'] });
    chai.expect(scope.scheduleIDs).to.deep.equal(['s3', 's4', 's1', 's2']);
    chai.expect(scope.groupIDs).to.deep.equal(['g3', 'g4', 'g1']);
    chai.expect(RolesPermissions.Filters.students(scope)).to.deep.equal({
      $or: [{ id: 'user1' }, { 'schedules.id': { $in: ['s3', 's4'] } }, { 'groups.id': { $in: ['g3', 'g4'] } }],
    });
    chai.expect(RolesPermissions.Filters.professors(scope)).to.deep.equal({
      $or: [{ id: 'user1' }, { 'schedules.id': { $in: ['s1', 's2'] } }],
    });
    chai.expect(RolesPermissions.canSee(scope, 'groups', 'g1')).to.equal(true);
    chai.expect(RolesPermissions.canSee(scope, 'groups', 'g4')).to.equal(true);

    // case: a failure of the part of the student
    StudentsRest.getOne.resolves({ status: 500, error: { message: 'Database failure' } });
    const resFailed = await RolesPermissions.getScope({ ..._ctx, roles: ['student', 'professor'] });
    chai.expect(resFailed.status).to.equal(500);

    // case: a member with none of these roles sees nothing
    const resNone = await RolesPermissions.getScope({ ..._ctx, roles: [] });
    const nothing = { id: 'user1', professor: null, student: null, scheduleIDs: [], groupIDs: [] };
    chai.expect(resNone.value).to.deep.equal(nothing);
    chai.expect(RolesPermissions.Filters.students(nothing)).to.deep.equal({ id: { $in: [] } });
  });

  /**
   * the students of a group or a schedule seen by a student: all (show, the default), or only itself (hide); a
   * professor sees all of them, also a student that is the professor of the group or the schedule
   */
  it('should show the classmates by the setting of the school', async () => {
    const stubSettings = sinon
      .stub(SchoolsRest, 'getSettings')
      .resolves({ status: 200, value: { classmates: 'hide' } });
    const student = { id: 'user1', professor: null, student: { groupIDs: ['g1'], scheduleIDs: [] } };
    const getGroups = () => [{ id: 'g1', students: [{ id: 'user1' }, { id: 'user2' }] }, { id: 'g2' }];

    // hide: only itself
    const res = await RolesPermissions.filterClassmates(getGroups(), student, _ctx);
    chai.expect(res.value).to.deep.equal([{ id: 'g1', students: [{ id: 'user1' }] }, { id: 'g2' }]);
    chai.expect(stubSettings.firstCall.args[0]).to.equal('school1');

    // hide: also the students of the groups of a schedule
    const groups = [{ id: 'g1', students: [{ id: 'user1' }, { id: 'user3' }] }];
    const schedule = { id: 's1', students: [{ id: 'user2' }], groups };
    const resSchedule = await RolesPermissions.filterClassmates([schedule], student, _ctx);
    chai
      .expect(resSchedule.value)
      .to.deep.equal([{ id: 's1', students: [], groups: [{ id: 'g1', students: [{ id: 'user1' }] }] }]);

    // hide: a group of its schedules as a professor shows all its students
    const both = { ...student, professor: { scheduleIDs: ['s3'], groupIDs: ['g1'] } };
    const resBoth = await RolesPermissions.filterClassmates(getGroups(), both, _ctx);
    chai.expect(resBoth.value[0].students).to.have.length(2);

    // show: all
    stubSettings.resolves({ status: 200, value: { classmates: 'show' } });
    const resShow = await RolesPermissions.filterClassmates(getGroups(), student, _ctx);
    chai.expect(resShow.value[0].students).to.have.length(2);

    // a professor only, an admin, objects without students: not changed, the settings are not read
    stubSettings.resetHistory();
    const professor = { id: 'user1', professor: { scheduleIDs: [], groupIDs: [] }, student: null };
    for (const scope of [professor, null]) {
      const resNot = await RolesPermissions.filterClassmates(getGroups(), scope, _ctx);
      chai.expect(resNot.value[0].students).to.have.length(2);
    }
    await RolesPermissions.filterClassmates([{ id: 'g2' }], student, _ctx);
    chai.expect(stubSettings.callCount).to.equal(0);

    // the settings can not be read
    stubSettings.resolves({ status: 500, error: { message: 'Database failure' } });
    chai.expect((await RolesPermissions.filterClassmates(getGroups(), student, _ctx)).status).to.equal(500);
  });
});
