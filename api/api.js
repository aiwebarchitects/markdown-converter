const $ = document.querySelector.bind(document);
const $$ = document.querySelectorAll.bind(document);
const els = {
  input: $('#markdown-input'),
  preview: $('#preview-content'),
  aiModal: $('#ai-modal'),
  aiConfigModal: $('#ai-config-modal'),
  aiType: $('#ai-type'),
  aiRequest: $('#ai-request'),
  aiSystemPrompt: $('#ai-system-prompt'),
  wordCount: $('#word-count'),
  charCount: $('#char-count'),
  cursorPos: $('#cursor-position'),
  aiStatus: $('#ai-status'),
  loading: $('.loading'),
  notification: $('#notification'),
  aiConfig: $('#ai-config'),
  systemPrompt: $('#system-prompt'),
  themeToggle: $('#theme-toggle')
};

const updatePreview = _.debounce(() => 
  els.preview.innerHTML = DOMPurify.sanitize(marked.parse(els.input.value)), 300);

const updateStatusBar = _.debounce(() => {
  const text = els.input.value;
  els.wordCount.textContent = `Words: ${text.trim().split(/\s+/).length}`;
  els.charCount.textContent = `Characters: ${text.length}`;
  const pos = els.input.selectionStart;
  const textBefore = text.substr(0, pos);
  const line = textBefore.split('\n').length;
  const col = pos - textBefore.lastIndexOf('\n');
  els.cursorPos.textContent = `Line: ${line}, Column: ${col}`;
}, 100);

const showNotification = (message, duration) => {
  els.notification.textContent = message;
  els.notification.classList.add('show');
  setTimeout(() => {
    els.notification.classList.remove('show');
  }, duration);
};

const getAIConfig = () => ({
  systemPrompt: els.systemPrompt.textContent
});

const handleAIAssist = async () => {
  try {
    els.loading.style.display = 'block';
    els.aiStatus.textContent = 'AI working...';
    const config = getAIConfig();
    const res = await fetch('/api/ai-assist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        content: els.input.value,
        request: els.aiRequest.value, 
        type: els.aiType.value,
        systemPrompt: config.systemPrompt
      })
    });
    const data = await res.json();
    
    // Apply regex replacements
    let newContent = els.input.value;
    data.replacements.forEach(replacement => {
      newContent = newContent.replace(new RegExp(replacement.regex, 'g'), replacement.replace);
    });
    
    els.input.value = newContent;
    updatePreview();
    els.aiModal.style.display = 'none';
    els.aiStatus.textContent = 'AI task completed';
    showNotification(data.summary, data.notificationDuration);
  } catch (err) {
    console.error('AI assist error:', err);
    els.aiStatus.textContent = 'AI task failed';
    showNotification('AI task failed. Please try again.', 3000);
  } finally {
    els.loading.style.display = 'none';
  }
};

const handleAIGrammar = async () => {
  try {
    els.loading.style.display = 'block';
    els.aiStatus.textContent = 'AI checking grammar...';
    const config = getAIConfig();
    const res = await fetch('/api/ai-grammar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        content: els.input.value,
        systemPrompt: config.systemPrompt
      })
    });
    const data = await res.json();
    
    // Apply corrections
    let newContent = els.input.value;
    data.corrections.forEach(correction => {
      newContent = newContent.replace(correction.original, correction.corrected);
    });
    
    els.input.value = newContent;
    updatePreview();
    els.aiStatus.textContent = 'Grammar check completed';
    showNotification(data.summary, data.notificationDuration);
  } catch (err) {
    console.error('AI grammar check error:', err);
    els.aiStatus.textContent = 'Grammar check failed';
    showNotification('Grammar check failed. Please try again.', 3000);
  } finally {
    els.loading.style.display = 'none';
  }
};

const handleAISummarize = async () => {
  try {
    els.loading.style.display = 'block';
    els.aiStatus.textContent = 'AI summarizing...';
    const config = getAIConfig();
    const res = await fetch('/api/ai-summarize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        content: els.input.value,
        systemPrompt: config.systemPrompt
      })
    });
    const data = await res.json();
    
    // Append summary to the end of the document
    els.input.value += '\n\n## Summary\n\n' + data.summary;
    updatePreview();
    els.aiStatus.textContent = 'Summary generated';
    showNotification(data.summary, data.notificationDuration);
  } catch (err) {
    console.error('AI summarize error:', err);
    els.aiStatus.textContent = 'Summarization failed';
    showNotification('Summarization failed. Please try again.', 3000);
  } finally {
    els.loading.style.display = 'none';
  }
};

const handleAITranslate = async () => {
  try {
    els.loading.style.display = 'block';
    els.aiStatus.textContent = 'AI translating...';
    const targetLanguage = prompt('Enter target language:');
    if (!targetLanguage) {
      els.aiStatus.textContent = 'Translation cancelled';
      return;
    }
    const config = getAIConfig();
    const res = await fetch('/api/ai-translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        content: els.input.value,
        targetLanguage: targetLanguage,
        systemPrompt: config.systemPrompt
      })
    });
    const data = await res.json();
    
    // Replace content with translation
    els.input.value = data.translatedContent;
    updatePreview();
    els.aiStatus.textContent = 'Translation completed';
    showNotification(data.summary, data.notificationDuration);
  } catch (err) {
    console.error('AI translate error:', err);
    els.aiStatus.textContent = 'Translation failed';
    showNotification('Translation failed. Please try again.', 3000);
  } finally {
    els.loading.style.display = 'none';
  }
};

const handleAIConfigSubmit = () => {
  els.systemPrompt.textContent = els.aiSystemPrompt.value;
  els.aiConfigModal.style.display = 'none';
  showNotification('AI configuration updated', 3000);
};

const wrapText = (before, after) => {
  const { selectionStart: start, selectionEnd: end } = els.input;
  const selected = els.input.value.substring(start, end);
  els.input.setRangeText(`${before}${selected}${after}`, start, end, 'select');
  updatePreview();
};

const formatActions = {
  'format-bold': () => wrapText('**', '**'),
  'format-italic': () => wrapText('*', '*'),
  'format-underline': () => wrapText('<u>', '</u>'),
  'format-strikethrough': () => wrapText('~~', '~~'),
  'format-heading': () => wrapText('\n# ', '\n'),
  'format-link': () => wrapText('[', '](url)'),
  'format-image': () => wrapText('![alt text](', ')'),
};

els.input.addEventListener('input', () => {
  updatePreview();
  updateStatusBar();
});
els.input.addEventListener('keyup', updateStatusBar);
els.input.addEventListener('click', updateStatusBar);

$$('.format-item').forEach(item => 
  item.addEventListener('click', () => formatActions[item.id]?.()));

$('#ai-assist').addEventListener('click', () => els.aiModal.style.display = 'block');
$('#ai-configure').addEventListener('click', () => {
  els.aiSystemPrompt.value = els.systemPrompt.textContent;
  els.aiConfigModal.style.display = 'block';
});
$$('.close').forEach(close => 
  close.addEventListener('click', () => {
    els.aiModal.style.display = 'none';
    els.aiConfigModal.style.display = 'none';
  }));
$('#ai-submit').addEventListener('click', handleAIAssist);
$('#ai-config-submit').addEventListener('click', handleAIConfigSubmit);
$('#ai-grammar').addEventListener('click', handleAIGrammar);
$('#ai-summarize').addEventListener('click', handleAISummarize);
$('#ai-translate').addEventListener('click', handleAITranslate);

$('#new-file').addEventListener('click', () => {
  if (confirm("Unsaved changes will be lost. Continue?")) {
    els.input.value = '';
    updatePreview();
    updateStatusBar();
  }
});

$('#open-file').addEventListener('click', () => {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.md, .txt';
  input.onchange = e => {
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = event => {
      els.input.value = event.target.result;
      updatePreview();
      updateStatusBar();
    };
    reader.readAsText(file);
  };
  input.click();
});

$('#save-file').addEventListener('click', () => {
  const blob = new Blob([els.input.value], {type: 'text/markdown'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'document.md';
  a.click();
});

$('#undo').addEventListener('click',() => document.execCommand('undo'));
$('#redo').addEventListener('click', () => document.execCommand('redo'));

['cut', 'copy', 'paste'].forEach(action => 
  $(`#${action}`).addEventListener('click', () => {
    try {
      document.execCommand(action);
    } catch (err) {
      console.error(`Unable to ${action}:`, err);
      alert(`Use keyboard shortcut for ${action} operation.`);
    }
  }));

els.input.addEventListener('input', function() {
  const pos = this.selectionStart;
  const text = this.value.slice(0, pos);
  const words = text.split(/\s+/);
  const lastWord = words[words.length - 1];

  if (lastWord === '/ai') {
    this.value = text.slice(0, -3) + this.value.slice(pos);
    this.selectionStart = this.selectionEnd = pos - 3;
    els.aiModal.style.display = "block";
  }
});

document.addEventListener('keydown', (e) => {
  if (e.ctrlKey || e.metaKey) {
    switch(e.key) {
      case 'b': e.preventDefault(); formatActions['format-bold'](); break;
      case 'i': e.preventDefault(); formatActions['format-italic'](); break;
      case 'k': e.preventDefault(); formatActions['format-link'](); break;
      case 's': e.preventDefault(); $('#save-file').click(); break;
      case 'o': e.preventDefault(); $('#open-file').click(); break;
    }
  }
});

// Theme toggle functionality
const toggleTheme = () => {
  document.documentElement.classList.toggle('light-mode');
  const isDarkMode = !document.documentElement.classList.contains('light-mode');
  els.themeToggle.innerHTML = isDarkMode ? '<i class="fas fa-moon"></i>' : '<i class="fas fa-sun"></i>';
  localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
};

els.themeToggle.addEventListener('click', toggleTheme);

// Set initial theme based on user's preference
const savedTheme = localStorage.getItem('theme');
if (savedTheme === 'light') {
  document.documentElement.classList.add('light-mode');
  els.themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
} else {
  els.themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
}

updatePreview();
updateStatusBar();
