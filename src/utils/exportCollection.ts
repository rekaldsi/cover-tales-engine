import { Comic } from '@/types/comic';

export function exportToCSV(comics: Comic[]): void {
  const headers = [
    'Title', 'Issue', 'Publisher', 'Era', 'Variant', 'Grade Status', 'Grade',
    'Cert Number', 'Current Value', 'Purchase Price', 'Key Issue', 'Key Reason',
    'Writer', 'Artist', 'Cover Date', 'Date Added', 'Notes'
  ];

  const rows = comics.map(c => [
    c.title,
    c.issueNumber,
    c.publisher,
    c.era,
    c.variant || '',
    c.gradeStatus,
    c.grade || '',
    c.certNumber || '',
    c.currentValue?.toString() || '',
    c.purchasePrice?.toString() || '',
    c.isKeyIssue ? 'Yes' : 'No',
    c.keyIssueReason || '',
    c.writer || '',
    c.artist || '',
    c.coverDate || '',
    c.dateAdded,
    c.notes || ''
  ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','));

  const csv = [headers.join(','), ...rows].join('\n');
  downloadFile(csv, 'comic-collection.csv', 'text/csv');
}

export function exportToJSON(comics: Comic[]): void {
  const json = JSON.stringify(comics, null, 2);
  downloadFile(json, 'comic-collection.json', 'application/json');
}

function downloadFile(content: string, filename: string, type: string): void {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
