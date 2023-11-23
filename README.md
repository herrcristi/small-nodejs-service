# small-nodejs-service

A node.js microservice

This projects implements a portal for managing schools.

The reasons behind this project include:

- multi tenant with schools
- users have roles inside every entity (school) like professor, student, admin
- relationships between schools - users (professors/students/etc) - classes - locations - groups - schedules

For the backend part every entity should show

- rest api implementation implemented via web server controller
- mongo access
- notification
- calls between difference services
- authentication
- translation
- unit tests with high coverage of the code
