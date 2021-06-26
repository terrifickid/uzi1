//var M = require('mongodb');
//ObjectID = M.ObjectID;
//const MongoClient = M.MongoClient;
const Alpaca = require('@alpacahq/alpaca-trade-api');
//var Decimal = require('decimal.js');
//var timeseries = require("timeseries-analysis");
//import { ma, dma, ema, sma, wma } from 'moving-averages';
const redis = require("redis");
const { promisify } = require("util");
const client = redis.createClient();
client.on("error", function(error) {
  console.error(error);
});
const lpush = promisify(client.lpush).bind(client);

/////////////////////////////////////////////////////////////////////////////
var alpaca = new Alpaca({
  keyId: 'PKBUNXWPBRSXGWTIY9G9',
  secretKey: '5WDrbVKMPgPGee1eZdyGbGaaPZQAHT6odOtpmWjh',
  paper: true,
  usePolygon: false
});
/////////////////////////////////////////////////////////////////////////////
const tradeApi = alpaca.data_ws;
tradeApi.onConnect(function() {
  console.log("Trade API Connected")
  tradeApi.subscribe(['alpacadatav1/T.TSLA']);
});
tradeApi.onDisconnect(() => {
  console.log("Trade API Disconnected");
  process.exit(1);
})
/////////////////////////////////////////////////////////////////////////////
const execApi = alpaca.trade_ws;
execApi.onConnect(function () {
  console.log("Exec API Connected")
  execApi.subscribe(['trade_updates']);
  tradeApi.connect();
});
execApi.onDisconnect(() => {
  console.log("Exec API Disconnected");
    process.exit(1);
});
//////// HEART
///////////////////////////////////////////////////////////////////////////////
tradeApi.onStockTrades(async function(subject, data) {
  //values.push( parseFloat(data.price) );

  lpush('trades',data.price);

  console.log(data.size, data.price);


});






/////////////////////////////////////////////////////////////////////////////
(async function() {

  try {
    console.log('init...');
    await execApi.connect();
    alpaca.cancelAllOrders();


  } catch (err) {
    console.log(err);
  }

})();
