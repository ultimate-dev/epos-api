#!/usr/bin/env node

const app = require("./app");
const http = require("http").createServer(app);
const io = require("socket.io")(http);

io.on("connection", (socket) => {
  console.log("SOCKET - Connection");
  socket.on("disconnect", function () {
    console.log("SOCKET - Disconnect");
  });
});

/**
 * Port Configuration
 */
const PORT = process.env.PORT || 3000;

app.set("io", io);
app.set("port", PORT);

/**
 * Listen Port
 */
http.listen(PORT, () => console.log(`Server Started: http://localhost:${PORT}`));
