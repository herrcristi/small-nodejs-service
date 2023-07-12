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
      id: 'GitHub University',
    },
    {
      id: 'Local Highschool',
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
      birthday: '1980-01-01T00:00:00Z',
      phoneNumber: '+0',
      address: 'London',
      schools: ['GitHub University', 'Local Highschool'],
    },
    {
      id: 'user2',
      email: 'john.bravo@testdomain.test',
      password: 'password',
      firstName: 'John',
      lastName: 'Bravo',
      birthday: '2000-01-01T00:00:00Z',
      phoneNumber: '+0',
      address: 'Home alone',
      schools: ['GitHub University'],
    },
  ],
};

module.exports = { ...Public };
