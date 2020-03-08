const TIMEOUT = 30000;
const KEYWORDS = [
  ['ww', ['前々']],
  ['w', ['forward', 'for', 'four', 'fall', 'ahead', '前', 'まえ']],
  ['s', ['back', 'buck', 'pack', '後', 'うしろ']],
  ['a', ['left', 'lift', '左', 'ひだり', '茶碗']],
  ['d', ['right', 'light', '右', 'みぎ', '箸']],
  [' ', ['jump', 'dump', 'ジャンプ', '飛', '跳']],
];

export default {
  name: 'wasd',
  description: 'WASD commands',
  order: 18110,
  settings: {
    window: 'vrchat', // a target window to focus, only works on Windows
    exKeys: { value: ' zc', label: 'Extra chat keys', rules: [value=> !value.match(/[^a-zA-Z_0-9 ]/)] },
    time: { value: 500, min: 100, max: 3000, step: 50, label: 'Key press (ms)' },
  },
  data: function() {
    const wordMap = {};
    const wordList = [];
    KEYWORDS.forEach(words => words[1].forEach(w => wordMap[w] = words[0]));
    KEYWORDS.forEach(words => wordList.push(...words[1]));
    const voiceMatch = new RegExp(`(${wordList.join('|')})`, 'ig');
    return {
      wordMap,
      voiceMatch,
      controlling: false,
      ws: null,
    };
  },
  methods: {
    _send: function(options) {
      if (this.$d.ws.readyState !== WebSocket.OPEN) return;
      this.$d.ws.send(JSON.stringify(options));
    },
    focus: function() {
      if (!this.$p.window) return;
      this._send({ type: 'focus', window: this.$p.window });
    },
    sendKeys: function(keys) {
      this.$logger.info(`WASD: ${keys.join(', ')}`);
      this._send({ type: 'sendKeys', time: this.$p.time, keys });
    },
  },
  onlaunched: function(e) {
    this.$d.ws = new WebSocket('ws://localhost:18100');
    this.$bot.timer.set('wasd', TIMEOUT, () => {
      this.$d.controlling = false;
      this.$bot.tts.speak('I have control');
    });
  },
  onstopped: function(e) {
    this.$bot.timer.stop('wasd');
    this.$d.controlling = false;
  },
  onvoice: function(e) {
    if (!this.$d.controlling) return;
    this.$bot.timer.start('wasd');
    if (!e.isFinal) return;
    const keys = [];
    const matches = e.transcript.match(this.$d.voiceMatch);
    if (!matches || !matches.length) return;
    matches.forEach(m => keys.push(this.$d.wordMap[m.toLowerCase()]));
    this.sendKeys(keys);
  },
  chatCommands: [
    {
      name: 'control',
      description: 'e.g. !wasd wwaadd ss',
      word: ['wasd'],
      handler: function(e) {
        e.result.speak = false;
        const exKeys = this.$p.exKeys.replace(/[^a-zA-Z_0-9 ]/g, '');
        const replacement = new RegExp(`[^wasd${exKeys}]`, 'g');
        const keys = e.transcript.replace(replacement, '').split('');
        if (!keys.length) throw new Error('no key');
        this.focus();
        setTimeout(() => this.sendKeys(keys), 500);
      },
    },
  ],
  voiceCommands: [
    {
      name: 'take-control',
      description: 'Say direction after you have control',
      word: {
        en: [/I have control/i],
        ja: [/アイ.*ハブ.*コントロール/],
      },
      handler: function(e) {
        this.$d.controlling = true;
        this.$bot.timer.start('wasd');
        this.$bot.tts.speak('You have control');
        this.focus();
      },
    },
    {
      name: 'give-control',
      word: {
        en: [/You have control/i],
        ja: [/ユー.*ハブ.*コントロール/],
      },
      through: function() { return !this.$d.controlling; },
      handler: function(e) {
        this.$bot.timer.stop('wasd');
        this.$d.controlling = false;
        this.$bot.tts.speak('I have control');
      },
    },
  ],
};
