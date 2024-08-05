const config = require('./config.js');

console.log('logger started');

class Logger {
  httpLogger = (req, res, next) => {
    let send = res.send;
    res.send = (resBody) => {
      const logData = {
        authorized: !!req.headers.authorization,
        path: `${req.hostname}${req.originalUrl}`,
        ip: req.ip,
        method: req.method,
        statusCode: res.statusCode,
        req: JSON.stringify(req.body),
        res: resBody,
      };
      const level = this.statusToLogLevel(res.statusCode);
      this.log(level, 'http', logData);
      res.send = send;
      console.log('logging', logData);
      return res.send(resBody);
    };
    next();
  };

  log(level, type, logData) {
    logData = this.sanitize(logData);
    const labels = { component: config.logging.source, level: level, type: type };
    const values = [this.nowString(), logData];
    const logEvent = { streams: [{ stream: labels, values: [values] }] };

    this.sendLogToGrafana(logEvent);
  }

  statusToLogLevel(statusCode) {
    if (statusCode >= 500) return 'error';
    if (statusCode >= 400) return 'warn';
    return 'info';
  }

  nowString() {
    return (Math.floor(Date.now()) * 1000000).toString();
  }

  sanitize(logData) {
    logData = JSON.stringify(logData);
    logData = logData.replace(/\\"password\\":\s*\\"[^"]*\\"/g, '\\"password\\": \\"*****\\"');
    logData = logData.replace(/\\"token\\":\s*\\"[^"]*\\"/g, '\\"token\\": \\"*****\\"');

    return logData;
  }

  sendLogToGrafana(event) {
    const body = JSON.stringify(event);
    fetch(`${config.logging.url}`, {
      method: 'post',
      body: body,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.logging.userId}:${config.logging.apiKey}`,
      },
    })
      .then((res) => {
        if (!res.ok) console.log('Failed to send log to Grafana');
      })
      .catch((error) => {
        console.error('Error pushing logs:', error);
      });
  }
}
module.exports = new Logger();
