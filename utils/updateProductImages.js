var axios = require('axios');
require('dotenv').config();
var XLSX = require('xlsx');
const fs = require('fs');
const IMAGE_SERVER = 'https://blueskydev.000webhostapp.com/';

const EXCEL_FILE = 'Products/20210612/adjusted_size.xlsx';
const SHEET_INDEX = 6;
const SHEET_LENGTH = 273;
const IMAGE_DIR_BASE = '20210612/HOODIES-SWEATERS';
// const VENDOR = 'Mountainskin Official Store';

const CAT_INDEX = 'A';
const TITLE_INDEX = 'K';
const HTML_INDEX = 'L';

const OPTION1_INDEX = 'C';
const OPTION2_INDEX = 'B';

const MEDIA1_INDEX = 'G';
const MEDIA2_INDEX = 'H';
const MEDIA3_INDEX = 'I';

// Dev Store
// const COLLECTION_ID = 270106362021;

// Live Store
const COLLECTION_ID = 266911645867;

const updateProductImages = async (sourceURL, destinationURL, authSource, authDest) => {
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
            // fs.writeFile(`files/dProducts-${id}.json`, JSON.stringify(dProducts), err => {
            // })
            // fs.writeFile(`files/sProducts-${id}.json`, JSON.stringify(productsSource[i]), err => {
            // })
            // break;
            // console.log(`***** ERROR ERROR ERROR ERROR ERROR ERROR ERROR ***** Not Found Products`)
            continue;
        }

        const product = { id, images: [] };
        const dImages = dProducts[0].images;
        if (images.length !== dImages.length) {
            for (const dImage of dImages ) {
                const sImage = images.filter((item) => {
                    return item.src.indexOf(dImage.filename) !== -1
                })
                if (sImage.length > 0) {
                    product.images.push({
                        "id": sImage[0].id
                    })
                } else {
                    product.images.push({
                        "src": dImage.src
                    })
                }
            }

            if (product.images.length !== dImages.length) {
                fs.writeFile(`files/images-${id}-d.json`, JSON.stringify(dProducts), err => {
                })
                fs.writeFile(`files/images-${id}-s.json`, JSON.stringify(productsSource[i]), err => {
                })
                continue;
            }

            postProducts.push(product)
        }

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
        // url: `https://${storeURL}.myshopify.com/admin/api/2021-01/products.json?limit=250&fields=id,title,body_html,product_type,images,variants&collection_id=${COLLECTION_ID}&vendor=${VENDOR}`,
        url: `https://${storeURL}.myshopify.com/admin/api/2021-01/products.json?limit=250&fields=id,title,body_html,product_type,images,variants&collection_id=${COLLECTION_ID}`,
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
            const productImages = await getProductsImages(worksheet, i);
            product.images = product.images.concat(productImages);
        } else {
            if (Object.keys(product).length > 0) {
                if (product.images.length === 0) delete product.images;
            }
            if (Object.keys(product).length > 0) {
                product.images = removeAllDuplicates(product.images);
                products.push(product);
            }
            product = {};
            product.images = [];
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
            const productImages = await getProductsImages(worksheet, i);
            product.images = product.images.concat(productImages);
        }
    }
    if (Object.keys(product).length > 0) {
        if (product.images.length === 0) delete product.images;
    }
    product.images = removeAllDuplicates(product.images);
    products.push(product);
    return products
}

const getProductsVariants = (worksheet, product, i) => {
    const option1 = worksheet[`${OPTION1_INDEX}${i}`] ? worksheet[`${OPTION1_INDEX}${i}`].v : null;
    const option2 = worksheet[`${OPTION2_INDEX}${i}`] ? worksheet[`${OPTION2_INDEX}${i}`].v : null;

    product.variants.push({
        option1: option1,
        option2: option2,
    })
    return product;
}


const getProductsImages = async (worksheet, i) => {
    const images = [];
    const productImages = [];
    const media1 = worksheet[`${MEDIA1_INDEX}${i}`]?.v;
    const media2 = worksheet[`${MEDIA2_INDEX}${i}`]?.v;
    const media3 = worksheet[`${MEDIA3_INDEX}${i}`]?.v;
    // const media4 = worksheet[`G${i}`]?.v;
    // const media5 = worksheet[`H${i}`]?.v;
    // const media6 = worksheet[`I${i}`]?.v;
    // const media7 = worksheet[`J${i}`]?.v;

    if (media1) images.push(media1);
    if (media2) images.push(media2);
    if (media3) images.push(media3);
    // if (media4) images.push(media4);
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
                    filename: images[m],
                    src: IMAGE_SERVER + imagePath2
                });
            }
        } catch (e) {
        }
    }

    return productImages;
}

const removeALLTags = (str) => {
    return str.replace(/(<p[^>]+?>|<p>|<\/p>)/img, "").replace(/(<br[^>]+?>|<br>|<\/br>)/img, "").replace(/[^a-zA-Z]+/g, '');
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

module.exports = updateProductImages;
