const WebSocket = require('ws');
const robot = require('robotjs');
const processWindows = require('node-process-windows');

const handlers = {
  focus: options => processWindows.focusWindow(options.window),
  sendKeys: options => {
    options.keys.reduce((promise, key) => {
      return promise.then(() => new Promise(resolve => {
        robot.keyToggle(key, 'down');
        setTimeout(() => {
          robot.keyToggle(key, 'up');
          resolve();
        }, options.time);
      }));
    }, Promise.resolve());
  },
};

const wss = new WebSocket.Server({ port: 18110 });
wss.on('connection', ws => {
  console.log('Connected');
  ws.on('message', message => {
    console.log('Received:', message);
    const options = JSON.parse(message);
    if (handlers[options.type]) handlers[options.type](options);
  });
});
