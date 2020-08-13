
var M = require('mongodb');
ObjectID = M.ObjectID;
const MongoClient = M.MongoClient;
const BinanceClient = require('node-binance-api');

var symbol = process.argv[2];
var p1 = process.argv[3];
var p2 = process.argv[4];
const technicalIndicators = require('technicalindicators');
technicalIndicators.setConfig('precision', p2);

var values = [];

var RSI = require('technicalindicators').RSI;
var rsi;

var drop = [];
var trade = {price: M.Decimal128.fromString(String(0))};
var buy = [];
var sell = [];
var cRSI;
var cAVG;
var cAVG2;
var trend = [];
var trendtrend = [];
var m = 0;
var k = 0;
var signal = 1;
var signalp = 1;
var testbuy = false;
var testsell = false;
var enable = false;
var scythe = false;
var frame = 100;

function t(){
  if(cAVG2 < cAVG) return true;
  return false;

}
async function log(data = []){
        var output = '';
        for(item of data){
              output += String(item).padEnd(15) + ' ';
          }
        console.log(output);
    }

    function delta(value){
      trend.push(value);
      if(trend.length > frame)trend.shift();
      return round(getAvg(trend), 2);
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

(async function() {


  // Connection
  const dbName = 'scythe3';
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

  var binance = new BinanceClient().options({
          APIKEY: 'dKh1FqWiDlLGVxzWWsE4a3GzSQlgaClnk9K1lXebdBrkXVc4ZiHLKukv6lBVOuWZ',
          APISECRET: 'NXjBmcFKIHemPviszdYSU6zJ0Xlo6SpHtxcBgLpn7CO3vNs02iQSTxmliBpg7eOb',
          useServerTime: true, // If you get timestamp errors, synchronize to server time at startup
          test: true // If you want to use sandbox mode where orders are simulated
    });

  setInterval(getSignal,60000);


var count = 0;
    binance.websockets.trades([symbol], async function(trades){
       var time = new Date().getTime();
      let {e:eventType, E:eventTime, s:symbol, p:price, q:quantity, m:maker, a:tradeId} = trades;
      trade = {eventTime: eventTime, price:  M.Decimal128.fromString(price)};

      //Indicators
      values.push( parseFloat(price.toString()) );
      if(values.length > frame) values.shift();
      if(values.length < frame) return;
      cAVG = round(getAvg(values), 2);
      cAVG2 = delta(cAVG);
      enable = true;
          
 if(scythe && signal && count < 10 && cRSI >= 70 && round(getPercentageChange(testbuy, trade.price), 2)){
          count++;
          console.log('L', parseFloat(testbuy.toString()), parseFloat(trade.price.toString()), '$'+getPercentageChange(testbuy, trade.price));
          exec.insertOne({"_id": new ObjectID(), net: M.Decimal128.fromString(String(getPercentageChange(testbuy, trade.price))) , time: time});    
            }

            if(scythe && !signal && !testbuy && cRSI < 20){
           //   buy.push(trade.price);
            }
     	
// log([signal, cAVG2, cAVG, parseFloat(trade.price.toString()), testbuy, testsell,  round(getPercentageChange(testbuy, trade.price), 2), round(getPercentageChange(testsell, trade.price), 2)]);
  });



})();

function getSignal(){
  var time = new Date().getTime();
  var signaln = t();
  if(signal !== 1){
    if(signal !== signaln && enable){
       scythe = true;
      console.log(signal, signaln);

      //BUY!!!
      if(!signal && signaln){
        count = 0;
        drop = [];
        testbuy = trade.price;
        sell.forEach(async function(price, index) {
          console.log('S', parseFloat(price.toString()), parseFloat(trade.price.toString()), '$'+getPercentageChange(trade.price, price));
          exec.insertOne({"_id": new ObjectID(), net: M.Decimal128.fromString(String(getPercentageChange(trade.price, price))) , time: time});
        });
        sell = [];
      }

      //SELL!!!
      if(signal && !signaln){
        testsell = trade.price;
        buy.forEach(async function(price, index) {
          console.log('L', parseFloat(price.toString()), parseFloat(trade.price.toString()), '$'+getPercentageChange(price,trade.price));
          exec.insertOne({"_id": new ObjectID(), net: M.Decimal128.fromString(String(getPercentageChange(price,trade.price))) , time: time});
        });
        buy = [];
      }
      if(testbuy && testsell){
        rsi = new RSI({period : 20, values : []});
        console.log('SCYTHE', testbuy.toString(), testsell.toString(), getPercentageChange(testbuy, testsell));
        exec.insertOne({"_id": new ObjectID(), net: M.Decimal128.fromString(String(getPercentageChange(testbuy, testsell))) , time: time});
        testbuy = false;
        testsell = false;
         if(signal) testsell = trade.price;
         if(!signal) testbuy = trade.price;
      }
      signal = signaln;

    }
  }else{
    signal = signaln;
  }
}


function bsignals(){
  return false;
    //if(signal && cRSI <= 50) return true;
    if(signal && cRSI <= 52) return true;
    //if(cAVG > trade.price && cRSI >= 60 && m <= cRSI && m >= 50 && k <= m && k >= 50) return true;
  //  if(cAVG > trade.price && cRSI >= 65 && k >= 50 && m >= 50 && cRSI >= 60 &&  && ) return true;
    return false;
}

function ssignals(){
  return false;
   //if(!signal && cRSI >= 50) return true;
   if(!signal && cRSI >= 48) return true;
    //if(cAVG < trade.price && cRSI <= 40 && m >= cRSI && m <= 50 && k >= m && k <= 50 ) return true;
    return false;
}
