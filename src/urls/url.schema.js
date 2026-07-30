const { z } = require("zod");
const { MAX_URL_SIZE } = require("../utils/constants");

const createUrlSchema = z.object({
    url: z.string().url().min(1).max(MAX_URL_SIZE),
});

module.exports = {
    createUrlSchema
}