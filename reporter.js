// Renders validator report into DOM. No technical jargon.
window.Reporter = {
  currentReport: null,
  currentFilter: 'all',
  isExpandedAll: false,

  init() {
    const btnExpand = document.getElementById('btnToggleExpand');
    if (btnExpand) {
      btnExpand.addEventListener('click', () => {
        this.isExpandedAll = !this.isExpandedAll;
        btnExpand.textContent = this.isExpandedAll ? 'Collapse All' : 'Expand All';
        document.querySelectorAll('#resultList .rule-group').forEach(group => {
          const header = group.querySelector('.rule-group-header');
          const arrow = group.querySelector('.group-arrow');
          if (this.isExpandedAll) {
            group.classList.add('expanded');
            if (arrow) arrow.textContent = '▼';
          } else {
            group.classList.remove('expanded');
            if (arrow) arrow.textContent = '▶';
          }
        });
      });
    }

    const btnExport = document.getElementById('btnExportReport');
    if (btnExport) {
      btnExport.addEventListener('click', () => this.exportReport());
    }

    // Create one shared fixed tooltip element
    const floatTip = document.createElement('div');
    floatTip.id = 'raw-url-float-tip';
    floatTip.style.cssText = `
      position:fixed;display:none;background:var(--surface);
      border:1px solid var(--border);color:var(--text);
      padding:6px 12px;border-radius:var(--r-card);font-size:12px;
      white-space:nowrap;z-index:9999;box-shadow:0 4px 12px rgba(0,0,0,0.2);
      pointer-events:none;`;
    document.body.appendChild(floatTip);

    document.addEventListener('mouseover', e => {
      const tip = e.target.closest('.raw-url-tip');
      if (!tip) return;
      floatTip.textContent = tip.dataset.tooltip;
      floatTip.style.display = 'block';
    });
    document.addEventListener('mousemove', e => {
      floatTip.style.left = (e.clientX + 12) + 'px';
      floatTip.style.top = (e.clientY - 30) + 'px';
    });
    document.addEventListener('mouseout', e => {
      if (!e.target.closest('.raw-url-tip')) return;
      floatTip.style.display = 'none';
    });

    const modal = document.createElement('div');
    modal.id = 'heading-structure-modal';
    modal.style.cssText = `
      display:none;position:fixed;inset:0;background:rgba(0,0,0,0.5);
      z-index:9999;align-items:center;justify-content:center;`;
    modal.innerHTML = `
      <div style="background:var(--surface);border:1px solid var(--border);
        border-radius:var(--r-card);padding:24px;min-width:380px;max-width:580px;
        max-height:80vh;overflow-y:auto;box-shadow:0 8px 32px rgba(0,0,0,0.2);">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
          <div style="font-weight:700;font-size:16px;">Heading Structure</div>
          <button id="closeHeadingModal" style="background:none;border:none;font-size:20px;cursor:pointer;color:var(--text-muted);">✕</button>
        </div>
        <div id="headingStructureTree" style="font-family:var(--font-mono);font-size:13px;line-height:2;"></div>
      </div>`;
    document.body.appendChild(modal);
    document.getElementById('closeHeadingModal').addEventListener('click', () => {
      modal.style.display = 'none';
    });
    modal.addEventListener('click', e => {
      if (e.target === modal) modal.style.display = 'none';
    });
  },

  render(report) {
    this.currentReport = report;
    this.currentFilter = 'all';
    this.isExpandedAll = false;
    const btnExpand = document.getElementById('btnToggleExpand');
    if (btnExpand) btnExpand.textContent = 'Expand All';

    this._renderBanner(report);
    this._renderStats(report);
    this._renderList();
  },

  setFilter(filter) {
    this.currentFilter = filter;
    document.querySelectorAll('.filter-tab').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.filter === filter);
    });
    this._renderList();
  },

  _renderBanner(report) {
    const banner = document.getElementById('resultsBanner');
    if (!banner) return;

    if (report.issueCount === 0) {
      banner.className = 'results-banner banner-pass';
      banner.innerHTML = `
        <div class="banner-icon">🎉</div>
        <div class="banner-content">
          <div class="banner-title">Document is Clean & Compliant!</div>
          <div class="banner-desc">All ${report.activeRules.length} enabled checks passed without any errors or warnings.</div>
        </div>
      `;
    } else {
      const errors = report.issues.filter(i => {
        const rule = report.activeRules.find(r => r.id === i.ruleId);
        return !rule || rule.severity === 'error';
      }).length;
      const warnings = report.issues.length - errors;

      banner.className = 'results-banner banner-fail';
      banner.innerHTML = `
        <div class="banner-icon">⚠️</div>
        <div class="banner-content">
          <div class="banner-title">${report.issueCount} Issue${report.issueCount === 1 ? '' : 's'} Found</div>
          <div class="banner-desc">${errors} Error${errors === 1 ? '' : 's'} and ${warnings} Warning${warnings === 1 ? '' : 's'} detected in visible content or tag structure.</div>
        </div>
      `;
    }
  },

  _renderStats(report) {
    const totalRules = report.activeRules.length;
    const issueCount = report.issueCount;

    // Group issues by rule
    const rulesWithIssues = new Set(report.issues.map(i => i.ruleId)).size;
    const passedCount = totalRules - rulesWithIssues;
    const healthScore = totalRules > 0 ? Math.round((passedCount / totalRules) * 100) : 100;

    const rulesEl = document.getElementById('statRules');
    if (rulesEl) rulesEl.textContent = totalRules;

    const issuesEl = document.getElementById('statIssues');
    if (issuesEl) {
      issuesEl.textContent = issueCount;
      issuesEl.style.color = issueCount > 0 ? 'var(--fail)' : 'var(--pass)';
    }

    const passedEl = document.getElementById('statPassed');
    if (passedEl) passedEl.textContent = passedCount;

    const scoreEl = document.getElementById('statScore');
    if (scoreEl) {
      scoreEl.textContent = `${healthScore}%`;
      scoreEl.style.color = healthScore === 100 ? 'var(--pass)' : healthScore >= 70 ? 'var(--warn)' : 'var(--fail)';
    }

    // Update Filter Tab Counts
    const cntAll = document.getElementById('filterCountAll');
    if (cntAll) cntAll.textContent = totalRules;

    const cntIssues = document.getElementById('filterCountIssues');
    if (cntIssues) cntIssues.textContent = rulesWithIssues;

    const cntPassed = document.getElementById('filterCountPassed');
    if (cntPassed) cntPassed.textContent = passedCount;
  },

  exportReport() {
    if (!this.currentReport) return;
    const data = {
      timestamp: new Date().toISOString(),
      rulesRun: this.currentReport.activeRules.length,
      totalIssues: this.currentReport.issueCount,
      issues: this.currentReport.issues
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `validation-report-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  },

  _renderList() {
    const list = document.getElementById('resultList');
    list.innerHTML = '';
    const report = this.currentReport;
    if (!report) return;

    // Group issues by ruleId
    const groupsByRule = {};
    for (const issue of report.issues) {
      if (!groupsByRule[issue.ruleId]) groupsByRule[issue.ruleId] = [];
      groupsByRule[issue.ruleId].push(issue);
    }

    const groups = report.activeRules.map(rule => {
      const ruleIssues = groupsByRule[rule.id] || [];
      return {
        ruleId: rule.id,
        ruleName: rule.name,
        severity: rule.severity,
        issues: ruleIssues,
        passed: ruleIssues.length === 0
      };
    });

    let groupsToShow = groups;
    if (this.currentFilter === 'issues') {
      groupsToShow = groups.filter(g => !g.passed);
    } else if (this.currentFilter === 'passed') {
      groupsToShow = groups.filter(g => g.passed);
    }

    if (groupsToShow.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'empty-state';
      empty.textContent = this.currentFilter === 'issues'
        ? 'No issues found. Nice and clean.'
        : 'Nothing to show for this filter.';
      list.appendChild(empty);
      return;
    }

    for (const group of groupsToShow) {
      list.appendChild(this._buildGroup(group));
    }
  },

  _buildGroup(group) {
    const wrap = document.createElement('div');
    wrap.className = 'rule-group ' + (group.passed ? 'group-pass' : 'group-' + group.severity);

    const header = document.createElement('button');
    header.type = 'button';
    header.className = 'rule-group-header';

    const countBadge = group.passed
      ? `<span class="count-badge count-pass">Passed</span>`
      : `<span class="count-badge count-${group.severity}">${group.issues.length} issue${group.issues.length === 1 ? '' : 's'}</span>`;

    const severityLabel = group.passed ? 'PASS' : group.severity.toUpperCase();

    header.innerHTML = `
      <span class="group-arrow">▶</span>
      <span class="group-rule-name">${this._escape(group.ruleName)}</span>
      <span class="group-center">${countBadge}</span>
      <span class="group-severity severity-tag-${group.passed ? 'pass' : group.severity}">${severityLabel}</span>
    `;

    if (group.ruleId === 'heading-hierarchy') {
      const viewBtn = document.createElement('button');
      viewBtn.textContent = '🌲 View Structure';
      viewBtn.style.cssText = `
        margin-left:auto;margin-right:12px;padding:4px 12px;
        font-size:12px;border:1px solid var(--border);
        border-radius:var(--r-btn);background:var(--surface);
        color:var(--text);cursor:pointer;font-weight:600;
      `;
      viewBtn.addEventListener('click', e => {
        e.stopPropagation();
        // Build tree from parsed lines
        const lines = this.currentReport.parsed.lines;
        const errorLines = new Set(this.currentReport.issues
          .filter(i => i.ruleId === 'heading-hierarchy')
          .map(i => i.line));
        const headings = [];
        const sectionOpenRe = /<section[\s>]/i;
        const sectionCloseRe = /<\/section>/i;
        const headingRe = /<(h[1-6])[\s>]/i;
        const pagebreakRe = /epub:type=["']pagebreak["']/i;
        const sectionStack = [];

        lines.forEach((line, i) => {
          if (pagebreakRe.test(line)) return;
          if (sectionOpenRe.test(line)) sectionStack.push(sectionStack.length);

          const hMatch = line.match(headingRe);
          if (hMatch) {
            const level = parseInt(hMatch[1][1]);
            const isError = errorLines.has(i + 1);
            const textMatch = line.replace(/<[^>]+>/g, '').trim();
            headings.push({ level, lineNum: i + 1, isError, text: textMatch.slice(0, 40) });
          }

          if (sectionCloseRe.test(line) && sectionStack.length > 0) sectionStack.pop();
        });

        // Build tree HTML
        const treeEl = document.getElementById('headingStructureTree');
        treeEl.innerHTML = '';
        headings.forEach((h, idx) => {
          const indent = '&nbsp;&nbsp;&nbsp;'.repeat((h.level - 1) * 2);
          const prefix = h.level === 1 ? '' : '├── ';
          const icon = h.isError ? '❌' : '✅';
          const color = h.isError ? 'var(--fail)' : 'var(--pass)';
          const errorMsg = h.isError ? `<span style="color:var(--fail);font-size:11px;"> ← issue</span>` : '';
          treeEl.innerHTML += `
            <div style="color:${color};">
              ${indent}${prefix}${icon} <strong>h${h.level}</strong>
              <span style="color:var(--text-muted);font-size:11px;margin-left:6px;">Line ${h.lineNum}</span>
              <span style="color:var(--text);margin-left:6px;">${h.text || ''}</span>
              ${errorMsg}
            </div>
          `;
        });

        document.getElementById('heading-structure-modal').style.display = 'flex';
      });
      header.appendChild(viewBtn);
    }

    const body = document.createElement('div');
    body.className = 'rule-group-body';

    const inner = document.createElement('div');
    inner.className = 'rule-group-body-inner';

    if (group.passed) {
      const row = document.createElement('div');
      row.className = 'group-issue-row row-pass';
      row.textContent = 'All checks passed for this rule.';
      inner.appendChild(row);
    } else {
      if (group.ruleId === 'duplicate-id') {
        group.issues.forEach(issue => {
          const row = document.createElement('div');
          row.className = 'group-issue-row';
          const idText = issue.message.replace('Duplicate ID found: ', '').replace(/"/g, '');
          row.innerHTML = `
            <span style="font-weight:600;font-family:var(--font-mono)">Duplicate ID found:
              <span class="dup-id-chip" data-id="${idText}" style="color:var(--fail);background:var(--fail-soft);padding:2px 8px;border-radius:var(--r-pill);cursor:pointer;user-select:none;" title="Click to copy">${issue.message.replace('Duplicate ID found: ', '')}</span></span>
            <span class="dup-id-toast" style="display:none;margin-left:10px;font-size:12px;color:var(--pass);font-weight:600;">✔ Copied!</span>
          `;
          row.querySelector('.dup-id-chip').addEventListener('click', function() {
            navigator.clipboard.writeText(idText).then(() => {
              const toast = row.querySelector('.dup-id-toast');
              toast.style.display = 'inline';
              setTimeout(() => { toast.style.display = 'none'; }, 2000);
            });
          });
          inner.appendChild(row);
        });
      } else if (group.ruleId === 'pagebreak-sequence') {
        // Collect all pagebreaks from raw lines
        const allPages = [];
        const errorLines = new Set(group.issues.map(i => i.line));
        const pagebreakTagRegex = /<[^>]*?(?:pagebreak|role=["']doc-pagebreak["']|epub:type=["']pagebreak["']|id=["'](?:page|pb)[_-]?\w+["'])[^>]*?>/gi;
        const idRegex = /id=["']([^"']+)["']/i;

        this.currentReport.parsed.lines.forEach((line, i) => {
          let tagMatch;
          pagebreakTagRegex.lastIndex = 0;
          while ((tagMatch = pagebreakTagRegex.exec(line)) !== null) {
            const tagStr = tagMatch[0];
            const idMatch = tagStr.match(idRegex);
            if (!idMatch) continue;
            const rawId = idMatch[1];
            const pageVal = rawId.replace(/^(?:page|pb)[_-]?/i, '');
            allPages.push({ num: pageVal, line: i + 1, isError: errorLines.has(i + 1) });
          }
        });

        // Render circles
        const wrap2 = document.createElement('div');
        wrap2.style.cssText = 'display:flex;flex-wrap:wrap;gap:10px;padding:12px 16px;';
        allPages.forEach(page => {
          const circle = document.createElement('div');
          circle.title = `Line ${page.line}`;
          circle.style.cssText = `
            width:40px;height:40px;border-radius:50%;
            background:${page.isError ? 'var(--fail)' : 'var(--pass)'};
            color:#fff;display:flex;align-items:center;
            justify-content:center;font-weight:700;font-size:12px;
            flex-shrink:0;cursor:default;
            title="Line ${page.line}";
          `;
          circle.textContent = page.num;
          circle.title = `Page ${page.num} — Line ${page.line}`;
          wrap2.appendChild(circle);
        });
        inner.appendChild(wrap2);

        // Show error messages below
        if (group.issues.length > 0) {
          group.issues.forEach(issue => {
            const msg = document.createElement('div');
            msg.style.cssText = 'padding:6px 16px;font-size:12px;color:var(--fail);';
            msg.textContent = issue.message;
            inner.appendChild(msg);
          });
        }
      } else if (group.ruleId === 'file-size') {
        group.issues.forEach(issue => {
          const row = document.createElement('div');
          row.className = 'group-issue-row';
          row.innerHTML = `
            <span style="font-weight:600">${this._escape(this._explainIssue(issue))}</span>
          `;
          inner.appendChild(row);
        });
      } else if (group.ruleId === 'li-span-between') {
        const table = document.createElement('table');
        table.className = 'issue-table';
        table.innerHTML = `
          <thead>
            <tr>
              <th class="col-whats-wrong">What's wrong</th>
              <th class="col-where">Where it is</th>
              <th class="col-location">Location</th>
            </tr>
          </thead>
          <tbody></tbody>
        `;
        const tbody = table.querySelector('tbody');
        group.issues.forEach(issue => {
          const tr = document.createElement('tr');
          tr.innerHTML = `
            <td class="col-whats-wrong">Span found outside a list item</td>
            <td class="col-where"><span class="snippet-text">${this._escape(issue.detail.replace('Found: ', '').replace(' as direct child of list', '').trim().slice(0, 60))}</span></td>
            <td class="col-location">Line ${issue.line} · Col ${issue.col}</td>
          `;
          tbody.appendChild(tr);
        });
        inner.appendChild(table);
      } else if (group.ruleId === 'unlinked-reference') {
        group.issues.forEach(issue => {
          const row = document.createElement('div');
          row.className = 'group-issue-row';
          row.style.cssText = 'display:flex;align-items:center;gap:16px;padding:10px 16px;';

          // Explanation
          const explain = document.createElement('div');
          explain.style.cssText = 'flex:2;font-weight:600;color:var(--warn);';
          explain.textContent = `"${issue.detail.replace('Found: ', '')}" is not wrapped in an anchor tag`;
          row.appendChild(explain);

          // Highlighted reference text
          const tag = document.createElement('span');
          tag.style.cssText = 'flex:1;background:var(--warn-soft);color:var(--warn);padding:2px 8px;border-radius:var(--r-pill);font-family:var(--font-mono);font-size:13px;font-weight:600;text-align:center;';
          tag.textContent = issue.detail.replace('Found: ', '');
          row.appendChild(tag);

          // Line and col
          const loc = document.createElement('div');
          loc.style.cssText = 'flex:1;font-size:12px;color:var(--text-muted);text-align:right;';
          loc.textContent = `Line ${issue.line} · Col ${issue.col}`;
          row.appendChild(loc);

          inner.appendChild(row);
        });
      } else if (group.ruleId === 'missing-alt-text') {
        const table = document.createElement('table');
        table.className = 'issue-table';
        table.innerHTML = `
          <thead>
            <tr>
              <th class="col-whats-wrong">Issue</th>
              <th class="col-location">Line</th>
            </tr>
          </thead>
          <tbody></tbody>
        `;
        const tbody = table.querySelector('tbody');
        group.issues.forEach(issue => {
          const tr = document.createElement('tr');
          tr.innerHTML = `
            <td class="col-whats-wrong">${this._escape(issue.message)}</td>
            <td class="col-location">Line ${issue.line}</td>
          `;
          tbody.appendChild(tr);
        });
        inner.appendChild(table);
      } else if (group.ruleId === 'ol-li-structure') {
        const table = document.createElement('table');
        table.className = 'issue-table';
        table.innerHTML = `
          <thead>
            <tr>
              <th class="col-whats-wrong">What's wrong</th>
              <th class="col-location">Location</th>
            </tr>
          </thead>
          <tbody></tbody>
        `;
        const tbody = table.querySelector('tbody');
        group.issues.forEach(issue => {
          const tr = document.createElement('tr');
          tr.innerHTML = `
            <td class="col-whats-wrong">${this._escape(issue.message)}</td>
            <td class="col-location">Line ${issue.line}</td>
          `;
          tbody.appendChild(tr);
        });
        inner.appendChild(table);
      } else {
        const lines = this.currentReport.parsed.lines;
        const table = document.createElement('table');
        table.className = 'issue-table';
        table.innerHTML = `
          <thead>
            <tr>
              <th class="col-whats-wrong">What's wrong</th>
              <th class="col-where">Where it is</th>
              <th class="col-location">Location</th>
            </tr>
          </thead>
          <tbody></tbody>
        `;
        const tbody = table.querySelector('tbody');
        group.issues.forEach(issue => {
          const lineText = lines[issue.line - 1] || '';
          const { cleanLine, cleanCol } = this._stripTagsWithOffset(lineText, issue.col);
          const tr = document.createElement('tr');

          if (issue.ruleId === 'italic-paren-start') {
            tr.innerHTML = `
              <td class="col-whats-wrong">${this._escape(this._explainIssue(issue))}</td>
              <td class="col-where"><span class="snippet-text"><i>${this._escape(issue.detail)}</i></span></td>
              <td class="col-location">Line ${issue.line}</td>
            `;
          } else {
            const explanation = issue.ruleId === 'raw-url'
              ? `<span class="raw-url-tip" data-tooltip='"${this._escape(issue.detail)}" should be wrapped in an &lt;a&gt; tag' style="cursor:help;border-bottom:1px dashed var(--text-muted);">Raw URL found in text</span>`
              : this._escape(this._explainIssue(issue));
            tr.innerHTML = `
              <td class="col-whats-wrong">${explanation}</td>
              <td class="col-where"><span class="snippet-text">${this._buildSnippet(cleanLine, cleanCol, issue.length || 1)}</span></td>
              <td class="col-location">Line ${issue.line} · Col ${issue.col}</td>
            `;
          }

          tbody.appendChild(tr);
        });
        inner.appendChild(table);
      }
    }

    body.appendChild(inner);

    header.addEventListener('click', () => {
      const expanded = wrap.classList.toggle('expanded');
      header.querySelector('.group-arrow').textContent = expanded ? '▼' : '▶';
    });

    wrap.appendChild(header);
    wrap.appendChild(body);
    return wrap;
  },

  _explainIssue(issue) {
    if (issue.ruleId === 'multi-space') {
      if (issue.message === 'Tab character found in text content') {
        return 'A tab character was found in the text';
      }
      if (issue.message === 'Space found immediately after tag opening') {
        return 'A space was found right after a tag opens — remove it';
      }
      if (issue.message === 'Space found immediately before tag closing') {
        return 'A space was found right before a tag closes — remove it';
      }
      return `${issue.length} spaces found instead of 1`;
    }

    if (issue.ruleId === 'invalid-char-spacing') {
      switch (issue.message) {
        case 'Number directly followed by letter without space':
          return 'A number runs directly into a word — add a space';
        case 'Lowercase letter directly followed by uppercase without space':
          return 'A lowercase letter runs into a capital — add a space';
        case 'Dot not followed by a space':
          return 'A dot is not followed by a space';
        case 'Decimal number — check if space is needed':
          return 'Decimal number found — verify if spacing is correct';
        default:
          return issue.message;
      }
    }

    if (issue.ruleId === 'paragraph-start-case') {
      return 'This block starts with a lowercase letter — it should begin with a capital';
    }

    if (issue.ruleId === 'duplicate-id') {
      return `Duplicate id ${issue.message} — found on lines: ${issue.detail}`;
    }

    if (issue.ruleId === 'pagebreak-sequence') {
      return issue.message;
    }

    if (issue.ruleId === 'italic-paren-start') {
      return issue.message;
    }

    if (issue.ruleId === 'raw-url')
      return `Raw URL found in text`;

    if (issue.ruleId === 'sup-sequence') {
      return issue.message;
    }

    if (issue.ruleId === 'raw-entity') {
      return `Raw character found — should be encoded`;
    }

    if (issue.ruleId === 'encoded-entity') {
      return issue.message;
    }

    if (issue.ruleId === 'para-end-punctuation')
      return `This paragraph does not end with a period or semicolon — found ${issue.message.match(/'(.+)'/)?.[1] ?? 'unknown'} instead`;

    if (issue.ruleId === 'file-size')
      return `This file is too large. ${issue.detail}. Reduce file size below 300KB before packaging.`;

    if (issue.ruleId === 'li-span-between')
      return `A span tag was found between two list items — it should not appear outside a <li>`;

    if (issue.ruleId === 'unlinked-reference')
      return `"${issue.detail.replace('Found: ', '')}" appears as plain text — it should be wrapped in an <a> tag linking to the referenced item`;

    return issue.message;
  },

  _stripTagsWithOffset(lineText, col) {
    // Strip HTML tags, tracking how the 1-based col shifts in the cleaned text.
    // Entities (&amp; &#x00E1; etc.) are left untouched — only <...> tags are removed.
    const idx = Math.max(0, col - 1);
    let cleanLine = '';
    let cleanCol = 1;
    let inTag = false;

    for (let i = 0; i < lineText.length; i++) {
      const ch = lineText[i];
      if (ch === '<') {
        inTag = true;
        continue;
      }
      if (ch === '>') {
        inTag = false;
        continue;
      }
      if (!inTag) {
        if (i === idx) cleanCol = cleanLine.length + 1;
        cleanLine += ch;
      }
    }

    if (idx >= lineText.length) cleanCol = cleanLine.length + 1;

    return { cleanLine, cleanCol };
  },

  _buildSnippet(lineText, col, length) {
    const start = Math.max(0, col - 1);
    const end = Math.min(lineText.length, start + length);

    const beforeRaw = lineText.slice(0, start);
    const afterRaw = lineText.slice(end);

    const beforeWords = beforeRaw.trim().split(/\s+/).filter(Boolean).slice(-5).join(' ');
    const afterWords = afterRaw.trim().split(/\s+/).filter(Boolean).slice(0, 5).join(' ');
    const highlighted = lineText.slice(start, end) || '';

    const before = this._escape(beforeWords);
    const highlight = `<span class="error-highlight">${this._escape(highlighted)}</span>`;
    const after = this._escape(afterWords);

    // Preserve original spacing at boundaries instead of always inserting a space
    const sepBefore = beforeRaw.length && /\s$/.test(beforeRaw) ? ' ' : '';
    const sepAfter = afterRaw.length && /^\s/.test(afterRaw) ? ' ' : '';

    let result = '';
    if (before) result += before + sepBefore;
    result += highlight;
    if (after) result += sepAfter + after;
    return result;
  },

  _escape(str) {
    const div = document.createElement('div');
    div.textContent = str == null ? '' : String(str);
    return div.innerHTML;
  }
};
