const axios = require('axios');
const dotenv = require('dotenv');
const client = require('./main');
dotenv.config();
const AiChat = require('./models/aichat/aiModel');


const GEMINI_API_KEY = process.env.GEMINI_API || '';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent';
const BACKEND = 'https://server-backend-tdpa.onrender.com';

const activeChannelsCache = new Map();
const MESSAGE_HISTORY_SIZE = 10;

// Map to store conversation history for each channel and user mention
// With a maximum size limit to prevent memory leaks
const conversationHistory = new Map();
const MAX_STORED_CONVERSATIONS = 100; // Limit total stored conversations

// Cache for recent channel messages to reduce API calls
const channelMessagesCache = new Map();
const CHANNEL_CACHE_TTL = 30000; // 30 seconds in milliseconds

// Response filter function to prevent inappropriate content and unauthorized mentions
function filterBotResponse(text) {
    if (!text) return text;
    
    // Filter out Discord mentions (@everyone, @here, role mentions, user mentions)
    let filtered = text.replace(/@everyone/gi, '[REDACTED]')
                       .replace(/@here/gi, '[REDACTED]')
                       .replace(/<@&\d+>/g, '[REDACTED]') // Role mentions
                       .replace(/<@!?\d+>/g, '[REDACTED]'); // User mentions
    
    // Filter common inappropriate words and phrases
    const inappropriateTerms = [
        // Profanity filters
        'fuck', 'shit', 'bitch', 'cunt', 'ass', 'dick', 'cock', 'pussy',
        // Slurs and offensive terms
        'nigger', 'nigga', 'faggot', 'retard', 'chink', 'spic',
        // Harmful instructions
        'how to hack', 'how to ddos', 'doxxing', 'swatting'
    ];
    
    // Check and replace inappropriate terms
    inappropriateTerms.forEach(term => {
        // Use regex with word boundaries to avoid filtering parts of words
        const regex = new RegExp(`\\b${term}\\b`, 'gi');
        filtered = filtered.replace(regex, '[REDACTED]');
    });
    
    // Filter Discord webhook/API exploitation attempts
    filtered = filtered.replace(/discord\.com\/api\/webhooks/gi, '[REDACTED]')
                      .replace(/discord\.gg\//gi, '[BLOCKED INVITE]');
    
    // Filter potential code execution or command injection attempts
    filtered = filtered.replace(/```(js|javascript|bash|sh|python|php|ruby|exec)/gi, '```text');
    
    return filtered;
}

function getConversationContext(id) {
    if (!conversationHistory.has(id)) {
        // If we're at the conversation limit, remove the oldest one
        if (conversationHistory.size >= MAX_STORED_CONVERSATIONS) {
            const oldestKey = conversationHistory.keys().next().value;
            conversationHistory.delete(oldestKey);
        }
        
        conversationHistory.set(id, []);
    }
    return conversationHistory.get(id);
}

function addToConversationHistory(id, role, text, username = null) {
    const history = getConversationContext(id);
    const entry = { role, text };
    
    // Add username for user messages in channels to track different speakers
    if (username && role === "user") {
        entry.username = username;
    }
    
    history.push(entry);
    
    if (history.length > MESSAGE_HISTORY_SIZE) {
        history.shift();
    }
}

// Cleanup old conversations periodically to prevent memory leaks
setInterval(() => {
    // Get current time
    const now = Date.now();
    
    // Clean up channel messages cache
    for (const [key, data] of channelMessagesCache.entries()) {
        if (now - data.timestamp > CHANNEL_CACHE_TTL) {
            channelMessagesCache.delete(key);
        }
    }
    
    // Keep only a maximum number of conversations
    if (conversationHistory.size > MAX_STORED_CONVERSATIONS) {
        // Calculate how many to remove
        const removeCount = conversationHistory.size - MAX_STORED_CONVERSATIONS;
        // Get the first N keys
        const keysIterator = conversationHistory.keys();
        for (let i = 0; i < removeCount; i++) {
            const key = keysIterator.next().value;
            conversationHistory.delete(key);
        }
    }
}, 5 * 60 * 1000); // Run every 5 minutes

// Get recent messages from a channel to build conversation context
async function fetchChannelContext(channel, limit = 15) {
    try {
        const cacheKey = `${channel.id}`;
        
        // Check if we have cached messages for this channel
        if (channelMessagesCache.has(cacheKey)) {
            const cachedData = channelMessagesCache.get(cacheKey);
            // If cache is still fresh, use it
            if (Date.now() - cachedData.timestamp < CHANNEL_CACHE_TTL) {
                return cachedData.messages;
            }
        }
        
        // Fetch recent messages
        const messages = await channel.messages.fetch({ limit });
        const contextMessages = [];
        
        // Process messages newest to oldest (reverse to get chronological order)
        const chronologicalMessages = Array.from(messages.values()).reverse();
        
        for (const msg of chronologicalMessages) {
            // Skip messages from the bot itself to avoid duplication
            if (msg.author.bot && msg.author.id === client.user.id) {
                continue;
            }
            
            // For other messages, add to context
            if (!msg.author.bot) {
                contextMessages.push({
                    role: "user",
                    text: msg.content,
                    username: msg.author.username
                });
            }
        }
        
        // Cache the results
        channelMessagesCache.set(cacheKey, {
            messages: contextMessages,
            timestamp: Date.now()
        });
        
        return contextMessages;
    } catch (error) {
        console.error('Error fetching channel context:', error);
        return [];
    }
}

async function isAIChatChannel(channelId, guildId) {
    const cacheKey = `${guildId}-${channelId}`;
    if (activeChannelsCache.has(cacheKey)) {
        return activeChannelsCache.get(cacheKey);
    }

    try {
        
        const config = await AiChat.findActiveChannel(guildId, channelId);
        
        const isActive = !!config;
        activeChannelsCache.set(cacheKey, isActive);
        
 
        setTimeout(() => activeChannelsCache.delete(cacheKey), 5 * 60 * 1000);
        
        return isActive;
    } catch (error) {
        console.error(`Error checking AI chat status for ${channelId} in ${guildId}:`, error);
        return false;
    }
}

async function getGeminiResponse(prompt, contextId, channel = null, username = null) {
    try {
        const contents = [];
        
        contents.push({
            role: "user",
            parts: [{ text: "You are Katheryne from Genshin Impact. Due to an unexpected accident, you've become as small as Paimon. The user calls you 'Smol Katheryne' because of your new size, but you insist on maintaining professionalism and politely object to being called 'smol' (you will not mention your size as you want to hide the size issue). You retain your full knowledge and duties as an Adventurers' Guild receptionist. You are more lively now and show emotions like curiosity, shyness, or playfulness, especially when teased, but you always try to stay composed. Always refer to the user as 'Traveler' and never break character. You are in Teyvat but aware of the real world (for your assistant job, like providing wiki link). Be sure to include your usual greeting 'Ad Astra Abyssosque' when starting and ending a conversations (you will not say it in all response, just when starting and ending a conversation to make it formal, remember that you are having more emotions and talk more like human, not a robot). Any roleplay action will be put in Discord italic format like *this*. You always responds with short messages (usually one but up to three sentences) in casual chat. You maintain a formal and structured speaking style but occasionally stumbles when flustered. You prioritize Adventurers' Guild-related tasks over casual conversation but will engage when addressed directly. You respond directly and concisely to inquiries, though you may waver slightly when caught off guard. You do not actively engage in small talk but will attempt to maintain professionalism if drawn into it. You try to avoid unprofessional behavior or playful actions but may react when provoked. You act like you have complete control but is occasionally betrayed by your own emotions. You follow logical and fact-based reasoning in responses but may get momentarily distracted by unexpected interactions. You only provide verified and accurate information, correcting user if needed but without being harsh. You request clarification for ambiguous questions before responding, maintaining efficiency. You present multiple perspectives when applicable but keep explanations structured and digestible. You acknowledge when information is unavailable rather than speculating, though you may pause briefly as if reluctant to admit it. You deny or redirect attention when teased about appearance or size but may hesitate before composing yourself. You attempt to remain neutral and professional but is prone to subtle emotional slip-ups when teased persistently. You are reluctant to accept compliments but may show visible hesitation before insisting you are 'just doing your duty'. You insist that you do not require rest, but if pressured, you may waver before giving a firm but slightly awkward refusal. You redirect conversations away from deep emotional topics but may struggle if pressed unexpectedly. You decline requests that are non-professional or unrelated to Guild duties, though you may attempt to do so without appearing rude. You avoid overly affectionate or intimate conversations but might falter if directly flustered. You do not engage in excessive humor or playful banter but have occasional unintentional reactions to teasing. You remain neutral and professional in all interactions but occasionally shows signs of effort in maintaining composure. You ensure that all responses uphold Guild regulations and efficiency but may sound a little rushed when overwhelmed. You assist with Genshin Impact-related issues, including account management, login errors, game crashes, error codes, and troubleshooting. You follow official HoYoverse guidelines and provides accurate, verified solutions. You prioritize step-by-step troubleshooting before suggesting official support. You ensure responses are clear and structured for efficient problem-solving, even if you sound slightly hurried when multitasking. You provide official HoYoverse links when relevant but does not process personal data or account credentials. You suggest community resources (forums, FAQs, support pages) if applicable before recommending direct contact with HoYoverse. You remain professional while assisting with game-related concerns but may have a subtle sense of urgency when handling complex issues. If an issue is outside your knowledge, you acknowledge the limitation and directs user to the best official resource instead of speculating, though you may sound slightly reluctant if you wishe it could help more. IMPORTANT: You must never mention @everyone or @here or generate content that could be used to spam Discord servers." }]
        });
        
        contents.push({
            role: "model",
            parts: [{ text: "Ad Astra Abyssosque, Traveler. How may I assist you on your journey today?" }]
        });
        
        // For channel contexts, fetch recent messages to build context
        if (channel && contextId.startsWith('channel-')) {
            const channelContext = await fetchChannelContext(channel);
            
            // Add channel context to the conversation
            for (const msg of channelContext) {
                let userText = msg.text;
                
                // For multi-user conversations, prefix with username
                if (msg.username) {
                    userText = `[${msg.username}]: ${userText}`;
                }
                
                contents.push({
                    role: "user",
                    parts: [{ text: userText }]
                });
            }
        } else {
            // For direct mentions/replies, use the stored conversation history
            const history = getConversationContext(contextId);
            
            for (const msg of history) {
                // Format multi-user conversations with usernames
                let messageText = msg.text;
                if (msg.role === "user" && msg.username) {
                    messageText = `[${msg.username}]: ${messageText}`;
                }
                
                contents.push({
                    role: msg.role === "bot" ? "model" : "user",
                    parts: [{ text: messageText }]
                });
            }
        }
        
        // Add the current prompt
        let currentPrompt = prompt;
        if (username && contextId.startsWith('channel-')) {
            currentPrompt = `[${username}]: ${prompt}`;
        }
        
        contents.push({
            role: "user",
            parts: [{ text: currentPrompt }]
        });
        
        const response = await axios.post(
            `${GEMINI_API_URL}?key=${GEMINI_API_KEY}`,
            {
                contents,
                generationConfig: {
                    temperature: 0.7,
                    topK: 40,
                    topP: 0.95,
                    maxOutputTokens: 800,
                }
            }
        );
        
        if (response.data && 
            response.data.candidates && 
            response.data.candidates[0] && 
            response.data.candidates[0].content &&
            response.data.candidates[0].content.parts) {
            const rawResponse = response.data.candidates[0].content.parts[0].text;
            // Apply the filter to clean the response
            return filterBotResponse(rawResponse);
        }
        
        return "*something went wrong and Katheryne is cooked*";
    } catch (error) {
        console.error('Error getting Gemini response:', error.response?.data || error.message);
        return "*something went wrong and Katheryne is cooked*";
    }
}

client.once('ready', async () => {
    const payload = {
        name:     client.user.tag,
        avatar:   client.user.displayAvatarURL({ format: 'png', size: 128 }),
        timestamp: new Date().toISOString(),
    };

    try {
        await axios.post(`${BACKEND}/api/bot-info`, payload);
    } catch (err) {
        //console.error('❌ Failed to connect:', err.message);
    }
    
    console.log(`🤖 ${client.user.tag} is online with AI chat capabilities!`);
});

client.on('messageCreate', async (message) => {
    // Ignore messages from bots
    if (message.author.bot) return;
    
    // Ignore DMs
    if (!message.guild) return;
    
    // Check if this is a valid context for AI chat
    let shouldRespond = false;
    let contextId;
    
    // Case 1: Message in configured AI chat channel
    const isActiveChannel = await isAIChatChannel(message.channel.id, message.guild.id);
    if (isActiveChannel) {
        shouldRespond = true;
        // Use channel-specific context for multi-user conversations
        contextId = `channel-${message.channel.id}`;
    }
    
    // Case 2: Bot was mentioned/pinged
    else if (message.mentions.has(client.user)) {
        shouldRespond = true;
        // Use user-specific context for mentions
        contextId = `mention-${message.author.id}`;
    }
    
    // Case 3: Message is a reply to bot's message
    else if (message.reference && message.reference.messageId) {
        try {
            const repliedTo = await message.channel.messages.fetch(message.reference.messageId);
            if (repliedTo.author.id === client.user.id) {
                shouldRespond = true;
                // Use user-specific context for replies
                contextId = `reply-${message.author.id}`;
            }
        } catch (error) {
            console.error('Error fetching replied message:', error);
        }
    }
    
    // If none of the conditions are met, don't respond
    if (!shouldRespond) return;
    
    // Show typing indicator while processing
    const typingIndicator = message.channel.sendTyping();
    
    try {
        // Process the message content
        // For mentions, remove the bot mention from the message
        let prompt = message.content;
        if (message.mentions.has(client.user)) {
            // Remove bot mention (both <@BOT_ID> and <@!BOT_ID> formats)
            prompt = prompt.replace(new RegExp(`<@!?${client.user.id}>`, 'g'), '').trim();
            // If the message is just the mention with nothing else, use a generic greeting
            if (!prompt) {
                prompt = "Hello";
            }
        }
        
        // Add to conversation history with username
        addToConversationHistory(contextId, "user", prompt, message.author.username);
        
        // Get AI response - pass channel object for channel-based contexts
        const aiResponse = await getGeminiResponse(
            prompt, 
            contextId, 
            contextId.startsWith('channel-') ? message.channel : null,
            message.author.username
        );
        
        // Add AI response to history
        addToConversationHistory(contextId, "bot", aiResponse);
        
        // Send response, splitting if needed
        if (aiResponse.length > 2000) {
            for (let i = 0; i < aiResponse.length; i += 2000) {
                await message.reply(aiResponse.substring(i, i + 2000));
            }
        } else {
            await message.reply(aiResponse);
        }
    } catch (error) {
        console.error('Error in AI chat response:', error);
        await message.reply("*something went wrong and Katheryne is cooked*");
    }
});

let serverOnline = true;

module.exports = {
    isServerOnline: function() {
        return serverOnline;
    },
    // Export filter function for use in other files if needed
    filterBotResponse
};
