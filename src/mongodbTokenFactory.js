/*
 * @author David Menger
 */
'use strict';

const mongodb = require('mongodb');
const crypto = require('crypto');

const TOKEN_SIZE = 512;


function createToken (id, userIdOrGroups, type, options, token) {

    let userId = null;
    let groups = null;

    if (typeof userIdOrGroups === 'object') {
        groups = userIdOrGroups;
    } else {
        userId = userIdOrGroups;
    }

    return Object.assign({
        id,
        userId,
        token,
        type,
        groups
    }, options);
}

function mongodbTokenFactory (type, userIdOrGroups = null, options = {}, length = TOKEN_SIZE) {

    if (typeof options.token === 'string') {

        const matches = options.token.match(/^([a-f0-9]{24})/);

        if (!matches) {
            return Promise.reject(new Error('Token should start with ObjectId'));
        }

        return Promise.resolve(createToken(
            matches[1],
            userIdOrGroups,
            type,
            options,
            options.token
        ));
    }

    return new Promise((resolve, reject) => {
        crypto.randomBytes((length - 24) / 2, (err, tail) => {
            if (err) {
                reject(err);
            } else {
                const id = new mongodb.ObjectId().toString();

                resolve(createToken(
                    id,
                    userIdOrGroups,
                    type,
                    options,
                    `${id}${tail.toString('hex')}`
                ));
            }
        });
    });
}

module.exports = mongodbTokenFactory;
