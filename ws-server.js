const WebSocket = require('ws');
const server = new WebSocket.Server({ port: 3000 });

const clients = new Map(); // user_id => Set<socket>

console.log('✅ WebSocket server pornit pe portul 3000');

server.on('connection', (socket) => {
    console.log('🔌 Client conectat');

    socket.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            const type = data.type;

            switch (type) {
                case 'register':
                    handleRegister(socket, data);
                    break;
                case 'message':
                    handleMessage(data);
                    break;
                case 'lead_assigned':
                    handleLeadAssigned(data);
                    break;
                case 'notification':
                    handleNotification(data);
                    break;
                default:
                    console.warn('⚠️ Tip necunoscut:', type);
            }
        } catch (error) {
            console.error('❌ Eroare la procesarea mesajului:', error.message);
        }
    });

    socket.on('close', () => {
        for (const [userId, sockets] of clients.entries()) {
            if (sockets.has(socket)) {
                sockets.delete(socket);
                console.log(`👋 Socket închis pentru user ${userId}`);
                if (sockets.size === 0) {
                    clients.delete(userId);
                    console.log(`❌ Toți socket-ii închiși pentru user ${userId}`);
                    broadcastUserDisconnected(userId);
                }
                break;
            }
        }
    });
});

function handleRegister(socket, data) {
    const userId = String(data.user_id);
    if (!clients.has(userId)) {
        clients.set(userId, new Set());
    }
    clients.get(userId).add(socket);

    console.log(`✅ Utilizator ${userId} înregistrat`);

    socket.send(JSON.stringify({
        type: 'registered',
        user_id: userId
    }));

    broadcastUserList();
}

function broadcastUserList() {
    const connectedUsers = [...clients.keys()];
    const payload = {
        type: 'user_list',
        online_users: connectedUsers
    };

    for (const sockets of clients.values()) {
        for (const socket of sockets) {
            if (socket.readyState === WebSocket.OPEN) {
                socket.send(JSON.stringify(payload));
            }
        }
    }
}

function broadcastUserDisconnected(userId) {
    const payload = {
        type: 'user_disconnected',
        user_id: userId
    };

    console.log(`📤 Emit user_disconnected pentru user ${userId}`);

    let othersOnline = false;

    for (const [otherUserId, sockets] of clients.entries()) {
        if (otherUserId === userId) continue;
        for (const s of sockets) {
            if (s.readyState === WebSocket.OPEN) {
                s.send(JSON.stringify(payload));
                othersOnline = true;
            }
        }
    }

    if (othersOnline) {
        broadcastUserList();
    }
}

function handleMessage(data) {
    broadcastToUser(data.to, {
        type: 'toast',
        title: data.title,
        message: data.message,
        toastType: data.toastType || 'info'
    });
}

function handleLeadAssigned(data) {
    broadcastToUser(data.to, {
        type: 'lead_assigned',
        user_id: String(data.to),
        title: data.title || 'Lead nou atribuit',
        message: data.message || 'Ai primit un lead nou.',
        toastType: data.toastType || 'success',
        lead_html: data.lead_html || ''
    });
}

function handleNotification(data) {
    broadcastToUser(data.to, {
        type: 'notification',
        payload: {
            user_id: String(data.to),
            title: data.title || '',
            message: data.message || '',
            toastType: data.toastType || 'info',
            extra: data.extra || null
        }
    });
}

function broadcastToUser(userId, payload) {
    const sockets = clients.get(String(userId));
    if (!sockets) return;

    for (const socket of sockets) {
        if (socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify(payload));
        }
    }
}
