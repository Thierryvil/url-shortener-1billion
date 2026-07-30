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
    AWS_ACCESS_KEY_ID: z.string().default("local"),
    AWS_SECRET_ACCESS_KEY: z.string().default("local"),
    REDIS_URL: z.string().default("redis://redis:6379"),
    DYNAMODB_MAX_ATTEMPTS: z.coerce.number().int().positive().default(3),
    MAX_CREATION_URL_TRIES: z.coerce.number().int().positive().default(5),
    PUBLIC_BASE_URL: z.string().url().default("http://url-shortener.to"),
});

module.exports = {
    createUrlSchema,
    envSchema
}