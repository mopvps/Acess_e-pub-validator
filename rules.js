// Rule functions: (parsed) => [{ ruleId, line, col, message, detail }]
function isInsideEntity(line, col) {
  // Check if the character at col is part of an HTML entity
  // Hex entity: &#x...;
  // Decimal entity: &#...;
  // Named entity: &...;
  // Scan backwards from col to find '&', then forward to find ';'
  // If pattern matches &...;, &#...; or &#x...; return true
  let start = col;
  while (start >= 0 && line[start] !== '&') start--;
  if (start < 0) return false;
  if (line[start] !== '&') return false;
  let end = col;
  while (end < line.length && line[end] !== ';') end++;
  if (end >= line.length) return false;
  const entity = line.slice(start, end + 1);
  if (/^&#x[0-9A-Fa-f]+;$/.test(entity)) return true;
  if (/^&#[0-9]+;$/.test(entity)) return true;
  if (/^&[a-zA-Z]+;$/.test(entity)) return true;
  return false;
}

window.RULES = {
  'multi-space'(parsed) {
    const results = [];
    const { lines, textMask } = parsed;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const mask = textMask[i];

      for (let c = 0; c < line.length; c++) {
        // --- existing: multiple spaces ---
        if (mask[c] && line[c] === ' ' && mask[c + 1] && line[c + 1] === ' ') {
          if (isInsideEntity(line, c)) continue;
          let runEnd = c;
          while (runEnd + 1 < line.length && line[runEnd + 1] === ' ' && mask[runEnd + 1]) runEnd++;
          const length = runEnd - c + 1;
          const snipS = Math.max(0, c - 20);
          const snipE = Math.min(line.length, c + 20);
          results.push({
            ruleId: 'multi-space', line: i + 1, col: c + 1, length,
            message: 'Multiple spaces found in text content',
            detail: line.slice(snipS, snipE).trim() || '(blank text)'
          });
          c = runEnd;
          continue;
        }

        // --- existing: tab ---
        if (mask[c] && line[c] === '\t') {
          if (isInsideEntity(line, c)) continue;
          const snipS = Math.max(0, c - 20);
          const snipE = Math.min(line.length, c + 20);
          results.push({
            ruleId: 'multi-space', line: i + 1, col: c + 1, length: 1,
            message: 'Tab character found in text content',
            detail: line.slice(snipS, snipE).trim() || '(blank text)'
          });
          continue;
        }

        if (mask[c] && line[c] === ' ' && c > 0 && line[c - 1] === '>') {
          // Find the '<' that belongs to this '>' by scanning backwards simply
          let t = c - 2;
          while (t >= 0 && line[t] !== '<') t--;
          if (t < 0) continue;
          const tagChunk = line.slice(t + 1, c - 1).trim();
          const isClosing = tagChunk.startsWith('/');
          if (isClosing) continue; // </tag> space after = always normal
          const tagName = tagChunk.split(/[\s>\/]/)[0].toLowerCase();
          const snipS = Math.max(0, c - 20);
          const snipE = Math.min(line.length, c + 20);
          results.push({
            ruleId: 'multi-space', line: i + 1, col: c + 1, length: 1,
            message: 'Space found immediately after tag opening',
            detail: line.slice(snipS, snipE).trim() || '(blank text)'
          });
          continue;
        }

        if (mask[c] && line[c] === ' ' && c + 1 < line.length && line[c + 1] === '<') {
          // Only flag if previous visible char is a word character (not another tag boundary)
          let prevChar = '';
          for (let p = c - 1; p >= 0; p--) {
            if (mask[p]) { prevChar = line[p]; break; }
          }
          if (!prevChar || !/[a-zA-Z0-9.,;:!?'")\]]/.test(prevChar)) continue;

          const isClosing = line[c + 2] === '/';
          if (!isClosing) continue;
          const afterLt = line.slice(c + 3).trim();
          const tagName = afterLt.split(/[\s>\/]/)[0].toLowerCase();
          const SKIP_TAGS = ['a', 'sup', 'sub'];
          if (SKIP_TAGS.includes(tagName)) continue;
          const snipS = Math.max(0, c - 20);
          const snipE = Math.min(line.length, c + 20);
          results.push({
            ruleId: 'multi-space', line: i + 1, col: c + 1, length: 1,
            message: 'Space found immediately before tag closing',
            detail: line.slice(snipS, snipE).trim() || '(blank text)'
          });
          continue;
        }
      }
    }

    return results;
  },

  'invalid-char-spacing'(parsed) {
    const results = [];
    const { lines, textMask } = parsed;

    const isDigit = ch => ch >= '0' && ch <= '9';
    const isLower = ch => ch >= 'a' && ch <= 'z';
    const isUpper = ch => ch >= 'A' && ch <= 'Z';
    const isLetter = ch => isLower(ch) || isUpper(ch);

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const mask = textMask[i];

      for (let c = 0; c < line.length - 1; c++) {
        if (!mask[c] || !mask[c + 1]) continue;
        if (isInsideEntity(line, c)) continue;

        const a = line[c];
        const b = line[c + 1];

        const start = Math.max(0, c - 20);
        const end = Math.min(line.length, c + 20);
        const snippet = line.slice(start, end).trim();

        if (isDigit(a) && isLetter(b)) {
          // Skip ordinal suffixes: 1st, 2nd, 3rd, 4th...nth
          const twoChar = (b + (line[c + 2] || '')).toLowerCase();
          const isOrdinal = twoChar === 'st' || twoChar === 'nd' || twoChar === 'rd' || twoChar === 'th';
          // Skip decade/era patterns: 1690s, 1800s etc. (digit followed by 's' then non-letter)
          const isDecadeS = (b === 's' || b === 'S') && (!line[c + 2] || !isLetter(line[c + 2]));
          if (isOrdinal || isDecadeS) continue;
          results.push({
            ruleId: 'invalid-char-spacing',
            line: i + 1,
            col: c + 1,
            length: 2,
            message: 'Number directly followed by letter without space',
            detail: snippet || '(blank text)'
          });
          continue;
        }

        if (isLower(a) && isUpper(b)) {
          results.push({
            ruleId: 'invalid-char-spacing',
            line: i + 1,
            col: c + 1,
            length: 2,
            message: 'Lowercase letter directly followed by uppercase without space',
            detail: snippet || '(blank text)'
          });
          continue;
        }

        if (a === '.' && (isLetter(b) || isDigit(b))) {
          const prev = c > 0 ? line[c - 1] : '';
          const isDecimal = isDigit(prev) && isDigit(b);

          results.push({
            ruleId: 'invalid-char-spacing',
            line: i + 1,
            col: c + 1,
            length: 2,
            severity: isDecimal ? 'warn' : 'error',
            message: isDecimal
              ? 'Decimal number — check if space is needed'
              : 'Dot not followed by a space',
            detail: snippet || '(blank text)'
          });
        }
      }
    }

    return results;
  },

  'paragraph-start-case'(parsed) {
    const results = [];
    if (!parsed.dom) return results;

    const BLOCK_TAGS = 'p,div,h1,h2,h3,h4,h5,h6,li,blockquote,td,th';
    const SKIP = /^[\s\d\.,\-\(\)\[\]"';:!?\/\\@#%\*_\+=~\^\{\}\|<>&]/;

    const body = parsed.dom.querySelector('body');
    if (!body) return results;
    // Skip if dom parse put content outside body
    const bodyText = body.textContent.trim();
    if (!bodyText) return results;

    const els = body.querySelectorAll(BLOCK_TAGS);
    els.forEach(el => {
      if (['TITLE','HEAD','SCRIPT','STYLE'].includes(el.tagName.toUpperCase())) return;

      // Skip if this element contains other block elements — only check leaf blocks
      const BLOCK_TAG_NAMES = ['P','DIV','H1','H2','H3','H4','H5','H6','LI','BLOCKQUOTE','TD','TH'];
      const hasBlockChild = Array.from(el.children).some(c => BLOCK_TAG_NAMES.includes(c.tagName.toUpperCase()));
      if (hasBlockChild) return;

      // Get only the FIRST non-empty direct text node
      const firstTextNode = Array.from(el.childNodes)
        .filter(n => n.nodeType === Node.TEXT_NODE && n.textContent.trim() !== '')
        [0];

      // If no direct text node, check if first child is an inline element (span, em, strong, a)
      // and get its text as the opener
      const INLINE = ['SPAN','EM','STRONG','A','B','I','U','SUB','SUP'];
      let ownText = '';
      if (firstTextNode) {
        ownText = firstTextNode.textContent.trim();
      } else {
        const firstInline = Array.from(el.children)
          .find(c => INLINE.includes(c.tagName.toUpperCase()));
        if (firstInline) ownText = firstInline.textContent.trim();
      }

      if (!ownText) return;

      const first = ownText[0];
      if (SKIP.test(first)) return;
      if (first >= 'A' && first <= 'Z') return;
      if (first >= 'a' && first <= 'z') {
        const needle = ownText.slice(0, 20);
        let lineNum = 1, colNum = 1;
        outer: for (let i = 0; i < parsed.lines.length; i++) {
          const line = parsed.lines[i];
          const mask = parsed.textMask[i];
          if (!mask) continue;
          let searchFrom = 0;
          while (true) {
            const idx = line.indexOf(needle, searchFrom);
            if (idx === -1) break;
            if (mask[idx]) {
              // Only accept if this position is at start of visible text run
              // i.e. char before is either start of line, or previous char is not visible text
              const prevVisible = idx > 0 && mask[idx - 1];
              if (!prevVisible) {
                lineNum = i + 1;
                colNum = idx + 1;
                break outer;
              }
            }
            searchFrom = idx + 1;
          }
        }

        const rawLine = parsed.lines[lineNum - 1] || '';
        if (
          rawLine.includes('<?xml') ||
          rawLine.includes('<!DOCTYPE') ||
          rawLine.includes('<html') ||
          rawLine.includes('<head')
        ) return;

        results.push({
          ruleId: 'paragraph-start-case',
          line: lineNum,
          col: colNum,
          length: 1,
          message: 'Block element starts with a lowercase letter',
          detail: ownText.slice(0, 40)
        });
      }
    });
    return results;
  },

  'duplicate-id'(parsed) {
    const results = [];
    if (!parsed.dom) return results;

    const body = parsed.dom.querySelector('body');
    if (!body) return results;

    const all = body.querySelectorAll('[id]');
    const seen = {};

    // Find all line numbers for each id
    parsed.lines.forEach((line, i) => {
      const regex = /id="([^"]+)"/g;
      let match;
      while ((match = regex.exec(line)) !== null) {
        const id = match[1];
        if (!seen[id]) seen[id] = [];
        seen[id].push(i + 1);
      }
    });

    Object.entries(seen).forEach(([id, lines]) => {
      if (lines.length < 2) return;
      results.push({
        ruleId: 'duplicate-id',
        line: lines[0],
        col: 1,
        length: 1,
        message: `Duplicate ID found: "${id}"`,
        detail: ''
      });
    });

    return results;
  },

  'pagebreak-sequence'(parsed) {
    const issues = [];
    const lines = parsed.lines;

    // Match any span with epub:type="pagebreak"
    const pagebreakRe = /<span[^>]*epub:type=["']pagebreak["'][^>]*>/gi;
    const idRe = /id=["']([^"']+)["']/i;

    const pages = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      pagebreakRe.lastIndex = 0;
      let match;
      while ((match = pagebreakRe.exec(line)) !== null) {
        const tag = match[0];
        const idMatch = tag.match(idRe);
        if (!idMatch) continue;

        const rawId = idMatch[1];

        // Extract only the number from id (strip all non-numeric chars)
        const numStr = rawId.replace(/[^0-9]/g, '');
        if (!numStr) continue;

        const num = parseInt(numStr, 10);
        pages.push({ num, rawId, line: i + 1, col: match.index + 1 });
      }
    }

    // Check sequence
    for (let i = 0; i < pages.length - 1; i++) {
      const cur = pages[i];
      const next = pages[i + 1];
      if (next.num !== cur.num + 1) {
        issues.push({
          ruleId: 'pagebreak-sequence',
          line: next.line,
          col: next.col,
          length: 1,
          message: `Page number out of sequence — found "${next.rawId}" (${next.num}) after "${cur.rawId}" (${cur.num}), expected ${cur.num + 1}`,
          detail: `Expected: ${cur.num + 1} · Found: ${next.num}`
        });
      }
    }

    return issues;
  },

  'italic-paren-start'(parsed) {
    const results = [];
    if (!parsed.dom) return results;

    const body = parsed.dom.querySelector('body');
    if (!body) return results;

    const italics = body.querySelectorAll('i');
    italics.forEach(el => {
      const text = el.textContent.trim();
      const startsWithParen = text[0] === '(';
      const endsWithParen = text[text.length - 1] === ')';
      if (!startsWithParen && !endsWithParen) return;

      const needleStart = startsWithParen ? `<i>${text.slice(0, 15)}` : text.slice(-15);
      let lineNum = 1, colNum = 1;
      for (let i = 0; i < parsed.lines.length; i++) {
        const idx = parsed.lines[i].indexOf(needleStart);
        if (idx !== -1) { lineNum = i + 1; colNum = idx + 1; break; }
      }

      results.push({
        ruleId: 'italic-paren-start',
        line: lineNum,
        col: colNum,
        length: 1,
        message: startsWithParen
          ? 'Italic tag starts with "(" — opening parenthesis should not be italicised'
          : 'Italic tag ends with ")" — closing parenthesis should not be italicised',
        detail: text.slice(0, 40)
      });
    });

    return results;
  },

  'sup-sequence'(parsed) {
    const results = [];

    // Find header end line
    let headerEndLine = 0;
    for (let i = 0; i < parsed.lines.length; i++) {
      if (parsed.lines[i].includes('</header>')) { headerEndLine = i + 1; break; }
    }

    // Find footnotes start line
    let footnotesStartLine = Infinity;
    for (let i = 0; i < parsed.lines.length; i++) {
      if (
        parsed.lines[i].includes('epub:type="footnotes"') ||
        parsed.lines[i].includes("epub:type='footnotes'")
      ) { footnotesStartLine = i + 1; break; }
    }

    // Scan raw lines directly — no DOM needed
    const numericSups = [];
    const supRegex = /<sup[^>]*>([\s\S]*?)<\/sup>/g;

    for (let i = 0; i < parsed.lines.length; i++) {
      const lineNum = i + 1;
      if (lineNum <= headerEndLine) continue;
      if (lineNum >= footnotesStartLine) break;

      let match;
      const line = parsed.lines[i];
      supRegex.lastIndex = 0;
      while ((match = supRegex.exec(line)) !== null) {
        // Strip any inner tags to get plain text
        const text = match[1].replace(/<[^>]+>/g, '').trim();
        const n = parseInt(text, 10);
        // Skip non-pure-number
        if (isNaN(n) || String(n) !== text) continue;
        const colNum = match.index + 1;
        numericSups.push({ value: n, raw: text, line: lineNum, col: colNum });
      }
    }

    // Check sequence
    for (let i = 0; i < numericSups.length - 1; i++) {
      const cur = numericSups[i];
      const next = numericSups[i + 1];
      if (next.value !== cur.value + 1) {
        results.push({
          ruleId: 'sup-sequence',
          line: next.line,
          col: next.col,
          length: 1,
          message: `Superscript "${next.raw}" is out of sequence — expected "${cur.value + 1}" after "${cur.raw}"`,
          detail: `sup: ${next.raw}`
        });
      }
    }

    return results;
  },

  'raw-entity'(parsed) {
    const results = [];
    if (!window.ENTITY_MAP || Object.keys(window.ENTITY_MAP).length === 0) return results;

    const raw = parsed.raw;

    // Step 1: Strip tags to get text outside tags
    const textOutsideTags = raw.replace(/<[^>]+>/g, '');

    // Step 2: Strip all valid encoded entity tokens to get plain text only
    const tokenPattern = /&#x[0-9A-Za-z]*;|&#[0-9A-Za-z]*;|&[a-zA-Z][a-zA-Z0-9]*;/g;
    const textOnly = textOutsideTags.replace(tokenPattern, '');

    // Step 3: Build a set of characters that appear in textOnly
    const charsInText = new Set(textOnly);

    // Step 4: For each entity char found in textOnly, locate it in original lines
    for (const [ch, entity] of Object.entries(window.ENTITY_MAP)) {
      if (!ch || !charsInText.has(ch)) continue;

      for (let i = 0; i < parsed.lines.length; i++) {
        const line = parsed.lines[i];
        const mask = parsed.textMask[i];

        let searchFrom = 0;
        while (true) {
          const idx = line.indexOf(ch, searchFrom);
          if (idx === -1) break;

          // Only flag if in visible text (not inside a tag)
          if (!mask[idx]) { searchFrom = idx + 1; continue; }

          // Skip if inside an encoded entity
          if (isInsideEntity(line, idx)) { searchFrom = idx + 1; continue; }

          const snipS = Math.max(0, idx - 20);
          const snipE = Math.min(line.length, idx + ch.length + 20);

          results.push({
            ruleId: 'raw-entity',
            line: i + 1,
            col: idx + 1,
            length: ch.length,
            message: `Raw character "${ch}" should be encoded as ${entity.decimal} or ${entity.hex} or ${entity.character}`,
            detail: line.slice(snipS, snipE).trim() || '(blank text)'
          });

          searchFrom = idx + ch.length;
        }
      }
    }

    return results;
  },

  'encoded-entity'(parsed) {
    const results = [];

    // Only check for these exact tokens
    const watchTokens = ['&#x27;', '&#39;'];

    for (let i = 0; i < parsed.lines.length; i++) {
      const line = parsed.lines[i];

      for (const token of watchTokens) {
        let searchFrom = 0;
        while (true) {
          const idx = line.indexOf(token, searchFrom);
          if (idx === -1) break;

          const snipS = Math.max(0, idx - 20);
          const snipE = Math.min(line.length, idx + token.length + 20);

          results.push({
            ruleId: 'encoded-entity',
            line: i + 1,
            col: idx + 1,
            length: token.length,
            message: `Encoded entity "${token}" found — should be a plain apostrophe or left as raw character`,
            detail: line.slice(snipS, snipE).trim() || '(blank text)'
          });

          searchFrom = idx + token.length;
        }
      }
    }

    return results;
  }
};

window.RULES['file-size'] = function(parsed) {
  const bytes = new Blob([parsed.raw]).size;
  if (bytes > 300 * 1024) {
    return [{
      ruleId: 'file-size',
      line: 1, col: 1, length: 1,
      message: `File size ${(bytes/1024).toFixed(1)}KB exceeds the 300KB limit`,
      detail: `Current size: ${(bytes/1024).toFixed(1)}KB — Expected: max 300KB`
    }];
  }
  return [];
};

window.RULES['para-end-punctuation'] = function(parsed) {
  const issues = [];
  parsed.lines.forEach((line, i) => {
    const matches = [...line.matchAll(/<\/p>/gi)];
    matches.forEach(match => {
      const stripped = line.slice(0, match.index)
        .replace(/<[^>]*>/g, '')       // strip all tags
        .replace(/&[^;]+;/g, 'X')     // replace entities with placeholder
        .trimEnd();
      const charBefore = stripped.slice(-1);
      if (!charBefore) return;
      if (charBefore !== '.' && charBefore !== ';') {
        // col = position of charBefore in original line
        const charBeforeCol = match.index; // char just before </p>
        issues.push({
          ruleId: 'para-end-punctuation',
          line: i + 1,
          col: charBeforeCol, // points to last visible char
          length: 1,
          message: `Paragraph ends with '${charBefore}' instead of . or ;`,
          detail: `Found: '${charBefore}' before </p>`
        });
      }
    });
  });
  return issues;
};

window.RULES['li-span-between'] = function(parsed) {
  const issues = [];
  let insideList = false;
  let insideLi = false;

  parsed.lines.forEach((line, i) => {
    const trimmed = line.trim();

    // Track entering/exiting ul or ol
    if (/<(ul|ol)[\s>]/i.test(trimmed)) insideList = true;
    if (/<\/(ul|ol)>/i.test(trimmed)) { insideList = false; insideLi = false; }

    if (/<li[\s>]/i.test(trimmed)) insideLi = true;

    // Span check BEFORE closing </li> resets the flag
    if (insideList && !insideLi && /<span/i.test(trimmed)) {
      const spanIdx = line.toLowerCase().indexOf('<span');
      const liIdx = line.toLowerCase().indexOf('<li');
      if (liIdx !== -1 && liIdx < spanIdx) {
        // span is inside an <li> that opens on this line — not a real issue
      } else {
        const col = spanIdx + 1;
        issues.push({
          ruleId: 'li-span-between',
          line: i + 1,
          col,
          length: trimmed.length,
          message: `Span tag found outside <li> inside a list`,
          detail: `Found: ${trimmed} as direct child of list`
        });
      }
    }

    // Reset insideLi AFTER span check so </li> on same line as <span doesn't cause false positive
    if (/<\/li>/i.test(trimmed)) insideLi = false;
    if (/<li[\s>]/i.test(trimmed) && /<\/li>/i.test(trimmed)) insideLi = false;
  });

  return issues;
};

window.RULES['unlinked-reference'] = function(parsed) {
  const issues = [];

  const REFERENCE_RE = /(?<![A-Za-z])(?:(Chapter|Ch\.)[\s\-\.]*([IVXLCDMivxlcdm]+|\d[\d\.]*[A-Za-z]?)|(Figure|Fig\.|Fig|Illustration|Illus\.|Ill\.|Section|Sect\.|Sec\.|Appendix|App\.|Algorithm|Algo\.|Exercise|Equation|Eq\.|Footnote|Theorem|Thm\.|Listing|List\.|Problem|Prob\.|Example|Ex\.|Article|Art\.|Exhibit|Formula|Diagram|Sidebar|Annex|Amendment|Schedule|Clause|Specimen|Solution|Sample|Stanza|Scene|Verse|Volume|Vol\.|Plate|Pl\.|Table|Tab\.|Graph|Chart|Image|Scheme|Lemma|Proof|Answer|Panel|Part|Map|Box|Note|Act|Line|Case)[\s\-\.]*(\d[\d\.]*[A-Za-z]?))(?![A-Za-z])/gi;

  parsed.lines.forEach((line, i) => {
    // Skip figure caption lines
    if (line.includes('fig-num') || line.includes('fig-cap')) return;
    // Skip if entire match is inside an <a>...</a> tag
    REFERENCE_RE.lastIndex = 0;
    let match;
    while ((match = REFERENCE_RE.exec(line)) !== null) {
      const matchIndex = match.index;

      // Check if this position is inside an <a> tag by scanning backwards
      const before = line.slice(0, matchIndex);
      const openA = before.lastIndexOf('<a ');
      const closeA = before.lastIndexOf('</a>');

      // If last <a seen is after last </a>, we are inside an anchor
      if (openA !== -1 && openA > closeA) continue;

      // Also skip if inside any tag (textMask check)
      if (parsed.textMask[i] && !parsed.textMask[i][matchIndex]) continue;

      const afterMatch = line[matchIndex + match[0].length];
      if (afterMatch === ':') continue;

      issues.push({
        ruleId: 'unlinked-reference',
        line: i + 1,
        col: matchIndex + 1,
        length: match[0].length,
        message: `Cross-reference "${match[0].trim()}" is not wrapped in an anchor tag`,
        detail: `Found: ${match[0].trim()}`
      });
    }
  });

  return issues;
};

window.RULES['raw-url'] = function(parsed) {
  const issues = [];

  const URL_RE = /(?:https?:\/\/|ftp:\/\/|mailto:|www\.)[^\s<>"']+/gi;

  parsed.lines.forEach((line, i) => {
    URL_RE.lastIndex = 0;
    let match;
    while ((match = URL_RE.exec(line)) !== null) {
      // Skip if inside a tag (not visible text)
      if (!parsed.textMask[i] || !parsed.textMask[i][match.index]) continue;

      issues.push({
        ruleId: 'raw-url',
        line: i + 1,
        col: match.index + 1,
        length: match[0].length,
        message: `Raw URL found in text: ${match[0]}`,
        detail: match[0]
      });
    }
  });

  return issues;
};

window.RULES['missing-alt-text'] = function(parsed) {
  const issues = [];
  parsed.lines.forEach((line, i) => {
    const imgRegex = /<img[^>]*>/gi;
    let match;
    while ((match = imgRegex.exec(line)) !== null) {
      const tag = match[0];
      const altMatch = tag.match(/alt=["']([^"']*)["']/i);
      const hasAlt = altMatch !== null;
      const isEmpty = hasAlt && altMatch[1].trim() === '';
      if (!hasAlt || isEmpty) {
        issues.push({
          ruleId: 'missing-alt-text',
          line: i + 1,
          col: match.index + 1,
          length: tag.length,
          message: hasAlt ? 'Image has empty alt attribute' : 'Image is missing alt attribute',
          detail: tag.slice(0, 60)
        });
      }
    }
  });
  return issues;
};

window.RULES['heading-hierarchy'] = function(parsed) {
  const issues = [];
  const lines = parsed.lines;

  const sectionOpenRe = /<section[\s>]/i;
  const sectionCloseRe = /<\/section>/i;
  const headingRe = /<(h[1-6])[\s>]/i;
  const pagebreakRe = /epub:type=["']pagebreak["']/i;

  // Each entry: { waitingForHeading: bool, level: number|null }
  const sectionStack = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;

    if (pagebreakRe.test(line) && !headingRe.test(line)) continue;

    if (sectionOpenRe.test(line)) {
      sectionStack.push({ waitingForHeading: true, level: null });
    }

    const hMatch = line.match(headingRe);
    if (hMatch) {
      const level = parseInt(hMatch[1][1]);

      for (let s = sectionStack.length - 1; s >= 0; s--) {
        if (sectionStack[s].waitingForHeading) {
          sectionStack[s].waitingForHeading = false;
          sectionStack[s].level = level;

          let parentLevel = 0;
          for (let p = s - 1; p >= 0; p--) {
            const candidate = sectionStack[p].level || sectionStack[p].lastChildLevel || null;
            if (candidate !== null) {
              parentLevel = candidate;
              break;
            }
          }

          if (parentLevel === 0 && level !== 1) {
            issues.push({
              ruleId: 'heading-hierarchy',
              line: lineNum,
              col: 1,
              length: 1,
              message: `<h${level}> used as root heading — expected <h1>`,
              detail: line.trim().slice(0, 60)
            });
          } else if (parentLevel > 0 && level > parentLevel + 1) {
            issues.push({
              ruleId: 'heading-hierarchy',
              line: lineNum,
              col: 1,
              length: 1,
              message: `<h${level}> found inside <h${parentLevel}> section — expected <h${parentLevel + 1}>`,
              detail: line.trim().slice(0, 60)
            });
          }
          break;
        }
      }
    }

    if (sectionCloseRe.test(line)) {
      if (sectionStack.length > 0) {
        const closed = sectionStack.pop();
        // Propagate closed section's level to parent so siblings can inherit it
        if (closed.level !== null && sectionStack.length > 0) {
          const parent = sectionStack[sectionStack.length - 1];
          if (parent.lastChildLevel === undefined || closed.level > parent.lastChildLevel) {
            parent.lastChildLevel = closed.level;
          }
        }
      }
    }
  }

  return issues;
};

window.RULES['ol-li-structure'] = function(parsed) {
  const issues = [];
  const raw = parsed.raw;

  // Use a single-pass token scan on raw text instead of line-by-line
  const tagRe = /<(\/?)([a-zA-Z][a-zA-Z0-9]*)[^>]*?>/g;
  let match;

  // Stack: each entry = { tag: 'ol'|'li', directChild: bool }
  const stack = [];

  // Track line number by counting newlines up to match index
  const getLine = idx => (raw.slice(0, idx).match(/\n/g) || []).length + 1;

  while ((match = tagRe.exec(raw)) !== null) {
    const isClose = match[1] === '/';
    const tag = match[2].toLowerCase();

    if (tag === 'ol' || tag === 'ul') {
      if (!isClose) {
        // Check if this nested list is directly inside ol/ul but outside li
        let nearestOL = -1;
        let nearestLI = -1;
        for (let s = stack.length - 1; s >= 0; s--) {
          if (stack[s].tag === 'li' && nearestLI === -1) nearestLI = s;
          if ((stack[s].tag === 'ol' || stack[s].tag === 'ul') && nearestOL === -1) nearestOL = s;
          if (nearestOL !== -1) break;
        }
        if (nearestOL !== -1 && (nearestLI === -1 || nearestOL > nearestLI)) {
          const lineNum = getLine(match.index);
          const parentTag = stack[nearestOL].tag;
          issues.push({
            ruleId: 'ol-li-structure',
            line: lineNum,
            col: 1,
            length: match[0].length,
            message: `<${tag}> found directly inside <${parentTag}> — only <li> is allowed here`,
            detail: match[0].slice(0, 60)
          });
        }
        stack.push({ tag: tag });
      } else {
        // pop until we find matching ol
        for (let s = stack.length - 1; s >= 0; s--) {
          const popped = stack.pop();
          if (popped.tag === 'ol' || popped.tag === 'ul') break;
        }
      }
    } else if (tag === 'li') {
      if (!isClose) {
        stack.push({ tag: 'li' });
      } else {
        for (let s = stack.length - 1; s >= 0; s--) {
          const popped = stack.pop();
          if (popped.tag === 'li') break;
        }
      }
    } else if (!isClose) {
      // Any other opening tag — check if direct child of ol (not inside li)
      // Find nearest ol or li in stack
      let nearestOL = -1;
      let nearestLI = -1;
      for (let s = stack.length - 1; s >= 0; s--) {
        if (stack[s].tag === 'li' && nearestLI === -1) nearestLI = s;
        if ((stack[s].tag === 'ol' || stack[s].tag === 'ul') && nearestOL === -1) nearestOL = s;
        if (nearestOL !== -1) break;
      }

      // If nearest ancestor is ol (not li), it's a direct child of ol — flag it
      if (nearestOL !== -1 && (nearestLI === -1 || nearestOL > nearestLI)) {
        const lineNum = getLine(match.index);
        const parentTag = stack[nearestOL].tag;
        issues.push({
          ruleId: 'ol-li-structure',
          line: lineNum,
          col: 1,
          length: match[0].length,
          message: `<${tag}> found directly inside <${parentTag}> — only <li> is allowed here`,
          detail: match[0].slice(0, 60)
        });
      }
    }
  }

  return issues;
};

window.RULES['figure-table-after-ref'] = function(parsed) {
  const issues = [];
  if (!parsed.dom) return issues;

  const lines = parsed.lines;
  const seenRefs = new Set();
  const refRe = /(Figure|Fig\.|Fig|Table|Tab\.)\s*([\d]+(?:\.[\d]+)?[a-zA-Z]?)/gi;

  const getLine = tag => {
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].indexOf(tag) !== -1) return i + 1;
    }
    return 1;
  };

  const blocks = parsed.dom.querySelectorAll('p, div, li, td, th, h1, h2, h3, h4, h5, h6, blockquote');

  blocks.forEach(el => {
    if (el.closest('figure')) return;
    const text = el.textContent || '';
    let match;
    refRe.lastIndex = 0;
    const newFigureRefs = [];
    const newTableRefs = [];

    while ((match = refRe.exec(text)) !== null) {
      const keyword = /^fig/i.test(match[1]) ? 'Figure' : 'Table';
      const number = match[2];
      const key = `${keyword}_${number}`;
      if (seenRefs.has(key)) continue;

      if (keyword === 'Figure') {
        newFigureRefs.push(number);
      } else {
        newTableRefs.push(number);
      }
    }

    if (newFigureRefs.length === 0 && newTableRefs.length === 0) return;

    const detail = text.trim().slice(0, 80);
    const openTag = (el.outerHTML || '').split('>')[0] + '>';
    const lineNum = getLine(openTag);

    // Helper: skip noise siblings (pagebreak spans, empty elements)
    const isNoise = el => {
      const tag = el.tagName.toLowerCase();
      if (tag === 'span' && /pagebreak|doc-pagebreak/.test(el.getAttribute('epub:type') || '')) return true;
      if (el.textContent.trim() === '' && !['figure','table','img'].includes(tag)) return true;
      return false;
    };

    // Count consecutive <figure> tags, skipping noise
    let sibling = el.nextElementSibling;
    let figureCount = 0;
    while (sibling) {
      if (isNoise(sibling)) { sibling = sibling.nextElementSibling; continue; }
      if (sibling.tagName.toLowerCase() === 'figure') { figureCount++; sibling = sibling.nextElementSibling; continue; }
      break;
    }

    // Count consecutive <table> tags, skipping noise
    sibling = el.nextElementSibling;
    let tableCount = 0;
    while (sibling) {
      if (isNoise(sibling)) { sibling = sibling.nextElementSibling; continue; }
      if (sibling.tagName.toLowerCase() === 'table') { tableCount++; sibling = sibling.nextElementSibling; continue; }
      break;
    }

    if (newFigureRefs.length > 0 && figureCount < newFigureRefs.length) {
      newFigureRefs.forEach(number => {
        issues.push({
          ruleId: 'figure-table-after-ref',
          line: lineNum,
          col: 1,
          length: 1,
          message: `Reference to "Figure ${number}" not followed by a <figure> tag`,
          detail
        });
      });
    }

    if (newTableRefs.length > 0 && tableCount < newTableRefs.length) {
      newTableRefs.forEach(number => {
        issues.push({
          ruleId: 'figure-table-after-ref',
          line: lineNum,
          col: 1,
          length: 1,
          message: `Reference to "Table ${number}" not followed by a <table> tag`,
          detail
        });
      });
    }

    newFigureRefs.forEach(number => seenRefs.add(`Figure_${number}`));
    newTableRefs.forEach(number => seenRefs.add(`Table_${number}`));
  });

  return issues;
};

window.RULES['bibliography-cite-check'] = function(parsed) {
  const issues = [];
  if (!parsed.dom) return issues;

  const lines = parsed.lines;

  const getLine = tag => {
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].indexOf(tag) !== -1) return i + 1;
    }
    return 1;
  };

  const headings = parsed.dom.querySelectorAll('h1, h2, h3, h4, h5, h6');

  headings.forEach(heading => {
    if (!/bibliography|references?/i.test(heading.textContent || '')) return;

    let sibling = heading.nextElementSibling;
    while (sibling && !['ul', 'ol'].includes(sibling.tagName.toLowerCase())) {
      sibling = sibling.nextElementSibling;
    }
    if (!sibling) return;

    const listItems = sibling.querySelectorAll('li');
    listItems.forEach(li => {
      const hasItalic = Array.from(li.children).some(child => child.tagName.toLowerCase() === 'i');
      if (!hasItalic) return;

      const detail = (li.textContent || '').trim().slice(0, 80);
      const lineNum = getLine('<i>');

      issues.push({
        ruleId: 'bibliography-cite-check',
        line: lineNum,
        col: 1,
        length: 1,
        message: '<i> tag found in bibliography/reference <li> — should be <cite>',
        detail
      });
    });
  });

  return issues;
};

window.runRule = function (ruleId, parsed, enabled) {
  const config = window.RULES_CONFIG.find(r => r.id === ruleId);
  if (!config || !enabled) return [];
  const fn = window.RULES[ruleId];
  if (!fn) return [];
  return fn(parsed).map(r => ({ ...r, severity: r.severity || config.severity, ruleName: config.name }));
};
