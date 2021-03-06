/**
 * deviceType Service API router
 *
 * @since 1.0.0
 */

const Joi = require('joi');
const DeviceType = require('./../repository/DeviceType');
const config = require('../config/server.config').url;
const dateUtil = require('../common/date-util');
const SSSError = require('../common/Error');

module.exports = [
  {
    method: 'GET',
    path: `${config.deviceTypeApiPrefix}`,
    handler: (request, h) => DeviceType.find().then(list => h.response({
      data: dateUtil.formatDates(list),
      totalCount: list.length,
    })).catch(err => h.response(err)),
  },
  {
    method: 'POST',
    path: `${config.deviceTypeApiPrefix}`,
    handler: async (request, h) => {
      const deviceType = Object.assign({}, request.payload);
      return DeviceType.find({ value: deviceType.value })
        .then((result) => {
          if (result && result.length > 0) {
            throw new SSSError(SSSError.Types.CONFLICT, { value: deviceType.value });
          }
          return true;
        })
        .then(() => DeviceType.add(deviceType))
        .then(result => h.response(result));
    },
    config: {
      validate: {
        payload: {
          label: Joi.string().required(),
          value: Joi.string().required(),
          template: Joi.string(),
        },
      },
    },
  },
  {
    method: 'PUT',
    path: `${config.deviceTypeApiPrefix}/{deviceTypeId}`,
    handler: async (request, h) => {
      const deviceType = Object.assign({}, request.payload);
      let unset;
      if (!deviceType.template) {
        unset = { template: 1 };
      }
      return DeviceType.find({ value: deviceType.value })
        .then((result) => {
          if (result && result.length > 0 && request.params.deviceTypeId !== result[0]._id) {
            throw new SSSError(SSSError.Types.CONFLICT, { value: deviceType.value });
          }
          return true;
        })
        .then(() => DeviceType.update(request.params.deviceTypeId, deviceType, unset))
        .then(result => h.response(result));
    },
    config: {
      validate: {
        params: {
          deviceTypeId: Joi.string().required(),
        },
        payload: {
          label: Joi.string().required(),
          value: Joi.string().required(),
          template: Joi.string(),
        },
      },
    },
  },
  {
    method: 'DELETE',
    path: `${config.deviceTypeApiPrefix}/{deviceTypeId}`,
    handler: (request, h) => DeviceType.remove(request.params.deviceTypeId)
      .then(result => h.response(result))
      .catch(err => h.response(err)),
    config: {
      validate: {
        params: {
          deviceTypeId: Joi.string().required(),
        },
      },
    },
  },
];
