/**
 * roles permissions: what a member of a school sees of the school, by its roles in the school of the request
 * (_ctx.roles): a school admin (and a portal admin) sees everything; a professor and a student see what concerns them,
 * and a member with both roles sees what each of them sees
 * - students: a student only itself; a professor the students of its schedules (listed, or in a group of a schedule)
 * - professors: a professor only itself; a student the professors of its schedules
 * - groups: a student its groups; a professor the groups of its schedules
 * - schedules: a student the ones where it is listed or one of its groups is; a professor the ones where it is listed
 * - the students of a group or a schedule seen by a student: all, or only itself (the school setting classmates)
 * _ctx.roles is set only by the users-auth middleware (a request of a user): a call of another service, or in the same
 * process, has none and is not restricted
 */
const UsersRest = require('./rest/users.rest.js');
const SchoolsRest = require('./rest/schools.rest.js');
const StudentsRest = require('./rest/students.rest.js');
const ProfessorsRest = require('./rest/professors.rest.js');
const GroupsRest = require('./rest/groups.rest.js');
const SchedulesRest = require('./rest/schedules.rest.js');

const Roles = UsersRest.Constants.Roles;

const Private = {
  /**
   * the ids of the referenced objects of a field ([{ id }])
   */
  getIDs: (refs) => (refs || []).map((ref) => ref.id),

  /**
   * the ids of two lists, each once
   */
  union: (ids1, ids2) => [...new Set([...(ids1 || []), ...(ids2 || [])])],

  /**
   * the filter that any of its parts matches (the parts of the roles of the caller); none: nothing matches
   */
  anyOf: (parts) => {
    const filters = parts.filter((part) => part);
    if (!filters.length) {
      return { id: { $in: [] } };
    }
    return filters.length === 1 ? filters[0] : { $or: filters };
  },

  /**
   * the part of a professor: its schedules (where it is listed), and the groups of these schedules
   * returns { status, value: { scheduleIDs, groupIDs } } or { status, error }
   */
  getProfessorPart: async (_ctx) => {
    const part = { scheduleIDs: [], groupIDs: [] };
    const r = await ProfessorsRest.getOne(_ctx.userID, { _id: 0, id: 1, schedules: 1 }, _ctx);
    if (r.status === 404) {
      return { status: 200, value: part }; // not a professor record yet: nothing of its own
    }
    if (r.error) {
      return r;
    }
    part.scheduleIDs = Private.getIDs(r.value.schedules);

    // the groups of its schedules
    if (part.scheduleIDs.length) {
      const rSchedules = await SchedulesRest.getAllByIDs(part.scheduleIDs, { _id: 0, id: 1, groups: 1 }, _ctx);
      if (rSchedules.error) {
        return rSchedules;
      }
      part.groupIDs = Private.union(rSchedules.value.flatMap((schedule) => Private.getIDs(schedule.groups)));
    }
    return { status: 200, value: part };
  },

  /**
   * the part of a student: its groups, and its schedules (where it is listed, or one of its groups is)
   * returns { status, value: { groupIDs, scheduleIDs } } or { status, error }
   */
  getStudentPart: async (_ctx) => {
    const part = { groupIDs: [], scheduleIDs: [] };
    const r = await StudentsRest.getOne(_ctx.userID, { _id: 0, id: 1, groups: 1, schedules: 1 }, _ctx);
    if (r.status === 404) {
      return { status: 200, value: part }; // not a student record yet: nothing of its own
    }
    if (r.error) {
      return r;
    }
    part.groupIDs = Private.getIDs(r.value.groups);
    const scheduleIDs = Private.getIDs(r.value.schedules);

    // the schedules of its groups
    if (part.groupIDs.length) {
      const rGroups = await GroupsRest.getAllByIDs(part.groupIDs, { _id: 0, id: 1, schedules: 1 }, _ctx);
      if (rGroups.error) {
        return rGroups;
      }
      scheduleIDs.push(...rGroups.value.flatMap((group) => Private.getIDs(group.schedules)));
    }
    part.scheduleIDs = Private.union(scheduleIDs);
    return { status: 200, value: part };
  },
};

const Public = {
  /**
   * the scope of the caller: null (everything: a school admin, a portal admin, a call of a service) or
   * { id, professor, student, scheduleIDs, groupIDs }: the part of each of its roles (null: not this role), and what
   * they see together (the roles apply both: a professor that is also a student sees what each of them sees); a member
   * with none of these roles sees nothing
   * returns { status, value: scope } or { status, error }
   */
  getScope: async (_ctx) => {
    const roles = _ctx.roles;
    if (!Array.isArray(roles) || roles.includes(Roles.Admin) || roles.includes(Roles.PortalAdmin)) {
      return { status: 200, value: null };
    }

    const scope = { id: _ctx.userID, professor: null, student: null, scheduleIDs: [], groupIDs: [] };
    if (roles.includes(Roles.Professor)) {
      const r = await Private.getProfessorPart(_ctx);
      if (r.error) {
        return r;
      }
      scope.professor = r.value;
    }
    if (roles.includes(Roles.Student)) {
      const r = await Private.getStudentPart(_ctx);
      if (r.error) {
        return r;
      }
      scope.student = r.value;
    }

    // the groups and the schedules of its roles together
    scope.scheduleIDs = Private.union(scope.professor?.scheduleIDs, scope.student?.scheduleIDs);
    scope.groupIDs = Private.union(scope.professor?.groupIDs, scope.student?.groupIDs);
    return { status: 200, value: scope };
  },

  /**
   * the filter of what a scope sees of a list (the services: students, professors, groups, schedules): what any of
   * its roles sees
   */
  Filters: {
    // a student: only itself; a professor: the students of its schedules (listed, or in a group of a schedule)
    students: (scope) =>
      Private.anyOf([
        scope.student && { id: scope.id },
        scope.professor && { 'schedules.id': { $in: scope.professor.scheduleIDs } },
        scope.professor && { 'groups.id': { $in: scope.professor.groupIDs } },
      ]),
    // a professor: only itself; a student: the professors of its schedules
    professors: (scope) =>
      Private.anyOf([
        scope.professor && { id: scope.id },
        scope.student && { 'schedules.id': { $in: scope.student.scheduleIDs } },
      ]),
    groups: (scope) => ({ id: { $in: scope.groupIDs } }),
    schedules: (scope) => ({ id: { $in: scope.scheduleIDs } }),
  },

  /**
   * a group or a schedule seen by a scope (its details): one of its groups (groups) or of its schedules (schedules);
   * without a scope: all
   */
  canSee: (scope, serviceName, objID) => {
    if (!scope) {
      return true;
    }
    const ids = serviceName === 'groups' ? scope.groupIDs : scope.scheduleIDs;
    return ids.includes(objID);
  },

  /**
   * a list restricted to a scope: its filter and the filter of the scope (none: not restricted)
   * filter: { filter, projection, limit, skip, sort } (RestApiUtils.buildFilterFromReq)
   */
  restrict: (filter, scope, serviceName) => {
    if (scope) {
      filter.filter = { $and: [filter.filter, Public.Filters[serviceName](scope)] };
    }
    return filter;
  },

  /**
   * the students of groups or schedules seen by a student: all, or only itself (the school setting classmates); the
   * objects are changed: their students, and the students of their groups (the groups of a schedule); a group or a
   * schedule of the caller as a professor (its schedules and their groups) shows all its students
   * returns { status, value: objs } or { status, error }
   */
  filterClassmates: async (objs, scope, _ctx) => {
    if (!scope?.student) {
      return { status: 200, value: objs };
    }

    // the lists of students of the objects (the students of a group or a schedule, and of the groups of a schedule),
    // except the ones of the caller as a professor
    const taughtIDs = new Set(Private.union(scope.professor?.scheduleIDs, scope.professor?.groupIDs));
    const holders = objs.flatMap((obj) => [obj, ...(Array.isArray(obj?.groups) ? obj.groups : [])]);
    const withStudents = holders.filter((holder) => Array.isArray(holder?.students) && !taughtIDs.has(holder.id));
    if (!withStudents.length) {
      return { status: 200, value: objs };
    }

    const rSettings = await SchoolsRest.getSettings(_ctx.tenantID, _ctx);
    if (rSettings.error) {
      return rSettings;
    }
    if (rSettings.value.classmates !== SchoolsRest.Constants.Settings.Classmates.Hide) {
      return { status: 200, value: objs };
    }

    for (const holder of withStudents) {
      holder.students = holder.students.filter((student) => student.id === scope.id);
    }
    return { status: 200, value: objs };
  },
};

module.exports = { ...Public };
