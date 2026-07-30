const HyperExpress = require('hyper-express');
const { RedisCache } = require('./cache/redis');
const { logger } = require('./logger');
const { createUrlRouter } = require('./urls/url.routes');
const { env } = require('./config');

const redis = new RedisCache();

redis.connect().then(() => {
    logger.info('Connected to Redis');
}).catch((error) => {
    logger.error({ error }, 'Failed to connect to Redis');
});

const webserver = new HyperExpress.Server();

webserver.use('/', createUrlRouter({ cache: redis }));

webserver.get('/health', async (_request, response) => {
    response.status(200).json({ status: 'ok' });
});

webserver.listen(env.PORT, env.HOST)
    .then(() => logger.info(`Webserver started on ${env.HOST} at port ${env.PORT}`))
    .catch((error) => logger.error({ error }, `Failed to start webserver on ${env.HOST} at port ${env.PORT}`))
    .finally(() => {
        process.on('SIGINT', async () => {
            logger.info('Received SIGINT. Shutting down gracefully...');
            await redis.disconnect();
        });
    });
