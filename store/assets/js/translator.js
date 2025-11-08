/**
 * CyberSmrt Translation System
 * Supports real languages + cyber languages (1337 Speak, Binary, Morse Code, Caesar Cipher)
 */

// Prevent duplicate execution
if (typeof window.TRANSLATOR_LOADED === 'undefined') {
window.TRANSLATOR_LOADED = true;

class CyberSmrtTranslator {
  constructor() {
    this.currentLanguage = this.getStoredLanguage() || 'en';
    this.translationCache = new Map();
    this.originalContent = new Map();

    // Custom language encoders
    this.encoders = {
      '1337': this.to1337Speak.bind(this),
      'binary': this.toBinary.bind(this),
      'morse': this.toMorse.bind(this),
      'caesar': this.toCaesar.bind(this)
    };

    // Morse code mapping
    this.morseCode = {
      'A': '.-', 'B': '-...', 'C': '-.-.', 'D': '-..', 'E': '.', 'F': '..-.',
      'G': '--.', 'H': '....', 'I': '..', 'J': '.---', 'K': '-.-', 'L': '.-..',
      'M': '--', 'N': '-.', 'O': '---', 'P': '.--.', 'Q': '--.-', 'R': '.-.',
      'S': '...', 'T': '-', 'U': '..-', 'V': '...-', 'W': '.--', 'X': '-..-',
      'Y': '-.--', 'Z': '--..', '0': '-----', '1': '.----', '2': '..---',
      '3': '...--', '4': '....-', '5': '.....', '6': '-....', '7': '--...',
      '8': '---..', '9': '----.', '.': '.-.-.-', ',': '--..--', '?': '..--..',
      '!': '-.-.--', ' ': '/'
    };
  }

  /**
   * Get stored language preference
   */
  getStoredLanguage() {
    try {
      return localStorage.getItem('cybersmrt-language');
    } catch (e) {
      return null;
    }
  }

  /**
   * Store language preference
   */
  setStoredLanguage(lang) {
    try {
      localStorage.setItem('cybersmrt-language', lang);
      this.currentLanguage = lang;
    } catch (e) {
      console.warn('Could not store language preference:', e);
    }
  }

  /**
   * Convert text to 1337 Speak
   * Uses advanced substitutions while maintaining readability
   */
  to1337Speak(text) {
    const leetMap = {
      // Vowels
      'a': '4', 'A': '@',
      'e': '3', 'E': '3',
      'i': '1', 'I': '!',
      'o': '0', 'O': '0',
      'u': 'u', 'U': 'U',  // Keep U readable

      // Common consonants with advanced replacements
      's': '$', 'S': '$',
      't': '7', 'T': '+',
      'l': '1', 'L': '|_',
      'h': '#', 'H': '#',
      'x': '><', 'X': '><',
      'c': '(', 'C': '(',

      // Additional number-based replacements
      'g': '9', 'G': '9',
      'b': '8', 'B': '8',
      'z': '2', 'Z': '2',

      // Keep these mostly readable
      'k': 'k', 'K': 'K',
      'r': 'r', 'R': 'R',
      'n': 'n', 'N': 'N',
      'm': 'm', 'M': 'M',
      'y': 'y', 'Y': 'Y'
    };

    return text.split('').map(char => leetMap[char] || char).join('');
  }

  /**
   * Convert text to Binary
   */
  toBinary(text) {
    return text.split('').map(char => {
      const binary = char.charCodeAt(0).toString(2).padStart(8, '0');
      return binary;
    }).join(' ');
  }

  /**
   * Convert text to Morse Code
   */
  toMorse(text) {
    return text.toUpperCase().split('').map(char => {
      return this.morseCode[char] || char;
    }).join(' ');
  }

  /**
   * Convert text to Caesar Cipher (ROT13)
   */
  toCaesar(text) {
    return text.replace(/[a-zA-Z]/g, (char) => {
      const code = char.charCodeAt(0);
      const isUpperCase = char === char.toUpperCase();
      const base = isUpperCase ? 65 : 97;
      return String.fromCharCode(((code - base + 13) % 26) + base);
    });
  }

  /**
   * Translate text based on current language
   */
  async translate(text, targetLang = this.currentLanguage) {
    if (!text || !text.trim()) return text;

    // Return original for English
    if (targetLang === 'en') return text;

    // Check cache
    const cacheKey = `${targetLang}:${text}`;
    if (this.translationCache.has(cacheKey)) {
      return this.translationCache.get(cacheKey);
    }

    // Handle custom cyber languages
    if (this.encoders[targetLang]) {
      const encoded = this.encoders[targetLang](text);
      this.translationCache.set(cacheKey, encoded);
      return encoded;
    }

    // For real languages, we'll use Google Translate API via a simple fetch
    // Note: In production, you'd want to use a proper translation service
    try {
      const translated = await this.translateViaAPI(text, targetLang);
      this.translationCache.set(cacheKey, translated);
      return translated;
    } catch (error) {
      console.warn('Translation failed:', error);
      return text; // Fallback to original text
    }
  }

  /**
   * Translate via external API using LibreTranslate
   */
  async translateViaAPI(text, targetLang) {
    try {
      console.log(`🌐 Translating to ${targetLang}:`, text.substring(0, 50) + '...');

      // Use LibreTranslate's free API with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const response = await fetch('https://libretranslate.com/translate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          q: text,
          source: 'en',
          target: targetLang,
          format: 'text'
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        console.error(`Translation API error: ${response.status} ${response.statusText}`);
        throw new Error(`Translation API error: ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ Translation received:', data.translatedText?.substring(0, 50) + '...');
      return data.translatedText || text;
    } catch (error) {
      if (error.name === 'AbortError') {
        console.warn('Translation API timed out after 10 seconds');
      } else {
        console.warn('Translation API failed:', error.message);
      }
      return text; // Fallback to original text
    }
  }

  /**
   * Store original content before translation
   */
  storeOriginalContent(element) {
    if (!this.originalContent.has(element)) {
      this.originalContent.set(element, {
        text: element.textContent,
        html: element.innerHTML
      });
    }
  }

  /**
   * Restore original content
   */
  restoreOriginalContent(element) {
    const original = this.originalContent.get(element);
    if (original) {
      element.textContent = original.text;
    }
  }

  /**
   * Translate all text nodes in the document
   */
  async translatePage(targetLang) {
    // Store current language
    this.setStoredLanguage(targetLang);

    // If switching back to English, restore original content
    if (targetLang === 'en') {
      this.originalContent.forEach((original, element) => {
        element.textContent = original.text;
      });
      return;
    }

    // Select all text-containing elements
    const textNodes = this.getTextNodes(document.body);

    for (const node of textNodes) {
      const element = node.parentElement;

      // Skip script, style, and certain data attributes
      if (this.shouldSkipElement(element)) continue;

      // Store original content
      this.storeOriginalContent(element);

      // Translate the text
      const originalText = node.textContent.trim();
      if (originalText) {
        const translated = await this.translate(originalText, targetLang);
        node.textContent = translated;
      }
    }

    // Handle placeholders - store first, then translate/restore
    const placeholderElements = document.querySelectorAll('[placeholder]');
    for (const element of placeholderElements) {
      // Always store original if not already stored
      if (!element.dataset.originalPlaceholder) {
        element.dataset.originalPlaceholder = element.placeholder;
      }

      if (targetLang === 'en') {
        // Restore to original English
        element.placeholder = element.dataset.originalPlaceholder;
      } else {
        // Translate from original English
        const translated = await this.translate(element.dataset.originalPlaceholder, targetLang);
        element.placeholder = translated;
      }
    }

    // Clear input values when changing languages (don't translate user input)
    document.querySelectorAll('input[type="search"], input[type="text"]').forEach((element) => {
      if (element.value && targetLang !== 'en') {
        // Store the value if switching away from English
        if (!element.dataset.originalValue) {
          element.dataset.originalValue = element.value;
        }
        element.value = '';
      } else if (targetLang === 'en' && element.dataset.originalValue) {
        // Restore value when returning to English
        element.value = element.dataset.originalValue;
        delete element.dataset.originalValue;
      }
    });
  }

  /**
   * Get all text nodes in an element
   */
  getTextNodes(element) {
    const textNodes = [];
    const walker = document.createTreeWalker(
      element,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: (node) => {
          // Skip whitespace-only nodes
          if (node.textContent.trim().length === 0) {
            return NodeFilter.FILTER_REJECT;
          }
          return NodeFilter.FILTER_ACCEPT;
        }
      }
    );

    let node;
    while (node = walker.nextNode()) {
      textNodes.push(node);
    }

    return textNodes;
  }

  /**
   * Check if element should be skipped for translation
   */
  shouldSkipElement(element) {
    if (!element) return true;

    const skipTags = ['SCRIPT', 'STYLE', 'CODE', 'PRE', 'NOSCRIPT'];
    const skipClasses = ['no-translate'];

    // Skip certain tags
    if (skipTags.includes(element.tagName)) return true;

    // Skip elements with no-translate class
    if (element.classList && Array.from(element.classList).some(cls => skipClasses.includes(cls))) {
      return true;
    }

    // Skip elements with translate="no"
    if (element.getAttribute('translate') === 'no') return true;

    return false;
  }
}

// Initialize global translator
window.cyberSmrtTranslator = new CyberSmrtTranslator();

// Auto-translate on page load if language is set
document.addEventListener('DOMContentLoaded', () => {
  const storedLang = window.cyberSmrtTranslator.getStoredLanguage();
  if (storedLang && storedLang !== 'en') {
    // Wait a bit for page to fully render
    setTimeout(() => {
      window.cyberSmrtTranslator.translatePage(storedLang);
    }, 100);
  }
});

} // End duplicate check
