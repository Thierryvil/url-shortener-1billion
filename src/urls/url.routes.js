const HyperExpress = require('hyper-express');
const { logger } = require('../logger');
const urlRepository = require('./url.repository');
const { createUrl } = require('./url.service');
const { createUrlSchema } = require('./url.schema');

function createUrlRouter({ cache, repository = urlRepository }) {
    const router = new HyperExpress.Router();

    router.post('/api/v1/urls', async (request, response) => {
        const { error, data } = createUrlSchema.safeParse(await request.json());

        if (error) {
            return response.status(400).json({ error: { message: "INVALID_URL" } });
        }

        try {
            const result = await createUrl(repository, data.url);

            if (result.error) {
                return response.status(503).json({ error: { message: result.message } });
            }

            return response.status(201).json(result.url);
        } catch (error) {
            logger.error({ error }, 'Failed to create URL');
            return response.status(503).json({ error: { message: "IMPOSSIBLE_TO_SAVE_URL" } });
        }
    });

    router.get('/:code', async (request, response) => {
        const { code } = request.params;

        if (!code) {
            return response.status(400).json({ error: { message: "INVALID_CODE" } });
        }

        let cachedUrl = null;

        try {
            cachedUrl = await cache.get(code);
        } catch (error) {
            logger.warn({ error, code }, 'Failed to retrieve URL from Redis');
        }

        if (cachedUrl) {
            return response.redirect(cachedUrl);
        }

        let mapping;

        try {
            mapping = await repository.findUrlMappingByCode(code);
        } catch (error) {
            logger.error({ error, code }, 'Failed to retrieve URL from DynamoDB');
            return response.status(503).json({ error: { message: "IMPOSSIBLE_TO_RETRIEVE_URL" } });
        }

        if (!mapping) {
            return response.status(404).json({ error: { message: "URL_NOT_FOUND" } });
        }

        cache.set(code, mapping.original_url, 3600).catch((error) => {
            logger.warn({ error, code }, 'Failed to store URL in Redis');
        });

        return response.redirect(mapping.original_url);
    });

    return router;
}

module.exports = { createUrlRouter };
