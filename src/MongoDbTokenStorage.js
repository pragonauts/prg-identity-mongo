/*
 * @author David Menger
 */
'use strict';

const mongodb = require('mongodb');
const mongotoolbox = require('mongotoolbox');

const TOKEN_REGEX = /^[a-f0-9]{24}$/i;

class MongoDbTokenStorage {

    constructor (collectionName = 'tokens') {
        this._collectionName = collectionName;

        this._collection = null;
    }

    init (dbConnection) {
        this._collection = dbConnection.collection(this._collectionName);

        return mongotoolbox.ensureIndex(this._collection)
            .index({ expireAt: 1 }, { sparse: true, expireAfterSeconds: 0 })
            .writeIndexes();
    }

    saveToken (id, object) {
        if (!id.match(TOKEN_REGEX)) {
            const err = new Error('Token ID should be 24char long hexastring');
            return Promise.reject(err);
        }

        const preparedObject = Object.assign({}, object, {
            _id: new mongodb.ObjectID(id),
            userId: object.userId ? new mongodb.ObjectID(object.userId) : null
        });

        if (preparedObject.id) {
            delete preparedObject.id;
        }

        return this._collection.insert(preparedObject);
    }

    dropTokenById (id) {
        return this._collection.deleteOne({
            _id: new mongodb.ObjectID(id)
        });
    }

    getTokenById (id) {
        if (!id.match(TOKEN_REGEX)) {
            const err = new Error('Token ID should be 24char long hexastring');
            return Promise.reject(err);
        }

        const sel = this._collection
            .find({
                _id: new mongodb.ObjectID(id)
            })
            .limit(1);

        return sel.next()
            .then(res => this._filterRawDbObject(res));
    }

    _filterRawDbObject (rawDbObject) {
        if (rawDbObject === null) {
            return rawDbObject;
        }

        const ret = Object.assign(rawDbObject, {
            id: rawDbObject._id.toString(),
            userId: rawDbObject.userId ? rawDbObject.userId.toString() : null
        });

        delete ret._id;

        return ret;
    }
}

module.exports = MongoDbTokenStorage;
