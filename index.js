/* Intended to be run ON the Raspberry Pi */

var tools = require('wireless-tools');
var async = require('async');

var commands = {
  scan: 'sudo iwlist wlan0 scan | grep ESSID | cut \'"\' -f2',
  wpaList: 'wpa_cli list_networks'
};

var myInterface = 'wlan0';
var execSync = require('child_process').execSync;
var exec = require('child_process').exec;

/*
@method scan
@description scan available wifi networks (does not list)
@param {Function} callback
@return {Array[Object]}
*/
function scan(callback) {
  tools.wpa.scan(myInterface, function (err, data) {
    if (err || !data.hasOwnProperty('result') ||  data.result != 'OK') return callback(err, data);
    setTimeout(function () {
      //console.log('Scan results:');
      tools.wpa.scan_results(myInterface, function (err, networks) {
        callback(err, networks);
      });
    }, 1000);
  });
};


/*
@method findConnection
@description Search a network on the known networks list and return it's network id, fails if not found
@param {String} ssid Network ssid
@param {Function(err, networkId)} callback Returns error if the network isn't found, id of the network found
*/
function findConnection(ssid, callback) {

  var networkId;
  //console.log('Listing...');
  exec(commands.wpaList, function (err, stdout, stderr) {
    
    var networksList = stdout.split("\n");
    var networksArray = new Array();
    var tempNetworkJson, parameters;

    networksList.splice(0, 2); //Remove headers
    networksList.splice(networksList.length - 1, 1); //Remove footer
    
    for (var networkIndex in networksList) {
      tempNetworkJson = {};

      parameters = networksList[networkIndex].split("\t");
      tempNetworkJson = {
        network_id: parameters[0],
        ssid: parameters[1],
        bssid: parameters[2],
        flags: parameters[3],
      };
      networksArray.push(tempNetworkJson);
    }
    
    //console.log('Looking for the network...');
    for (var i = 0; i < networksArray.length; i++) {
      if (networksArray[i].ssid == ssid) {
        //console.log('Network ' + networksArray[i].network_id + ' found');
        return callback(err, networksArray[i].network_id);
      }
    }
    //console.log('Network not found...');
    return callback(err, networkId);
  });
}

/*
@method openConnection
@description Connects to an open network with the ssid specified
@param {String} ssid Network ssid
@param {Function(err)} callback Returns error if the connection isn't successful
*/
function openConnection(ssid, callback) {
  var netId;
  async.waterfall([
    async.apply(findConnection, ssid),
    function (networkId, next) {
      if (networkId == undefined) return next(networkId);
      tools.wpa.remove_network(myInterface, networkId, function (err, data) {
        next(err);
      });
    },
    function (next) {
      createConnection(function (err, networkId) {
        if (!err) netId = networkId;
        //console.log('Created network:', netId, err);
        next(err);
      });
    },
    function (next) { setupOpenConnection(netId, ssid, next); }, //Can't use async.apply due to netId being shared
    function (next) { startConnection(netId, next); }
  ], function (err) {
    if (err) {
      if (netId) {
        tools.wpa.remove_network(myInterface, netId, function (err, data) {
          return callback(err);
        });
      } else {
        return callback(err);
      }
    } else {
      return callback(err);
    }
  });
}

/*
@method connection
@description Connects to a network with the ssid specified using the password provided (If a network with that ssid is already  )
@param {String} ssid Network ssid
@param {String} ssid Network psk
@param {Function(err)} callback Returns error if the connection isn't successful
*/
function connection(ssid, password, callback) {
  var netId;
  async.waterfall([
    async.apply(findConnection, ssid),
    function (networkId, next) {
      if (networkId == undefined) return next(networkId);
      tools.wpa.remove_network(myInterface, networkId, function (err, data) {
        next(err);
      });
    },
    function (next) {
      createConnection(function (err, networkId) {
        if (!err) netId = networkId;
        //console.log('Created network:', netId, err);
        next(err);
      });
    },
    function (next) { setupConnection(netId, ssid, password, next); }, //Can't use async.apply due to netId being shared
    function (next) { startConnection(netId, next); }
  ], function (err) {
    if (err) {
      if (netId) {
        tools.wpa.remove_network(myInterface, netId, function (err, data) {
          return callback(err);
        });
      } else {
        return callback(err);
      }
    } else {
      return callback(err);
    }
  });
}


/*
@method createConnection
@description Creates a connection record and returns its network id if successful
@param {Function(err, networkId)} callback Returns error if the network creation fails, Network id
*/
function createConnection(callback) {
  tools.wpa.add_network(myInterface, function (err, netId) {
    //if (err) console.log('ERR: ', err);
    netId = netId.result;
    callback(err, netId);
  });
}


/*
@method setupConnection
@description Sets the parameters for a secure network
@param {Integer} networkId Network id
@param {String} ssid Network ssid
@param {String} ssid Network psk
@param {Function(err)} callback Returns error if the process fails
*/
function setupConnection(networkId, ssid, password, callback) {
  //console.log('Setting ssid...');
  tools.wpa.set_network(myInterface, networkId, 'ssid', '\'"' + ssid + '"\'', function (err) {
    if (err) return callback(err);
    if (!password || password == null || password === '') {
      callback(err);
    } else {
      //console.log('Setting pass...');
      tools.wpa.set_network(myInterface, networkId, 'psk', '\'"' + password + '"\'', function (err) {
        return callback(err);
      });
    }
  });
};


/*
@method status
@description 
@param {Function(err)} callback Returns error if the process fails, status JSON object with the interface status
{
    bssid: '2c:f5:d3:02:ea:d9',
    frequency: 2412,
    mode: 'station',
    key_mgmt: 'wpa2-psk',
    ssid: 'Fake-Wifi',
    pairwise_cipher: 'CCMP',
    group_cipher: 'CCMP',
    p2p_device_address: 'e4:28:9c:a8:53:72',
    wpa_state: 'COMPLETED',
    ip: '10.34.141.168',
    mac: 'e4:28:9c:a8:53:72',
    uuid: 'e1cda789-8c88-53e8-ffff-31c304580c1e',
    id: 0
}
*/
function status(cb) { 
  tools.wpa.status(myInterface, cb);
}


/*
@method checkConnection
@description Returns the state of the network with the ssid specified
@param {String} ssid Network ssid
@param {Function(err, result)} Error if unable to get network status, Object with connection details
{
  selected: true | false, //
  connected: true | false,
  ip: 192.168.0.2
}
*/
function checkConnection(ssid, cb) {
  var result;
  status(function (err, status) {
    if (!err) {
      if (status.hasOwnProperty('ssid') && status.hasOwnProperty('wpa_state')) {
        result = {};
        result.selected = (status.ssid == ssid);
        if (result.selected) result.connected = (status.wpa_state == 'COMPLETED');
        if (result.connected && status.ip_address) result.ip = status.ip_address;
      } else {
        err = new Error('Incomplete status object');
      }      
    } 
    cb(err, result);
  });
}


/*
@method setupOpenConnection
@description Sets the parameters for an open network
@param {Integer} networkId Network id
@param {String} ssid Network ssid
@param {Function(err)} callback Returns error if the process fails
*/
function setupOpenConnection(networkId, ssid, callback) {
  //console.log('Setting ssid ' + ssid + ' to network ' + networkId + '...');
  tools.wpa.set_network(myInterface, networkId, 'ssid', '\'"' + ssid + '"\'', function (err) {
    if (err) return callback(err);
    //console.log('Setting no pass...');
    tools.wpa.set_network(myInterface, networkId, 'key_mgmt', 'NONE', function (err) {
      return callback(err);
    });
  });
};


/*
@method startConnection
@description Enables a network, saves the configuration and selects the network with the id provided
@param {Integer} networkId Network id
@param {Function(err)} callback Returns error if the process fails
*/
function startConnection(networkId, callback) {
  //console.log('Enabling network ' + networkId + '...');
  tools.wpa.enable_network(myInterface, networkId, function (err, data) {
    if (err || !data.hasOwnProperty('result') ||  data.result != 'OK') return callback(err, data);
    //console.log('Saving config...');
    tools.wpa.save_config(myInterface, function (err) {
      if (err || !data.hasOwnProperty('result') ||  data.result != 'OK') return callback(err, data);
      //console.log('Selecting network...');
      tools.wpa.select_network(myInterface, networkId, function (err, data) {
        if (err || !data.hasOwnProperty('result') || data.result != 'OK') return callback(err, data);
        callback();
      });
    });
  });
};


module.exports = {
  /*
  @method check
  @description Checks if a network is present
  @param {String} ssid Network ssid
  @param {Function(err, ssid)} callback Returns error if the process fails, ssid
  */
  check: function (ssid, cb) {
    var wifiList = [];
    var scan = execSync(commands.scan);
    scan.stdout.on('message', function (data) {
      wifiList.push(data)
    });
    scan.on('exit', function () {
      if (wifiList.indexOf(ssid) === -1) {
        cb('SSID Not Found')
      } else {
        cb(null, ssid)
      }
    })
  },
  connect: connection,
  connectOpen: openConnection,
  scan: scan,
  status: status,
  check: checkConnection
}