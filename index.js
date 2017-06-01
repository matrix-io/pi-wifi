/* Intended to be run ON the Raspberry Pi */

var tools = require('wireless-tools');
var async = require('async');

const defaultOpenKey = 'NONE';
const defaultEnterpriseKey = 'WPA-EAP';
const defaultSupplicantConfigFile = '/etc/wpa_supplicant/wpa_supplicant.conf';
const defaultDNSFile = '/etc/resolv.conf';
const defaultInterface = 'wlan0';

var currentInterface = defaultInterface;

const commands = {
  detectSupplicant: 'ps -fea | grep -v grep | grep wpa_supplicant',
  interfaceDown: 'ifdown --force :INTERFACE',
  interfaceUp: 'ifup :INTERFACE',
  scan: 'sudo iwlist wlan0 scan | grep ESSID | cut \'"\' -f2',
  startSupplicant: 'sudo wpa_supplicant -Dwext -c :CONFIG_FILE -B -i :INTERFACE  && sudo chattr -i :DNS_FILE',
  wpaDisconnect: 'wpa_cli disconnect',
  wpaInterface: 'wpa_cli interface :INTERFACE',
  wpaList: 'wpa_cli list_networks'
};


var exec = require('child_process').exec;

/**
* @method scan
* @description scan available wifi networks
* @param {Function} callback
* @return {Array[Object]}
*/
function scan(callback) {
  tools.wpa.scan(currentInterface, function (err, data) {
    if (err || !data.hasOwnProperty('result') || data.result !== 'OK') return callback(err, data);
    setTimeout(function () {
      //console.log('Scan results:');
      tools.wpa.scan_results(currentInterface, function (err, networks) {
        callback(err, networks);
      });
    }, 1000);
  });
}


/**
* @method findConnection
* @description Search a network on the known networks list and return it's network id, fails if not found
* @param {string} ssid Network ssid
* @param {Function(err, networkId)} callback Returns error if the network isn't found, id of the network found
*/
function findConnection(ssid, callback) {

  var networkId;
  //console.log('Listing...');
  listNetworks(function (err, networksArray) {
    if (!err) {
      //console.log('Looking for the network...');
      for (var i = 0; i < networksArray.length; i++) {
        if (networksArray[i].ssid === ssid) {
          //console.log('Network ' + networksArray[i].network_id + ' found');
          return callback(err, networksArray[i].network_id);
        }
      }
    }
    //console.log('Network not found...');
    return callback(err, networkId);
  });
}

/**
* @method setCurrentInterface
* @description Specify the interface to use
* @param {string} iface Intertface to set
* @param {function} callback Returns error if unable to set the interface
*/
function setCurrentInterface(iface, callback) {
  exec(replaceInCommand(commands.wpaInterface, { interface: iface }), function (err) { 
    if (!err) currentInterface = iface;
    return callback(err);
  });
}

/**
* @method checkConnectionDetails
* @description Verifies the parameters details and if it isn't properly formed it will return an error, undefined otherwise
* @param {Object} params Json object with the network parameters
* @param {Function(err)} callback Returns error if the connection isn't successful
*/
function checkConnectionDetails(/*params*/) {
  var err;
  //TODO implement this verification (e.g.: If a secure network is missing a password error out)
  return err;
}

/**
 * @method prepareConnectionDetails
 * @param {Object} details
 * @return {Object} Returns an adjusted json object with the proper format and default parameters required
 */
function prepareConnectionDetails(details) {

  var params = {};
  if (details.hasOwnProperty('ssid')) params.ssid = '\'"' + details.ssid + '"\'';  //Add ssid

  if (!details.hasOwnProperty('password')) {
    if (!details.hasOwnProperty('key_mgmt')) params.key_mgmt = defaultOpenKey; //Set key_mgmt for an open network
  } else if (!details.hasOwnProperty('username')) { //If no user then it is a regular secured network
    params.psk = '\'"' + details.password + '"\'';
  } else { //If it has password and user it must be an enterprise network
    params.key_mgmt = defaultEnterpriseKey; //Set key_mgmt for default enterprise network (802.1x)
    params.identity = '\'"' + details.username + '"\'';
    params.password = '\'"' + details.password + '"\'';
    if (!details.hasOwnProperty('eap')) params.eap = 'PEAP';
    //if (!details.hasOwnProperty('phase2')) params.phase2 = '\'"autheap=MSCHAPV2"\'';
  }

  if (details.hasOwnProperty('eap')) params.eap = details.eap;
  if (details.hasOwnProperty('phase1')) params.phase1 = details.phase2;
  if (details.hasOwnProperty('phase2')) params.phase2 = details.phase2;
  if (details.hasOwnProperty('key_mgmt')) params.key_mgmt = details.key_mgmt; //Add Key management if found

  return params;
}

/**
* @method connection
* @description Connects to a network with the parameters specified (This can connect to open and secure networks including EAP 802.1x)
* @param {Object} details Network details
* - {string} key_mgmt You can specify the type of security to use. (Optional)
* - {string} ssid (Optional, required for secure and enterprise networks)
* - {string} username (Optional, required for enterprise networks)
* - {string} password (Optional, required for secure or enterprise networks)
* @param {Function(err)} callback Returns error if the network creation isn't successful
*/
function connection(details, callback) {
  var netId;

  var err = checkConnectionDetails(details);
  if (err) return callback(err);

  var params = prepareConnectionDetails(details);

  findConnection(details.ssid, function (err, networkId) { //Look for an existing connection with that SSID
    async.series({
      remove: function(next) { //Remove the network if found
        if (networkId === undefined) return next(undefined);
        tools.wpa.remove_network(currentInterface, networkId, next);
      },
      create: function(next) { //Create a new network
        createConnection(function (err, networkId) {
          if (!err) netId = networkId;
          //console.log('Created network:', netId, err);
          next(err);
        });
      },
      setup: function (next) { //Add provided parameters to network
        setupConnection(netId, params, next);
      }, //Can't use async.apply due to netId being shared
      start: function(next) { connectToId(netId, next); } //Actually connect to the network
    }, function (err, results) {
      if (err && results.create) tools.wpa.remove_network(currentInterface, netId, callback);
      else callback(err);
    });
  });
}


/**
* @method openConnection
* @description Connects to an open network with the ssid specified
* @param {string} ssid Network ssid
* @param {Function(err)} callback Returns error if the connection isn't successful
*/
function openConnection(ssid, callback) {

  var params = {
    ssid: ssid
  };
  connection(params, callback);
}


/**
* @method enterpriseConnection
* @description Connects to a network with the ssid specified using the password provided
* @param {string} ssid Network ssid
* @param {string} username User/identity to use on authentication
* @param {string} password Password to use on authentication
* @param {Function(err)} callback Returns error if the connection isn't successful
*/
function enterpriseConnection(ssid, username, password, callback) {

  var params = {
    ssid: ssid,
    username: username,
    password: password
  };
  connection(params, callback);
}


/**
* @method secureConnection
* @description Connects to a network with the ssid specified using the password provided
* @param {string} ssid Network ssid
* @param {string} ssid Network psk
* @param {Function(err)} callback Returns error if the connection isn't successful
*/
function secureConnection(ssid, password, callback) {

  var params = {
    ssid: ssid,
    password: password
  };
  connection(params, callback);

}


/** 
* @method createConnection
* @description Creates a connection record and returns its network id if successful
* @param {Function(err, networkId)} callback Returns error if the network creation fails, Network id
*/
function createConnection(callback) {
  tools.wpa.add_network(currentInterface, function (err, netId) {
    if (!err && netId.hasOwnProperty('result')) netId = netId.result;
    callback(err, netId);
  });
}


/**
* @method setupConnection
* @description Sets the parameters for a network
* @param {Integer} networkId Network id
* @param {Object} params Json object with network parameters to set (Name, Value)
* @param {Function(err)} callback Returns error if the process fails
*/
function setupConnection(netId, params, callback) {
  async.eachOf(params, function (value, key, next) { //For each one of the parameters listed
    console.log('>>> Setting', key, 'with', value);
    setNetworkParameter(currentInterface, netId, key, value, next); //Set it to the network
  }, callback);
}


/**
 * @method setNetworkParameter
 * @description Sets a network parameter
 * @param {string} interface Interface to use
 * @param {integer} networkId Network to set it to
 * @param {string} name Parameter key/name
 * @param {string} value Parameter value
 * @param {function} callback Returns an error if the parameter wasn't set
 */
function setNetworkParameter(interface, networkId, name, value, callback) {
  tools.wpa.set_network(interface, networkId, name, value, callback);
}


/**
* @method status
* @description Show status parameters of the interface specified, if no interface is provided the selected one is used
* @param {string} iface Interface to get status from. (If not provided it defaults to the currently selected one)
* @param {Function(err)} callback Returns error if the process fails, status JSON object with the interface status
* @example
*
* status('wlan0', function(err, status){
*   if(!err) console.log(status);
* });
* // => 
* {
*   bssid: '2c:f5:d3:02:ea:d9',
*   frequency: 2412,
*   mode: 'station',
*   key_mgmt: 'wpa2-psk',
*   ssid: 'Fake-Wifi',
*   pairwise_cipher: 'CCMP',
*   group_cipher: 'CCMP',
*   p2p_device_address: 'e4:28:9c:a8:53:72',
*   wpa_state: 'COMPLETED',
*   ip: '10.34.141.168',
*   mac: 'e4:28:9c:a8:53:72',
*   uuid: 'e1cda789-8c88-53e8-ffff-31c304580c1e',
*   id: 0
* }
*/
function status(iface, cb) {
  if (cb === undefined) {
    cb = iface;
    iface = currentInterface;
  }  
  tools.wpa.status(iface, cb);
}


/**
* @method checkConnection
* @description Returns the state of the network with the specified ssid
* @param {string} ssid Network ssid
* @param {Function(err, result)} Error if unable to get network status, Object with connection details
* {
*   selected: true | false,
*   connected: true | false,
*   ip: 192.168.0.2
* }
*/
function checkConnection(ssid, cb) {
  var result;
  status(function (err, status) {
    if (!err) {
      result = { selected: false, connected: false };
      if (status.hasOwnProperty('ssid') && status.hasOwnProperty('wpa_state')) {
        result.selected = (status.ssid === ssid);
        if (result.selected) result.connected = (status.wpa_state === 'COMPLETED');
        if (result.connected && status.ip) result.ip = status.ip;
      } else {
        err = new Error('Incomplete status object');
      }
    }
    cb(err, result);
  });
}


/**
* @method connectToId
* @description Enables a network, saves the configuration and selects the network with the id provided
* @param {Integer} networkId Network id
* @param {Function(err)} callback Returns error if the process fails
*/
function connectToId(networkId, callback) {
  //console.log('Enabling network ' + networkId + '...');
  tools.wpa.enable_network(currentInterface, networkId, function (err, data) {
    if (err || !data.hasOwnProperty('result') || data.result !== 'OK') return callback(err);
    //console.log('Saving config...');
    tools.wpa.save_config(currentInterface, function (err) {
      if (err || !data.hasOwnProperty('result') || data.result !== 'OK') return callback(err);
      //console.log('Selecting network...');
      tools.wpa.select_network(currentInterface, networkId, function (err, data) {
        if (err || !data.hasOwnProperty('result') || data.result !== 'OK') return callback(err);
        callback();
      });
    });
  });
}


/**
 * @method detectSupplicant
 * @description Looks for a running wpa_supplicant process and if so returns the config file and interface used
 * @param {function} callback (err, iface, configFile) Error if the process failed or no supplicant is running, Interface used, Config file used
 */
function detectSupplicant(callback) {
  exec(commands.detectSupplicant, function (err, stdout) {
    var iface, configFile;
    var result = false;
    if (!err) {
      var lines = stdout.split('\n');
      for (var i = 0; i < lines.length; i++) {
        if (lines[i].indexOf('wlan') > -1) {
          var options = lines[i].split(' ');
          if (options.indexOf('-i') > -1) iface = options[options.indexOf('-i') + 1];
          if (options.indexOf('-c') > -1) configFile = options[options.indexOf('-c') + 1];
          result = true;
        }
      }
    }
    callback(err, iface, configFile);
  });
}


/**
 * @method startSupplicant
 * @description Starts a wpa_supplicant instance
 * @param {object} options Json object where the interface, config file and dns file to use can be specified, otherwhise default values will be selected
 * - iface: Interface to use. Defaults to the currently selected one
 * - config: Configuration file for the supplicant file. Defaults to /etc/wpa_supplicant/wpa_supplicant.conf
 * - dns: DNS file to use. Defaults to /etc/resolv.conf
 * @param {function} callback (err) Error if the process fails
 */
function startSupplicant(options, callback) {
  if (callback === undefined) callback = options; //If no options is passed and just the callback is provided
  
  var iface = options.hasOwnProperty('iface') ? options.iface : currentInterface;
  var configFile = options.hasOwnProperty('config') ? options.config : defaultSupplicantConfigFile;
  var dnsFile = options.hasOwnProperty('dns') ? options.dns : defaultDNSFile;
  exec(replaceInCommand(commands.startSupplicant, { config_file: configFile, interface: iface, dns_file: dnsFile }), callback);
}


/**
 * @method interfaceUp
 * @description Raises the interface provided
 * @param {string} iface Interface to start
 * @param {function} callback (err) Returns an error if the process fails
 */
function interfaceUp(iface, callback) {
  iface = iface || currentInterface;
  exec(replaceInCommand(commands.interfaceUp, { interface: iface }), function (err) {
    callback(err);
  });
}


/**
 * @method interfaceDown
 * @description Drops the interface provided
 * @param {string} iface Interface to stop
 * @param {function} callback (err) Returns an error if the process fails
 */
function interfaceDown(iface, callback) {
  iface = iface || currentInterface;
  exec(replaceInCommand(commands.interfaceDown, { interface: iface }), function (err) {
    callback(err);
  });
}

/**
 * @method restartInterface
 * @description Restarts the interface provided
 * @param {string} iface Interface to restart
 * @param {function} callback (err) Returns an error if the process fails
 */
function restartInterface(iface, callback) {
  async.series([
    async.apply(interfaceDown, iface),
    async.apply(interfaceUp, iface),
  ], callback);
}


/**
 * @method listNetworks
 * @description List the networks in an array, each network has Network ID, SSID, BSSID and FLAGS
 * @param {function} callback (err, networksArray) returns err if the process fails, each network is a Json object that contains network_id, ssid, bssid and flags
 */
function listNetworks(callback) {
  exec(commands.wpaList, function (err, stdout) {
    var tempNetworkJson, parameters, networksArray;

    if (!err) {
      var networksList = stdout.split('\n');
      networksArray = [];
      networksList.splice(0, 2); //Remove headers
      networksList.splice(networksList.length - 1, 1); //Remove footer

      for (var networkIndex in networksList) {
        tempNetworkJson = {};

        parameters = networksList[networkIndex].split('\t');
        tempNetworkJson = {
          network_id: parameters[0],
          ssid: parameters[1],
          bssid: parameters[2],
          flags: parameters[3],
        };
        networksArray.push(tempNetworkJson);
      }
    }

    callback(err, networksArray);
  });
}

/**
 * @method disconnect
 * @description Disconnects from the network on the current interface
 * @param {function} callback (err) returns err if the process fails
 */
function disconnect(callback) {
  exec(commands.wpaDisconnect, callback);
}


/**
 * @method disableSupplicant
 * @description Kills the supplicant process for the specified interface
 * @param {string} iface Interface used by supplicant (If not iface is supplied the current one will be used)
 * @param {function} callback (err) returns err if unable to kill the process
 */
function disableSupplicant(iface, callback) {
  if (callback === undefined) {
    callback = iface; //If no options is passed and just the callback is provided
    iface = currentInterface;
  }
  tools.wpa_supplicant.disable(iface, callback);
}

/**
 * @method replaceInCommand
 * @description Used to replace preset variables strings (e.g.: This is a :VAR text)
 * @param {string} text Text containg the variables to be replaced
 * @param {Object} toReplace Json object that contains the string to find (key) and the replace string (value)
 * @return Returns the text after replacing the variables
 */
function replaceInCommand(text, toReplace) {
  for (var placeHolder in toReplace) {
    text = text.replace(new RegExp(':' + placeHolder.toUpperCase(), 'g'), toReplace[placeHolder]);
  }
  return text;
}

module.exports = {
  check: checkConnection,
  connectTo: connection,
  connectToId: connectToId,
  connect: secureConnection,
  connectOpen: openConnection,
  connectEAP: enterpriseConnection,
  disconnect: disconnect,
  detectSupplicant: detectSupplicant,
  interfaceDown: interfaceDown,
  interfaceUp: interfaceUp,
  killSupplicant: disableSupplicant,
  listNetworks: listNetworks,
  restartInterface: restartInterface,
  scan: scan,
  setCurrentInterface: setCurrentInterface,
  startSupplicant: startSupplicant,
  status: status
}