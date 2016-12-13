/*
 * @author David Menger
 */
'use strict';

const mongotoolbox = require('mongotoolbox');
const ObjectID = require('mongodb').ObjectID;

const NOT_MAIL_REGEX = /^[^@]+$/i;


class MongoDbUserStorage {

    constructor (collectionName = 'users') {
        this._collectioName = collectionName;

        this._collection = null;
    }

    init (dbConnection) {
        this._collection = dbConnection.collection(this._collectioName);

        return mongotoolbox.ensureIndex(this._collection)
            .index({ _uqUserName: 1 },
                { unique: true, sparse: true })
            .index({ _uqEmail: 1 },
                { unique: true, sparse: true })
            .index({ 'auths.type': 1, 'auths.id': 1 },
                { sparse: true })
            .writeIndexes();
    }

    findById (userId) {
        if (!userId || !ObjectID.isValid(userId)) {
            return Promise.resolve(null);
        }

        const sel = this._collection
            .find({ _id: new ObjectID(userId) })
            .limit(1);

        return sel.next()
            .then(user => this._filterRawDbObject(user));
    }

    getUserByAuth (type, id) {
        const sel = this._collection
            .find({
                auths: { $elemMatch: { id, type } }
            })
            .limit(1);

        return sel.next()
            .then(user => this._filterRawDbObject(user));
    }

    getUser (userNameOrEmail) {
        const sel = this._collection
            .find(this._getCondition(userNameOrEmail))
            .limit(1);

        return sel.next()
            .then(user => this._filterRawDbObject(user));
    }

    updateUser (userId, data) {
        return this._collection.findOneAndUpdate({
            _id: new ObjectID(userId)
        }, data, {
            returnOriginal: false
        })
        .then(res => this._filterRawDbObject(res.value));
    }

    dropUserArrayItem (userId, field, identifier, key = null) {
        return this._collection.findOneAndUpdate({
            _id: new ObjectID(userId)
        }, {
            $pull: {
                [field]: this._createArrayFieldCondition(identifier, key)
            }
        }, {
            returnOriginal: false
        }).then(res => this._filterRawDbObject(res.value));
    }

    _createArrayFieldCondition (obj, key = null) {
        let identifier = obj;

        if (typeof obj === 'object' && key !== null) {
            identifier = obj[key];
        }

        let fieldCondition = obj;

        if (key !== null) {
            fieldCondition = {
                $elemMatch: { [key]: identifier }
            };
        }

        return fieldCondition;
    }

    upsertUserArrayItem (userId, field, obj, key = null) {

        const arrayFieldCondition = this._createArrayFieldCondition(obj, key);

        const updatePromise = this._collection.findOneAndUpdate({
            _id: new ObjectID(userId),
            [field]: arrayFieldCondition
        }, {
            $set: { [`${field}.$`]: obj }
        }, {
            returnOriginal: false
        });

        const addPromise = this._collection.findOneAndUpdate({
            _id: new ObjectID(userId),
            [field]: { $not: arrayFieldCondition }
        }, {
            $push: { [field]: obj }
        }, {
            returnOriginal: false
        });

        return Promise.all([addPromise, updatePromise])
            .then(([addResult, updateResult]) => (
                this._filterRawDbObject(addResult.value || updateResult.value)
            ));
    }

    createUser (userObject) {
        const preparedObject = this._prepareInsertObject(userObject);

        return this._collection.insertOne(preparedObject)
            .then(res => this._filterRawDbObject(res.ops[0]));
    }

    _filterRawDbObject (rawDbObject) {
        if (rawDbObject === null) {
            return rawDbObject;
        }

        const ret = Object.assign(rawDbObject, {
            id: rawDbObject._id.toString()
        });

        delete ret._id;
        delete ret._uqUserName;
        delete ret._uqEmail;

        return ret;
    }

    _prepareInsertObject (userObject) {
        const add = {};

        if (userObject[MongoDbUserStorage.USERNAME_FIELD]) {
            add._uqUserName = userObject[MongoDbUserStorage.USERNAME_FIELD].toLowerCase();
        }

        if (userObject[MongoDbUserStorage.EMAIL_FIELD]) {
            add._uqEmail = userObject[MongoDbUserStorage.EMAIL_FIELD].toLowerCase();
        }

        return Object.assign({}, userObject, add);
    }

    _getCondition (userNameOrEmail) {
        if (typeof userNameOrEmail !== 'string') {
            throw new Error('Identificator should be string');

        } else if (userNameOrEmail.match(NOT_MAIL_REGEX)) {
            return {
                _uqUserName: userNameOrEmail.toLowerCase()
            };
        }

        return {
            _uqEmail: userNameOrEmail.toLowerCase()
        };
    }

}

MongoDbUserStorage.USERNAME_FIELD = 'userName';
MongoDbUserStorage.EMAIL_FIELD = 'email';

module.exports = MongoDbUserStorage;
