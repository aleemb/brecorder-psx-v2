const fs = require("fs");
const net = require("net");
var LineByLineReader = require('line-by-line');

const port = process.argv[2];

// Usage: node feed.js
console.log(`\n\nFeed Started! Try it via commands:`);
console.log(`nc -v -w120 127.0.0.1 ${port}`);
console.log(`nc -v -w120 127.0.0.1 ${port} 2>&1 | grep --line-buffered -E "EFERT|HASCOL|LUCK|GATM"\n`);

// https://gist.github.com/tedmiston/5935757
var server = net.createServer(function (socket) {

  const filePath = `${__dirname}/bluechips.txt`;

  /**
   * Load the entire file into memory and return a random line. This never ends even for very small files.
   */
  var random = () => {
    const data = fs.readFileSync(filePath, "utf8").split("\n");

    let interval = setInterval(() => {
      // read a random line from the file
      const line1 = data[Math.floor(Math.random() * data.length)] + "\n";
      const line2 = data[Math.floor(Math.random() * data.length)] + "\n";
      const line3 = data[Math.floor(Math.random() * data.length)] + "\n";
      socket.write(line1 + line2 + line3);
    }, 1000);

    socket.pipe(socket);
    socket.on("error", () => clearInterval(interval)); // triggers when client disconnected (ctrl^c)
  }


  /**
   * Streams an entire file, line-by-line, sending anywhere between one and a handful of lines per second
   */
   var streaming = () => {
    const reader = new LineByLineReader(filePath);
    reader.on('line', function (line) {
      reader.pause();
      setTimeout(() => reader.resume(), 100);
      socket.write(line + "\n");
    });
  
    socket.pipe(socket);

    // triggers when client disconnected (ctrl^c)
    socket.on("error", (e) => {
      console.log("Client disconnected from socket");
      reader.pause();
      setTimeout(() => reader.resume(), 1000);
    }); 
  }

  // random();
  streaming();
});

server.listen(port, "127.0.0.1");
