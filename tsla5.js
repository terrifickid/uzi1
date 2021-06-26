var M = require('mongodb');
ObjectID = M.ObjectID;
const MongoClient = M.MongoClient;
const Alpaca = require('@alpacahq/alpaca-trade-api');
//var timeseries = require("timeseries-analysis");
//import { ma, dma, ema, sma, wma } from 'moving-averages';

var cAVG;
var signal;
var signals = [];
var exec;
var values = [];
var tradeGate = true;
var ivanMode = false;
var marketOrder = [];
var testbuy;
var testsell;
var filled = false;
//DB
const dbName = 'tsla';
const url = "mongodb+srv://tk:test123@data.owryg.gcp.mongodb.net/"+dbName+"?retryWrites=true&w=majority";
const client = new MongoClient(url, { useNewUrlParser: true, useUnifiedTopology: true});

//FRAME
var frame = 20;

/////////////////////////////////////////////////////////////////////////////

function t(p){
  if(cAVG < parseFloat(p)) return true;
  return false;
}

async function log(data = []){
  var output = '';
  for(item of data){
    output += String(item).padEnd(10) + ' ';
  }
  console.log(output);
}

function getAvg(grades) {
  const total = grades.reduce((acc, c) => acc + c, 0);
  return total / grades.length;
}

function round(value, decimals) {
      var val = Number(Math.round(value+'e'+decimals)+'e-'+decimals);
        if(isNaN(val)) return 0;
        return val;
    }

function getPercentageChange(ask, bid){
  if(!ask || !bid) return 0;
  ask = parseFloat(ask);
  bid = parseFloat(bid);

        var pc = [(bid - ask)/ask] * 100;
        if(pc == 'Infinity') return 0;
        return pc;
    }

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
  values.push( parseFloat(data.price) );
  if(values.length > frame) values.shift();
  if(values.length < frame) return;
  cAVG = round(getAvg(values), 2);
  ivan(t(data.price), data.price, data.size);


});

///////////////////////////////////////////////////////////////////////////////
execApi.onOrderUpdate(data => {
  console.log(data.event, data.order.type, data.order.side, data.order.limit_price, data.order.filled_avg_price);
  if(data.event == 'fill'){

    //LOG
    var time = new Date().getTime();
    if(data.order.side == 'buy' && !testbuy){
      filled = true;
      if(!testsell) execTrade(false, 'limit', 'gtc', parseFloat(data.order.filled_avg_price)+0.05);
      testbuy = data.order.filled_avg_price;
    }
    if(data.order.side == 'sell' && !testsell){
      filled = true;
      if(!testbuy)execTrade(true, 'limit', 'gtc', parseFloat(data.order.filled_avg_price)-0.05);
      testsell = data.order.filled_avg_price;
    }


    if(testbuy && testsell){
      console.log('SCYTHE ', testsell - testbuy);
      exec.insertOne({"_id": new ObjectID(), net: M.Decimal128.fromString(String(testsell - testbuy)) , time: time});
      testbuy = false;
      testsell = false;
      tradeGate = true;
      filled = false;
    }

  }

  if(data.event == 'canceled'){
    tradeGate = true;
  }
});

/////////////////////////////////////////////////////////////////////////////
async function execTrade(t,type,time, limit_price = null){
  console.log('ran');
  tradeGate = false;
  side = 'sell';
  if(t) side = 'buy';
  var order = {
    symbol: 'TSLA',
    qty: 1,
    side: side,
    type: type,
    time_in_force: time
  }
  if(limit_price) order.limit_price = limit_price;
  try{
    var res = await alpaca.createOrder(order);
  }catch(err){
    tradeGate = true;

  }


}


/////////////////////////////////////////////////////////////////////////////
async function ivan(t, trade, qty){
  signaln = t;
  signals.push(signaln);
  if(signals.length > frame) signals.shift();
  cSIG = round(getAvg(signals), 2);

  if(signaln !== signal){
    console.log('*****************************************************');

    if(!filled)await alpaca.cancelAllOrders();

    if(tradeGate) {
      execTrade(signaln, 'limit', 'gtc', trade);
    }


    //execTrade(signaln, 'market', 'gtc');
  }else{

  }

  signal = signaln;


  log([signal, cSIG, round(getPercentageChange(cAVG, trade),2), qty, trade, testbuy, testsell]);

}

/////////////////////////////////////////////////////////////////////////////
(async function() {

  try {
    // Connect
    await client.connect();
    exec = await client.db(dbName).collection("exec");
    console.log('init...');
    await execApi.connect();
    alpaca.cancelAllOrders();
  } catch (err) {
    console.log(err);
  }

})();
