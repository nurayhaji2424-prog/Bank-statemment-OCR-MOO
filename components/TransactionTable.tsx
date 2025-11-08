import React, { useState } from 'react';
import { Transaction } from '../types';
import { CopyIcon } from './icons/CopyIcon';

interface TransactionTableProps {
  transactions: Transaction[];
}

const TransactionTable: React.FC<TransactionTableProps> = ({ transactions }) => {
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied'>('idle');

  // Using Tab-Separated Values (TSV) for better copy-paste compatibility with spreadsheets like Google Sheets.
  const convertToTSV = (data: Transaction[]): string => {
    const headers = ['Date', 'Description', 'Amount', 'Category', 'Notes'];
    
    const sanitize = (value: string | number) => {
      if (value === null || value === undefined) {
        return '';
      }
      // Remove characters that could break the TSV structure (tabs, newlines) from string values.
      return value.toString().replace(/[\t\n\r]/g, ' ');
    };

    const rows = data.map(t => [
        sanitize(t.date),
        sanitize(t.description),
        t.amount.toString(), // Amount is a number, no character sanitization needed.
        sanitize(t.category),
        sanitize(t.notes)
    ].join('\t'));

    return [headers.join('\t'), ...rows].join('\n');
  };

  const handleCopy = () => {
    const tsvData = convertToTSV(transactions);
    navigator.clipboard.writeText(tsvData).then(() => {
      setCopyStatus('copied');
      setTimeout(() => setCopyStatus('idle'), 2000);
    });
  };

  return (
    <div className="space-y-4">
        <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-gray-800">Extracted Transactions</h2>
            <button
                onClick={handleCopy}
                className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
                <CopyIcon className="w-5 h-5" />
                <span>{copyStatus === 'idle' ? 'Copy to CSV' : 'Copied!'}</span>
            </button>
        </div>
      <div className="overflow-x-auto bg-white rounded-lg border border-gray-200">
        <table className="w-full text-left">
          <thead className="bg-gray-50">
            <tr>
              <th className="p-4 font-semibold text-gray-600">Date</th>
              <th className="p-4 font-semibold text-gray-600">Description</th>
              <th className="p-4 font-semibold text-gray-600 text-right">Amount</th>
              <th className="p-4 font-semibold text-gray-600">Category</th>
              <th className="p-4 font-semibold text-gray-600">Notes</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((t, index) => (
              <tr key={index} className="border-t border-gray-200 hover:bg-gray-50">
                <td className="p-4 whitespace-nowrap">{t.date}</td>
                <td className="p-4">{t.description}</td>
                <td className={`p-4 font-mono text-right ${t.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {t.amount.toFixed(2)}
                </td>
                <td className="p-4">
                  <span className="px-2 py-1 text-xs font-medium rounded-full bg-teal-100 text-teal-800">
                    {t.category}
                  </span>
                </td>
                <td className="p-4 text-gray-500">{t.notes}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TransactionTable;