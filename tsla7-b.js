var M = require('mongodb');
ObjectID = M.ObjectID;
const MongoClient = M.MongoClient;
const Alpaca = require('@alpacahq/alpaca-trade-api');
var Decimal = require('decimal.js');
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
var mode = 0;
var pc = [];
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
  if(values.length > 2) values.shift();
  if(values.length < 2) return;
  // Getting sum of numbers

  l = 0;
   var mSIG = values.reduce(function(d, l1){
     l1 = l1 * 1000;
     if(l == 0) l = l1;
     p = l1 - l;
     l = l1;
     return d + p;
   }, 0);

   if(mSIG > 0)   signals.push(true);
   if(mSIG < 0)   signals.push(false);
   if(signals.length > frame) signals.shift();
   //if(signals.length < frame) return;

   cSIG = round(getAvg(signals), 2);

   //cAVG = round(getAvg(values), 2);









if(tradeGate){


    switch(mode){
      case 0:
      if(cSIG < 0.5) mode = 1;

      break;

      case 1:
        if(cSIG > 0.5){
          if(tradeGate) execTrade(true, 'market', 'gtc');
          mode = 2;
        }
      break;




    }


}else{
  if(testbuy && cSIG < 0.6 && !ivanMode)  { ivanMode = true; await alpaca.cancelAllOrders(); execTrade(false, 'market', 'gtc'); }

}






  log([cSIG, mSIG, data.size, data.price, round(getPercentageChange(testbuy, data.price),2), testbuy, round(getPercentageChange(data.price, testsell), 2), testsell]);


});

///////////////////////////////////////////////////////////////////////////////
execApi.onOrderUpdate(data => {
  console.log('#EVENT', data.event, data.order.type, data.order.side, data.order.limit_price, data.order.filled_avg_price);
  if(data.event == 'fill'){
    filled = true;

    //LOG
    var time = new Date().getTime();
    if(data.order.side == 'buy' && !testbuy){
      //if(!testsell) execTrade(false, 'limit', 'gtc', parseFloat(data.order.filled_avg_price)+0.02);
      testbuy = data.order.filled_avg_price;

    }
    if(data.order.side == 'sell' && !testsell){
      testsell = data.order.filled_avg_price;

    }


    if(testbuy && testsell){
      console.log('#SCYTHE ', testsell - testbuy);
      exec.insertOne({"_id": new ObjectID(), net: M.Decimal128.fromString(String(testsell - testbuy)) , time: time});
      testbuy = false;
      testsell = false;
      tradeGate = true;
      filled = false;
      ivanMode = false;
      mode = 0;

    }

  }

  if(data.event == 'canceled'){
    if(!filled)tradeGate = true;
  }
});

/////////////////////////////////////////////////////////////////////////////
async function execTrade(t,type,time, limit_price = null){
  console.log('#EXEC', t,type,time, limit_price);
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
