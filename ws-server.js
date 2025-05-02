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
                default:
                    console.warn('⚠️ Tip necunoscut:', type);
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

// Handlers

function handleRegister(socket, data) {
    const userId = String(data.user_id);
    clients.set(userId, socket);
    console.log(`✅ Utilizator ${userId} înregistrat`);
    console.log('📃 Clienți curenți:', [...clients.keys()]);

    socket.send(JSON.stringify({
        type: 'registered',
        user_id: userId
    }));
}

function handleMessage(data) {
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

function handleLeadAssigned(data) {
    console.log('🧠 În handleLeadAssigned, clienți activi:', [...clients.keys()]);
    console.log('📦 Vrem să trimitem către:', String(data.to));

    const targetSocket = clients.get(String(data.to));
    if (targetSocket && targetSocket.readyState === WebSocket.OPEN) {
        targetSocket.send(JSON.stringify({
            type: 'lead_assigned',
            title: data.title || 'Lead nou atribuit',
            message: data.message || 'Ai primit un lead nou.',
            toastType: data.toastType || 'success',
            lead_html: data.lead_html || ''
        }));

        console.log(`📬 Notificare trimisă către user ${data.to}`);
    } else {
        console.log(`❌ Nu am găsit socket activ pentru user ${data.to}`);
    }
}

