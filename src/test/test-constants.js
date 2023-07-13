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
      status: 'active',
    },
    {
      id: 'school-high2',
      name: 'Local Highschool',
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
      password: 'password',
      firstName: 'Big',
      lastName: 'Ben',
      name: 'Big Ben',
      birthday: '1980-01-01T00:00:00Z',
      phoneNumber: '+0',
      address: 'London',
      schools: [
        {
          id: 'school-univ1',
          name: 'GitHub University',
          roles: ['student'],
        },
        {
          id: 'school-high2',
          name: 'Local Highschool',
          roles: ['teacher', 'admin'],
        },
      ],
    },
    {
      id: 'user2',
      email: 'john.bravo@testdomain.test',
      password: 'password',
      firstName: 'John',
      lastName: 'Bravo',
      name: 'John Bravo',
      birthday: '2000-01-01T00:00:00Z',
      phoneNumber: '+0',
      address: 'Home alone',
      schools: [
        {
          id: 'school-univ1',
          name: 'GitHub University',
          roles: ['teacher'],
        },
      ],
    },
  ],
};

module.exports = { ...Public };
