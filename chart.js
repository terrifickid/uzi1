module.exports = class CHART {


  constructor(){
    const width = 3000; //px
const height = 1000; //px
    const { ChartJSNodeCanvas } = require('chartjs-node-canvas');
      this.myChart = new ChartJSNodeCanvas({ width, height });
  }

  async url(input){

    var min = Math.min.apply(Math, input.moves);
    var max = Math.max.apply(Math, input.moves);

    var data = {
    labels: Object.keys(input.moves),
    datasets: [{
      label: "Price",
      data: input.moves,
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
      label: "PCS2",
      data: input.pcs2,
      borderWidth: 1,
      borderColor: '#000',
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
      display: false,
      position: 'top',
      labels: {
        boxWidth: 80,
        fontColor: 'black'
      }
    }
  };

  var config = {
      type: 'line',
      data: data,
      options: options,
  };

  const url = await this.myChart.renderToDataURL(config);
  return url;
  }



}
