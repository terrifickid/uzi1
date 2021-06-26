var M = require('mongodb');
ObjectID = M.ObjectID;
const MongoClient = M.MongoClient;
const Alpaca = require('@alpacahq/alpaca-trade-api');

var cAVG;
var signal;
var exec;
var values = [];
var tradeGate = true;
var ivanMode = false;
var marketOrder = [];
var testbuy;
var testsell;

//DB
const dbName = 'tsla';
const url = "mongodb+srv://tk:test123@data.owryg.gcp.mongodb.net/"+dbName+"?retryWrites=true&w=majority";
const client = new MongoClient(url, { useNewUrlParser: true, useUnifiedTopology: true});

//FRAME
var frame = 100;

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
  keyId: 'PK8PK6GYIDS7DRK5G6CQ',
  secretKey: 'UJKDX6EfNHKOwgJaNH8UuSSFB7mK15hbAV18cMzm',
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
});
///////////////////////////////////////////////////////////////////////////////
tradeApi.onStockTrades(async function(subject, data) {
  values.push( parseFloat(data.price) );
  if(values.length > frame) values.shift();
  //if(values.length < frame) return;
  cAVG = round(getAvg(values), 2);
  ivan(t(data.price));
  i = round(getPercentageChange(cAVG, parseFloat(data.price)),2);
  if(!signal) i = i * -1;
  if(tradeGate && i > 0.1) execTrade(signal, 'market');
  log([signal, cAVG, parseFloat(data.price), i, testbuy, testsell]);
});

///////////////////////////////////////////////////////////////////////////////
execApi.onOrderUpdate(data => {
  console.log(data.event, data.order.type, data.order.side, data.order.limit_price, data.order.filled_avg_price);
  if(data.event == 'fill'){

    //LOG
    var time = new Date().getTime();
    if(data.order.side == 'buy') testbuy = data.order.filled_avg_price;
    if(data.order.side == 'sell') testsell = data.order.filled_avg_price;
    if(testbuy && testsell){
      console.log('SCYTHE ', testsell - testbuy);
      exec.insertOne({"_id": new ObjectID(), net: M.Decimal128.fromString(String(testsell - testbuy)) , time: time});
      testbuy = false;
      testsell = false;
    }

    //ON FILLS
    if(data.order.type == 'market'){
      if(ivanMode){
        tradeGate = true;
        ivanMode = false;
        return;
      }
      if(data.order.side == 'buy') execTrade(false, 'limit', parseFloat(data.order.filled_avg_price)+0.01);
      if(data.order.side == 'sell') execTrade(true, 'limit', parseFloat(data.order.filled_avg_price)-0.01);
    }else if(data.order.type == 'limit'){
      tradeGate = true;
    }
  }

  if(data.event == 'canceled'){
    if(data.order.type == 'market') tradeGate = true;
    if(data.order.type == 'limit'){
      var d = false;
      if(data.order.side == 'buy') d = true;
      ivanMode = true;
      execTrade(d, 'market');
    }
  }
});

/////////////////////////////////////////////////////////////////////////////
async function execTrade(t,type,limit = null){
  tradeGate = false;
  side = 'sell';
  if(t) side = 'buy';
  var order = {
    symbol: 'TSLA',
    qty: 1,
    side,
    type: type,
    time_in_force: 'day'
  }
  if(limit) order.limit_price = limit;
  alpaca.createOrder(order);
}

/////////////////////////////////////////////////////////////////////////////
async function ivan(t){
  signaln = t;
  if(signaln !== signal && !tradeGate && !ivanMode){
    console.log('*********************************************************');
    alpaca.cancelAllOrders();
  }
  signal = signaln;
}

/////////////////////////////////////////////////////////////////////////////
(async function() {

  try {
    // Connect
    await client.connect();
    exec = await client.db(dbName).collection("exec");
    console.log('init...');
    execApi.connect();
  } catch (err) {
    console.log(err);
  }

})();
