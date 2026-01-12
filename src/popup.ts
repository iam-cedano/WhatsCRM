interface ScheduledMessage {
  alarmName: string;
  contact: string;
  template: string;
  time: number;
}

document.addEventListener('DOMContentLoaded', () => {
  // --- DOM Elements ---
  const tabButtons = document.querySelectorAll('.tab-button');
  const tabContents = document.querySelectorAll('.tab-content');
  const addTemplateBtn = document.getElementById('add-template-btn') as HTMLButtonElement;
  const templateInput = document.getElementById('template-input') as HTMLTextAreaElement;
  const templatesList = document.getElementById('templates-list') as HTMLUListElement;
  const templateSelect = document.getElementById('template-select') as HTMLSelectElement;
  const refreshGroupsBtn = document.getElementById('refresh-groups-btn') as HTMLButtonElement;
  const scheduleBtn = document.getElementById('schedule-btn') as HTMLButtonElement;
  const saveBotBtn = document.getElementById('save-bot-btn') as HTMLButtonElement;
  const groupSelect = document.getElementById('group-select') as HTMLSelectElement;
  const scheduleTimeInput = document.getElementById('schedule-time') as HTMLInputElement;
  const botMessage = document.getElementById('bot-message') as HTMLTextAreaElement;
  const scheduledList = document.getElementById('scheduled-list') as HTMLUListElement;

  // --- Storage Keys ---
  const TEMPLATES_KEY = 'whatsCrmTemplates';
  const BOT_MESSAGE_KEY = 'whatsCrmBotMessage';
  const SCHEDULED_MESSAGES_KEY = 'whatsCrmScheduledMessages';

  // --- Functions ---

  /**
   * Loads and displays scheduled messages.
   */
  const loadScheduledMessages = (): void => {
    chrome.storage.local.get([SCHEDULED_MESSAGES_KEY], (result) => {
      const scheduledMessages: ScheduledMessage[] = (result[SCHEDULED_MESSAGES_KEY] as ScheduledMessage[]) || [];
      scheduledList.innerHTML = '';

      scheduledMessages.forEach((msg, index) => {
        const li = document.createElement('li');
        const text = `"${msg.template.substring(0, 15)}..." to ${msg.contact} at ${new Date(msg.time).toLocaleString()}`;
        const textSpan = document.createElement('span');
        textSpan.textContent = text;
        li.appendChild(textSpan);

        const cancelBtn = document.createElement('button');
        cancelBtn.textContent = 'Cancel';
        cancelBtn.className = 'delete-btn';
        cancelBtn.addEventListener('click', () => cancelScheduledMessage(index));
        li.appendChild(cancelBtn);

        scheduledList.appendChild(li);
      });
    });
  };

  /**
   * Cancels a scheduled message.
   * @param {number} index - The index of the message to cancel.
   */
  const cancelScheduledMessage = (index: number): void => {
    chrome.storage.local.get([SCHEDULED_MESSAGES_KEY], (result) => {
      const scheduledMessages: ScheduledMessage[] = (result[SCHEDULED_MESSAGES_KEY] as ScheduledMessage[]) || [];
      const msgToCancel = scheduledMessages[index];

      if (msgToCancel) {
        chrome.alarms.clear(msgToCancel.alarmName, (wasCleared) => {
          console.log(`Alarm ${msgToCancel.alarmName} cleared: ${wasCleared}`);
        });

        scheduledMessages.splice(index, 1);
        chrome.storage.local.set({ [SCHEDULED_MESSAGES_KEY]: scheduledMessages }, () => {
          console.log('Scheduled message cancelled.');
          loadScheduledMessages();
        });
      }
    });
  };

  /**
   * Loads the saved bot message and displays it.
   */
  const loadBotMessage = (): void => {
    chrome.storage.local.get([BOT_MESSAGE_KEY], (result) => {
      if (result[BOT_MESSAGE_KEY]) {
        botMessage.value = result[BOT_MESSAGE_KEY] as string;
        console.log('Bot message loaded.');
      }
    });
  };

  /**
   * Loads templates from chrome.storage and updates the UI.
   */
  const loadTemplates = (): void => {
    chrome.storage.local.get([TEMPLATES_KEY], (result) => {
      const templates: string[] = (result[TEMPLATES_KEY] as string[]) || [];
      console.log('Templates loaded:', templates);

      templatesList.innerHTML = '';
      templateSelect.innerHTML = '<option value="">-- Select a Template --</option>';

      templates.forEach((templateText, index) => {
        const li = document.createElement('li');
        const textSpan = document.createElement('span');
        textSpan.textContent = templateText;
        textSpan.className = 'template-text';
        li.appendChild(textSpan);

        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = 'Delete';
        deleteBtn.className = 'delete-btn';
        deleteBtn.addEventListener('click', () => deleteTemplate(index));
        li.appendChild(deleteBtn);

        templatesList.appendChild(li);

        const option = document.createElement('option');
        option.value = templateText;
        option.textContent = `Template #${index + 1}`;
        templateSelect.appendChild(option);
      });
    });
  };

  /**
   * Deletes a template from storage at a given index.
   * @param {number} index - The index of the template to delete.
   */
  const deleteTemplate = (index: number): void => {
    chrome.storage.local.get([TEMPLATES_KEY], (result) => {
      const templates: string[] = (result[TEMPLATES_KEY] as string[]) || [];
      templates.splice(index, 1);
      chrome.storage.local.set({ [TEMPLATES_KEY]: templates }, () => {
        console.log('Template deleted.');
        loadTemplates();
      });
    });
  };

  // --- Event Listeners ---

  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      tabButtons.forEach(btn => btn.classList.remove('active'));
      tabContents.forEach(content => content.classList.remove('active'));
      button.classList.add('active');
      const tabId = (button as HTMLElement).dataset.tab;
      if (tabId) {
        document.getElementById(tabId)?.classList.add('active');
      }
    });
  });

  addTemplateBtn.addEventListener('click', () => {
    const newTemplate = templateInput.value.trim();
    if (newTemplate) {
      chrome.storage.local.get([TEMPLATES_KEY], (result) => {
        const templates: string[] = (result[TEMPLATES_KEY] as string[]) || [];
        templates.push(newTemplate);
        chrome.storage.local.set({ [TEMPLATES_KEY]: templates }, () => {
          console.log('Template saved.');
          templateInput.value = '';
          loadTemplates();
        });
      });
    }
  });

  refreshGroupsBtn.addEventListener('click', () => {
    console.log('Requesting contacts from content script...');
    chrome.tabs.query({ url: "*://web.whatsapp.com/*" }, (tabs) => {
      if (tabs.length === 0) {
        alert("Please make sure you have WhatsApp Web open in a tab.");
        return;
      }
      chrome.tabs.sendMessage(tabs[0].id!, { action: 'getContacts' }, (response) => {
        if (chrome.runtime.lastError) {
          console.error(chrome.runtime.lastError.message);
          return;
        }
        if (response && response.status === 'success') {
          groupSelect.innerHTML = '';
          response.payload.forEach((contact: string) => {
            const option = document.createElement('option');
            option.value = contact;
            option.textContent = contact;
            groupSelect.appendChild(option);
          });
          console.log('Contacts loaded in UI.');
        } else {
          console.error('Failed to get contacts from content script.');
        }
      });
    });
  });

  scheduleBtn.addEventListener('click', () => {
    const template = templateSelect.value;
    const selectedGroups = Array.from(groupSelect.selectedOptions).map(o => o.value);
    const scheduleTime = scheduleTimeInput.value;

    if (!template || selectedGroups.length === 0 || !scheduleTime) {
      alert('Please select a template, at least one group, and a time.');
      return;
    }

    const scheduleTimestamp = new Date(scheduleTime).getTime();

    if (scheduleTimestamp < Date.now()) {
      alert('Please select a future time.');
      return;
    }

    chrome.storage.local.get([SCHEDULED_MESSAGES_KEY], (result) => {
      const scheduledMessages: ScheduledMessage[] = (result[SCHEDULED_MESSAGES_KEY] as ScheduledMessage[]) || [];
      
      selectedGroups.forEach(group => {
        const alarmName = `whatsCrm-${group}-${scheduleTimestamp}`;
        chrome.alarms.create(alarmName, { when: scheduleTimestamp });
        
        scheduledMessages.push({
          alarmName: alarmName,
          contact: group,
          template: template,
          time: scheduleTimestamp
        });

        console.log(`Alarm created: ${alarmName}`);
      });

      chrome.storage.local.set({ [SCHEDULED_MESSAGES_KEY]: scheduledMessages }, () => {
        alert('Message(s) scheduled successfully!');
        scheduleTimeInput.value = '';
        loadScheduledMessages();
      });
    });
  });

  saveBotBtn.addEventListener('click', () => {
    const botMessageText = botMessage.value.trim();
    if (botMessageText) {
      chrome.storage.local.set({ [BOT_MESSAGE_KEY]: botMessageText }, () => {
        console.log('Bot message saved.');
        alert('Auto-responder message saved!');
      });
    }
  });

  // --- Initial Load ---
  loadTemplates();
  loadBotMessage();
  loadScheduledMessages();
  console.log('Popup UI script initialized.');
});
