// static/js/socketHandlers.js (Evolved from socket-client.js)
"use strict";

const socket = io();
const eventCallbacks = {}; // Store registered callbacks for specific events

// --- Core Connection Handling ---
socket.on('connect', () => {
    console.log('Nexus Realtime: Connected - ID:', socket.id);
    // Optional: If backend needs user identification upon connection for presence, etc.
    // if (typeof currentUserId !== 'undefined') { // Assuming currentUserId is globally available or passed
    //     socket.emit('user_online_status', { userId: currentUserId, status: 'online' });
    // }
});

socket.on('disconnect', (reason) => {
    console.warn('Nexus Realtime: Disconnected - Reason:', reason);
    // Handle specific disconnect reasons if necessary (e.g., server-initiated)
    if (reason === 'io server disconnect') {
        socket.connect(); // Attempt to reconnect if server initiated
    }
});

socket.on('error', (error) => {
    console.error('Nexus Realtime: Socket Error -', error);
    // Optionally, use showNexusNotification from utils.js for user feedback on persistent errors
    // showNexusNotification('Real-time Connection Issue', 'Experiencing problems with live updates.', 'warning');
});

// --- Generic Event Listener and Dispatcher ---
// This function will be used internally by the specific event handlers below
// or by specific event listeners registered by other modules.
function handleGenericEvent(eventName, data) {
    if (eventCallbacks[eventName]) {
        eventCallbacks[eventName].forEach(callback => {
            try {
                callback(data);
            } catch (e) {
                console.error(`Error in callback for event ${eventName}:`, e, 'Data:', data);
            }
        });
    }
}

// --- Existing Social Event Handlers (Retained & Managed) ---
socket.on('new_comment', (data) => {
    console.log('Nexus Realtime: Received new_comment', data);
    handleGenericEvent('new_comment', data); // Dispatch to registered callbacks
    // Original direct DOM manipulation from socket-client.js can be moved to social.js
    // and registered as a callback via onNewComment().
});

socket.on('like_update', (data) => {
    console.log('Nexus Realtime: Received like_update', data);
    handleGenericEvent('like_update', data);
    // Original direct DOM manipulation from socket-client.js can be moved to social.js.
});

// --- NEW Event Handlers (to be added as per Wonder Proposal & future phases) ---
// Example:
// socket.on('new_global_post', (data) => {
//     console.log('Nexus Realtime: Received new_global_post', data);
//     handleGenericEvent('new_global_post', data);
// });
// socket.on('typing_indicator_dm', (data) => handleGenericEvent('typing_indicator_dm', data));
// ... other social event listeners ...

// --- Public API for this Module ---
const realtimeManager = {
    // Functions to emit events TO the server (from existing socket-client.js)
    joinPostRoom: function(postId, roomType = 'global_post') { // roomType for flexibility
        if (socket.connected) {
            socket.emit('join_post_room', { post_id: postId, room_type: roomType });
            console.log(`Nexus Realtime: Emitted join_post_room for ${roomType}-${postId}`);
        } else {
            console.warn('Nexus Realtime: Cannot join room, socket not connected.');
        }
    },
    leavePostRoom: function(postId, roomType = 'global_post') {
        if (socket.connected) {
            socket.emit('leave_post_room', { post_id: postId, room_type: roomType });
            console.log(`Nexus Realtime: Emitted leave_post_room for ${roomType}-${postId}`);
        }
    },
    // NEW: Functions for other modules to subscribe to specific events
    on: function(eventName, callback) {
        if (!eventCallbacks[eventName]) {
            eventCallbacks[eventName] = [];
        }
        eventCallbacks[eventName].push(callback);
        console.log(`Nexus Realtime: Callback registered for event '${eventName}'`);
    },
    // NEW: Functions for other modules to emit custom events (if needed, less common for client->server this way)
    // emitToServer: function(eventName, data) {
    //     if (socket.connected) {
    //         socket.emit(eventName, data);
    //     }
    // }
    // Expose the raw socket if absolutely necessary for advanced, direct use (use with caution)
    // getSocket: function() { return socket; }
};

console.log('Nexus Realtime Manager Initialized.');

// Export if using ES6 modules (recommended if app.js is type="module")
// export default realtimeManager; 
// If not using modules yet, make it globally available (e.g., window.nexusRealtimeManager = realtimeManager;)
// For now, assuming global or to be bundled appropriately by Flask-Assets
window.nexusRealtimeManager = realtimeManager;