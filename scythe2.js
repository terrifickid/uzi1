//CONFIG
var frame = 2000;
var symbol = 'omgusdt';
var p = 4;
var dbName = 'scythe2';

//API
const BinanceClient = require('node-binance-api');
var binance = new BinanceClient().options({
         APIKEY: 'dKh1FqWiDlLGVxzWWsE4a3GzSQlgaClnk9K1lXebdBrkXVc4ZiHLKukv6lBVOuWZ',
         APISECRET: 'NXjBmcFKIHemPviszdYSU6zJ0Xlo6SpHtxcBgLpn7CO3vNs02iQSTxmliBpg7eOb',
         useServerTime: true, // If you get timestamp errors, synchronize to server time at startup
         test: true // If you want to use sandbox mode where orders are simulated
   });

// DB Connection
var M = require('mongodb');
ObjectID = M.ObjectID;
const MongoClient = M.MongoClient;
const url = "mongodb+srv://tk:test123@data.owryg.gcp.mongodb.net/"+dbName+"?retryWrites=true&w=majority";
const client = new MongoClient(url, { useNewUrlParser: true, useUnifiedTopology: true});

//VAR
var db;
var values = [];
var trade = {price: M.Decimal128.fromString(String(0))};
var cAVG;
var signal = 1;
var testbuy = false;
var testsell = false;


//FUNCS 
function t(){
  if(cAVG < trade.price) return true;
  return false;

}

async function log(data = []){
        var output = '';
        for(item of data){
              output += String(item).padEnd(15) + ' ';
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
  ask = parseFloat(ask.toString());
  bid = parseFloat(bid.toString());

        var pc = [(bid - ask)/ask] * 100;
        if(pc == 'Infinity') return 0;
        return pc;
    }

//INIT
(async function() {

  try {
    // Connect
    await client.connect();
    exec = await client.db(dbName).collection("exec");
  } catch (err) {
    console.log(err.stack);
  }

  console.log('init...');

  binance.websockets.trades([symbol], async function(trades){
      var time = new Date().getTime();
      let {e:eventType, E:eventTime, s:symbol, p:price, q:quantity, m:maker, a:tradeId} = trades;
      trade = {eventTime: time, price:  M.Decimal128.fromString(String(price))};
      onTrade(trade);

  });

 

})();

function onTrade(trade){
  var time = new Date().getTime();
  cAVG = round(getAvg(values), 2);
  values.push( parseFloat(trade.price.toString()) );
  if(values.length > frame) values.shift();
  //if(values.length < frame) return;

  getSignal();

  //Rising
  if(signal && !testbuy){
      testbuy = trade.price;
      if(testsell){
        console.log('SCYTHE', trade.price.toString(), testsell.toString(), getPercentageChange(trade.price, testsell));
        exec.insertOne({"_id": new ObjectID(), net: M.Decimal128.fromString(String(getPercentageChange(testbuy, trade.price))) , time: time});
      testsell = null;
      }	
  }

  //Falling
  if(!signal && !testsell){
  testsell = trade.price;
     if(testbuy){
       console.log('SCYTHE', testbuy.toString(), trade.price.toString(), getPercentageChange(testbuy, trade.price));
       exec.insertOne({"_id": new ObjectID(), net: M.Decimal128.fromString(String(getPercentageChange(testbuy, trade.price))) , time: time});
     testbuy = null;
     }
  }

  if(getPercentageChange(testbuy, trade.price) >= 0.3){
       console.log('L', testbuy.toString(), trade.price.toString(), getPercentageChange(testbuy, trade.price));
       exec.insertOne({"_id": new ObjectID(), net: M.Decimal128.fromString(String(getPercentageChange(testbuy, trade.price))) , time: time});
       testbuy = false;
  }

   if(getPercentageChange(trade.price, testsell) >= 0.3){ 
     console.log('S', trade.price.toString(), testsell.toString(), getPercentageChange(trade.price, testsell));
     exec.insertOne({"_id": new ObjectID(), net: M.Decimal128.fromString(String(getPercentageChange(trade.price, testsell))) , time: time});
     testsell = false; 
  }

  log([signal, cAVG, parseFloat(trade.price.toString()), getPercentageChange(testbuy, trade.price), getPercentageChange(trade.price, testsell), values.length]);
}


function getSignal(){
  var signaln = t();
  if(signal !== 1){
    if(signal !== signaln){
      signal = signaln;
    }
  }else{
    signal = signaln;
  }
}

