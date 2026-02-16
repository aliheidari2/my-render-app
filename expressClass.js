const express = require('express');
const path = require('path');

class ExpressClass {
  constructor() {
    this.app = express();
    this.methods = {};
    this.staticPath = null;
    this.app.use(express.json({ limit: '100mb' }));
  }

  setStaticFilesPath(staticPath) {
    this.staticPath = path.resolve(staticPath);
    this.app.use(express.static(this.staticPath));
  }

  setMainHtml(htmlFilename) {
    this.mainHtml = htmlFilename;
    this.app.get('/', (req, res) => {
      res.sendFile(path.join(this.staticPath, this.mainHtml));
    });
  }

  defineRoute(route, callback) {
    this.app.post(route, async (req, res) => {
      try {
        const result = await callback(req.body);
        res.json(result);
      } catch (error) {
        console.error(`Route error: ${error}`);
        res.status(500).send('Internal Server Error');
      }
    });
  }

  defineMethod(route, methodName, callback) {
    if (!this.methods[route]) {
      this.methods[route] = {};

      this.defineRoute(route, async (data) => {
        try {
          const { methodName, parameters } = data || {};
          if (!methodName || !this.methods[route][methodName]) {
            throw new Error(`Method '${methodName}' not found`);
          }
          const result = await this.methods[route][methodName](...(parameters || []));
          return result;
        } catch (error) {
          console.error(`Error handling method: ${error}`);
          return '';
        }
      });
    }

    this.methods[route][methodName] = callback;
    console.log(`Registered method '${methodName}' for route '${route}'`);
  }

  defineAllConfigs(staticFilesPath, mainHtml) {
    this.setStaticFilesPath(staticFilesPath);
    this.setMainHtml(mainHtml);
  }

  defineAllBackendMethods(route, backendInstance) {
    try {
      const methods = Object.getOwnPropertyNames(Object.getPrototypeOf(backendInstance))
        .filter(name => typeof backendInstance[name] === 'function' && name !== 'constructor');
      methods.forEach(methodName => {
        try {
          const method = backendInstance[methodName].bind(backendInstance);
          this.defineMethod(route, methodName, method);
        } catch (error) {
          console.error(`'${backendbackendInstance}' object has no attribute '${methodName}': ${error}`);
        }
      });
    } catch (error) {
      console.error(`Error loading backend file: ${error}`);
    }
  }

  static startServer(
    port = 5000,
    backendInstance,
    staticFilesPath = './files/static',
    mainHtml = 'index.html',
    requestRoute = '/getResponse',
  ) {
    let instance = new ExpressClass()
    instance.defineAllConfigs(staticFilesPath, mainHtml);
    instance.defineAllBackendMethods(requestRoute, backendInstance);
    instance.app.listen(port, '0.0.0.0', () => {
      console.log(`Server running on http://0.0.0.0:${port}`);
    });
    return instance;
  }

}

module.exports = ExpressClass;