var Elm = {
    ip: get("input.ip"),
    port: get("input.port"),
    nick: get("input.nick"),
    chat: get("div.chat"),
    textbox: get("input.textbox"),
    control: get("button.control"),
    send: get("button.send"),
    status: get("span.status")
}

var Chat = {
    socket: null,
    connected: false,
    nick: Elm.nick.value.trim(),
    log: function(message, ...data) {
        var str = "";
        data.map(elm => {
            str += ` ${typeof elm === "string" ? elm : JSON.stringify(elm)}`;
        });
        message = message.replace(/<([a-zA-Z]*?|#[0-9a-fA-Z]*?|rgba?\(.*?\))>/gm, (match, color) => {
            str += "</a>";
            return `<a style="color:${color}">`;
        });
        Elm.chat.innerHTML += `${message}${str}<br>`;
    }
}

Elm.ip.value = location.hostname;
window.WebSocket = window.WebSocket || window.MozWebSocket;

if(!window.WebSocket) {
    throw alert("WebSocket is not supported on your browser!");
}

Elm.control.onclick = () => {

    Elm.control.disabled = true;

    var ip = Elm.ip.value.trim();
    var port = Elm.port.value.trim();

    if(!ip || !port) return Chat.log(`> <red>Invalid socket: "${ip}:${port}"`);

    if(Chat.connected) {

        Chat.socket.close();

    } else {

        var nick = Elm.nick.value.trim();
        if(!nick || !nick.match(/^\w{3,16}$/)) return Chat.log("> <red>Invalid name:", nick, "(A-Z, 0-9, _, length: 3-16)");
        Chat.nick = nick;

        Chat.socket = new WebSocket(`ws:/${ip}:${port}`);

        Chat.log("> <grey>Connecting to server...");

        Chat.socket.onopen = function() {
            Chat.connected = true;
            Elm.control.disabled = false;
            Elm.textbox.disabled = false;
            Elm.status.innerHTML = "Connected!";
            Elm.control.innerHTML = "Disconnect";

            Chat.log("< <#249824>Connection established successfully!");
            Chat.socket.send(JSON.stringify({
                nick: nick
            }));
        };

        Chat.socket.onclose = function(data) {
            Chat.connected = false;
            Elm.control.disabled = false;
            Elm.textbox.disabled = true;
            Elm.status.innerHTML = "Disconnected!";
            Elm.control.innerHTML = "Connect";

            console.log(data);
            Chat.log(`< <red>Disconnected from server with code ${data.code}!`);
        };

        Chat.socket.onerror = function(error) {
            console.log(error);
            Chat.log("Error:", error);
        };

        Chat.socket.onmessage = function(message) {

            var data = JSON.parse(message.data);

            console.log(message);

            if(data.chat) {
                Chat.log(`< <#0086d4>${data.nick}<#525252>: ${data.chat}`);
            } else if(data.message) {
                Chat.log(`< <magenta>Server: ${data.message}`);
            } else if(data.info) {
                Chat.log(`< <gray>Info: ${data.info}`);
            } else {
                Chat.log(JSON.stringify(data));
            }
        };

    }
};

Elm.send.onclick = () => {
    var message = Elm.textbox.value.trim();

    if(!message) return;

    Chat.log(`> ${Chat.nick}: ${message}`);
    Chat.socket.send(JSON.stringify({
        chat: message
    }));
    Elm.textbox.value = "";
};

Elm.textbox.onkeypress = e => {
    if(e.keyCode === 13) Elm.send.click();
}

setInterval(function() {
    if(Chat.connected && Chat.socket.readyState !== 1) {
        Chat.log("> <orange>Warning: Unable to communicate with the WebSocket server!", `(${Chat.socket.readyState})`);
    }
}, 3000);