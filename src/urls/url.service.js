const { ConditionalCheckFailedException } = require("@aws-sdk/client-dynamodb");
const { logger } = require("../logger");
const { generateBase62 } = require("../utils");
const { env } = require("../config");

function createShortUrl(code) {
    return `${env.PUBLIC_BASE_URL}/${code}`;
}

async function createUrl(repository, originalUrl) {
    for (let i = 0; i < env.MAX_CREATION_URL_TRIES; i++) {
        const code = generateBase62();

        const mapping = {
            code,
            short_url: createShortUrl(code),
            original_url: originalUrl,
            created_at: Math.floor(Date.now() / 1000),
        }

        try {
            await repository.saveUrlMapping(mapping);
            return { error: false, url: mapping }
        } catch (error) {
            logger.error(error);

            if (error instanceof ConditionalCheckFailedException) {
                logger.warn(`Code collision detected for code: ${code}. Retrying...`);
                continue;
            }

            return { error: true, message: "IMPOSSIBLE_TO_SAVE_URL" }
        }
    }

    return {
        error: true,
        message: 'IMPOSSIBLE_TO_GENERATE_CODE',
    };
}

module.exports = {
    createUrl,
}