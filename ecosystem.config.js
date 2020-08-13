module.exports = {
  apps : [{
    name: 'scythe',
    script: 'scythe.js',
    watch: false,
    args: 'btcusdt 2 4',
    log_file: 'scythe.log',
  },{   
    name: 'turtle5MS',
    script: 'turtle.js',
    watch: false,
    args: 'btcusdt 2 4 turtle5MS 55 500',
    log_file: 'scythe.log',
  },{
    name: 'skittle',
    script: 'skittle.js',
    watch: false,
    args: 'btcusdt 2 4 skittle 55 1000',
    log_file: 'scythe.log',
  ,
]
};
