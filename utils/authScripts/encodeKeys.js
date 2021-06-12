module.exports = function (apiKey, apiSecret) {
    var authConcat = apiKey + ':' + apiSecret
    var encoded = Buffer.from(authConcat).toString('base64')
    return  'Basic ' + encoded
}