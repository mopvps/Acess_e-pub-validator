(function () {

  const REFERENCE = {
    opf: "<?xml version='1.0' encoding='utf-8'?>\n<package xmlns=\"http://www.idpf.org/2007/opf\" unique-identifier=\"bookid\" version=\"3.0\" prefix=\"ibooks: http://vocabulary.itunes.apple.com/rdf/ibooks/vocabulary-extensions-1.0/ a11y: http://www.idpf.org/epub/vocab/package/a11y/#\" xml:lang=\"en\">\n<metadata xmlns:dc=\"http://purl.org/dc/elements/1.1/\" xmlns:opf=\"http://www.idpf.org/2007/opf\">\n<dc:title id=\"en_title\" xml:lang=\"en\">i-Ready Classroom Mathematics, Grade 1 \u2022 Student Companion</dc:title>\n<dc:creator id=\"id\">Curriculum Associates</dc:creator>\n<dc:source id=\"isbn\">urn:isbn:9781663008374</dc:source>\n<dc:identifier id=\"bookid\">urn:isbn:9781663008374</dc:identifier>\n<dc:format>73 Pages</dc:format>\n<dc:type>Text</dc:type>\n<dc:rights>\u00a9 2026\u2013Curriculum Associates, LLC</dc:rights>\n<dc:language>en</dc:language>\n<dc:date>2026</dc:date>\n<dc:publisher>Curriculum Associates</dc:publisher>\n<meta refines=\"#en_title\" property=\"title-type\">main</meta>\n<meta refines=\"#en_title\" property=\"file-as\">i-Ready Classroom Mathematics, Grade 1 \u2022 Student Companion</meta>\n<meta refines=\"#isbn\" property=\"source-of\">pagination</meta>\n<meta property=\"dcterms:modified\">2026-05-19T09:50:00Z</meta>\n<meta name=\"cover\" content=\"cover-image\"/>\n<meta property=\"schema:accessMode\">textual</meta>\n<meta property=\"schema:accessMode\">visual</meta>\n<meta property=\"schema:accessModeSufficient\">textual,visual</meta>\n<meta property=\"schema:accessModeSufficient\">textual</meta>\n<meta property=\"schema:accessibilityFeature\">longDescription</meta>\n<meta property=\"schema:accessibilityFeature\">alternativeText</meta>\n<meta property=\"schema:accessibilityFeature\">structuralNavigation</meta>\n<meta property=\"schema:accessibilityFeature\">pageBreakMarkers</meta>\n<meta property=\"schema:accessibilityFeature\">pageNavigation</meta>\n<meta property=\"schema:accessibilityFeature\">ARIA</meta>\n<meta property=\"schema:accessibilityFeature\">readingOrder</meta>\n<meta property=\"schema:accessibilityFeature\">displayTransformability</meta>\n<meta property=\"schema:accessibilityFeature\">tableOfContents</meta>\n<meta property=\"schema:accessibilityFeature\">MathML</meta>\n<meta property=\"schema:accessibilityHazard\">none</meta>\n<meta property=\"schema:accessibilitySummary\">This title is a well-marked up and structured book, which is fully accessible. This South Carolina Companion edition contains images, table of contents, page-list, landmark, reading order, Structural Navigation, and semantic structure. Short alt texts and long descriptions are provided. This ebook passes Daisy's Ace WCAG 2.1 Level AA checks.</meta>\n<link href=\"http://www.idpf.org/epub/a11y/accessibility-20170105.html#wcag-aa\" rel=\"dcterms:conformsTo\"/>\n<meta refines=\"#id\" property=\"role\" scheme=\"marc:relators\">aut</meta>\n<meta refines=\"#id\" property=\"file-as\">Associates, Curriculum</meta>\n</metadata>",
    ncx: "<?xml version='1.0' encoding='utf-8'?>\n<ncx xmlns=\"http://www.daisy.org/z3986/2005/ncx/\" xmlns:ncx=\"http://www.daisy.org/z3986/2005/ncx/\" version=\"2005-1\" xml:lang=\"en\">\n<head>\n<meta name=\"dtb:uid\" content=\"urn:isbn:9781663008374\"/>\n<meta name=\"dtb:depth\" content=\"1\"/>\n<meta name=\"dtb:totalPageCount\" content=\"6\"/>\n<meta name=\"dtb:maxPageNumber\" content=\"6\"/>\n</head>",
    nav: "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<!DOCTYPE html>\n<html xmlns=\"http://www.w3.org/1999/xhtml\" xmlns:epub=\"http://www.idpf.org/2007/ops\" epub:prefix=\"z3998: http://www.daisy.org/z3998/2012/vocab/structure/, se: https://standardebooks.org/vocab/1.0\" xml:lang=\"en\" lang=\"en\">\n<head>\n<title>Navigational Content Page</title>\n</head>"
  };

  function trimContent(raw, type) {
    if (type === 'opf') {
      const idx = raw.indexOf('</metadata>');
      return idx !== -1 ? raw.slice(0, idx + '</metadata>'.length) : raw;
    }
    if (type === 'ncx') {
      const idx = raw.indexOf('</head>');
      return idx !== -1 ? raw.slice(0, idx + '</head>'.length) : raw;
    }
    if (type === 'nav') {
      const idx = raw.indexOf('</head>');
      return idx !== -1 ? raw.slice(0, idx + '</head>'.length) : raw;
    }
    return raw;
  }

  function computeDiff(aText, bText) {
    const aLines = aText.split('\n');
    const bLines = bText.split('\n');
    const result = [];
    const maxLen = Math.max(aLines.length, bLines.length);
    for (let i = 0; i < maxLen; i++) {
      const aLine = aLines[i];
      const bLine = bLines[i];
      if (aLine === undefined) {
        result.push({ type: 'added', text: bLine });
      } else if (bLine === undefined) {
        result.push({ type: 'removed', text: aLine });
      } else if (aLine.trim() !== bLine.trim()) {
        result.push({ type: 'removed', text: aLine });
        result.push({ type: 'added', text: bLine });
      } else {
        result.push({ type: 'same', text: aLine });
      }
    }
    return result;
  }

  function escape(str) {
    return (str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function renderDiff(diffLines) {
    const output = document.getElementById('compareDiffOutput');
    const hasDiff = diffLines.some(d => d.type !== 'same');
    if (!hasDiff) {
      output.innerHTML = '<div class="diff-empty-state">\u2705 No differences found \u2014 files match!</div>';
      return;
    }
    let html = '';
    diffLines.forEach(d => {
      if (d.type === 'added') {
        html += '<span class="diff-line-added">+ ' + escape(d.text) + '</span>';
      } else if (d.type === 'removed') {
        html += '<span class="diff-line-removed">- ' + escape(d.text) + '</span>';
      } else {
        html += '<span class="diff-line-same">  ' + escape(d.text) + '</span>';
      }
    });
    output.innerHTML = html;
  }

  const FILE_LABELS = { opf: 'content.opf', ncx: 'toc.ncx', nav: 'nav.xhtml' };

  const modal = document.getElementById('compareModal');
  const btnOpen = document.getElementById('btnOpenCompare');
  const btnClose = document.getElementById('btnCloseCompare');
  const btnRun = document.getElementById('btnRunCompare');
  const btnClear = document.getElementById('btnClearCompare');
  const fileTypeSelect = document.getElementById('compareFileType');
  const compareInput = document.getElementById('compareInput');
  const diffOutput = document.getElementById('compareDiffOutput');
  const modalTitle = document.getElementById('compareModalTitle');

  let activeType = '';

  btnOpen.addEventListener('click', function() {
    const type = fileTypeSelect.value;
    if (!type) {
      alert('Please select a file type from the dropdown first.');
      return;
    }
    activeType = type;
    modalTitle.textContent = 'Compare \u2014 ' + FILE_LABELS[type];
    compareInput.value = '';
    diffOutput.innerHTML = '<div class="diff-empty-state">Paste your file content and click Run Compare.</div>';
    modal.style.display = 'flex';
  });

  btnClose.addEventListener('click', function() { modal.style.display = 'none'; });
  modal.addEventListener('click', function(e) { if (e.target === modal) modal.style.display = 'none'; });

  btnClear.addEventListener('click', function() {
    compareInput.value = '';
    diffOutput.innerHTML = '<div class="diff-empty-state">Paste your file content and click Run Compare.</div>';
  });

  btnRun.addEventListener('click', function() {
    const type = activeType;
    if (!type) return;
    const pastedRaw = compareInput.value;
    if (!pastedRaw.trim()) {
      alert('Please paste the file content in the left panel.');
      return;
    }
    const refRaw = REFERENCE[type];
    const pastedTrimmed = trimContent(pastedRaw, type).trim();
    const refTrimmed = refRaw.trim();
    const diff = computeDiff(refTrimmed, pastedTrimmed);
    renderDiff(diff);
  });

})();