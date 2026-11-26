import React from 'react';

// Renders the legal drafts in legal/*.md as a page. Deliberately small: headings, paragraphs, lists,
// tables, blockquotes, **bold**, *italic* and `code`. Anything between <!-- internal --> and
// <!-- /internal --> (the "values sourced from code" tables, drafting notes) is dropped from the page.

const stripInternal = (md: string) => md.replace(/<!-- internal -->[\s\S]*?<!-- \/internal -->/g, '');

function inline(text: string, key: string): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g;
  let last = 0, m: RegExpExecArray | null, i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const t = m[0];
    if (t.startsWith('**')) out.push(<strong key={`${key}-${i++}`}>{t.slice(2, -2)}</strong>);
    else if (t.startsWith('`')) out.push(<code key={`${key}-${i++}`} className="legal-code">{t.slice(1, -1)}</code>);
    else out.push(<em key={`${key}-${i++}`}>{t.slice(1, -1)}</em>);
    last = m.index + t.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function LegalMarkdown({ source }: { source: string }) {
  const lines = stripInternal(source).replace(/\r\n/g, '\n').split('\n');
  const blocks: React.ReactNode[] = [];
  let i = 0, k = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim() || line.trim() === '---') { i++; continue; }
    const h = line.match(/^(#{1,3})\s+(.*)$/);
    if (h) {
      const level = h[1].length;
      const Tag = (level === 1 ? 'h1' : level === 2 ? 'h2' : 'h3') as 'h1' | 'h2' | 'h3';
      blocks.push(<Tag key={k++} className={`legal-h${level}`}>{inline(h[2], `h${k}`)}</Tag>);
      i++; continue;
    }
    if (line.startsWith('|')) {
      const rows: string[][] = [];
      while (i < lines.length && lines[i].startsWith('|')) {
        if (!/^\|[\s:|-]+\|$/.test(lines[i])) rows.push(lines[i].slice(1, -1).split('|').map(c => c.trim()));
        i++;
      }
      const [head, ...body] = rows;
      blocks.push(
        <div key={k++} className="legal-table-wrap"><table className="legal-table">
          <thead><tr>{head.map((c, j) => <th key={j}>{inline(c, `th${k}${j}`)}</th>)}</tr></thead>
          <tbody>{body.map((r, ri) => <tr key={ri}>{r.map((c, j) => <td key={j}>{inline(c, `td${k}${ri}${j}`)}</td>)}</tr>)}</tbody>
        </table></div>,
      );
      continue;
    }
    if (/^(\d+\.|-)\s/.test(line)) {
      const ordered = /^\d+\./.test(line);
      const items: string[] = [];
      while (i < lines.length && /^(\d+\.|-)\s/.test(lines[i])) {
        let item = lines[i].replace(/^(\d+\.|-)\s+/, ''); i++;
        while (i < lines.length && /^\s{2,}\S/.test(lines[i])) { item += ' ' + lines[i].trim(); i++; }
        items.push(item);
      }
      const List = ordered ? 'ol' : 'ul';
      blocks.push(<List key={k++} className="legal-list">{items.map((t, j) => <li key={j}>{inline(t, `li${k}${j}`)}</li>)}</List>);
      continue;
    }
    if (line.startsWith('>')) {
      const parts: string[] = [];
      while (i < lines.length && lines[i].startsWith('>')) { parts.push(lines[i].replace(/^>\s?/, '')); i++; }
      blocks.push(<blockquote key={k++} className="legal-quote">{inline(parts.join(' '), `q${k}`)}</blockquote>);
      continue;
    }
    const para: string[] = [];
    while (i < lines.length && lines[i].trim() && !/^(#{1,3}\s|\||>|(\d+\.|-)\s)/.test(lines[i])) { para.push(lines[i].trim()); i++; }
    blocks.push(<p key={k++} className="legal-p">{inline(para.join(' '), `p${k}`)}</p>);
  }
  return <>{blocks}</>;
}
