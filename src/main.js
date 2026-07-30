const HyperExpress = require('hyper-express');
const { generateBase62 } = require('./utils');
const { createUrlSchema } = require('./schemas');
const { env } = require('./config');
const { logger } = require('./logger')
const { dynamodb } = require('./database/dynamodb');
const { PutCommand, GetCommand } = require('@aws-sdk/lib-dynamodb');
const { RedisCache } = require('./cache/redis');

const redis = new RedisCache();

redis.connect().then(() => {
    logger.info('Connected to Redis');
}).catch((error) => {
    logger.error('Failed to connect to Redis:', error);
    process.exit(1);
});

const webserver = new HyperExpress.Server();

webserver.get('/health', async (request, response) => {
    response.json({ status: 'ok' }).status(200);
});

webserver.get('/:code', async (request, response) => {
    const { code } = request.params;

    if (!code) {
        return response.json({ error: { message: "INVALID_CODE" } }).status(400)
    }

    const isCodeCached = await redis.get(code)

    if (isCodeCached) {
        return response.redirect(isCodeCached).status(302);
    }

    const result = await dynamodb.send(
        new GetCommand({
            TableName: 'url_mappings',
            Key: { code },
            ConsistentRead: true,
        }),
    );

    if (!result.Item) {
        return response.json({ error: { message: "URL_NOT_FOUND" } }).status(404)
    }

    await redis.set(code, result.Item.original_url, 3600);

    response.redirect(result.Item.original_url).status(302);
})

webserver.post('/api/v1/urls', async (request, response) => {
    const { error, success, data } = createUrlSchema.safeParse(await request.json());

    if (error) {
        return response.json({ error: { message: "INVALID_URL" } }).status(400);
    }

    const { url } = data

    const code = generateBase62();

    const mapping = {
        code,
        short_url: `http://localhost/${code}`,
        original_url: url,
        created_at: Math.floor(Date.now() / 1000),
    }

    try {
        await dynamodb.send(
            new PutCommand({
                TableName: 'url_mappings',
                Item: mapping,
                ConditionExpression: "attribute_not_exists(#code)",
                ExpressionAttributeNames: {
                    "#code": "code",
                },
            }),
        );
    } catch (error) {
        logger.error(error);
        response.json({ error: { message: "IMPOSSIBLE_TO_SAVE_URL" } }).status(500)
        return
    }


    response
        .json(mapping)
        .status(201);
})

webserver.listen(env.PORT, env.HOST)
    .then((socket) => logger.info(`Webserver started on ${env.HOST} at port ${env.PORT}`))
    .catch((error) => logger.error(`Failed to start webserver on ${env.HOST} at port ${env.PORT}`))
    .finally(() => {
        process.on('SIGINT', async () => {
            logger.info('Received SIGINT. Shutting down gracefully...');
            await redis.disconnect();
        });
    });