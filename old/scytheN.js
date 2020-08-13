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


var trade = {price: M.Decimal128.fromString(String(0))};
var buy = [];
var sell = [];
var cRSI;
var cAVG;
var trend = [];
var trendtrend = [];
var m = 0;
var k = 0;
var signal = 'off';
var signalp = 1;
var testbuy = false;
var testsell = false;
var enable = false;
var scythe = false;
var frame = process.argv[5];
var pulse = process.argv[6];
var db = process.argv[7];
var mode;

var RSI = require('technicalindicators').RSI;

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

    function delta(value){
      trend.push(value);
      if(trend.length > 3)trend.shift();
      var d = getAvg(trend);
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
  var total = 0;
  grades.forEach(function(grade){
   total = total + grade;
  });
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
  const dbName = process.argv[7];
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


    binance.websockets.trades([symbol], async function(trades){
       var time = new Date().getTime();
      let {e:eventType, E:eventTime, s:symbol, p:price, q:quantity, m:maker, a:tradeId} = trades;
      trade = {eventTime: eventTime, price:  M.Decimal128.fromString(price)};
    });
    
setInterval(getSignal,pulse);

})();

function getSignal(){
 //Indicators
 	
      values.push( parseFloat(trade.price.toString()) );
      if(values.length > frame) values.shift();
      if(values.length < frame) return;
      cRSI = RSI.calculate({period : frame-1, values : values});
      cRSI = round(cRSI[0],0);
      m = delta(cRSI);
      k = deltadelta(m);
      cAVG = round(getAvg(values), 2);
      log([signal, testbuy, testsell, cAVG, parseFloat(trade.price.toString()), round(cRSI,0)+'/'+m+'/'+k,  buy.length + sell.length]);

     

  var time = new Date().getTime();
    signaln = t();
    if(signal == 'off') signal = signaln;
    if(signal != signaln){
      scythe = true;
      //BUY!!!
      if(!signal && signaln && !testbuy){
     //   testbuy = trade.price;
     //   console.log('L');
      }
      //SELL!!!
      if(signal && !signaln && !testsell){
       //  testsell = trade.price;
       //  console.log('S');
     }

      signal = signaln;
    }

        if(scythe && !testbuy && round(cRSI,0) >= m  )testbuy = trade.price;
        if(scythe && !testsell && round(cRSI,0) <= m ) testsell = trade.price;        
        
      if(testbuy && testsell){
        

        console.log('SCYTHE', testbuy.toString(), testsell.toString(), getPercentageChange(testbuy, testsell));
        exec.insertOne({"_id": new ObjectID(), net: M.Decimal128.fromString(String(getPercentageChange(testbuy, testsell))) , time: time});

        testbuy = false;
        testsell = false;

        if(signal){
        // console.log('S');
	// testsell = trade.price;
	}

        if(!signal){
        //console.log('L');
         // testbuy = trade.price;
        }
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
