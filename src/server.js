/**
 * Server main
 *
 * @since 1.0.0
 */

import Hapi from '@hapi/hapi';

require('dotenv').config();
require('babel-register');
require('babel-polyfill');

const vision = require('@hapi/vision');
const inert = require('@hapi/inert');
const HapiAuthJwt2 = require('hapi-auth-jwt2');
const HapiReactViews = require('hapi-react-views');
const HapiErrorHandler = require('./middleware/error-handler');
const HapiTransformer = require('./middleware/transformer');
const HapiAuthChecker = require('./middleware/auth-info-checker');

const commonApiRouter = require('./router/common-api-router');
const statusApiRouter = require('./router/status-api-router');
const statusTypeApiRouter = require('./router/status-type-api-router');
const deviceTypeApiRouter = require('./router/device-type-api-router');
const baseRouter = require('./router/ui-router');
const User = require('./repository/User');
const DeviceType = require('./repository/DeviceType');
const StatusType = require('./repository/StatusType');

const config = require('./config/server.config');
const SSSError = require('./common/Error');

const util = require('./common/common-util');
const logger = require('winston');

const server = new Hapi.Server({
  port: process.env.PORT || config.defaults.port,
});

server.state('token', {
  ttl: config.auth.tokenTTL,
  isSecure: process.env.USE_HTTPS && process.env.USE_HTTPS === 'true',
  path: '/',
});

const plugins = [
  { plugin: vision },
  { plugin: inert },
  { plugin: HapiAuthJwt2 },
  { plugin: HapiErrorHandler, options: { apiPrefix: config.url.apiPrefix, errorView: 'Error' } },
  {
    plugin: HapiAuthChecker,
    options: {
      excludeUrlPatterns: [new RegExp(`^${config.url.apiPrefix}`), new RegExp('^/logout')],
    },
  },
  { plugin: HapiTransformer, options: { apiPrefix: config.url.apiPrefix } },
];

const _setAuthStrategy = () => {
  server.auth.strategy('jwt', 'jwt', {
    key: process.env.SECRET_KEY || config.auth.secretKey,
    validate: (decoded, request, h) => {
      // Check token IP address
      const clientIP = util.getClientIp(request);
      if (clientIP !== decoded.ip) {
        logger.warn(
          `[Auth] This client IP is matched with token info.: decoded.ip => ${decoded.ip}, client IP => ${clientIP}`,
        );
        return h.unauthenticated(new SSSError(SSSError.Types.AUTH_TOKEN_INVALID));
      }
      // Check token expiration
      if (decoded.exp < new Date().getTime()) {
        logger.warn(
          `[Auth] This auth token is expired.: decoded.exp => ${decoded.exp}, now => ${new Date().getTime()}`,
        );
        return h.unauthenticated(new SSSError(SSSError.Types.AUTH_TOKEN_EXPIRED));
      }
      return User.find({ username: decoded.username })
        .then((accounts) => {
          if (!accounts || accounts.length === 0) {
            logger.warn(`[Auth] This account is not exist.: ${decoded.username}`);
            return h.unauthenticated(new SSSError(SSSError.Types.AUTH_USER_NOT_EXIST, { username: decoded.username }));
          }
          const result = h.authenticated({ credentials: accounts[0] });
          result.isValid = true;
          return result;
        })
        .catch((e) => {
          logger.error(`[DB] DB error occurred: ${e.message}`);
          h.unauthenticated(new SSSError(SSSError.Types.DB));
        });
    },
    verifyOptions: { algorithms: ['HS256'] },
  });
  server.auth.default('jwt');
};

const _setViewEngine = () => {
  server.views({
    engines: { jsx: HapiReactViews, js: HapiReactViews },
    relativeTo: __dirname,
    path: config.directory.component,
    defaultExtension: 'js',
  });
};

const _setRoutes = (extraRoutes) => {
  // for static assets
  server.route(commonApiRouter);
  server.route(statusApiRouter);
  server.route(statusTypeApiRouter);
  server.route(deviceTypeApiRouter);
  server.route(baseRouter);
  if (extraRoutes) {
    server.route(extraRoutes);
  }
};

const _setInitalData = () => {
  let promises = [];
  return Promise.all([User.count(), DeviceType.count(), StatusType.count()])
    .then(([userCount, deviceTypeCount, statusTypeCount]) => {
      if (userCount === 0) {
        promises = promises.concat(config.initialData.users.map(user => User.add(user)));
      }
      if (deviceTypeCount === 0) {
        promises = promises.concat(config.initialData.deviceTypes.map(dt => DeviceType.add(dt)));
      }
      if (statusTypeCount === 0) {
        promises = promises.concat(config.initialData.statusTypes.map(user => StatusType.add(user)));
      }
    })
    .then(() => Promise.all(promises))
    .then(result => logger.log('[SET INITIAL DATA] success: ', result));
};

exports.addPlugin = (pluginSetting) => {
  plugins.push(pluginSetting);
};

exports.start = extraRoutes => server.register(plugins)
  .then(() => {
    _setAuthStrategy();
    _setViewEngine();
    _setRoutes(extraRoutes);
  })
  .then(() => _setInitalData())
  .then(() => server.start())
  .then(() => {
    logger.log('Server running at:', server.info.uri);
    return server;
  })
  .catch((error) => { throw error; });
