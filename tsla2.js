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
var buy = [];
var sell = [];
var cRSI;
var cAVG;
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

  const alpaca = new Alpaca({
    keyId: 'PKWV6X3Q1POAQD0HU6JJ',
    secretKey: 'Lw4ULKMX98zL017GZH4ML3wm0ZW2ndhDSlyEkRR5',
    paper: true,
    usePolygon: false
  })

  const al = alpaca.data_ws
    al.onConnect(function() {
      console.log("Connected")
      al.subscribe(['alpacadatav1/T.TSLA'])
    })
    al.onDisconnect(() => {
      console.log("Disconnected")
    })

al.onStockTrades(function(subject, data) {
 var time = new Date().getTime();
 trade = {eventTime: time, price:  M.Decimal128.fromString(String(data.price))};
     //Indicators

        cRSI = rsi.nextValue(trade.price);
        m = delta(cRSI);
        k = deltadelta(m);
        cAVG = round(getAvg(values), 2);
        values.push( parseFloat(trade.price.toString()) );
        if(values.length > frame) values.shift();
        //if(values.length < frame) return;
        enable = true;

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
	
	if(getPercentageChange(testbuy, trade.price) >= 0.01){
	 console.log('L', testbuy.toString(), trade.price.toString(), getPercentageChange(testbuy, trade.price));
         exec.insertOne({"_id": new ObjectID(), net: M.Decimal128.fromString(String(getPercentageChange(testbuy, trade.price))) , time: time});
	 testbuy = false;
        }

         if(getPercentageChange(trade.price, testsell) >= 0.01){ 
         console.log('S', trade.price.toString(), testsell.toString(), getPercentageChange(trade.price, testsell));
         exec.insertOne({"_id": new ObjectID(), net: M.Decimal128.fromString(String(getPercentageChange(trade.price, testsell))) , time: time});
         testsell = false; 
        }

        log([signal, cAVG, parseFloat(trade.price.toString()), getPercentageChange(testbuy, trade.price), getPercentageChange(trade.price, testsell)]);

})

al.connect();


 

 
 

})();

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
