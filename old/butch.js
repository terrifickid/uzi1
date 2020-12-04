var _ = require('lodash');
var M = require('mongodb');
ObjectID = M.ObjectID;
const MongoClient = M.MongoClient;
const Alpaca = require('@alpacahq/alpaca-trade-api');

const { create, all } = require('mathjs');


var symbol = process.argv[2];
var p1 = process.argv[3];
var p2 = process.argv[4];
var dbName = process.argv[5]
var values = [];
var trade = {price: M.Decimal128.fromString(String(0))};
var frame = process.argv[6];
var pulse = process.argv[7];

var ld;
var sd;

var enable = false;

var lbuy = false;
var lsell = false;

var sbuy = false;
var ssell = false;

const config = {
  epsilon: 1e-12,
  matrix: 'Array',
  number: 'BigNumber',
  precision: 64,
  predictable: false,
  randomSeed: null
}
const math = create(all);



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

(async function() {


  // Connection
 
  const url = "mongodb+srv://tk:test123@data.owryg.gcp.mongodb.net/"+dbName+"?retryWrites=true&w=majority";
  const client = new MongoClient(url, { useNewUrlParser: true, useUnifiedTopology: true});

  try {
    // Connect
    await client.connect();
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
 console.log(data.price);
   trade = {eventTime: time, price:  M.Decimal128.fromString(String(data.price))};
   //Indicators
    values.push( parseFloat(trade.price.toString()) );
    if(values.length > frame) values.shift();
    if(values.length < frame) return;
    enable = true;
   getSignal();
})

al.connect();



})();

function g(){
//Long
if( getPercentageChange(math.max(values), trade.price) >= 0 ) ld = true;
if( getPercentageChange(math.min(_.takeRight(values,frame/3)), trade.price) <= 0 ) ld = false;

//Short
if( getPercentageChange(math.min(values), trade.price) <= 0 ) sd = true;
if( getPercentageChange(math.max(_.takeRight(values,frame/3)), trade.price) >= 0 ) sd = false;
}


function getSignal(){
  if(!enable) return;
  var time = new Date().getTime();

  g();
  
  if(!lbuy && ld) lbuy = trade.price;
  if(!lsell && !ld && lbuy) lsell = trade.price;

  if(!ssell && sd) ssell = trade.price;
  if(!sbuy && !sd && ssell) sbuy = trade.price;
  
  log(['l',ld, math.max(values), math.min(_.takeRight(values,frame/2)), parseFloat(trade.price.toString()), lbuy, lsell]);
  log(['s',sd, math.min(values), math.max(_.takeRight(values,frame/2)), parseFloat(trade.price.toString()), sbuy, ssell]);
  
  if(lbuy && lsell){
      console.log('LTURTLE', lbuy.toString(), lsell.toString(), getPercentageChange(lbuy, lsell));
       exec.insertOne({"_id": new ObjectID(), net: M.Decimal128.fromString(String(getPercentageChange(lbuy, lsell))) , time: time});
       lbuy = false;
       lsell = false;
  }

  if(sbuy && ssell){
      console.log('STURTLE', sbuy.toString(), ssell.toString(), getPercentageChange(sbuy, ssell));
       exec.insertOne({"_id": new ObjectID(), net: M.Decimal128.fromString(String(getPercentageChange(sbuy, ssell))) , time: time});
       sbuy = false;
       ssell = false;
  }
  
}


