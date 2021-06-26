var frame = 200;
var M = require('mongodb');
ObjectID = M.ObjectID;
const MongoClient = M.MongoClient;
const BinanceClient = require('node-binance-api');
const Alpaca = require('@alpacahq/alpaca-trade-api');

var symbol = process.argv[2];
var p1 = process.argv[3];
var p2 = process.argv[4];
const technicalIndicators = require('technicalindicators');
technicalIndicators.setConfig('precision', p2);

var values = [];

var RSI = require('technicalindicators').RSI;
var rsi = new RSI({period : frame, values : []});

var trade = {price: M.Decimal128.fromString(String(0))};
var cRSI;
var cAVG;
var trend = [];
var trendtrend = [];
var m = 0;
var k = 0;
var signal = 1;
var signalp = 1;
var testbuy = false;
var buyBuffer = null;
var buyExec = null;
var buyGate = true;
var buyTime = null;
var testsell = false;
var sellBuffer = null;
var sellExec = null;
var sellGate = true;
var sellTime = null;
var enable = false;
var scythe = false;
var tradeGate = true;

var exec = null;
var alpaca = null;
function t(){
  if(cAVG < trade.price) return true;
  return false;

}
async function log(data = []){
        var output = '';
        for(item of data){
              output += String(item).padEnd(10) + ' ';
          }
        console.log(output);
    }

    function delta(value){
      var d = getAvg(trend);
      if(trend.length > 3)trend.shift();
      trend.push(value);
      return round(d,0);
    }

    function deltadelta(value){
      var d = getAvg(trendtrend);
      if(trendtrend.length > 5)trendtrend.shift();
      trendtrend.push(value);
      return round(d,0);
      if( value > d) return true;
      return false;
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
  ask = parseFloat(ask.toString());
  bid = parseFloat(bid.toString());

        var pc = [(bid - ask)/ask] * 100;
        if(pc == 'Infinity') return 0;
        return pc;
    }


    function getSignal(){
      var signaln = t();
      if(signal !== 1){
        if(signal !== signaln && enable){
          signal = signaln;
        }
      }else{
        signal = signaln;
      }
    }


    async function execTrade(side,type,limit = null){
      if(tradeGate){
        tradeGate = false;
        var order = {
                  symbol: 'TSLA',
                  qty: 1,
                  side,
                  type: type,
                  time_in_force: 'day'
        }

        if(limit) order.limit_price = limit;
          var res = await alpaca.createOrder(order);

      }
    }



(async function() {


  // Connection
  const dbName = 'tsla';
  const url = "mongodb+srv://tk:test123@data.owryg.gcp.mongodb.net/"+dbName+"?retryWrites=true&w=majority";
  const client = new MongoClient(url, { useNewUrlParser: true, useUnifiedTopology: true});

  var db;


  try {
    // Connect
    await client.connect();
    db = await client.db(dbName).collection("trades");
    rsiDb = await client.db(dbName).collection("rsi");
    exec = await client.db(dbName).collection("exec");
  } catch (err) {
    console.log(err.stack);
  }

  console.log('init...');



  alpaca = new Alpaca({
    keyId: 'PKFQBBK8969KGRML9SUZ',
    secretKey: 'McYV98H8OkQBvxriWcb7Hh6f3l7C17Ha9w6b33LV',
    paper: true,
    usePolygon: false
  })


  //Trades
  const tradeApi = alpaca.data_ws;
  tradeApi.onConnect(function() {
    console.log("Trade API Connected")
    tradeApi.subscribe(['alpacadatav1/T.TSLA']);
  });
  tradeApi.onDisconnect(() => {
    console.log("Trade API Disconnected");
  })

  tradeApi.onStockTrades(async function(subject, data) {
   var time = new Date().getTime();
   trade = {eventTime: time, price:  M.Decimal128.fromString(String(data.price))};
       //Indicators

          cRSI = rsi.nextValue(trade.price);
          m = delta(cRSI);
          k = deltadelta(m);
          cAVG = round(getAvg(values), 2);
          values.push( parseFloat(trade.price.toString()) );
          if(values.length > frame) values.shift();
          if(values.length < frame) return;
          enable = true;

          getSignal();


          //Rising
          if(signal && !testbuy){
              //if waiting on buy limit, cancel all orders.
              execTrade('buy', 'market');
          //Falling
          }else if(!signal && !testsell){
            //if waiting on sell limit, cancel all orders.
            execTrade('sell', 'market');

          //Long for Profit
          }else if(testbuy){
            execTrade('sell', 'limit', round(testbuy * 1.001, 2));

          }else if(testsell){
            execTrade('buy', 'limit', round(testsell * 0.999, 2));

          }

        //s  log([signal, cAVG, parseFloat(trade.price.toString()), testbuy, getPercentageChange(testbuy, trade.price), testsell, getPercentageChange(trade.price, testsell)]);

  });

  //exec
  const execApi = alpaca.trade_ws;
  execApi.onConnect(function () {
    console.log("Exec API Connected")
    execApi.subscribe(['trade_updates']);
    tradeApi.connect();
  });
  execApi.onDisconnect(() => {
    console.log("Exec API Disconnected");
  });
  execApi.onOrderUpdate(data => {
    console.log(data.event, data.order.type, data.order.side, data.order.limit_price, data.order.filled_avg_price);
    if(data.event == 'fill'){
      if(data.order.side == 'buy') testbuy = data.order.filled_avg_price;
      if(data.order.side == 'sell') testsell = data.order.filled_avg_price;

      if(testbuy && testsell){
        var time = new Date().getTime();
        exec.insertOne({"_id": new ObjectID(), net: M.Decimal128.fromString(String(getPercentageChange(testbuy, testsell))) , time: time});

        console.log('SCYTHE', testbuy.toString(), testsell.toString(), getPercentageChange(testbuy, testsell));
        testbuy = false;
        testsell = false;

      }

      tradeGate = true;

    }

  });



execApi.connect();




})();
