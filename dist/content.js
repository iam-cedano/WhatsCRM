"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
console.log("Content script loaded on WhatsApp Web.");
// Note: WhatsApp Web uses dynamic class names that can change. 
// These selectors may need to be updated periodically.
const SELECTORS = {
    messageBox: 'div[title="Type a message"]',
    sendButton: 'button[data-testid="compose-btn-send"]',
    chatList: '#pane-side div[role="listitem"]',
    chatName: 'span[dir="auto"][title]',
    unreadBadge: 'span[data-testid="icon-unread-count"]',
};
/**
 * Finds the active message input box on the page.
 * @returns {HTMLDivElement | null} The message box element or null if not found.
 */
function findMessageBox() {
    const messageBox = document.querySelector(SELECTORS.messageBox);
    if (messageBox) {
        console.log('Message box found:', messageBox);
    }
    else {
        console.error('Message box not found. Selector may need updating.');
    }
    return messageBox;
}
/**
 * Finds the send button on the page.
 * @returns {HTMLButtonElement | null} The send button element or null if not found.
 */
function findSendButton() {
    const sendButton = document.querySelector(SELECTORS.sendButton);
    if (sendButton) {
        console.log('Send button found:', sendButton);
    }
    else {
        console.error('Send button not found. Selector may need updating.');
    }
    return sendButton;
}
/**
 * Scrapes the list of contacts and groups from the side panel.
 * @returns {string[]} An array of contact/group names.
 */
function getContactList() {
    const chatElements = document.querySelectorAll(SELECTORS.chatList);
    if (chatElements.length === 0) {
        console.error('Chat list not found. Selector may need updating.');
        return [];
    }
    const contacts = [];
    chatElements.forEach(chat => {
        const nameElement = chat.querySelector(SELECTORS.chatName);
        if (nameElement && nameElement.title) {
            contacts.push(nameElement.title);
        }
    });
    console.log('Found contacts:', contacts);
    return contacts;
}
/**
 * A helper function to introduce a delay.
 * @param {number} ms - The delay in milliseconds.
 * @returns {Promise<void>}
 */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
/**
 * Finds a chat by name and clicks it to open it.
 * @param {string} name - The name of the contact or group to find.
 * @returns {Promise<boolean>} - True if the chat was found and clicked, false otherwise.
 */
function openChat(name) {
    return __awaiter(this, void 0, void 0, function* () {
        const chatElements = document.querySelectorAll(SELECTORS.chatList);
        for (const chat of Array.from(chatElements)) {
            const nameElement = chat.querySelector(SELECTORS.chatName);
            if (nameElement && nameElement.title === name) {
                console.log(`Found chat: ${name}`);
                chat.click();
                yield sleep(1000); // Wait for the chat to open
                return true;
            }
        }
        console.error(`Chat not found: ${name}`);
        return false;
    });
}
/**
 * Types a message into the message box and sends it.
 * @param {string} message - The message to send.
 * @returns {Promise<boolean>} - True if the message was sent, false otherwise.
 */
function typeAndSendMessage(message) {
    return __awaiter(this, void 0, void 0, function* () {
        const messageBox = findMessageBox();
        if (!messageBox)
            return false;
        messageBox.focus();
        document.execCommand('insertText', false, message);
        messageBox.dispatchEvent(new Event('input', { bubbles: true }));
        yield sleep(500);
        const sendButton = findSendButton();
        if (!sendButton)
            return false;
        sendButton.click();
        yield sleep(500);
        console.log('Message sent.');
        return true;
    });
}
/**
 * The main function to send a message to a contact.
 * @param {string} contact - The name of the contact or group.
 * @param {string} message - The message to send.
 */
function sendMessage(contact, message) {
    return __awaiter(this, void 0, void 0, function* () {
        const chatFound = yield openChat(contact);
        if (chatFound) {
            yield typeAndSendMessage(message);
        }
    });
}
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('Message received from extension:', request);
    if (request.action === 'sendMessage') {
        const { contact, message } = request.payload;
        sendMessage(contact, message)
            .then(() => sendResponse({ status: 'success' }))
            .catch(err => sendResponse({ status: 'error', message: err.toString() }));
        return true;
    }
    if (request.action === 'getContacts') {
        const contacts = getContactList();
        sendResponse({ status: 'success', payload: contacts });
    }
});
// --- Auto-Responder Bot Logic ---
const BOT_MESSAGE_KEY = 'whatsCrmBotMessage';
const REPLIED_CONTACTS_KEY = 'whatsCrmRepliedContacts';
const checkForUnreadMessages = () => __awaiter(void 0, void 0, void 0, function* () {
    const chatElements = document.querySelectorAll(SELECTORS.chatList);
    const { [BOT_MESSAGE_KEY]: botMessage } = yield chrome.storage.local.get(BOT_MESSAGE_KEY);
    const { [REPLIED_CONTACTS_KEY]: repliedContactsResult } = yield chrome.storage.local.get(REPLIED_CONTACTS_KEY);
    const repliedContacts = repliedContactsResult || [];
    if (!botMessage) {
        return;
    }
    for (const chat of Array.from(chatElements)) {
        const unreadBadge = chat.querySelector(SELECTORS.unreadBadge);
        const nameElement = chat.querySelector(SELECTORS.chatName);
        if (nameElement && unreadBadge) {
            const contactName = nameElement.title;
            if (!repliedContacts.includes(contactName)) {
                console.log(`New message from a first-time contact: ${contactName}. Sending auto-response.`);
                yield sendMessage(contactName, botMessage);
                const updatedRepliedContacts = [...repliedContacts, contactName];
                yield chrome.storage.local.set({ [REPLIED_CONTACTS_KEY]: updatedRepliedContacts });
                return;
            }
        }
    }
});
const observeChatList = () => {
    const chatList = document.querySelector('#pane-side');
    if (!chatList) {
        setTimeout(observeChatList, 2000);
        return;
    }
    const observer = new MutationObserver(() => {
        console.log('Change detected in chat list. Checking for unread messages.');
        checkForUnreadMessages();
    });
    observer.observe(chatList, {
        childList: true,
        subtree: true,
    });
    console.log('MutationObserver is now watching the chat list.');
};
setTimeout(observeChatList, 5000);
