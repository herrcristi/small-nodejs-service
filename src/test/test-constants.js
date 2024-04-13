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
  UsersAuth: [
    {
      id: 'big.ben@testdomain.test',
      password:
        '13f4888656e370d5ad7e1fd64e8249e840ffdbf2535ae59cc3790447a519e1c2139b0fc7eaf4d0d643ac17e031b519ecb854d9af47da86a12c72d3629d92e9de',
      salt: 'salt1',
      userID: 'user1',
      type: 'user-auth',
      _test_data: {
        origPassword: 'password1',
      },
    },
    {
      id: 'john.bravo@testdomain.test',
      password:
        '112c5f06e4bba1d2cddee9552091e598d098e8a1c9ce184363e9f2ca7ef3daed936d01ab634c26ce458a46c502f4a126ebb0bab179cd39e2a0ba938f12447bb7',
      salt: 'salt2',
      userID: 'user2',
      type: 'user-auth',
      _test_data: {
        origPassword: 'password2',
      },
    },
  ],

  UsersSignup: [
    {
      email: 'big.ben1@testdomain.test',
      password: 'Big Ben1',
      name: 'Big Ben1',
      birthday: '1980-01-01T00:00:00Z',
      phoneNumber: '+0',
      address: 'London',
      school: {
        name: 'GitHub University',
        description: 'GitHub University. The place to code.',
      },
    },
  ],

  UsersToken: [
    {
      token: 'token1',
    },
  ],

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
          roles: ['professor', 'admin'],
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
          roles: ['professor'],
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
          email: 'big.ben@testdomain.test',
          schools: [
            {
              id: 'school-univ1',
              roles: ['student'],
            },
            {
              id: 'school-high2',
              roles: ['professor', 'admin'],
            },
          ],
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
        username: 'big.ben@testdomain.test',
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
        username: 'big.ben@testdomain.test',
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
            username: 'Big Ben',
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
      user: {
        id: 'user1',
        name: 'Big Ben',
        type: 'user',
        status: 'active',
        email: 'big.ben@testdomain.test',
      },
      type: 'student',
      classes: [
        {
          id: 'class1',
          name: 'Mathematics',
          type: 'class',
          status: 'active',
          description: 'Mathematics basics',
          credits: 5,
          required: 'required',
        },
      ],
      groups: [
        {
          id: 'group1',
          name: 'Group 1A',
          type: 'group',
          status: 'active',
        },
      ],
      schedules: [
        {
          id: 'schedule1',
          name: 'Schedule Mathematics 1A',
          type: 'schedule',
          status: 'active',
          class: {
            id: 'class1',
            name: 'Mathematics',
            type: 'class',
            status: 'active',
            description: 'Mathematics basics',
            credits: 5,
            required: 'required',
          },
        },
      ],
    },
  ],

  StudentsNotifications: [
    {
      serviceName: 'students',
      modified: [
        {
          id: 'user1',
          user: {
            id: 'user1',
            name: 'Big Ben',
            type: 'user',
            status: 'active',
            email: 'big.ben@testdomain.test',
          },
          name: 'Big Ben',
          type: 'student',
          status: 'active',
        },
      ],
    },
  ],

  /**
   * Professors
   */
  Professors: [
    {
      id: 'user2',
      user: {
        id: 'user2',
        name: 'John Bravo',
        type: 'user',
        status: 'active',
        email: 'john.bravo@testdomain.test',
      },
      type: 'professor',
      classes: [
        {
          id: 'class1',
          name: 'Mathematics',
          type: 'class',
          status: 'active',
          description: 'Mathematics basics',
          credits: 5,
          required: 'required',
        },
      ],
      schedules: [
        {
          id: 'schedule1',
          name: 'Schedule Mathematics 1A',
          type: 'schedule',
          status: 'active',
          class: {
            id: 'class1',
            name: 'Mathematics',
            type: 'class',
            status: 'active',
            description: 'Mathematics basics',
            credits: 5,
            required: 'required',
          },
        },
      ],
    },
  ],

  ProfessorsNotifications: [
    {
      serviceName: 'professors',
      modified: [
        {
          id: 'user1',
          user: {
            id: 'user1',
            name: 'Big Ben',
            type: 'user',
            status: 'active',
            email: 'big.ben@testdomain.test',
          },
          type: 'professor',
          name: 'Big Ben',
          status: 'active',
        },
      ],
    },
  ],

  /**
   * Classes
   */
  Classes: [
    {
      id: 'class1',
      name: 'Mathematics',
      type: 'class',
      status: 'active',
      description: 'Mathematics basics',
      credits: 5,
      required: 'required',
      _lang_en: {
        status: 'Active',
        credits: '5',
        required: 'Required',
      },
    },
    {
      id: 'class2',
      name: 'Politics',
      type: 'class',
      status: 'active',
      description: 'Politics basics',
      credits: 3,
      required: 'optional',
      _lang_en: {
        status: 'Active',
        credits: '3',
        required: 'Optional',
      },
    },
  ],

  ClassesNotifications: [
    {
      serviceName: 'classes',
      modified: [
        {
          id: 'class1',
          name: 'Mathematics',
          type: 'class',
          status: 'active',
          description: 'Mathematics basics',
          credits: 5,
          required: 'required',
        },
      ],
    },
  ],

  /**
   * Locations
   */
  Locations: [
    {
      id: 'location1',
      name: 'Main Conference Room',
      type: 'location',
      status: 'active',
      address: 'Main Building, Main Conference Room',
      _lang_en: {
        status: 'Active',
      },
    },
    {
      id: 'location2',
      name: 'Second Room',
      type: 'location',
      status: 'active',
      address: 'Main Building, 1st floor, second room',
      _lang_en: {
        status: 'Active',
      },
    },
  ],

  LocationsNotifications: [
    {
      serviceName: 'locations',
      modified: [
        {
          id: 'location1',
          name: 'Main Conference Room',
          type: 'location',
          status: 'active',
          address: 'Main Building, Main Conference Room',
        },
      ],
    },
  ],

  /**
   * Groups
   */
  Groups: [
    {
      id: 'group1',
      name: 'Group 1A',
      type: 'group',
      status: 'active',
      description: 'Group 1A. First year',
      students: [
        {
          id: 'user1',
          user: {
            id: 'user1',
            name: 'Big Ben',
            type: 'user',
            status: 'active',
            email: 'big.ben@testdomain.test',
          },
          type: 'student',
        },
      ],
      schedules: [
        {
          id: 'schedule1',
          name: 'Schedule Mathematics 1A',
          type: 'schedule',
          status: 'active',
          class: {
            id: 'class1',
            name: 'Mathematics',
            type: 'class',
            status: 'active',
            description: 'Mathematics basics',
            credits: 5,
            required: 'required',
          },
        },
      ],
      _lang_en: {
        status: 'Active',
      },
    },
  ],

  GroupsNotifications: [
    {
      serviceName: 'groups',
      modified: [
        {
          id: 'group1',
          name: 'Group1A',
          type: 'group',
          status: 'active',
          students: [
            {
              id: 'user1',
              name: 'Big Ben',
              type: 'student',
              status: 'active',
            },
          ],
        },
      ],
    },
  ],

  /**
   * Schedules
   */
  Schedules: [
    {
      id: 'schedule1',
      name: 'Schedule Mathematics 1A',
      type: 'schedule',
      status: 'active',
      class: {
        id: 'class1',
        name: 'Mathematics',
        type: 'class',
        status: 'active',
        description: 'Mathematics basics',
        credits: 5,
        required: 'required',
      },
      schedules: [
        {
          timestamp: '2023-12-04T08:00:00.000Z', // every Monday at 08:00
          frequency: 'weekly',
          status: 'active',
          location: {
            id: 'location1',
            name: 'Main Conference Room',
            type: 'location',
            status: 'active',
            address: 'Main Building, Main Conference Room',
          },
        },
      ],
      professors: [
        {
          id: 'user2',
          user: {
            id: 'user2',
            name: 'John Bravo',
            type: 'user',
            status: 'active',
            email: 'john.bravo@testdomain.test',
          },
          type: 'professor',
        },
      ],
      groups: [
        {
          id: 'group1',
          name: 'Group 1A',
          type: 'group',
          status: 'active',
        },
      ],
      students: [
        {
          id: 'user1',
          user: {
            id: 'user1',
            name: 'Big Ben',
            type: 'user',
            status: 'active',
            email: 'big.ben@testdomain.test',
          },
          type: 'student',
        },
      ],
      _lang_en: {
        status: 'Active',
      },
    },
  ],

  SchedulesNotifications: [
    {
      serviceName: 'schedules',
      modified: [
        {
          id: 'schedule1',
          name: 'schedule1A',
          type: 'schedule',
          status: 'active',
          students: [
            {
              id: 'user1',
              name: 'Big Ben',
              type: 'student',
              status: 'active',
            },
          ],
        },
      ],
    },
  ],
};

module.exports = { ...Public };
