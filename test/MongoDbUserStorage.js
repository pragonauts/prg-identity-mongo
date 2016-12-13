'use strict';

const assert = require('assert');
const { MongoClient } = require('mongodb');
const MongoDbUserStorage = require('../src/MongoDbUserStorage');

describe('MongoDbUserStorage', function () {

    const mongoStore = new MongoDbUserStorage('testUsers');
    let createdUser;

    let db;

    before(function () {

        const url = 'mongodb://127.0.0.1:27017/identityTests';
        // Use connect method to connect to the Server
        return MongoClient.connect(url).then((connectedDb) => {
            db = connectedDb;
            return mongoStore.init(connectedDb);
        });
    });

    after(function () {
        return db.close();
    });

    beforeEach(function () {
        const userObject = {
            name: 'SomeName',
            array: [{ key: 1, payload: 1 }]
        };
        return mongoStore.createUser(userObject)
            .then(_user => (createdUser = _user));
    });

    it('should be ok to add new key-value object', function () {
        return mongoStore.upsertUserArrayItem(createdUser.id, 'array', { key: 2, payload: 2 }, 'key')
            .then((user) => {
                assert.equal(user.array.length, 2, 'The array property should contain two items');
            });
    });

    it('should be ok to add update a existing object', function () {
        return mongoStore.upsertUserArrayItem(createdUser.id, 'array', { key: 1, payload: 3 }, 'key')
            .then((user) => {
                assert.equal(user.array.length, 1, 'The array property should contain two items');
                assert.equal(user.array[0].payload, 3, 'The third property should have updated value');
            });
    });

});
