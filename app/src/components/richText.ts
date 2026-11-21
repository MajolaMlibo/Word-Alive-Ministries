export const RICH_TEXT_PREFIX = '<!--wam-rich-text-->';

export function isRichText(value: string | null | undefined) {
  return Boolean(value?.startsWith(RICH_TEXT_PREFIX));
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function decodeHtml(value: string) {
  return value
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

function inlineMarkdownToHtml(value: string) {
  return escapeHtml(value)
    .replace(/\[([^\]]+)\]\((https:\/\/[^)\s]+)\)/g, '<a href="$2">$1</a>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/_([^_]+)_/g, '<em>$1</em>');
}

/** Converts legacy Markdown-like text into the editor's safe, local HTML. */
export function markdownToEditorHtml(value: string) {
  const lines = value.split('\n');
  const output: string[] = [];
  let list: 'ul' | 'ol' | null = null;

  const closeList = () => {
    if (list) output.push(`</${list}>`);
    list = null;
  };

  for (const line of lines) {
    const numbered = line.match(/^\d+\.\s+(.*)$/);
    if (line.startsWith('- ')) {
      if (list !== 'ul') {
        closeList();
        output.push('<ul>');
        list = 'ul';
      }
      output.push(`<li>${inlineMarkdownToHtml(line.slice(2))}</li>`);
      continue;
    }
    if (numbered) {
      if (list !== 'ol') {
        closeList();
        output.push('<ol>');
        list = 'ol';
      }
      output.push(`<li>${inlineMarkdownToHtml(numbered[1])}</li>`);
      continue;
    }

    closeList();
    if (line.startsWith('## ')) output.push(`<h2>${inlineMarkdownToHtml(line.slice(3))}</h2>`);
    else if (line.startsWith('> ')) output.push(`<blockquote>${inlineMarkdownToHtml(line.slice(2))}</blockquote>`);
    else output.push(`<p>${inlineMarkdownToHtml(line || ' ')}</p>`);
  }

  closeList();
  return output.join('');
}

function richHtmlToMarkdown(value: string) {
  const body = value
    .replace(/<a\s+[^>]*href=(['"])(https:\/\/[^'"\s]+)\1[^>]*>([\s\S]*?)<\/a>/gi, '[$3]($2)')
    .replace(/<(strong|b)[^>]*>([\s\S]*?)<\/(strong|b)>/gi, '**$2**')
    .replace(/<(em|i)[^>]*>([\s\S]*?)<\/(em|i)>/gi, '_$2_')
    .replace(/<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/gi, '## $1\n')
    .replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, '> $1\n')
    .replace(/<ul[^>]*>([\s\S]*?)<\/ul>/gi, (_, items) => String(items).replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, '- $1\n'))
    .replace(/<ol[^>]*>([\s\S]*?)<\/ol>/gi, (_, items) => {
      let number = 0;
      return String(items).replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (_match, item) => {
        number += 1;
        return `${number}. ${item}\n`;
      });
    })
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div)>/gi, '\n')
    .replace(/<[^>]*>/g, '');

  return decodeHtml(body)
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function editorHtmlForValue(value: string) {
  return isRichText(value) ? value.slice(RICH_TEXT_PREFIX.length) : markdownToEditorHtml(value);
}

export function valueFromEditorHtml(html: string) {
  const plain = richHtmlToMarkdown(html);
  return plain ? `${RICH_TEXT_PREFIX}${html}` : '';
}

export function displayText(value: string) {
  return isRichText(value) ? richHtmlToMarkdown(value.slice(RICH_TEXT_PREFIX.length)) : value;
}
