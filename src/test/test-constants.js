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
    },
    {
      id: 'school-high2',
      name: 'Local Highschool',
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
      schools: ['school-univ1', 'school-high2'],
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
      schools: ['school-univ1'],
    },
  ],
};

module.exports = { ...Public };
