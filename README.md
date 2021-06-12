# Shopify Storecloner Script

This script uses the [Shopify Admin API](https://shopify.dev/docs/admin-api) to clone the following resources:

1) Blogs
2) Pages*
3) Products**

## Installing
```
$ npm install
```
```
$ npm start
```
## Prerequisites 
This script requires a process.env file on the root folder to retreive the API Key and API Secret as shown below:
```
apiKey_source = 'YOUR SOURCE API KEY'
apiSecret_source = 'YOUR SOURCE API SECRET'
apiKey_dest = 'YOUR DESTINATION API KEY'
apiSecret_dest = 'YOUR DESTINATION API SECRET'
sourceURL = 'YOUR SOURCE URL'
destinationURL = 'YOUR DESTINATION URL'
```
See [dotenv](https://www.npmjs.com/package/dotenv) and [how to get API keys and secrets](https://duplicate-shopify-app.herokuapp.com/credentials) for more info.


## main.js
Using [Axios](https://github.com/axios/axios), this script first sends a GET request to the endpoint [https://{storeURL}.myshopify.com/admin/api/2021-01/{resource}.json](https://{storeURL}.myshopify.com/admin/api/2021-01/{resource}.json) (hardcoded into the URL parameter for now).

After successful retrieval all the resources, it sends a POST request to the endpoint [https://{storeURL}.myshopify.com/admin/api/2021-01/{resource}.json](https://{storeURL}.myshopify.com/admin/api/2021-01/{resource}.json). A successful POST request will respond with status code = 201.


Example of a GET resquest response:
```javascript
{
  blogs: [{
    id: 76612534453,
    handle: 'news-11',
    title: 'News',
    updated_at: '2021-02-15T04:45:09-05:00',
    feedburner_location: null,
    created_at: '2021-02-15T04:45:09-05:00',
    template_suffix: null,
    admin_graphql_api_id: 'gid://shopify/OnlineStoreBlog/76612534453'
  }]
}
```
This data is taken from the sourceURL and posted to the destURL in a forloop for the length of the resource array.

Example result:
```
====DUPLICATING PAGES====
===Fetching Pages===
===Fetching Pages===
Page Data Fetched
===Posting 1 of 36 Pages===
===Posting 2 of 36 Pages===
===Posting 3 of 36 Pages===
```

## Deleting resources
```
npm run delete
```
Deletes all the resources on the destination store incase anything goes wrong and a reset is needed. 

Edit which resources gets deleted by changing the args in [deleteResource.js](./utils/deleteScript/deleteResource.js)
```javascript
main(['pages','blogs']).then(console.log);
```

## DISCLAIMER
I have found (rather embarassingly 🤦) that there exists [shopify-api-node](https://www.npmjs.com/package/shopify-api-node) which basically eliminates the need for Axios, but rather creates an instance to do exactly what's done here in cleaner code. I will be spending sometime reading the docs and porting over my code to implement this package instead. 

## Future Improvements

Future developments include embedding this script into a public Shopify app via [Shopify App Bridge](https://shopify.dev/tools/app-bridge), allowing a user to import resources through a familar UI like [Polaris](https://polaris.shopify.com/). 

*Shops that use Gempages need to import the theme.zip manually before importing the pages as the POST request is reliant on Gempage templates.

**There are some issues with variant images (undefined image_ids during posting) which results in an error: 422
To resolve this, I eliminated the image_ids from product variants. 
