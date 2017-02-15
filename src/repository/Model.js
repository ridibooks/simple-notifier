/**
 * Abstract Model class interacting with MongoDB
 *
 * @since 1.0.0
 */

const co = require('co');
const mongodb = require('mongodb');
const config = require('../config/server.config');
const NotifierError = require('../common/Error');

const MongoClient = mongodb.MongoClient;
const ObjectID = mongodb.ObjectID;
const url = process.env.MONGODB_URI || config.defaults.mongoDBUrl;
const logger = require('winston');

/**
 * @class
 * @classdesc basic interactions with selected collection
 */
class Model {

  constructor(collection, indexes) {
    if (new.target === Model) {
      throw new TypeError('Cannot construct Model instances directly');
    }

    this.collection = collection || this.constructor.name.toLowerCase();

    if (indexes instanceof Array) {
      this.runQuery(col => col.createIndexes(indexes))
        .then(() => logger.log(`[DB] ${this.collection}'s index creation is successfully done.`))
        .catch(error => logger.error(`[DB] ${this.collection}'s index creation is failed.`, error));
    }
  }

  runQuery(fn) {
    const self = this;
    return co(function* () {
      const db = yield MongoClient.connect(url);
      const collection = db.collection(self.collection);
      const result = yield fn.call(self, collection);
      yield db.close();
      return result;
    }).catch((err) => {
      throw err;
    });
  }

  find(query, sort, skip, limit) {
    if (query && query._id) {
      query._id = ObjectID(query._id);
    }
    return this.runQuery((collection) => {
      const cursor = collection.find(query || {}).sort(sort || {});
      if (typeof skip !== 'undefined' || typeof limit !== 'undefined') {
        cursor.skip(skip).limit(limit);
      }
      return cursor.toArray();
    }).then(list => list.map((item) => {
      item._id = item._id.toHexString();
      return item;
    })).catch((error) => {
      logger.error(error);
      throw new NotifierError(NotifierError.Types.DB, {}, error);
    });
  }

  count(query) {
    return this.runQuery(collection => collection.count(query || {}))
      .catch((error) => {
        logger.error(error);
        throw new NotifierError(NotifierError.Types.DB, {}, error);
      });
  }

  add(model) {
    return this.runQuery(collection => collection.insertOne(model))
      .then((result) => {
        let data = result.ops;
        if (data) {
          data = result.ops.map(d => Object.assign({}, d, { _id: d._id.toHexString() }));
        }
        return { data, count: result.result.n };
      })
      .catch((error) => {
        logger.error(error);
        throw new NotifierError(NotifierError.Types.DB, {}, error);
      });
  }

  update(id, model, unset) {
    return this.updateWithQuery({ _id: ObjectID(id) }, model, unset);
  }

  updateWithQuery(query, model, unset) {
    const option = { $set: model };
    if (unset) {
      option.$unset = unset;
    }
    return this.runQuery(collection => collection.findOneAndUpdate(query, option))

      .then(result => ({ data: [{ _id: result.value._id.toHexString() }], count: 1 }))
      .catch((error) => {
        logger.error(error);
        throw new NotifierError(NotifierError.Types.DB, {}, error);
      });
  }

  remove(id) {
    return this.runQuery(collection => collection.deleteOne({ _id: ObjectID(id) }))
      .then(result => ({ data: [{ _id: id }], count: result.result.n }))
      .catch((error) => {
        logger.error(error);
        throw new NotifierError(NotifierError.Types.DB, {}, error);
      });
  }
}

module.exports = Model;
