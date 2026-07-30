const { envSchema } = require("./config.schema");

const env = envSchema.parse(process.env);

module.exports = {
    env
}