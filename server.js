const ExpressClass = require('./expressClass');
const Backend = require('./backend');
const CommunicationClass = require('./communicationClass');
const CommunicationAgentClass = require('./communicationAgentClass');

class Main {

  backend;

  constructor() {
    this.backend = new Backend()
  }

  startExpress(port) {
    const express = ExpressClass.startServer(
      port,                  // Pass the port directly
      this.backend,          // Pass the backend instance
      './files/html-public', // Static files path
      'index.html',          // Main HTML file
      '/getResponse'         // Request route
    );
  }

  startCommunicationServer(url, sourceID) {
    const agent = new CommunicationAgentClass()
    agent.initializeWebServerAgent(url)
    const client = CommunicationClass.startServer(sourceID, this.backend, agent, 1000)
    return client
  }

}

function main() {
  let m = new Main()
  let port = 3000
  // let serverUrl = 'https://ali-colab.glitch.me/getResponse'
  let serverUrl = 'http://127.0.0.1:3000/getResponse'
  let sourceID = 'glitch'
  m.startExpress(port)
  let client = m.startCommunicationServer(serverUrl, sourceID)
  global.client = client
}

main()


// git config receive.denyCurrentBranch ignore