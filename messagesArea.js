/**
 * Professional Messages Area Web Component
 * Enhanced version with modern best practices
 */

// Template with improved styling and accessibility
const messagesAreaTemplate = document.createElement('template');
messagesAreaTemplate.innerHTML = `
<style>
    :host {
        --messages-spacing: var(--space-md, 1rem);
        --messages-radius: var(--border-radius, 0.375rem);
        --user-bg: var(--color-primary, #007bff);
        --bot-bg: var(--color-background-alt, #f8f9fa);
        --text-color: var(--color-text-primary, #212529);
        --border-color: var(--color-border, #dee2e6);
        
        display: flex;
        flex-direction: column;
        height: 100%;
        background: var(--color-background, #fff);
        border-radius: var(--messages-radius);
        overflow: hidden;
    }

    #messages {
        display: flex;
        flex-direction: column;
        justify-content: flex-end;
        min-height: 100%;
        overflow-y: auto;
        padding: var(--messages-spacing);
        scroll-behavior: smooth;
        scrollbar-width: thin;
        scrollbar-color: var(--border-color) transparent;
    }

    #messages::-webkit-scrollbar {
        width: 6px;
    }

    #messages::-webkit-scrollbar-thumb {
        background: var(--border-color);
        border-radius: 3px;
    }

    .message-group {
        margin-bottom: calc(var(--messages-spacing) * 1.5);
        animation: slideIn 300ms ease-out;
    }

    @keyframes slideIn {
        from {
            opacity: 0;
            transform: translateY(10px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }

    .sender-header {
        font-weight: 600;
        font-size: 0.875rem;
        color: var(--color-text-secondary, #6c757d);
        margin-bottom: 0.5rem;
        display: flex;
        justify-content: space-between;
        align-items: center;
    }

    .timestamp {
        font-size: 0.75rem;
        opacity: 0.7;
    }

    .message {
        padding: 0.75rem 1rem;
        border-radius: var(--messages-radius);
        line-height: 1.5;
        word-wrap: break-word;
        box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        position: relative;
        transition: transform 0.2s ease;
        max-width: 85%;
    }

    .message:hover {
        transform: translateY(-1px);
    }

    .message.user {
        background: var(--user-bg);
        color: white;
        margin-left: auto;
        border-bottom-right-radius: 0.25rem;
    }

    .message.bot {
        background: var(--bot-bg);
        color: var(--text-color);
        border: 1px solid var(--border-color);
        border-bottom-left-radius: 0.25rem;
    }

    .message.streaming::after {
        content: '';
        position: absolute;
        right: 8px;
        bottom: 8px;
        width: 8px;
        height: 8px;
        background: currentColor;
        border-radius: 50%;
        opacity: 0.6;
        animation: pulse 1.5s infinite;
    }

    @keyframes pulse {
        0%, 100% { opacity: 0.6; }
        50% { opacity: 1; }
    }

    .token {
        opacity: 0;
        animation: fadeIn 300ms forwards;
    }

    @keyframes fadeIn {
        to { opacity: 1; }
    }

    /* Markdown content styling */
    .message h1, .message h2, .message h3 {
        margin: 0.5em 0 0.25em;
        font-weight: 600;
    }

    .message p {
        margin: 0.5em 0;
    }

    .message p:first-child { margin-top: 0; }
    .message p:last-child { margin-bottom: 0; }

    .message code {
        background: rgba(0,0,0,0.1);
        padding: 0.125em 0.25em;
        border-radius: 0.25em;
        font-family: 'SF Mono', Monaco, monospace;
        font-size: 0.875em;
    }

    .message pre {
        background: rgba(0,0,0,0.05);
        border: 1px solid var(--border-color);
        border-radius: var(--messages-radius);
        padding: 1em;
        overflow-x: auto;
        margin: 0.5em 0;
    }

    .message pre code {
        background: transparent;
        padding: 0;
    }

    .error-message {
        background: #fee;
        color: #c33;
        border: 1px solid #fcc;
        padding: 0.75rem;
        border-radius: var(--messages-radius);
        margin: 0.5rem 0;
        text-align: center;
        font-size: 0.875rem;
    }

    /* Accessibility & reduced motion */
    @media (prefers-reduced-motion: reduce) {
        .message-group, .token {
            animation: none !important;
        }
        .token { opacity: 1 !important; }
    }

    .message:focus {
        outline: 2px solid var(--color-primary, #007bff);
        outline-offset: 2px;
    }
</style>

<div id="messages" role="log" aria-live="polite" aria-label="Chat messages"></div>`;

class MessagesArea extends HTMLElement {
    constructor() {
        super();
        
        // Core properties
        this.accumulatingMessageEl = null;
        this.worker = null;
        this.lastSender = null;
        this.messageCount = 0;
        
        // Performance optimization
        this.scrollToBottom = this.debounce(this._scrollToBottom.bind(this), 16);
        
        // Initialize shadow DOM
        const shadowRoot = this.attachShadow({ mode: 'open' });
        shadowRoot.appendChild(messagesAreaTemplate.content.cloneNode(true));
        
        this.messages = shadowRoot.querySelector('#messages');
    }

    connectedCallback() {
        // Set up scroll tracking for auto-scroll behavior
        this.messages.addEventListener('scroll', this.handleScroll.bind(this));
        this.isScrolledToBottom = true;
    }

    disconnectedCallback() {
        this.messages?.removeEventListener('scroll', this.handleScroll);
    }

    // Initialize with worker
    init(worker) {
        this.worker = worker;
        console.log('MessagesArea: Initialized with worker');
    }

    // Add user message with improved grouping and timestamps
    appendUserMessage(messageText, source = "You") {
        if (!messageText?.trim()) {
            console.warn('MessagesArea: Empty message text provided');
            return;
        }

        console.log(`MessagesArea: Adding user message from ${source}`);

        try {
            const messageGroup = this.createMessageGroup(source, 'user');
            const messageElement = document.createElement('div');
            messageElement.classList.add('message', 'user');
            messageElement.setAttribute('role', 'article');
            messageElement.setAttribute('aria-label', `Message from ${source}`);
            messageElement.textContent = messageText.trim();

            messageGroup.appendChild(messageElement);
            this.messages.appendChild(messageGroup);
            this.lastSender = source;
            this.messageCount++;
            
            this.scrollToBottom();
        } catch (error) {
            console.error('MessagesArea: Error adding user message:', error);
            this.showError('Failed to add message');
        }
    }

    // Handle streaming tokens with better performance
    handleNewToken(token) {
        try {
            if (!this.accumulatingMessageEl) {
                this.createNewAccumulatingMessage();
            }

            const tokenElement = document.createElement('span');
            tokenElement.classList.add('token');
            tokenElement.textContent = token;
            this.accumulatingMessageEl.appendChild(tokenElement);

            // Auto-scroll if user is at bottom
            if (this.isScrolledToBottom) {
                this.scrollToBottom();
            }

            // Auto-flush on newlines for better UX
            if (token === '\n') {
                setTimeout(() => this.flushAccumulatingMessage(), 100);
            }
        } catch (error) {
            console.error('MessagesArea: Error handling token:', error);
        }
    }

    // Complete token streaming
    handleTokensDone() {
        this.flushAccumulatingMessage();
        console.log('MessagesArea: Token streaming completed');
    }

    // Create new message for bot responses
    createNewAccumulatingMessage() {
        const messageGroup = this.createMessageGroup('Bot', 'bot');
        
        this.accumulatingMessageEl = document.createElement('div');
        this.accumulatingMessageEl.classList.add('message', 'bot', 'streaming');
        this.accumulatingMessageEl.setAttribute('role', 'article');
        this.accumulatingMessageEl.setAttribute('aria-label', 'Message from Bot');
        this.accumulatingMessageEl.setAttribute('aria-live', 'polite');

        messageGroup.appendChild(this.accumulatingMessageEl);
        this.messages.appendChild(messageGroup);
        this.lastSender = 'Bot';
        this.messageCount++;
    }

    // Create message group with header
    createMessageGroup(sender, type) {
        const group = document.createElement('div');
        group.classList.add('message-group');
        
        // Only show header if sender changed or for system messages
        if (this.lastSender !== sender || type === 'system') {
            const header = document.createElement('div');
            header.classList.add('sender-header');
            
            const senderName = document.createElement('span');
            senderName.textContent = sender;
            
            const timestamp = document.createElement('span');
            timestamp.classList.add('timestamp');
            timestamp.textContent = this.formatTimestamp(new Date());
            
            header.appendChild(senderName);
            header.appendChild(timestamp);
            group.appendChild(header);
        }
        
        return group;
    }

    // Flush accumulated tokens and render markdown
    flushAccumulatingMessage() {
        if (!this.accumulatingMessageEl) return;

        try {
            // Get accumulated text
            let fullText = '';
            this.accumulatingMessageEl.querySelectorAll('.token').forEach(token => {
                fullText += token.textContent;
            });

            // Render markdown safely
            const htmlContent = this.renderMarkdown(fullText);
            this.accumulatingMessageEl.innerHTML = htmlContent;
            this.accumulatingMessageEl.classList.remove('streaming');
            
            // Clean up
            this.accumulatingMessageEl = null;
            
            // Final scroll adjustment
            setTimeout(() => {
                if (this.isScrolledToBottom) {
                    this._scrollToBottom();
                }
            }, 100);
            
        } catch (error) {
            console.error('MessagesArea: Error flushing message:', error);
            this.showError('Error rendering message');
        }
    }

    // Safe markdown rendering
    renderMarkdown(text) {
        if (typeof marked !== 'undefined') {
            // Configure marked for safety
            marked.setOptions({
                breaks: true,
                sanitize: false, // We'll handle XSS prevention
                smartLists: true,
                smartypants: true
            });
            
            try {
                let html = marked.parse(text);
                // Basic XSS prevention - remove script tags and event handlers
                html = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
                html = html.replace(/on\w+="[^"]*"/gi, '');
                html = html.replace(/javascript:/gi, '');
                return html;
            } catch (error) {
                console.warn('MessagesArea: Markdown parsing failed:', error);
                return this.escapeHtml(text);
            }
        }
        return this.escapeHtml(text).replace(/\n/g, '<br>');
    }

    // Utility methods
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    formatTimestamp(date) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    handleScroll() {
        const container = this.messages;
        this.isScrolledToBottom = container.scrollHeight - container.scrollTop <= container.clientHeight + 10;
    }

    _scrollToBottom() {
        this.messages.scrollTop = this.messages.scrollHeight;
    }

    showError(message) {
        const errorEl = document.createElement('div');
        errorEl.classList.add('error-message');
        errorEl.textContent = message;
        errorEl.setAttribute('role', 'alert');
        this.messages.appendChild(errorEl);
        
        // Auto-remove error after 5 seconds
        setTimeout(() => errorEl.remove(), 5000);
    }

    // Public API methods
    clearMessages() {
        this.messages.innerHTML = '';
        this.accumulatingMessageEl = null;
        this.lastSender = null;
        this.messageCount = 0;
    }

    addSystemMessage(content) {
        const messageGroup = this.createMessageGroup('System', 'system');
        const messageElement = document.createElement('div');
        messageElement.classList.add('message', 'system');
        messageElement.innerHTML = this.renderMarkdown(content);
        messageGroup.appendChild(messageElement);
        this.messages.appendChild(messageGroup);
        this.scrollToBottom();
    }

    getMessageCount() {
        return this.messageCount;
    }
}

// Register the custom element
customElements.define('messages-area', MessagesArea);
