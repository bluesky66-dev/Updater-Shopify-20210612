var axios = require('axios');
require('dotenv').config();
var XLSX = require('xlsx');
const fs = require('fs');

const EXCEL_FILE = 'Products/20210612/adjusted_size.xlsx';
const SHEET_INDEX = 11;
const SHEET_LENGTH = 514;
const VENDOR = 'Mountainskin Official Store';

const CAT_INDEX = 'A';
const TITLE_INDEX = 'L';
const HTML_INDEX = 'M';

const OPTION1_INDEX = 'C';
const OPTION2_INDEX = 'B';

const MEDIA_INDEX = 'G';

// Dev Store
const COLLECTION_ID = 270126481573;

// Live Store
// const COLLECTION_ID = 269641089195;

const updateProducts = async (sourceURL, destinationURL, authSource, authDest) => {
    console.log('====READING PRODUCTS FROM xlsx file====');
    try {
        const productSource = await getProductsFromUrl(sourceURL, authSource);
        const productDest = await getProductsFromExcel(destinationURL, authDest);
        console.log('Product Data Fetched ' + productSource.products.length)
        // fs.writeFile(`files/productSource.json`, JSON.stringify(productSource), err => {
        // })
        // fs.writeFile(`files/productDest.json`, JSON.stringify(productDest), err => {
        // })

        const productData = [productSource, productDest];
        // const productTitle = 12;
        const productTitle = await checkProductData(destinationURL, authDest, productData);
        return typeof productTitle == 'number' ? 'Successfully imported ' + productTitle + ' products' : 'Error occured: ' + productTitle;
    } catch (err) {
        console.log(err);
    }
}
// NOTE: Once the return is called, the loop ends. You CAN'T use return in a FOR LOOP!!
const checkProductData = async (storeURL, auth, productData) => {
    const productsSource = productData[0].products;
    const productsDest = productData[1];
    const productTitlesDest = [];

    const postProducts = [];

    for (let i = 0; i < productsSource.length; i++) {
        if (!productsSource[i] || Object.keys(productsSource[i]).length === 0) continue;
        const { id, title, product_type, variants, images, body_html } = productsSource[i];
        console.log(`=== Updating product === ${i} === ${id}`);

        const dProducts = productsDest.filter((item) => {
            // if (title !== item.title && product_type === item.product_type && removeALLTags(body_html) !== removeALLTags(item.body_html)){
            //     console.log('=== d ===', removeALLTags(item.body_html))
            //     console.log('=== s ===', removeALLTags(body_html))
            // }

            return title === item.title
              && product_type === item.product_type
              && variants.length === item.variants.length;
        });
        if (dProducts.length < 1) {
            fs.writeFile(`files/dProducts-${id}.json`, JSON.stringify(dProducts), err => {
            })
            fs.writeFile(`files/sProducts-${id}.json`, JSON.stringify(productsSource[i]), err => {
            })
            // break;
            // console.log(`***** ERROR ERROR ERROR ERROR ERROR ERROR ERROR ***** Not Found Products`)
            continue;
        }

        const product = { id, variants: [] };
        for (let j = 0; j < variants.length; j++){
            const { id: variantId, option1, option2, image_id } = variants[j];
            if (image_id) {
                product.variants.push({
                    id: variantId
                });
                continue;
            }
            const dVariant = dProducts[0].variants.filter((item) => {
                return `${option1}`.trim() === item.option1.trim()
                  && `${option2}` === `${item.option2}`.trim()
            })
            if (dVariant.length < 1) continue;

            const sImage = images.filter((item) => {
                const { image } = dVariant[0];
                return item.src.indexOf(image) !== -1
            })

            if (sImage.length > 0) {
                product.variants.push({
                    id: variantId,
                    image_id: sImage[0].id,
                });
            }
        }

        if (product.variants.length !== variants.length) {
            // fs.writeFile(`files/product-${id}-d.json`, JSON.stringify(dProducts), err => {
            // })
            // fs.writeFile(`files/product-${id}-s.json`, JSON.stringify(productsSource[i]), err => {
            // })
            // console.log(`***** ERROR ERROR ERROR ERROR ERROR ***** ${product.variants.length} ***** ${variants.length}` )
            // break;
            // console.log(`***** ERROR ERROR ERROR ERROR ERROR ***** ${variants.length} ***** ${product.variants.length}` )
            continue;
        }

        postProducts.push(product)
        // break;
    }
    console.log('================================================================================================================================================================================================================================')
    console.log('======== postProducts Length =====================', postProducts.length)
    for (const productElement of postProducts) {
        console.log(`=== Updating Product === ${productElement.id}`);
        const productTitle = await putProduct(storeURL, auth, productElement);
        productTitlesDest.push(productTitle);
    }
    return productTitlesDest !== '' ? productTitlesDest.length : 'Products already imported';
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

const getProductsFromUrl = async (storeURL, auth) => {
    console.log('===Fetching Products===');
    var config = {
        method: 'get',
        url: `https://${storeURL}.myshopify.com/admin/api/2021-01/products.json?limit=250&fields=id,title,body_html,product_type,images,variants&collection_id=${COLLECTION_ID}&vendor=${VENDOR}`,
        // url: `https://${storeURL}.myshopify.com/admin/api/2021-01/products.json?limit=250&fields=id,title,body_html,product_type,images,variants&collection_id=${COLLECTION_ID}`,
        headers: {
            'Authorization': auth,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        }
    }
    const products = await axios(config)
      .then(response => response.data)
      .catch(errors => errors);
    return products
}

const putProduct = async (storeURL, auth, product) => {
    let payload = JSON.stringify({
        "product": product
    });


    let config = {
        method: 'put',
        url: `https://${storeURL}.myshopify.com/admin/api/2021-01/products/${product.id}.json`,
        headers: {
            'Authorization': auth,
            'Content-Type': 'application/json',
        },
        data: payload
    }

    const data = await axios(config)
      .then(response => response.data)
      .catch(errors => console.log(JSON.stringify(errors)));
    await sleep(200);
    return data ? data : 'An error occured';
}

const getProductsFromExcel = async (storeURL, auth) => {
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

        if (!title && !category) continue;

        if (preTitle === title && preCat === category && preHtmlBody === htmlBody) {
            product = getProductsVariants(worksheet, product, i);
        } else {
            if (Object.keys(product).length > 0) {
                products.push(product);
            }
            product = {};
            product.variants = [];

            preTitle = title;
            preCat = category;
            preHtmlBody = htmlBody;

            product.title = title;
            product.status = 'active';
            product.body_html = htmlBody;
            const categories = category.split('-');
            product.product_type = categories[0].trim();

            product = getProductsVariants(worksheet, product, i);
        }
    }
    products.push(product);
    return products
}

const getProductsVariants = (worksheet, product, i) => {
    const option1 = worksheet[`${OPTION1_INDEX}${i}`] ? worksheet[`${OPTION1_INDEX}${i}`].v : null;
    const option2 = worksheet[`${OPTION2_INDEX}${i}`] ? worksheet[`${OPTION2_INDEX}${i}`].v : null;

    const media = worksheet[`${MEDIA_INDEX}${i}`]?.v;

    product.variants.push({
        option1: option1,
        option2: option2,
        image: media.replace(' ', '_'),
    })
    return product;
}

const removeALLTags = (str) => {
    return str.replace(/(<p[^>]+?>|<p>|<\/p>)/img, "").replace(/(<br[^>]+?>|<br>|<\/br>)/img, "").replace(/[^a-zA-Z]+/g, '');
}

module.exports = updateProducts;
