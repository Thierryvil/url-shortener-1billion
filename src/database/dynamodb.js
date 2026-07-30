const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient } = require("@aws-sdk/lib-dynamodb");
const { env } = require("../config");

const rawDynamoClient = new DynamoDBClient({
    region: env.AWS_REGION,
    maxAttempts: env.DYNAMODB_MAX_ATTEMPTS,
    endpoint: env.DYNAMODB_ENDPOINT,
    credentials: {
        accessKeyId: env.AWS_ACCESS_KEY_ID,
        secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
    },
});

const dynamodb = DynamoDBDocumentClient.from(rawDynamoClient, {
    marshallOptions: {
        removeUndefinedValues: true,
    },
})

module.exports = {
    rawDynamoClient,
    dynamodb
};