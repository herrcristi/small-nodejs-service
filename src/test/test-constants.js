/**
 * Test constants
 */

const Public = {
  /**
   * web server
   */
  WebServer: 'http://localhost:8080',

  /**
   * schools
   */
  Schools: [
    {
      id: 'school-univ1',
      name: 'GitHub University',
      type: 'school',
      status: 'active',
      description: 'GitHub University. The place to code.',
      _lang_en: {
        status: 'Active',
      },
    },
    {
      id: 'school-high2',
      name: 'Local Highschool',
      type: 'school',
      status: 'active',
      description: '',
      _lang_en: {
        status: 'Active',
      },
    },
  ],

  SchoolsNotifications: [
    {
      serviceName: 'schools',
      modified: [
        {
          id: 'school-univ1',
          name: 'GitHub University',
          type: 'school',
          status: 'active',
        },
      ],
    },
  ],

  /**
   * users
   */
  Users: [
    {
      id: 'user1',
      email: 'big.ben@testdomain.test',
      name: 'Big Ben',
      type: 'user',
      status: 'active',
      birthday: '1980-01-01T00:00:00Z',
      phoneNumber: '+0',
      address: 'London',
      schools: [
        {
          id: 'school-univ1',
          roles: ['student'],
        },
        {
          id: 'school-high2',
          roles: ['teacher', 'admin'],
        },
      ],
      _lang_en: {
        status: 'Active',
      },
    },
    {
      id: 'user2',
      email: 'john.bravo@testdomain.test',
      name: 'John Bravo',
      type: 'user',
      status: 'active',
      birthday: '2000-01-01T00:00:00Z',
      phoneNumber: '+0',
      address: 'Home alone',
      schools: [
        {
          id: 'school-univ1',
          roles: ['teacher'],
        },
      ],
      _lang_en: {
        status: 'Active',
      },
    },
  ],

  UsersNotifications: [
    {
      serviceName: 'users',
      modified: [
        {
          id: 'user1',
          name: 'Big Ben',
          type: 'user',
          status: 'active',
        },
      ],
    },
  ],

  /**
   * events
   */
  Events: [
    {
      id: 'event1',
      severity: 'info',
      messageID: 'schools.post',
      name: 'schools.post',
      target: {
        id: 'school-univ1',
        name: 'GitHub University',
        type: 'school',
      },
      args: [],
      user: {
        id: 'user1',
        name: 'Big Ben',
      },
      type: 'event',
      createdTimestamp: '2023-08-04T12:12:12.001Z',
      _lang_en: {
        severity: 'Info',
        message: "School 'GitHub University' added",
      },
    },
    {
      id: 'event2',
      severity: 'info',
      messageID: 'users.post',
      name: 'users.post',
      target: {
        id: 'user2',
        name: 'John Bravo',
        type: 'user',
      },
      args: [],
      user: {
        id: 'user1',
        name: 'Big Ben',
      },
      type: 'event',
      createdTimestamp: '2023-08-04T12:12:12.001Z',
      _lang_en: {
        severity: 'Info',
        message: "User 'John Bravo' added",
      },
    },
  ],

  EventsNotifications: [
    {
      serviceName: 'events',
      modified: [
        {
          id: 'event1',
          severity: 'info',
          messageID: 'schools.post',
          name: 'schools.post',
          target: {
            id: 'school-univ1',
            name: 'GitHub University',
            type: 'school',
          },
          args: [],
          user: {
            id: 'user1',
            name: 'Big Ben',
          },
          type: 'event',
        },
      ],
    },
  ],

  /**
   * students
   */
  Students: [
    {
      id: 'user1',
      name: 'Big Ben',
      type: 'student',
      classes: [],
    },
    {
      id: 'user2',
      name: 'John Bravo',
      type: 'student',
      classes: [],
    },
  ],

  StudentsNotifications: [
    {
      serviceName: 'students',
      modified: [
        {
          id: 'user1',
          name: 'Big Ben',
          type: 'student',
        },
      ],
    },
  ],
};

module.exports = { ...Public };
