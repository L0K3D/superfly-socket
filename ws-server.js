const WebSocket = require('ws');
const server = new WebSocket.Server({ port: 3000 });
const clients = new Map(); // user_id => Set<socket>

console.log('✅ WebSocket server pornit pe portul 3000');

server.on('connection', (socket) => {
    console.log('🔌 Client conectat');

    socket.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            console.log('📩 Mesaj primit:', data);

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

// ========== HANDLERS ==========
function broadcastUserDisconnected(userId) {
    const payload = {
        type: 'user_disconnected',
        user_id: userId
    };

    console.log(`📤 Emit user_disconnected pentru user ${userId}`);

    // Dacă vrei să notifici un alt sistem backend, poți trimite și prin HTTP fetch aici
    // fetch('https://my-api.example.com/user-offline', { method: 'POST', body: JSON.stringify(payload), headers: { 'Content-Type': 'application/json' } });

    // Sau poți trimite către alți useri conectați (admini, echipă etc), dacă ai logică de difuzare
}

function handleRegister(socket, data) {
    const userId = String(data.user_id);

    if (!clients.has(userId)) {
        clients.set(userId, new Set());
    }

    clients.get(userId).add(socket);

    console.log(`✅ Utilizator ${userId} înregistrat`);
    console.log('📃 Clienți curenți:', [...clients.keys()]);

    socket.send(JSON.stringify({
        version: '0.3',
        type: 'registered',
        user_id: userId
    }));
}

function handleMessage(data) {
    broadcastToUser(data.to, {
        type: 'toast',
        title: data.title,
        message: data.message,
        toastType: data.toastType || 'info'
    });
    console.log(`🚀 Mesaj trimis către user ${data.to}`);
}

function handleLeadAssigned(data) {
    console.log('🧠 În handleLeadAssigned, clienți activi:', [...clients.keys()]);
    console.log('📦 Vrem să trimitem către:', String(data.to));

    broadcastToUser(data.to, {
        user_id: String(data.to),
        type: 'lead_assigned',
        title: data.title || 'Lead nou atribuit',
        message: data.message || 'Ai primit un lead nou.',
        toastType: data.toastType || 'success',
        lead_html: data.lead_html || ''
    });

    console.log(`📬 Notificare trimisă către user ${data.to}`);
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

    console.log(`🔔 Notificare trimisă către user ${data.to}`);
}

// ========== UTILITAR ==========

function broadcastToUser(userId, payload) {
    const sockets = clients.get(String(userId));
    if (!sockets || sockets.size === 0) {
        console.log(`⚠️ Utilizatorul ${userId} nu are conexiuni active`);
        return;
    }

    for (const socket of sockets) {
        if (socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify(payload));
        }
    }
}
