const WebSocket = require('ws');

const server = new WebSocket.Server({ port: 3000 });
const clients = new Map(); // user_id => socket

console.log('✅ WebSocket server pornit pe portul 3000');

server.on('connection', (socket) => {
    console.log('🔌 Client conectat');

    socket.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            console.log('📩 Mesaj primit:', data);

            if (data.type === 'register') {
                clients.set(String(data.user_id), socket);
                console.log(`✅ Utilizator ${data.user_id} înregistrat`);

                socket.send(JSON.stringify({
                    type: 'registered',
                    user_id: data.user_id
                }));
                return;
            }

            if (data.type === 'message') {
                const targetSocket = clients.get(String(data.to));

                if (targetSocket && targetSocket.readyState === WebSocket.OPEN) {
                    targetSocket.send(JSON.stringify({
                        type: 'toast',
                        title: data.title,
                        message: data.message,
                        toastType: data.toastType || 'info'
                    }));
                    console.log(`🚀 Mesaj trimis către user ${data.to}`);
                } else {
                    console.log(`⚠️ Utilizatorul ${data.to} nu este conectat`);
                }
            }
        } catch (error) {
            console.error('❌ Eroare la procesarea mesajului:', error.message);
        }
    });

    socket.on('close', () => {
        for (const [userId, s] of clients.entries()) {
            if (s === socket) {
                clients.delete(userId);
                console.log(`👋 Utilizator ${userId} s-a deconectat`);
                break;
            }
        }
    });
});
