export const printHtml = (title: string, content: string) => {
  const printWindow = window.open('', '_blank', 'width=1200,height=800');
  if (!printWindow) {
    window.alert('Please allow pop-ups to print the results.');
    return;
  }

  printWindow.onload = () => {
    printWindow.focus();
    printWindow.print();
  };
  printWindow.onafterprint = () => printWindow.close();
  printWindow.document.write(`<!doctype html>
<html>
  <head>
    <title>${title}</title>
    <style>
      @page { margin: 14mm; }
      body { color: #243b4d; font-family: Arial, sans-serif; margin: 0; }
      h1 { color: #1a5276; font-size: 18px; margin: 0 0 12px; }
      .meta { color: #63788a; font-size: 12px; margin: 0 0 12px; }
      table { border-collapse: collapse; font-size: 11px; width: 100%; }
      th { background: #1a5276; color: #fff; padding: 7px 6px; text-align: center; }
      td { border: 1px solid #d5e4ec; padding: 6px; text-align: center; }
      tbody tr:nth-child(even) { background: #f4faff; }
    </style>
  </head>
  <body>${content}</body>
</html>`);
  printWindow.document.close();
};