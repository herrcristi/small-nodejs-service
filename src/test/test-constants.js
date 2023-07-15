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
      description: 'GitHub University. The place to code.',
      status: 'active',
    },
    {
      id: 'school-high2',
      name: 'Local Highschool',
      description: '',
      status: 'active',
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
};

module.exports = { ...Public };
