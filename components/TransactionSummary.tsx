import React from 'react';
import { Transaction } from '../types';
import { ReceiptIcon } from './icons/ReceiptIcon';
import { ArrowUpIcon } from './icons/ArrowUpIcon';
import { ArrowDownIcon } from './icons/ArrowDownIcon';

interface TransactionSummaryProps {
  transactions: Transaction[];
}

const TransactionSummary: React.FC<TransactionSummaryProps> = ({ transactions }) => {
  const totalTransactions = transactions.length;
  const totalIncome = transactions
    .filter(t => t.amount > 0)
    .reduce((sum, t) => sum + t.amount, 0);
  const totalSpending = transactions
    .filter(t => t.amount < 0)
    .reduce((sum, t) => sum + t.amount, 0);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD', // You can make this dynamic if needed
      minimumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {/* Total Transactions Card */}
      <div className="bg-white p-6 rounded-xl border border-gray-200 flex items-center space-x-4">
        <div className="bg-blue-100 p-3 rounded-full">
          <ReceiptIcon className="w-6 h-6 text-blue-600" />
        </div>
        <div>
          <p className="text-sm text-gray-500">Total Transactions</p>
          <p className="text-2xl font-bold text-gray-800">{totalTransactions}</p>
        </div>
      </div>

      {/* Total Income Card */}
      <div className="bg-white p-6 rounded-xl border border-gray-200 flex items-center space-x-4">
        <div className="bg-green-100 p-3 rounded-full">
          <ArrowUpIcon className="w-6 h-6 text-green-600" />
        </div>
        <div>
          <p className="text-sm text-gray-500">Total Income</p>
          <p className="text-2xl font-bold text-green-600">
            {formatCurrency(totalIncome)}
          </p>
        </div>
      </div>

      {/* Total Spending Card */}
      <div className="bg-white p-6 rounded-xl border border-gray-200 flex items-center space-x-4">
        <div className="bg-red-100 p-3 rounded-full">
          <ArrowDownIcon className="w-6 h-6 text-red-600" />
        </div>
        <div>
          <p className="text-sm text-gray-500">Total Spending</p>
          <p className="text-2xl font-bold text-red-600">
            {formatCurrency(Math.abs(totalSpending))}
          </p>
        </div>
      </div>
    </div>
  );
};

export default TransactionSummary;