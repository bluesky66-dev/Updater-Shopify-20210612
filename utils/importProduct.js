var axios = require('axios');
require('dotenv').config();
var XLSX = require('xlsx');
const fs = require('fs');
const Shopify = require('shopify-api-node');

const {
    apiKey_source,
    apiSecret_source,
    apiKey_dest,
    apiSecret_dest,
    destinationURL,
    sourceURL
} = process.env;

const importProduct = async (sourceURL, destinationURL, authSource, authDest) => {
    console.log('==== Import Product ====');
    try {
        const product = {};
        const productTitle = await postProducts(destinationURL, authDest, product);
        return typeof productTitle == 'number' ? 'Successfully imported ' + productTitle + ' products' : 'Error occured: ' + productTitle;
    } catch (err) {
        console.log(err);
    }
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

const postProducts = async (storeURL, auth, productSource) => {
    let data = {};
    console.log(`=== Products Images === ${productSource?.images?.length}`);
    // return data ? data : 'An error occured';
    const shopify = new Shopify({
        shopName: destinationURL,
        apiKey: apiKey_dest,
        password: apiSecret_dest,
        timeout: 60000 * 60,
    });
    // return data ? data : 'An error occured';
    try {
        data = await shopify.product
          .create(productSource);
    } catch (e) {
        fs.writeFile(`files/payload-product.json`, JSON.stringify(productSource), err => {
            if (err) {
                console.error(err)
                return
            }
            //file written successfully
        })
        console.log(e.message)
    }
    await sleep(100);
    return data ? data : 'An error occured';
}

module.exports = importProduct;
