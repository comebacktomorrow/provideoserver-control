'use strict';

const net = require('net');

const compose = data => {
  // clone values
  data = Object.assign({}, data);

  // set limits
  data.brightness = Math.max(0, Math.min(3, data.brightness || 0));
  data.address = Math.max(0, Math.min(127, data.address || 0));

  // sanitize boolean values
  data.t1 = !!data.t1 ? 1 : 0;
  data.t2 = !!data.t2 ? 1 : 0;
  data.t3 = !!data.t3 ? 1 : 0;
  data.t4 = !!data.t4 ? 1 : 0;

  const HEADER = 0x80 + data.address;

  let CTRL = 0x00;

  // set MSB of brightness
  CTRL |= (data.brightness & 0b10) << 4; // same as >> 1 << 5

  // set LSB of brightness
  CTRL |= (data.brightness & 0b01) << 4; // same as >> 0 << 4

  // Set tally
  CTRL |= (data.t1 & 0b1);
  CTRL |= (data.t2 & 0b1) << 1;
  CTRL |= (data.t3 & 0b1) << 2;
  CTRL |= (data.t4 & 0b1) << 3;

  const DATA = Buffer.from(data.label.padEnd(16, '\0')).subarray(0, 16);

  return Buffer.concat([
    Buffer.from([
      HEADER,
      CTRL
    ]),
    DATA
  ]);
};

const sendUMDMessage = (controller, targetAddress, targetPort, message) => {
  const message = compose({
    address: targetAddress,
    brightness: 3,
    label: message,
    t1: 1,
    t2: 0,
    t3: 0,
    t4: 0
  });

  // Create a TCP client
  const client = new net.Socket();

  // Connect to the server
  client.connect(targetPort, targetAddress, () => {
    console.log('Connected to server');
    
    // Send the message
    client.write(message, err => {
      if (err) {
        console.error('Error sending message:', err);
      } else {
        console.log('Message sent');
      }
    });
  });

  // Handle errors
  client.on('error', err => {
    console.error('Connection error:', err);
  });

  // Close the connection when done
  client.on('close', () => {
    console.log('Connection closed');
  });
};

module.exports = { sendUMDMessage };