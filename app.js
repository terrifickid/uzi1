const express = require('express');
const app = express();
const port = 3000;

const SCYTHE = require("./scythe.js");
const CHART = require("./chart.js");
const REDIS = require("./redis.js");
var redis = new REDIS();

/////////////////////////////////////////////////////////////////////////////
async function renderChart(name,zoom,page){

  try {
    p = 500;

    // DATUM
    zoom -= 40;
    var scythe = new SCYTHE(name+'SIM',p);

    var items = p*10;
    items -= scythe.round(zoom*(items/8),0);
    var start = -1 * (items);
    var stop = -1;
    start -= scythe.round(page*(items/8),0);
    stop -= scythe.round(page*(items/8),0);
    var datum = await redis.LRANGE(name,start-p*10,stop);
    for(move of await field(datum, 'move')){
      var sig = await scythe.run(parseInt(move));
      if(sig.bSig) await scythe.recordBuy(move);
      if(sig.sSig) await scythe.recordSell(move);
    }

    var datumSIM = await redis.LRANGE(name+'SIM',-1 * items,-1);
    var datum = await redis.LRANGE(name,start,stop);
    await redis.del(name+'SIM');

    //REAL
    var chart = new CHART();
    var url = await chart.url({moves: await field(datum, 'move'), maxes: await field(datum, 'max'), mins: await field(datum, 'min'), pcs: await field(datum, 'pc'), pcs2: await field(datum, 'pc2'),  buys: await field(datum, 'buy'), sells:await field(datum, 'sell')})
    url = 0;

    var chartSIM = new CHART();
    var urlSIM = await chartSIM.url({moves: await field(datumSIM, 'move'), maxes: await field(datumSIM, 'max'), mins: await field(datumSIM, 'min'), pcs: await field(datumSIM, 'pc'), pcs2: await field(datumSIM, 'pc2'), buys: await field(datumSIM, 'buy'), sells:await field(datumSIM, 'sell')})

    return [url,urlSIM];


  } catch (err) {
    console.log(err);
  }

}

async function field(datum, key){
  return datum.map(function(item){
    var d = JSON.parse(item);

    return d[key];
  });
}

app.get('/', async (req, res) => {


  var page = req.param('page');
  var zoom = req.param('zoom');
  var name = req.param('name');

  var keys = await redis.KEYS();
  var keyHTML = '';
  for(key of keys){
    keyHTML += '<a class="btn btn-sm btn-light" href="/?name='+key+'&zoom=0&page=0">'+key+'</a>';
  }


  var urls = await renderChart(name,zoom,page);

  var style = '<link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/bootstrap/4.3.1/css/bootstrap.min.css" integrity="sha384-ggOyR0iXCbMQv3Xipma34MD+dH/1fQ784/j6cY/iJTQUOhcWr7x9JvoRxT2MZw1T" crossorigin="anonymous"><style>a{text-decoration: none; padding: 1rem; color: white; background: black; display: inline-block; margin-right: 1rem;}</style>';
  var uihtml = '<p><a class="btn btn-sm btn-dark" href="?name='+name+'&zoom='+(parseInt(zoom)-1)+'&page='+page+'">-</a><a class="btn btn-sm btn-dark" href="/?name='+name+'&zoom='+(parseInt(zoom)+1)+'&page='+page+'">+</a><a class="btn btn-sm btn-dark"  style="float: right;" href="/?name='+name+'&zoom='+zoom+'&page='+(parseInt(page)-1)+'">></a><a class="btn btn-sm btn-dark"  style="float: right;" href="/?name='+name+'&zoom='+zoom+'&page='+(parseInt(page)+1)+'"><</a>';
  //uihtml + = '<img style="width: 100%;" src="'+urls[0]+'">';
  uihtml += '<img style="width: 100%;" src="'+urls[1]+'">';

  res.send(style+keyHTML+uihtml);

})

app.listen(port, () => {
  console.log('SCYTHE ALPHA1');
  console.log('###########################################');
})
