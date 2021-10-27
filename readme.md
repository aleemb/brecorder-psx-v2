### Getting Started

- Allow 3001 in AWS firewall (security group) for production testing https://eu-west-1.console.aws.amazon.com/ec2/v2/home?region=eu-west-1#SecurityGroups:group-id=sg-c84ceead
- https://github.com/websockets/ws#external-https-server
- https://devcenter.heroku.com/articles/node-websockets
- https://stackoverflow.com/questions/11744975/enabling-https-on-express-js
- https://www.websocket.org/echo.html
- https://blog.jayway.com/2015/04/13/600k-concurrent-websocket-connections-on-aws-using-node-js/

### Test

Run `node` from current folder then:

```
# ticker.js
ticker = new (require("./Ticker"))();
ticker.set([
  {"symbol": "EFERT", "open": "50.10", "close": "60.10", "low": "48.50", "high": "48.00", "price": "55.00"},
  {"symbol": "LUCK", "open": "400.00", "close": "400.00", "low": "390.00", "high": "410.00", "price": "405.00"},
]);
ticker.get("EFERT,LUCK").then(r => console.log(r));

# ioredis
var Redis = require("ioredis");
var options = { keyPrefix: "psx:", host: "127.0.0.1"};
redis = Redis.createClient(options);
redis.hmget("ticks", ["EFERT", "LUCK"]).then(r => console.log(r));
```

### Live Client Test
```
window.addEventListener("load", function() {
    window.debug && console.log('add');
    connect = () => {
      const backoff = Math.random() * (8000 - 3000) + 3000; // range 3k-8k
      window.ws = new WebSocket("wss://wss.newskit.com:3001");
      ws.onerror = (e) => window.debug && console.log("ERROR", e) && ws.close();
      ws.onclose = (e) => setTimeout(() => connect(), backoff);
      ws.onmessage = (e) => window.debug && console.log(e.data);
      ws.onopen = (e) => {
        console.log('Conn');
        window.debug && console.log('Subscribe HASCOL...');
        ws.send('HASCOL');
      }
    };
    connect();
  }, false);
```

### Server Monitoring

```
netstat -an | grep :3001 | wc -l
netstat -natp | wc -l
```

- CPU Usage Baseline Performance
  - https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/burstable-credits-baseline-concepts.html
  - For t3a.small its 20% VCPU, anything higher means it will eat into the credit usage
- https://aws.amazon.com/premiumsupport/knowledge-center/ec2-cpu-utilization-check-throttling/
  - If CPU Credit Balance nears zero, throttling will occur. 600 CPU credits are default available
  - CPU credit usage should stay low. t3a.small has 600 CPU credits


### Producton Certificate

A certificate for `wss.newskit.com` already exists in the repo but highlighting the steps in any case.

1. We will run the server on `wss.newskit.com` which will need an SSL certificate for WSS communications testing.

2. Use certbot (apt install) to generate a certificate `sudo certbot certonly --manual -d wss.newskit.com`

3. You can check active connectec clients on server via `netstat -natp`

### Development Certificate

A certificate for `localhost` already exists in the repob ut highlighting the steps in any case.

1. On localhost, we still need a certificate for `wss://` communication.

2. As per https://letsencrypt.org/docs/certificates-for-localhost/ we generate the certificates:

   ```
   openssl req -x509 -out localhost.crt -keyout localhost.key \
   -newkey rsa:2048 -nodes -sha256 \
   -subj '/CN=localhost' -extensions EXT -config <( \
       printf "[dn]\nCN=localhost\n[req]\ndistinguished_name = dn\n[EXT]\nsubjectAltName=DNS:localhost\nkeyUsage=digitalSignature\nextendedKeyUsage=serverAuth")

   ```

### Testing on localhost

Via https://github.com/lynckia/licode/issues/1149#issuecomment-389951535

1. If running http server (`node server-express.js`), open https://locahost:3001. It's possible you will see a certificate warning. If so, accept it and open another duplicate tab and the console of that should let you play with wss.
2. If running wss server only (`node server.js`) , open https://localhost:3001. It will be stuck on loading indicator, which is fine. Open the JS console and it should let you play with wss.

JS Console:

```
websocket = new WebSocket("wss://localhost:3001");
websocket.onopen = function(evt) { console.log('open') };
websocket.onmessage = function(evt) { console.log('RES: ' + evt.data) };
```

### Client Side Code

The code below reconnects on disconnection.

```js
connect = () => {
  const backoff = Math.random() * (8000 - 3000) + 3000; // range 3k-8k
  const ws = new WebSocket("wss://" + window.location.host);
  ws.onerror = (e) => console.error("err", e) && ws.close();
  ws.onclose = (e) => setTimeout(() => connect(), backoff);
  ws.onmessage = (e) => console.log("RES:" + e.data);
};
connect();
```

References:

- https://stackoverflow.com/a/1527820/50475
- https://stackoverflow.com/a/8231481/50475

### Web Workers

Multiple tabs in the browser can result in multiple WSS connections. While not a big issue we can avoid this using web workers.

- https://stackoverflow.com/questions/10886910/how-to-maintain-a-websockets-connection-between-pages
- https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Using_web_workers

### Server Side Throttling

Do we even care to throttle? What if we build an upstream service around it and let others access it freemium?

We can use Varnish to throttle connections as it supports Web Sockets since v4.

We can also consider a native nodeJS or Express server throttling library.

### Considerations

In node we store all data. What if a ticker is retired? It should be deprecated but Redis doesn't allow expiry on HSET children, only the entire set.

### Pub/Sub

Redis Pub/Sub Performance Notes: https://groups.google.com/forum/#!topic/redis-db/R09u__3Jzfk
