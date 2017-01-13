/**
 * Hapi middleware for transforming contents of request and response
 *
 * @since 1.0.0
 */

const util = require('../common/util');

const defaultOptions = Object.freeze({
  apiPrefix: '/api',
  errorView: 'error',
});

const register = (server, opts, next) => {
  const options = Object.assign({}, defaultOptions, opts);
  /* eslint no-param-reassign: ["error", { "props": false }] */
  server.ext('onPostAuth', (request, reply) => {
    if (request.query) {
      request.query = util.snake2camelObject(request.query);
    }
    if (request.payload) {
      request.payload = util.snake2camelObject(request.payload);
    }
    return reply.continue();
  });

  server.ext('onPreResponse', (request, reply) => {
    if (request.path.includes(options.apiPrefix)) {
      return reply(util.camel2snakeObject(request.response.source));
    }
    return reply.continue();
  });

  next();
};

register.attributes = {
  name: 'hapi-transform',
  version: '1.0.0',
};

module.exports = register;
