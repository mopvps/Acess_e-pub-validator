// Rule config: id, name, description, enabled, severity, category
window.RULES_CONFIG = [
  {
    id: 'multi-space',
    name: 'Multiple space check',
    description: 'Flags 2 or more consecutive spaces or tab characters found in visible text content',
    enabled: false,
    severity: 'error',
    category: 'Typography'
  },
  {
    id: 'invalid-char-spacing',
    name: 'Invalid character spacing',
    description: 'Flags missing spaces after dots, numbers followed by letters, and lowercase followed by uppercase in visible text content.',
    enabled: false,
    severity: 'error',
    category: 'Typography'
  },
  {
    id: 'paragraph-start-case',
    name: 'Paragraph start case',
    description: 'Flags block-level elements whose visible text begins with a lowercase letter.',
    enabled: false,
    severity: 'error',
    category: 'Typography'
  },
  {
    id: 'duplicate-id',
    name: 'Duplicate ID check',
    description: 'Flags any id attribute value that appears more than once in the document.',
    enabled: true,
    severity: 'error',
    category: 'Structure'
  },
  {
    id: 'pagebreak-sequence',
    name: 'Pagebreak sequence check',
    description: 'Flags pagebreak tags whose page number is out of sequence.',
    enabled: true,
    severity: 'error',
    category: 'Structure'
  },
  {
    id: 'italic-paren-start',
    name: 'Italic parenthesis check',
    description: 'Flags italic tags whose text starts with "(" or ends with ")".',
    enabled: false,
    severity: 'error',
    category: 'Typography'
  },
  {
    id: 'sup-sequence',
    name: 'Superscript sequence check',
    description: 'Flags superscript tags whose numeric value is out of sequence. Starts after </header>, stops before the footnotes section. Non-numeric sup values are ignored.',
    enabled: false,
    severity: 'error',
    category: 'Structure'
  },
  {
    id: 'raw-entity',
    name: 'Raw character entity check',
    description: 'Flags characters that should be encoded as HTML entities but appear as raw characters in the text.',
    enabled: true,
    severity: 'error',
    category: 'Entities'
  },
  {
    id: 'encoded-entity',
    name: 'Encoded entity check',
    description: 'Warns when &#x27; or &#39; encoded apostrophe entities are found in the file.',
    enabled: false,
    severity: 'warn',
    category: 'Entities'
  },
  {
    id: 'file-size',
    name: 'File Size Limit',
    description: 'File must not exceed 300KB',
    enabled: true,
    severity: 'error',
    category: 'Structure'
  },
  {
    id: 'para-end-punctuation',
    name: 'Paragraph End Punctuation',
    description: 'Every <p> tag must end with . or ; before closing',
    enabled: false,
    severity: 'error',
    category: 'Typography'
  },
  {
    id: 'li-span-between',
    name: 'Span Between List Items',
    description: 'A <span> tag must not appear between </li> and <li>',
    enabled: false,
    severity: 'error',
    category: 'Structure'
  },
  {
    id: 'unlinked-reference',
    name: 'Missing Hyperlink on Reference Text',
    description: 'Flags cross-reference keywords (Figure, Table, Ch. etc.) followed by a number that are not wrapped in an <a> tag',
    enabled: true,
    severity: 'warn',
    category: 'Links & Refs'
  },
  {
    id: 'raw-url',
    name: 'Raw URL in Text',
    description: 'Flags raw URLs (http, https, www, ftp, mailto) found in visible text content',
    enabled: true,
    severity: 'warn',
    category: 'Links & Refs'
  },
  {
    id: 'missing-alt-text',
    name: 'Missing Alt Text',
    description: 'Flags <img> tags where alt attribute is empty or missing.',
    enabled: true,
    severity: 'error',
    category: 'Structure'
  },
  {
    id: 'heading-hierarchy',
    name: 'Heading Hierarchy Check',
    description: 'Flags section headings that skip levels (e.g. h1 directly to h3) or use wrong heading level inside a section.',
    enabled: true,
    severity: 'error',
    category: 'Structure'
  },
  {
    id: 'ol-li-structure',
    name: 'OL/LI Structure Check',
    description: 'Flags tags found directly inside <ol> or <ul> that are not <li> — including nested lists outside <li>.',
    enabled: true,
    severity: 'error',
    category: 'Structure'
  },
  {
    id: 'figure-table-after-ref',
    name: 'Figure/Table After Reference Check',
    description: 'Flags block elements that reference Figure or Table but are not immediately followed by the expected <figure> or <table> tag.',
    enabled: true,
    severity: 'warn',
    category: 'Structure'
  },
  {
    id: 'bibliography-cite-check',
    name: 'Bibliography/Reference Cite Tag Check',
    description: 'Flags <i> tags found inside bibliography or reference <li> items that should be <cite> tags instead.',
    enabled: true,
    severity: 'error',
    category: 'Structure'
  },
  {
    id: 'unknown-tag',
    name: 'Unknown Tag Check',
    description: 'Warns when any HTML tag other than the approved list is found in the XHTML file.',
    enabled: false,
    severity: 'warn',
    category: 'Structure'
  },
  {
    id: 'tag-unwanted-attribute',
    name: 'Unwanted Attribute Check',
    description: 'Flags tags that should not carry any attributes but do.',
    enabled: true,
    severity: 'warn',
    category: 'Structure'
  },
  {
    id: 'thead-after-tbody',
    name: 'THead/TH After TBody Check',
    description: 'Flags <thead> or <th> tags that appear after a <tbody> tag in the same table.',
    enabled: true,
    severity: 'error',
    category: 'Structure'
  },
  {
    id: 'missing-css-class',
    name: 'Missing CSS Class Check',
    description: 'Flags class names used in the XHTML file that are not defined in the uploaded CSS file.',
    enabled: true,
    severity: 'error',
    category: 'Structure'
  }
];

