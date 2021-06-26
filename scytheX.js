const QuickChart = require('quickchart-js');


async function chart(){
  const myChart = new QuickChart();

  var data = {
  labels: ["0s", "10s", "20s", "30s", "40s", "50s", "60s"],
  datasets: [{
    label: "Car Speed",
    data: [0, 59, 75, 20, 20, 55, 40],
  }]
};

var options = {
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

  myChart.setWidth(1000).setHeight(500);

  const url = await myChart.getShortUrl();

console.log(url);
}

chart();
