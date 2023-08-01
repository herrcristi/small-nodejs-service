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
    },
    {
      id: 'school-high2',
      name: 'Local Highschool',
      type: 'school',
      status: 'active',
      description: '',
    },
  ],

  /**
   * users
   */
  Users: [
    {
      id: 'user1',
      email: 'big.ben@testdomain.test',
      firstName: 'Big',
      lastName: 'Ben',
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
    },
    {
      id: 'user2',
      email: 'john.bravo@testdomain.test',
      firstName: 'John',
      lastName: 'Bravo',
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
};

module.exports = { ...Public };
