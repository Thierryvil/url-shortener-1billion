const { GetCommand, PutCommand } = require('@aws-sdk/lib-dynamodb');
const { dynamodb } = require('../database/dynamodb');

const tableName = 'url_mappings';

async function saveUrlMapping(data) {
    await dynamodb.send(
        new PutCommand({
            TableName: tableName,
            Item: data,
            ConditionExpression: "attribute_not_exists(#code)",
            ExpressionAttributeNames: {
                "#code": "code",
            },
        }),
    );
}

async function findUrlMappingByCode(code) {
    const result = await dynamodb.send(
        new GetCommand({
            TableName: tableName,
            Key: { code },
            ConsistentRead: true,
        }),
    );

    return result.Item ?? null;
}

module.exports = {
    findUrlMappingByCode,
    saveUrlMapping,
};
