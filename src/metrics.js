const config = require('./config.js');
const os = require('os');
const logger = require('./logger.js');

console.log('metrics started');

class MetricBuilder {
  constructor() {
    this._strings = [];
  }

  append(metricPrefix, metricName, metricValue) {
    const metric = `${metricPrefix},source=${config.metrics.source} ${metricName}=${metricValue}`;
    this._strings.push(metric);
    return this;
  }

  toString(delim = '\n') {
    return this._strings.join(delim);
  }
}

class Metrics {
  constructor() {
    this.requestLatency = 0;
    this.requests = {};
    this.purchase = { count: 0, revenue: 0, error: 0, latency: 0 };
    this.authEvents = { success: 0, failure: 0 };
    this.activeUsers = new Map();
  }

  sendMetricsPeriodically(period) {
    const timer = setInterval(() => {
      try {
        this.sendMetricToGrafana(this.getMetrics());
        logger.log('info', 'metrics', { msg: 'sent metrics' });
      } catch (error) {
        logger.log('error', 'metrics', { msg: 'Error sending metrics', err: { msg: error.message, stack: error.stack } });
      }
    }, period);

    timer.unref();
  }

  metricsReporter = (req, res) => {
    res.send(this.getMetrics());
  };

  getMetrics(delim = '\n') {
    const buf = new MetricBuilder();
    this.httpMetrics(buf);
    this.systemMetrics(buf);
    this.userMetrics(buf);
    this.purchaseMetrics(buf);
    this.authMetrics(buf);

    return buf.toString(delim);
  }

  requestTracker = (req, res, next) => {
    const httpMethod = req.method.toLowerCase();
    const previousValue = this.requests[httpMethod] ?? 0;
    this.requests[httpMethod] = previousValue + 1;

    const dateNow = Date.now();
    if (req.user) {
      if (this.activeUsers.has(req.user.id)) {
        this.activeUsers.get(req.user.id).last = dateNow;
      }
    }

    let send = res.send;
    res.send = (resBody) => {
      this.requestLatency += Date.now() - dateNow;
      res.send = send;
      return res.send(resBody);
    };

    next();
  };

  loginEvent = (userId, success) => {
    this.authEvents[success ? 'success' : 'failure'] += 1;
    if (success) {
      this.activeUsers.set(userId, { login: Date.now(), last: Date.now() });
    }
  };

  orderEvent = (orderEvent) => {
    this.purchase.count += orderEvent.count;
    this.purchase.revenue += orderEvent.revenue;
    this.purchase.error += orderEvent.error ? 1 : 0;
    if (orderEvent.end && orderEvent.start) {
      const latency = orderEvent.end - orderEvent.start;
      this.purchase.latency += latency;
    }
  };

  httpMetrics(buf) {
    buf.append('pizza_http_latency', 'total', this.requestLatency);
    const totalRequests = Object.values(this.requests).reduce((acc, curr) => acc + curr, 0);
    buf.append('pizza_http_request', 'all_total', totalRequests);
    Object.keys(this.requests).forEach((httpMethod) => {
      buf.append(`pizza_http_request`, `${httpMethod}_total`, this.requests[httpMethod]);
    });
  }

  systemMetrics(buf) {
    buf.append('pizza_system_cpu', 'percent', this.getCpuUsagePercentage());
    buf.append('pizza_system_memory', 'used', this.getMemoryUsagePercentage());
  }

  userMetrics(buf) {
    this.activeUsers.forEach((value, key) => {
      const expiresThreshold = Date.now() - 10 * 60 * 1000;
      if (value.last < expiresThreshold) {
        this.activeUsers.delete(key);
      }
    });
    buf.append('pizza_user_count', 'total', this.activeUsers.size);
  }

  purchaseMetrics(buf) {
    buf.append('pizza_purchase_count', 'total', this.purchase.count);
    buf.append('pizza_purchase_revenue', 'total', this.purchase.revenue);
    buf.append('pizza_purchase_latency', 'total', this.purchase.latency);
    buf.append('pizza_purchase_error', 'total', this.purchase.error);
  }

  authMetrics(buf) {
    buf.append('pizza_auth_success', 'total', this.authEvents.success);
    buf.append('pizza_auth_failure', 'total', this.authEvents.failure);
  }

  getCpuUsagePercentage() {
    const cpuUsage = os.loadavg()[0] / os.cpus().length;
    return cpuUsage.toFixed(2) * 100;
  }

  getMemoryUsagePercentage() {
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;
    const memoryUsage = (usedMemory / totalMemory) * 100;
    return memoryUsage.toFixed(2);
  }

  sendMetricToGrafana(metrics) {
    fetch(`${config.metrics.url}`, {
      method: 'post',
      body: metrics,
      headers: { Authorization: `Bearer ${config.metrics.userId}:${config.metrics.apiKey}` },
    }).catch((error) => {
      console.error('Error pushing metrics:', error);
    });
  }
}

module.exports = new Metrics();
