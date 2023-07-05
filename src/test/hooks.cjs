/**
 * Called by mocha
 */
const CommonUtils = require('../core/utils/common.utils.cjs');

exports.mochaHooks = {
  beforeAll: [
    async function () {
      this.timeout(20 * 1000);
      console.log('Tests started');
    },

    function (done) {
      // init service
      const service = require('../index.cjs');
      service.on('inited', () => {
        done();
      });
    },
  ],

  beforeEach: [async function () {}],

  afterEach: [async function () {}],

  afterAll: [
    async function () {
      console.log('Tests finished');
    },
  ],
};
