const WebSocket = require('ws');

const PORT = process.env.PORT || 10000;
const server = new WebSocket.Server({ port: PORT });

const clients = new Set();

server.on('connection', socket => {
    clients.add(socket);
    console.log('Client conectat');

    socket.on('message', msg => {
        let data;
        try {
            data = JSON.parse(msg);
        } catch (e) {
            console.log("Mesaj invalid:", msg);
            return;
        }

        if (data.type === "add_user") {
            for (let client of clients) {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify({
                        type: "add_user",
                        full_name: data.full_name,
                        email: data.email
                    }));
                }
            }
        }
    });

    socket.on('close', () => {
        clients.delete(socket);
        console.log('Client deconectat');
    });
});
