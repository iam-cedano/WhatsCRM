console.log("Content script loaded on WhatsApp Web.");

// Note: WhatsApp Web uses dynamic class names that can change. 
// These selectors may need to be updated periodically.

const SELECTORS: { [key: string]: string } = {
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
function findMessageBox(): HTMLDivElement | null {
  const messageBox = document.querySelector<HTMLDivElement>(SELECTORS.messageBox);
  if (messageBox) {
    console.log('Message box found:', messageBox);
  } else {
    console.error('Message box not found. Selector may need updating.');
  }
  return messageBox;
}

/**
 * Finds the send button on the page.
 * @returns {HTMLButtonElement | null} The send button element or null if not found.
 */
function findSendButton(): HTMLButtonElement | null {
  const sendButton = document.querySelector<HTMLButtonElement>(SELECTORS.sendButton);
  if (sendButton) {
    console.log('Send button found:', sendButton);
  } else {
    console.error('Send button not found. Selector may need updating.');
  }
  return sendButton;
}

/**
 * Scrapes the list of contacts and groups from the side panel.
 * @returns {string[]} An array of contact/group names.
 */
function getContactList(): string[] {
  const chatElements = document.querySelectorAll<HTMLDivElement>(SELECTORS.chatList);
  if (chatElements.length === 0) {
    console.error('Chat list not found. Selector may need updating.');
    return [];
  }
  
  const contacts: string[] = [];
  chatElements.forEach(chat => {
    const nameElement = chat.querySelector<HTMLSpanElement>(SELECTORS.chatName);
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
const sleep = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Finds a chat by name and clicks it to open it.
 * @param {string} name - The name of the contact or group to find.
 * @returns {Promise<boolean>} - True if the chat was found and clicked, false otherwise.
 */
async function openChat(name: string): Promise<boolean> {
  const chatElements = document.querySelectorAll<HTMLDivElement>(SELECTORS.chatList);
  for (const chat of Array.from(chatElements)) {
    const nameElement = chat.querySelector<HTMLSpanElement>(SELECTORS.chatName);
    if (nameElement && nameElement.title === name) {
      console.log(`Found chat: ${name}`);
      (chat as HTMLElement).click();
      await sleep(1000); // Wait for the chat to open
      return true;
    }
  }
  console.error(`Chat not found: ${name}`);
  return false;
}

/**
 * Types a message into the message box and sends it.
 * @param {string} message - The message to send.
 * @returns {Promise<boolean>} - True if the message was sent, false otherwise.
 */
async function typeAndSendMessage(message: string): Promise<boolean> {
  const messageBox = findMessageBox();
  if (!messageBox) return false;

  messageBox.focus();
  document.execCommand('insertText', false, message);
  messageBox.dispatchEvent(new Event('input', { bubbles: true }));

  await sleep(500);

  const sendButton = findSendButton();
  if (!sendButton) return false;
  
  sendButton.click();
  await sleep(500);
  console.log('Message sent.');
  return true;
}

/**
 * The main function to send a message to a contact.
 * @param {string} contact - The name of the contact or group.
 * @param {string} message - The message to send.
 */
async function sendMessage(contact: string, message: string): Promise<void> {
  const chatFound = await openChat(contact);
  if (chatFound) {
    await typeAndSendMessage(message);
  }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Message received from extension:', request);

  if (request.action === 'sendMessage') {
    const { contact, message } = request.payload;
    sendMessage(contact, message)
      .then(() => sendResponse({ status: 'success' }))
      .catch(err => sendResponse({ status: 'error', message: (err as Error).toString() }));
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

const checkForUnreadMessages = async (): Promise<void> => {
  const chatElements = document.querySelectorAll<HTMLDivElement>(SELECTORS.chatList);
  const { [BOT_MESSAGE_KEY]: botMessage } = await chrome.storage.local.get(BOT_MESSAGE_KEY);
  const { [REPLIED_CONTACTS_KEY]: repliedContactsResult } = await chrome.storage.local.get(REPLIED_CONTACTS_KEY);
  const repliedContacts: string[] = (repliedContactsResult as string[]) || [];

  if (!botMessage) {
    return;
  }

  for (const chat of Array.from(chatElements)) {
    const unreadBadge = chat.querySelector<HTMLSpanElement>(SELECTORS.unreadBadge);
    const nameElement = chat.querySelector<HTMLSpanElement>(SELECTORS.chatName);

    if (nameElement && unreadBadge) {
      const contactName = nameElement.title;
      if (!repliedContacts.includes(contactName)) {
        console.log(`New message from a first-time contact: ${contactName}. Sending auto-response.`);
        
        await sendMessage(contactName, botMessage as string);

        const updatedRepliedContacts = [...repliedContacts, contactName];
        await chrome.storage.local.set({ [REPLIED_CONTACTS_KEY]: updatedRepliedContacts });
        
        return; 
      }
    }
  }
};

const observeChatList = (): void => {
  const chatList = document.querySelector<HTMLDivElement>('#pane-side');

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
