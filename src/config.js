const { envSchema } = require("./schemas");

const env = envSchema.parse(process.env);

module.exports = {
    env
}