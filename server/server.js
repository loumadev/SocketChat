var wsPort = 3241;
var wsServer = require("websocket").server;
var http = require("http");

var history = [];

class Client {
    constructor(socket) {
        this.socket = socket;
        this.name = undefined;
        Client.clients.push(this);
    }
    send(object) {
        this.socket.send(JSON.stringify(object));
    }
    flush() {
        Client.clients.splice(Client.clients.indexOf(this), 1);
    }
    static broadcast(object) {
        for(var i = 0; i < Client.clients.length; i++) {
            Client.clients[i].socket.send(JSON.stringify(object));
        }
    }
    static broadcastExcept(object, client) {
        for(var i = 0; i < Client.clients.length; i++) {
            if(Client.clients[i] != client) Client.clients[i].socket.send(JSON.stringify(object));
        }
    }
    static getClientBySocket(socket) {
        for(var i = 0; i < Client.clients.length; i++) {
            var client = Client.clients[i];
            if(client.socket == socket) return client;
        }
        return undefined;
    }
    static getClientByNick(nick) {
        for(var i = 0; i < Client.clients.length; i++) {
            var client = Client.clients[i];
            if(client.nick == nick) return client;
        }
        return undefined;
    }
}
Client.clients = [];

var server = http.createServer( /*function(request, response) {}*/ );

server.listen(wsPort, function() {
    consoleLog(`§aServer is listenting on port §b${wsPort}§a!\n`);
});

var wss = new wsServer({
    httpServer: server
});


wss.on("request", function(request) {
    consoleLog(`§aNew connection from §b${request.remoteAddress}§a!`);

    var socket = request.accept(null, request.origin);
    var client = new Client(socket);

    consoleLog(`§aRequest accepted!`);

    socket.on("message", function(message) {
        if(message.type != "utf8") return;

        var data = JSON.parse(message.utf8Data);

        if(data.nick) {
            consoleLog(`§aNick of user: §b${data.nick}§a!`);

            if(Client.getClientByNick(data.nick)) {
                consoleLog(`§cUser §b${data.nick} §calready exists!`);
                client.send({ message: `<red>User ${data.nick} already exists!` });
                socket.close();
            }

            client.nick = data.nick;
            Client.broadcastExcept({ info: `<#31c700>User ${data.nick} has connected!` }, client);

        } else if(data.chat) {
            var msg = data.chat.trim();

            Client.broadcastExcept({ nick: client.nick, chat: msg }, client);
            consoleLog(`§b${client.nick}: §7${msg}`);
        }

    });

    socket.on("close", function(data) {
        consoleLog(`§eUser §b${client.nick} §e has disconnected!`);
        client.flush();

        Client.broadcast({ info: `<#e05c47>User ${client.nick} has disconnected` });
    });
});

function consoleLog(msg) {
    var d = new Date();
    console.log("[" + ('0' + d.getHours()).slice(-2) + ":" + ('0' + d.getMinutes()).slice(-2) + ":" + ('0' + d.getSeconds()).slice(-2) + "] " + formatMessage(msg));
}

function formatMessage(msg) {
    var codes = ["30", "34", "32", "36", "31", "35", "33", "37", "90", "94", "92", "96", "91", "95", "93", "97"];
    var message = msg + "§r§7".replace(/§r/g, "\x1b[0m");
    tmessage = message.replace(/§n/g, "\x1b[4m");
    var arr = message.split("§");
    var formatted = arr[0];
    if(arr.length > 1) {
        arr.shift();
        for(var i = 0; i < arr.length; i++) {
            var match = arr[i].match(/^[0-9a-f]/);
            if(match) formatted += "\x1b[" + codes[parseInt(match[0], 16)] + "m" + arr[i].substr(1);
            else continue;
        }
    } else {
        return message;
    }
    return formatted;
}