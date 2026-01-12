"use strict";
console.log("Background script loaded.");
chrome.alarms.onAlarm.addListener((alarm) => {
    console.log("Alarm fired:", alarm);
    if (alarm.name.startsWith('whatsCrm-')) {
        const SCHEDULED_MESSAGES_KEY = 'whatsCrmScheduledMessages';
        chrome.storage.local.get([SCHEDULED_MESSAGES_KEY], (result) => {
            let scheduledMessages = result[SCHEDULED_MESSAGES_KEY] || [];
            let messageToSend = null;
            let messageIndex = -1;
            for (let i = 0; i < scheduledMessages.length; i++) {
                if (scheduledMessages[i].alarmName === alarm.name) {
                    messageToSend = scheduledMessages[i];
                    messageIndex = i;
                    break;
                }
            }
            if (messageToSend) {
                chrome.tabs.query({ url: "https://web.whatsapp.com/*" }, (tabs) => {
                    if (tabs.length === 0) {
                        console.error("No WhatsApp tab found.");
                        return;
                    }
                    const tabId = tabs[0].id;
                    if (tabId) {
                        chrome.tabs.sendMessage(tabId, {
                            action: "sendMessage",
                            payload: {
                                contact: messageToSend.contact,
                                message: messageToSend.template,
                            },
                        }, (response) => {
                            if (chrome.runtime.lastError) {
                                console.error(chrome.runtime.lastError.message);
                            }
                            else {
                                console.log("Message sent to content script, response:", response);
                                scheduledMessages.splice(messageIndex, 1);
                                chrome.storage.local.set({ [SCHEDULED_MESSAGES_KEY]: scheduledMessages });
                            }
                        });
                    }
                });
            }
            else {
                console.error(`Could not find scheduled message for alarm: ${alarm.name}`);
            }
        });
    }
});
