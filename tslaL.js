var M = require('mongodb');
ObjectID = M.ObjectID;
const MongoClient = M.MongoClient;
const Alpaca = require('@alpacahq/alpaca-trade-api');
const QuickChart = require('quickchart-js');
const WEMA = require('technicalindicators').WEMA;

const redis = require("redis");
const { promisify } = require("util");
const red = redis.createClient();

const lpush = promisify(red.lpush).bind(red);
const lrange = promisify(red.lrange).bind(red);


  var net = 0;

  var f = 0;
  var p = 0;

  var longbuy = false;
  var longsell = false;
  var mode = 0;
  var longnet = 0;
  var shortnet = 0;
  var frame = 200;
  var nm = [];
  var rsis = [];
  var mode = 0;
  var profit = 50;
  var loss = -100;
  var maxes = [];
  var mins = [];
  var trades = [];
  var buys = [];
  var sells = [];
  var pcs = [];
  var usig = frame/1600;
  var dsig = usig * -1;

function slope(r){
  var y2 = r[r.length-1];
  var y1 = r[r.length-4];

  var s = (y1 - y2) / (1 - 3);
  return round(s,2);

}

async function strat(res,display){
  var market = res.map(function(d){ return round( d * 100,0) ;});
  for(move of market){
      nm.push(move);
      if(nm.length > frame) nm.shift();
      if(nm.length < frame) continue;



      var min = Math.min.apply(Math, nm);
      var max = Math.max.apply(Math, nm);

      var sup = nm[0] - nm[nm.length-1];

      var pc = getAvg(nm.slice(nm.length-20,nm.length-1));

      maxes.push(max);
      mins.push(min);
      trades.push(move);
      pcs.push(pc);
      var trend = slope(pcs);
      //if(move == min) { console.log(move, '-' );   maxes = [];  mode = 0;}
      //if(move == max) { console.log(move, '+' ); maxes.push(max);  mode = 1}
      //if(getPercentageChange(getAvg(nm), move) < 0){ console.log(move, 'v'); mode = 2;  }
      //if(getPercentageChange(getAvg(nm), move) > 0){  console.log(move, '^'); mode = 3; }

      if(!mode && getPercentageChange(min, pc) < 0.04) mode = 1;

      if(mode == 1 && getPercentageChange(min, pc) > 0.05 && trend > 1 ){
        mode = 2;
        longbuy = pc;
        buys.push(pc);
      }else{
        buys.push(0);
      }

      if(longbuy && pc - longbuy < loss){
        longsell = pc;
        sells.push(pc);
      }else{

        if(mode == 2 && getPercentageChange(pc, max) < 0.04) mode = 3;

        if(mode == 3 && getPercentageChange(pc, max) > 0.05 && trend < 1 ){
          mode = 4;
          longsell = pc;
          sells.push(pc);
        }else{
          sells.push(0);
        }

      }







      if(longbuy && longsell){
        console.log('*SCYTHE',longbuy, longsell, longsell - longbuy);
        longnet += longsell - longbuy;
        if(longsell - longbuy >= 0) p++;
        if(longsell - longbuy < 0)f++;
        longbuy = false;
        longsell = false;
        mode = 0;


      }





}


}



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





    async function chart(input){

      var min = Math.min.apply(Math, input.trades);
      var max = Math.max.apply(Math, input.trades);


      const myChart = new QuickChart();

      var data = {
      labels: Object.keys(input.trades),
      datasets: [{
        label: "Price",
        data: input.trades,
        borderColor: '#000',
        pointBorderWidth: 0,
        pointHitRadius: 0,
        pointRadius: 1,
        showLine: false,
        fill: false,

      },{
        label: "PCS",
        data: input.pcs,
        borderWidth: 1,
        borderColor: '#0FF',
        pointBorderWidth: 0,
        pointHitRadius: 0,
        pointRadius: 0,
        showLine: true,
        fill: false,
        yAxisID: 'y-axis-price'
      },{
        label: "MAX",
        data: input.maxes,
        borderWidth: 1,
        borderColor: '#0f0',
        pointBorderWidth: 0,
        pointHitRadius: 0,
        pointRadius: 1,
        showLine: true,
        fill: false,
        yAxisID: 'y-axis-price'
      },{
        label: "MIN",
        data: input.mins,
        borderWidth: 1,
        borderColor: '#f00',
        pointBorderWidth: 0,
        pointHitRadius: 0,
        pointRadius: 1,
        showLine: true,
        fill: false,
        yAxisID: 'y-axis-price'
      },{
        label: "SELL",
        data: input.sells,
        borderWidth: 1,
        borderColor: '#f00',
        pointBorderWidth: 0,
        pointHitRadius: 0,
        pointRadius: 10,
        showLine: false,
        fill: false,
        yAxisID: 'y-axis-price'
      },{
        label: "BUY",
        data: input.buys,
        borderWidth: 1,
        borderColor: '#00f',
        pointBorderWidth: 0,
        pointHitRadius: 0,
        pointRadius: 10,
        showLine: false,
        fill: false,
        yAxisID: 'y-axis-price'
      },]
    };

    var options = {
      scales: {
            yAxes: [{
              gridLines: {
                lineWidth: 1,
              },
                ticks: {
                    min: min,
                    max: max,
                },
                id: 'y-axis-price',
            },{
                ticks: {
                    min: min,
                    max: max
                },
                id: 'y-axis-rsi',
            }]
        },
      legend: {
        display: true,
        position: 'top',
        labels: {
          boxWidth: 80,
          fontColor: 'black'
        }
      }
    };


      myChart.setConfig({
        type: 'line',
        data: data,
        options: options,
    });

      myChart.setWidth(2300).setHeight(800).setDevicePixelRatio(2);

    const url = await myChart.getShortUrl();
    console.log(url);
    }


/////////////////////////////////////////////////////////////////////////////
(async function() {

  try {
    // Connect

    var res = await lrange('trades',0,-1);

        items = 2000;
        page = 5;

        var start = res.length - items * page;
        var stop = ( res.length - 1 ) - (items * (page-1));



    //await strat(res.slice(start, stop), true);
    await strat(res);
    process.exit();



  } catch (err) {
    console.log(err);
  }

})();
