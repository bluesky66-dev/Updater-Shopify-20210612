require('dotenv').config();
var encodeKeys = require('./utils/authScripts/encodeKeys');
var importProducts = require('./utils/importProductsFromXlsx');

// Retreives API keys from .env file
const {
    apiKey_source,
    apiSecret_source,
    apiKey_dest,
    apiSecret_dest,
    destinationURL,
    sourceURL
} = process.env;

async function main(){
    // Encodes the API keys in base64 to be used as Auth headers
    // var authSource = encodeKeys(apiKey_source, apiSecret_source);
    var authDest = encodeKeys(apiKey_dest, apiSecret_dest);

    //Tries to import the resources, catches errors
    try {
        const products = await importProducts(sourceURL,destinationURL,authSource,authDest);
        return [products];
    } catch (err) {
        console.log(err);
    }
}
main().then(console.log)
