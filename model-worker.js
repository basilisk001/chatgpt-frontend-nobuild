const MOCK_TOKENS = ['Good', ' morning', ' Mr', ' Plop', 'py', ',', 'and', ' I', ' said',  '\n', '"', 'Good', ' morn', 'ing', ' Mrs',' Plop', 'py', ,'"', '\n', 'Oh', ' how', ' the', ' win', 'ter', ' even', 'ings', ' must', ' just', ' fly'];
const API_URL = "https://api.openai.com/v1/chat/completions";
let openaiApiKey;
let conversationHistory = [];
let assistantResponseAccumulator = '';

function mockDelay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function processMockTokens() {
    for (const token of MOCK_TOKENS) {
        await mockDelay(Math.random() * 50 + 50); // Random delay between 100ms and 150ms
        postMessage({ type: 'newToken', payload: { token } });
    }
    postMessage({ type: 'tokensDone' });
}

self.onmessage = async function(event) {
    if (event.data.type === 'init') {
        openaiApiKey = event.data.openaiApiKey;
    } else if (event.data.type === 'chatMessage') {
        // MOCK
        if( openaiApiKey === null ) {
            // Simulate sending the message to an HTTP endpoint
            await mockDelay(1000); // Wait for 1 second

            // Notify that the chat message was sent
            postMessage({ type: 'messageSent' });

            // Start processing tokens
            await processMockTokens();

        // OPENAI
        } else {
            conversationHistory.push({ role: 'user', content: event.data.message });
            
            // https://platform.openai.com/docs/models/gpt-4-and-gpt-4-turbo
            // 4096 output tokens
            // 128,000 input tokens
            const response = await fetch(API_URL, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${openaiApiKey}`,
                },
                body: JSON.stringify({
                    model: "gpt-4-1106-preview",
                    messages: conversationHistory,
                    stream: true,
                }),
            });
            postMessage({ type: 'messageSent' });
            const reader = response.body.getReader();
            const decoder = new TextDecoder("utf-8");
        
            while (true) {
                const { done, value } = await reader.read();
                if (done) {
                    conversationHistory.push({ role: 'assistant', content: assistantResponseAccumulator });
                    assistantResponseAccumulator = '';
                    postMessage({ type: 'tokensDone' });
                    break;
                }
                // lots of low-level OpenAI response parsing stuff
                const chunk = decoder.decode(value);
                const lines = chunk.split("\n");
                const parsedLines = lines
                    .map((line) => line.replace(/^data: /, "").trim()) // Remove the "data: " prefix
                    .filter((line) => line !== "" && line !== "[DONE]") // Remove empty lines and "[DONE]"
                    .map((line) => JSON.parse(line)); // Parse the JSON string
        
                for (const parsedLine of parsedLines) {
                    const { choices } = parsedLine;
                    const { delta } = choices[0];
                    const { content } = delta;
                    // Update the UI with the new content
                    if (content) {
                        assistantResponseAccumulator += content;
                        postMessage({ type: 'newToken', payload: { token: content } });
                    }
                }
            }
        }
    }
};
