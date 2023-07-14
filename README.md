# small-nodejs-service

A node.js microservice

This projects implements a portal for managing schools.

The reasons behind this project includes:

- multi tenant with schools
- users have roles inside every entity (school) like teacher, student, admin
- relantionships between schools - users (teachers/students/etc) - classes - locations

For the backend part every entity should show

- a rest api implementation implemented via web server controller
- mongo access
- notification
- calls between difference services
