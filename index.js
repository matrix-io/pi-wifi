/* Intended to be run ON the Raspberry Pi */

var commands = {
  scan: 'sudo iwlist wlan0 scan | grep ESSID | cut \'"\' -f2',
  wpaScan: 'wpa_cli scan; wpa_cli scan_results',
  wpaSave: 'wpa_cli save_config',
  wpaAdd: 'wpa_cli add_network',
  wpaFile: 'sudo cat /etc/wpa_supplicant/wpa_supplicant.conf',
  restart: 'sudo ifdown wlan0; sudo ifup wlan0',
  check: 'ifconfig wlan0'
};

var execSync = require('child_process').execSync;

module.exports = {
  check: function(ssid, cb){
    var wifiList = [];
    var scan = execSync(commands.scan);
    scan.stdout.on('message', function(data){
      wifiList.push(data)
    });
    scan.on('exit', function(){
      if ( wifiList.indexOf(ssid) === -1 ){
        cb('SSID Not Found')
      } else {
        cb(null, ssid)
      }
    })
  },
  connect: function(ssid, pass, cb){
    var exec = require('child_process').execSync;
    var scan = exec(commands.wpaScan).toString();
    if ( scan.indexOf(ssid) > -1) {
      var netId = exec(commands.wpaAdd).toString().split('\n')[1];
      exec(`wpa_cli set_network ${netId} ssid "${ssid}"`)
      // if no pwd set_network 0 key_mgmt NONE
      exec(`wpa_cli set_network ${netId} psk "${pass}"`)
      exec(`wpa_cli enable_network ${netId}`)
      exec(commands.wpaSave);
      exec(commands.restart);
      // wpaFile should have new creds
      cb(null, true);
    } else {
      cb('SSID not found: ' + ssid);
    }

  }
}
