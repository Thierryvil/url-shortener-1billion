const { createClient } = require("redis");
const { env } = require("../config");

class RedisCache {
    constructor() {
        this.client = createClient({
            url: env.REDIS_URL
        });
    }

    async connect() {
        await this.client.connect();
    }

    async disconnect() {
        await this.client.disconnect();
    }

    async set(key, value, expirationInSeconds) {
        await this.client.set(key, value, {
            EX: expirationInSeconds
        });
    }

    async get(key) {
        return await this.client.get(key);
    }
}


module.exports = { RedisCache };