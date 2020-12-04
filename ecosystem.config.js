module.exports = {
  apps : [{
    name: 'scythe2',
    script: 'scythe2.js',
    watch: false,
    log_file: 'scythe.log',
  },{   
    name: 'tsla2',
    script: 'tsla2.js',
    watch: false,
    args: 'btcusdt 2 4 butch 11 1000',
    log_file: 'scythe.log',
        }
]
};
