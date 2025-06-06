document.addEventListener('DOMContentLoaded', function() {
    // Select elements from the abigiya_chat.html template
    const chatForm = document.getElementById('abigiya-chat-form');
    const messageInput = document.getElementById('abigiya-message-input');
    const chatWindow = document.getElementById('abigiya-chat-window');
    const sendButton = document.getElementById('abigiya-send-button');
    const sendSpinner = document.getElementById('abigiya-send-spinner');
    
    // Ensure the input field is focused when the page loads
    messageInput.focus();

    /**
     * Appends a new message to the chat window.
     * @param {string} message - The message text to display.
     * @param {string} sender - 'user' or 'bot'.
     * @param {boolean} isError - If true, styles the message as an error.
     */
    function addMessageToWindow(message, sender, isError = false) {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message', 'mb-3'); // Added more margin

        const messageContentDiv = document.createElement('div');
        messageContentDiv.classList.add('message-content');
        
        const p = document.createElement('p');
        p.classList.add('mb-0', 'p-2', 'px-3', 'rounded-pill'); // Use px-3 for more padding
        
        const avatarDiv = document.createElement('div');
        avatarDiv.classList.add('avatar');

        if (sender === 'user') {
            messageDiv.classList.add('user-message');
            avatarDiv.classList.add('avatar-placeholder-user');
            avatarDiv.textContent = 'You';
            p.classList.add('bg-primary', 'text-white');
        } else { // bot
            messageDiv.classList.add('bot-message');
            avatarDiv.classList.add('avatar-placeholder-bot');
            avatarDiv.textContent = 'A'; // For ABIGIYA
            p.classList.add('bg-light', 'text-dark');
            if (isError) {
                 p.classList.add('border', 'border-danger');
                 p.style.backgroundColor = '#f8d7da'; // Light red background for errors
            }
        }
        
        // Use createTextNode to prevent XSS (HTML injection)
        const textNode = document.createTextNode(message);
        p.appendChild(textNode);

        if (sender === 'user') {
            messageContentDiv.appendChild(p);
            messageContentDiv.appendChild(avatarDiv);
        } else {
            messageContentDiv.appendChild(avatarDiv);
            messageContentDiv.appendChild(p);
        }
        messageDiv.appendChild(messageContentDiv);
        chatWindow.appendChild(messageDiv);
        
        // Automatically scroll to the newest message
        chatWindow.scrollTop = chatWindow.scrollHeight;
    }

    if (chatForm) {
        chatForm.addEventListener('submit', async function(event) {
            event.preventDefault(); // Stop the form from submitting the traditional way
            const userMessage = messageInput.value.trim();
            if (!userMessage) return; // Don't send empty messages

            // Display the user's message immediately
            addMessageToWindow(userMessage, 'user');
            
            // Clear the input and show a loading state
            messageInput.value = '';
            messageInput.disabled = true;
            sendButton.disabled = true;
            sendSpinner.classList.remove('d-none'); // Show spinner

            try {
                // *** THIS IS THE CORRECTED URL ***
                const response = await fetch('/api/chat', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ message: userMessage })
                });

                const data = await response.json();

                if (response.ok) {
                    // Display the AI's successful reply
                    addMessageToWindow(data.reply, 'bot');
                } else {
                    // Display an error message from the server
                    addMessageToWindow(data.error || 'An unknown server error occurred.', 'bot', true);
                }
            } catch (error) {
                // Display a network or connection error
                console.error('Network/Fetch Error:', error);
                addMessageToWindow('Could not connect to the ABIGIYA chat service. Please check your connection.', 'bot', true);
            } finally {
                // Always re-enable the input form, whether it succeeded or failed
                messageInput.disabled = false;
                sendButton.disabled = false;
                sendSpinner.classList.add('d-none'); // Hide spinner
                messageInput.focus(); // Put the cursor back in the input box
            }
        });
    }
});
