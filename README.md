# Wifi For Pi

`connect(ssid, passphrase, cb)` - Connects to provided secure network via wpa-supplicant commands.

`connectOpen(ssid, cb)` - Connects to provided open network via wpa-supplicant commands.
`scan(cb)` - Scans for networks
`check(ssid, cb)` - checks for the presence of a SSID

## Notes
Tested on Raspberry Pi 3

## check(ssid, callback)
The **check** command is used to return the state of the network with the specified ssid

``` javascript
var piWifi = require('pi-wifi');

check('myTestNetwork', function(err, result) {
  console.log(result);
});

// =>
{
  selected: ...,
  connected: ...,
  ip: ...
}
```

## connectTo(details, callback)
The **connectTo** command is used to connect to a network with the parameters specified (This can connect to open and secure networks including 802.1x)
**details** can contain the following:
key_mgmt You can specify the type of security to use. (Optional)
ssid (Optional, required for secure and enterprise networks)
username (Optional, required for enterprise networks)
password (Optional, required for secure or enterprise networks)
eap
phase1
phase2

``` javascript
var piWifi = require('pi-wifi');

var networkDetails = {
  ssid: 'MyNetwork',
  username: 'demo',
  password: 'swordfish'
};

connectTo(details, function(err) {
  if(!err) {
    console.log('Connection was successful!');
  } else {
    console.log(err.message);
  }
});

// =>
{
  selected: ...,
  connected: ...,
  ip: ...
}
```






check: checkConnection,
connectTo: connection,
connectToId: connectToId,
connect: secureConnection,
connectOpen: openConnection,
connectEAP: enterpriseConnection,
detectSupplicant: detectSupplicant,
listNetworks: listNetworks,
interfaceDown: interfaceDown,
interfaceUp: interfaceUp,
restartInterface: restartInterface,
scan: scan,
startSupplicant: startSupplicant,
status: status