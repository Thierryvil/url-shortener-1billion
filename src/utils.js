const { BASE62_LENGTH } = require("./constants");

const BASE62_ALPHABET = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";

function generateBase62(length = BASE62_LENGTH) {
    const randomValues = new Uint8Array(length);
    crypto.getRandomValues(randomValues);

    let result = '';
    for (let i = 0; i < length; i++) {
        result += BASE62_ALPHABET[randomValues[i] % BASE62_ALPHABET.length];
    }
    return result;
}


module.exports = {
    generateBase62
}