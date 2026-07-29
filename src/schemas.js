const { z } = require("zod");
const { MAX_URL_SIZE } = require("./constants");

const createUrlSchema = z.object({
    url: z.string().url().min(1).max(MAX_URL_SIZE),
});

const envSchema = z.object({
    PORT: z.string().default("5000"),
    HOST: z.string().default("0.0.0.0"),
    AWS_REGION: z.string().default("us-east-1"),
    DYNAMODB_ENDPOINT: z.string().default("http://dynamodb:8000"),
    DYNAMOBDB_MAX_ATTEMPS: z.number().default(3),
    AWS_ACCESS_KEY_ID: z.string().default("local"),
    AWS_SECRET_ACCESS_KEY: z.string().default("local")
});

module.exports = {
    createUrlSchema,
    envSchema
}