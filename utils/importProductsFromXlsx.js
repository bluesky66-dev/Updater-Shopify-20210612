var axios = require('axios');
require('dotenv').config();
var XLSX = require('xlsx');
const fs = require('fs');
const Shopify = require('shopify-api-node');
const IMAGE_SERVER = 'https://blueskydev.000webhostapp.com/';

const {
    apiKey_source,
    apiSecret_source,
    apiKey_dest,
    apiSecret_dest,
    destinationURL,
    sourceURL
} = process.env;

const EXCEL_FILE = 'Products/20210612/adjusted_size.xlsx';
const SHEET_INDEX = 8;
const SHEET_LENGTH = 294;
const IMAGE_DIR_BASE = '20210612/LEATHER JACKETS';

const CAT_INDEX = 'A';
const TITLE_INDEX = 'L';
const HTML_INDEX = 'M';

const OPTION1_INDEX = 'C';
const OPTION2_INDEX = 'B';
const ALI_CODE_INDEX = 'D';
const MODEL_INDEX = 'E';

const SKU_INDEX = 'F';
const BARCODE_INDEX = 'K';

const COST_PER_INDEX = 'N';
const PRICE_INDEX = 'O';
const COMPARE_AT_INDEX = 'P';

const MEDIA1_INDEX = 'G';
const MEDIA2_INDEX = 'H';
const MEDIA3_INDEX = 'I';
const MEDIA4_INDEX = 'J';

const DELIVERY_INDEX = 'Q';
const STOCK_IN_INDEX = 'R';
const WEIGHT_INDEX = 'S';
const HS_CODE_INDEX = 'T';
const VENDOR_INDEX = 'V';

const importProducts = async (sourceURL, destinationURL, authSource, authDest) => {
    console.log('====READING PRODUCTS FROM xlsx file====');
    try {
        const productData = await getProducts(destinationURL, authDest);
        productData ? console.log('Product Data Fetched ' + productData.length) : console.log('Error occured, no products!');

        // const productTitle = 12;
        const productTitle = await checkProductData(destinationURL, authDest, productData);
        return typeof productTitle == 'number' ? 'Successfully imported ' + productTitle + ' products' : 'Error occured: ' + productTitle;
    } catch (err) {
        console.log(err);
    }
}
// NOTE: Once the return is called, the loop ends. You CAN'T use return in a FOR LOOP!!
const checkProductData = async (storeURL, auth, productData) => {
    const productTitlesDest = [];
    for (let i = 0; i < productData.length; i++) {
        console.log(`=== Adding product === ${i}`)
        if (!productData[i] || Object.keys(productData[i]).length === 0) continue;
        const productTitle = await postProducts(storeURL, auth, productData, i);
        productTitlesDest.push(productTitle);
        // break;
    }
    return productTitlesDest != '' ? productTitlesDest.length : 'Products already imported';
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
const postProducts = async (storeURL, auth, productsSource, i) => {
    let data = {};
    console.log(`=== Products Images === ${productsSource[i].images.length}`);
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
          .create(productsSource[i]);
    } catch (e) {
        fs.writeFile(`files/payload-${i}.json`, JSON.stringify(productsSource[i]), err => {
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
const getProducts = async (storeURL, auth) => {
    console.log('===Reading Products===');
    var workbook = XLSX.readFile(EXCEL_FILE);
    var first_sheet_name = workbook.SheetNames[SHEET_INDEX];
    var worksheet = workbook.Sheets[first_sheet_name];
    const products = [];
    let preTitle = '';
    let preCat = '';
    let preHtmlBody = '';
    let product = {};
    for (let i = 2; i <= SHEET_LENGTH; i++) {
        console.log(`===Reading Products === ${i}`);
        const category = worksheet[`${CAT_INDEX}${i}`]?.v.trim();
        const title = worksheet[`${TITLE_INDEX}${i}`]?.v;
        const htmlBody = worksheet[`${HTML_INDEX}${i}`]?.v;
        const deliveryTime = worksheet[`${DELIVERY_INDEX}${i}`]?.v;
        const vendor = worksheet[`${VENDOR_INDEX}${i}`]?.v;
        const aliCode = worksheet[`${ALI_CODE_INDEX}${i}`]?.v;
        if (!title && !category) continue;

        if (preTitle === title && preCat === category && preHtmlBody === htmlBody) {
            product = getProductsVariants(worksheet, product, i);
            const productImages = await getProductsImages(worksheet, i);
            product.images = product.images.concat(productImages);
        } else {
            if (Object.keys(product).length > 0) {
                if (product.images.length === 0) delete product.images;
                if (product.metafields.length === 0) delete product.metafields;
                product.options = product.options.filter((option, i) => {
                    return option.values.length > 0;
                })

            }
            if (Object.keys(product).length > 0) {
                product.images = removeAllDuplicates(product.images);
                products.push(product);
            }

            product = {};
            product.images = [];
            product.options = [
                {
                    "name": "Color",
                    "values": []
                },
                {
                    "name": "Size",
                    "values": []
                }
            ];
            product.variants = [];
            product.metafields = [];

            preTitle = title;
            preCat = category;
            preHtmlBody = htmlBody;

            product.title = title;
            product.status = 'active';
            product.body_html = htmlBody;
            product.vendor = vendor;
            const categories = category.split('-');
            product.product_type = categories[0].trim();
            product.tags = [categories[0].trim()];
            if (categories[1] !== undefined) {
                product.tags.push(categories[1].trim())
            }

            product = getProductsVariants(worksheet, product, i);

            if (deliveryTime) {
                product.metafields.push({
                    "key": "delivery_time",
                    "value": deliveryTime,
                    "value_type": "string",
                    "namespace": getMetaNamespace(product.product_type)
                })
                product.metafields.push({
                    "key": "ali_code",
                    "value": aliCode,
                    "value_type": "string",
                    "namespace": getMetaNamespace(product.product_type)
                })
            }

            const productImages = await getProductsImages(worksheet, i);
            product.images = product.images.concat(productImages);
        }
    }
    if (Object.keys(product).length > 0) {
        if (product.images.length === 0) delete product.images;
        if (product.metafields.length === 0) delete product.metafields;
        product.options = product.options.filter((option, i) => {
            return option.values.length > 0;
        })
    }
    product.images = removeAllDuplicates(product.images);
    products.push(product);
    fs.writeFile('files/putting-product.json', JSON.stringify(products), err => {
        if (err) {
            console.error(err)
            return
        }
        //file written successfully
    })
    return products
}

const getProductsVariants = (worksheet, product, i) => {
    const option1 = worksheet[`${OPTION1_INDEX}${i}`]?.v;
    const option2 = worksheet[`${OPTION2_INDEX}${i}`]?.v;
    // const option3 = worksheet[`${MODEL_INDEX}${i}`]?.v;
    const sku = worksheet[`${SKU_INDEX}${i}`]?.v;
    const barcode = worksheet[`${BARCODE_INDEX}${i}`]?.v;

    const costPerItem = worksheet[`${COST_PER_INDEX}${i}`]?.v;
    const price = worksheet[`${PRICE_INDEX}${i}`]?.v;
    const compareAtPrice = worksheet[`${COMPARE_AT_INDEX}${i}`]?.v;
    const inventoryQuantity = worksheet[`${STOCK_IN_INDEX}${i}`]?.v;

    const weight = worksheet[`${WEIGHT_INDEX}${i}`]?.v;
    const hsCode = worksheet[`${HS_CODE_INDEX}${i}`]?.v;

    if (product.options[0].values.indexOf(option1) < 0) {
        if (option1) product.options[0].values.push(option1);
    }
    if (product.options[1].values.indexOf(option2) < 0) {
        if (option2) product.options[1].values.push(option2);
    }
    // if (product.options[2].values.indexOf(option3) < 0) {
    //     if (option3) product.options[2].values.push(option3);
    // }

    product.variants.push({
        option1: option1,
        option2: option2,
        // option3: option3,
        price: price,
        sku: sku,
        barcode: barcode,
        compare_at_price: compareAtPrice,
        cost: costPerItem,
        weight: weight,
        inventory_quantity: inventoryQuantity,
    })
    return product;
}

const getMetaNamespace = (value) => {
    return value.toLowerCase().replace(/[^a-zA-Z ]/g, "").replace(' ', '_')
}

const getProductsImages = async (worksheet, i) => {
    const images = [];
    const productImages = [];
    const media1 = worksheet[`${MEDIA1_INDEX}${i}`]?.v;
    const media2 = worksheet[`${MEDIA2_INDEX}${i}`]?.v;
    const media3 = worksheet[`${MEDIA3_INDEX}${i}`]?.v;
    const media4 = worksheet[`${MEDIA4_INDEX}${i}`]?.v;
    // const media5 = worksheet[`H${i}`]?.v;
    // const media6 = worksheet[`I${i}`]?.v;
    // const media7 = worksheet[`J${i}`]?.v;

    if (media1) images.push(media1);
    if (media2) images.push(media2);
    if (media3) images.push(media3);
    if (media4) images.push(media4);
    // if (media5) images.push(media5);
    // if (media6) images.push(media6);
    // if (media7) images.push(media7);

    for (let m = 0; m < images.length; m++){
        try {
            const imagePath1 = `${IMAGE_DIR_BASE}/${images[m]}.jpg`;
            const imagePath2 = `${IMAGE_DIR_BASE}/${images[m]}.png`;

            if (fs.existsSync(`Products/${imagePath1}`)) {
                productImages.push({
                    src: IMAGE_SERVER + imagePath1
                });
            }
            if (fs.existsSync(`Products/${imagePath2}`)) {
                productImages.push({
                    src: IMAGE_SERVER + imagePath2
                });
            }
        } catch (e) {
        }
    }

    return productImages;
}

const addslashes = (str) => {
    return (str + '').replace(/[\\"']/g, '\\$&').replace(/\u0000/g, '\\0');
}

const removeAllDuplicates = (arr) => {
    if (!arr) return [];

    const obj = {};
    const newArr = [];

    for (let i = 0; i < arr.length; i++){
        obj[arr[i].src] = arr[i];
    }
    for ( let key in obj )
        newArr.push(obj[key]);

    return newArr;
}
module.exports = importProducts;
