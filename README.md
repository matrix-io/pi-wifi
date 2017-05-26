# Wifi For Pi

The purpose of this module is to provide tools to connect to a Wifi

## Table of Contents

- [Installation](#installation) - How to install the module
- [Usage](#usage) - Getting started
- [API](#api) - Commands available
  - [check(ssid, callback)](#checkssid-callback) - State of the network with the specified ssid
  - [connectTo(ssid, callback)](#connecttossid-callback) - State of the network with the specified ssid
  - [connectToId(networkId, callback)](#connectToIdnetworkId-callback) - Connects to a network with the parameters specified (This can connect to open and secure networks including 802.1x)
  - [connect(ssid, password, callback)](#connectssid-password-callback) - Connects to a network with the ssid specified using the password provided
  - [connectOpen(ssid, callback)](#connectOpenssid-callback) - Connects to an open network with the ssid specified
  - [connectEAP(ssid, password, callback)](#connectEAPssid-password-callback) - Connects to a network with the ssid specified using the password provided
  - [detectSupplicant(callback)](#detectSupplicantcallback) - Looks for a running wpa_supplicant process and if so returns the config file and interface used
  - [listNetworks(callback)](#listNetworkscallback) - List the networks in an array, each network has Network ID, SSID, BSSID and FLAGS
  - [interfaceDown(callback)](#interfaceDowncallback) - Drops the interface provided
  - [interfaceUp(callback)](#interfaceUpcallback) - Raises the interface provided
  - [restartInterface(callback)](#restartInterfacecallback) - Restarts the interface provided
  - [scan(callback)](#scancallback) - Scan available wifi networks
  - [setCurrentInterface(iface)](#setCurrentInterfaceiface) - Specify the interface to use
  - [startSupplicant(callback)](#startSupplicantcallback) - Starts a wpa_supplicant instance
  - [status(iface, callback)](#statusiface-callback) - Show status parameters of the interface specified, if no interface is provided the selected one is used
- [Notes](#notes)


## Installation

On your project root execute:

``` shell
$ npm install --save pi-wifi
```

## check(ssid, callback)
The **check** function is used to return the state of the network with the specified ssid

``` javascript
var piWifi = require('pi-wifi');

piWifi.check('myTestNetwork', function(err, result) {
  if (err) {
    return console.error(err.message);
  }
  console.log(result);
});

// => If everything is working
// { selected: true, connected: true, ip: '192.168.0.12' }
// => Alternatively
// { selected: false, connected: false }
```

## connectTo(details, callback)
The **connectTo** function is used to connect to a network with the parameters specified (This can connect to open and secure networks including 802.1x)

The **details** object can contain the following:

- ***key_mgmt*** You can specify the type of security to use. (Optional)
- ***ssid*** (required for secure and enterprise networks)
- ***username*** (required for enterprise networks)
- ***password*** (required for enterprise networks)	
- ***eap***
- ***phase1***
- ***phase2***

``` javascript
var piWifi = require('pi-wifi');

var networkDetails = {
  ssid: 'MyNetwork',
  username: 'demo',
  password: 'swordfish'
};

piWifi.connectTo(details, function(err) {
  if(!err) {
    console.log('Connection was successful!');
  } else {
    console.log(err.message); //Failed to connect
  }
});
*/
```

## connectToId(networkId, callback)
The **connectToId** function is used enables the network, saves the configuration and then select the network with the id provided

``` javascript
var piWifi = require('pi-wifi');

piWifi.connectToId(2, function(err) {
  if (err) {
    return console.error(err.message);
  }
  console.log('Successful connection!');
});
```

## connect(ssid, password, callback)
The **connect** function is used to connect to a network with the ssid specified using the password provided
***(Avoid using this as it is only for backwards compatibility and may be deprecated in the future)***

``` javascript
var piWifi = require('pi-wifi');

piWifi.connect('myTestNetwork', 'MyTestPassword', function(err) {
  if (err) {
    return console.error(err.message);
  }
  console.log('Successful connection!');
});
```

## connectOpen(ssid, callback)
The **connectOpen** function is used to connect to an open network with the ssid specified
***(Avoid using this as it is only for backwards compatibility and may be deprecated in the future)***

``` javascript
var piWifi = require('pi-wifi');

piWifi.connectOpen('myTestNetwork', function(err) {
  if (err) {
    return console.error(err.message);
  }
  console.log('Successful connection!');
});
```


## connectEAP(ssid, password, callback)
The **connectEAP** function is used to connect to a network with the ssid specified using the password provided
***(Avoid using this as it is only here for consistency and may be deprecated in the future)***

``` javascript
var piWifi = require('pi-wifi');

piWifi.connectEAP('myTestNetwork', 'MyTestUsername', 'MyTestPassword', function(err) {
  if (err) {
    return console.error(err.message);
  }
  console.log('Successful connection!');
});
```

## detectSupplicant(callback)
The **detectSupplicant** function is used to look for a running wpa_supplicant process and if found returns the config file and interface used

``` javascript
var piWifi = require('pi-wifi');

piWifi.detectSupplicant(function(err, iface, configFile) {
  if (err) {
    return console.error(err.message);
  }
  console.log('Supplicant running in interface', iface, 'using the configuration file', configFile);
});
```

## listNetworks(callback)
The **listNetworks** function is used to list the networks in an array, each network has Network ID, SSID, BSSID and FLAGS

``` javascript
var piWifi = require('pi-wifi');

piWifi.listNetworks(function(err, networksArray) {
  if (err) {
    return console.error(err.message);
  }
  console.log(networksArray);
});

// =>
// [{ network_id: 0, ssid: 'MyNetwork', bssid: 'any', flags: '[DISABLED]' },
// { network_id: 1, ssid: 'Skynet', bssid: 'any', flags: '[CURRENT]' }]
```

## interfaceDown(callback)
The **interfaceDown** function is used to drop the interface provided

``` javascript
var piWifi = require('pi-wifi');

piWifi.interfaceDown('wlan0', function(err) {
  if (err) {
    return console.error(err.message);
  }
  console.log('Interface dropped succesfully!');
});
```

## interfaceUp(callback)
The **interfaceUp** function is used to raise the interface provided

``` javascript
var piWifi = require('pi-wifi');

piWifi.interfaceUp('wlan0', function(err) {
  if (err) {
    return console.error(err.message);
  }
  console.log('Interface raised succesfully!');
});
```

## restartInterface(callback)
The **restartInterface** function is used to restart the interface provided

``` javascript
var piWifi = require('pi-wifi');

piWifi.restartInterface('wlan0', function(err) {
  if (err) {
    return console.error(err.message);
  }
  console.log('Interface restarted succesfully!');
});
```

## scan(callback)
The **scan** function is used to scan available wifi networks

``` javascript
var piWifi = require('pi-wifi');

piWifi.scan(function(err, networks) {
  if (err) {
    return console.error(err.message);
  }
  console.log(networks);
});

// =>
//[ 
//  { bssid: 'aa:bb:cc:dd:ee:ff',
//    frequency: 2462,
//    signalLevel: -40,
//    flags: '[WPA2-PSK-CCMP][WPS][ESS]',
//    ssid: 'MyNetwork' },
//  { bssid: '11:22:33:44:55:66',
//    frequency: 2462,
//    signalLevel: -28,
//    flags: '[WPA2-PSK-CCMP][ESS]',
//    ssid: 'AnotherNetwork' },
//  { bssid: 'aa:11:bb:22:cc:33',
//    frequency: 2462,
//    signalLevel: -33,
//    flags: '[WPA2-EAP-CCMP-preauth][WPS][ESS]',
//    ssid: 'MyEnterpriseNetwork' },
//  { bssid: 'c0:56:27:44:3b:9c',
//    frequency: 2412,
//    signalLevel: -59,
//    flags: '[WPA-PSK-CCMP+TKIP][WPA2-PSK-CCMP+TKIP][ESS]',
//    ssid: 'MyGuestsNetwork' 
//  }
//]
```

## setCurrentInterface(iface)
The **setCurrentInterface** function is used to specify the interface to use as default

``` javascript
var piWifi = require('pi-wifi');
piWifi.setCurrentInterface('wlan1');

piWifi.status('wlan0', function(err, status) {
  if (err) {
    return console.error(err.message);
  }
  console.log(status);
});

```

## startSupplicant(callback)
The **startSupplicant** function is used to start a wpa_supplicant instance

``` javascript
var piWifi = require('pi-wifi');

piWifi.startSupplicant({iface: 'wlan0', config: '/etc/wpa_supplicant/wpa_supplicant.conf', dns: '/etc/resolv.conf'}, function(err, networks) {
  if (err) {
    return console.error(err.message);
  }
  console.log('Supplicant instance successfully started!');
});

```

# status(iface, callback)
The **status** function is used to show status parameters of the interface specified, if no interface is provided the selected one is used

``` javascript
var piWifi = require('pi-wifi');

piWifi.status('wlan0', function(err, status) {
  if (err) {
    return console.error(err.message);
  }
  console.log(status);
});

// =>
//{
//  bssid: '2c:f5:d3:02:ea:d9',
//  frequency: 2412,
//  mode: 'station',
//  key_mgmt: 'wpa2-psk',
//  ssid: 'MyNetwork',
//  pairwise_cipher: 'CCMP',
//  group_cipher: 'CCMP',
//  p2p_device_address: 'aa:bb:cc:dd:ee:ff',
//  wpa_state: 'COMPLETED',
//  ip: '10.20.30.40',
//  mac: 'a1:b2:c3:d4:e5:f6',
//  uuid: 'e1cda789-8c88-53e8-ffff-31c304580c22',
//  id: 0
//}
```

## Notes
Tested on Raspberry Pi 3
