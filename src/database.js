const mongoose = require('mongoose');
const { mongoose: mongooseConfig } = require('./config.json');
const { TOPIC } = require('./models/topic');
const { ENDPOINT } = require('./models/endpoint');
const { uri, database, options } = mongooseConfig;

let connection;

async function connect() {
    await mongoose.connect(`${uri}/${database}`, options);

    connection = mongoose.connection;
    connection.on('error', console.error.bind(console, 'connection error:'));
}

function verifyConnected() {
    if (!connection) {
        throw new Error('Cannot make database requets without being connected');
    }
}

async function getTopicByName(topicName) {
    verifyConnected();

    if (typeof topicName !== 'string') {
        return null;
    }

    return TOPIC.findOne({
        name: topicName
    });
}

async function getTopicByCommunityID(communityID) {
    verifyConnected();

    if (typeof communityID !== 'string') {
        return null;
    }

    return TOPIC.findOne({
        community_id: communityID
    });
}

async function getDiscoveryHosts() {
    verifyConnected();
    return ENDPOINT.findOne({
        version: 1
    });
}

async function getServerConfig() {
    verifyConnected();
    return ENDPOINT.findOne({
        type: "config"
    });
}

module.exports = {
    connect,
    getTopicByName,
    getTopicByCommunityID,
    getDiscoveryHosts,
    getServerConfig
};