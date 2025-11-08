import React, { useState, useCallback } from 'react';
import { Transaction } from './types';
import { processStatementFiles } from './services/geminiService';
import FileUpload from './components/FileUpload';
import TransactionTable from './components/TransactionTable';
import TransactionSummary from './components/TransactionSummary';

const App: React.FC = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingMessage, setLoadingMessage] = useState<string>('');

  const handleFilesChange = (selectedFiles: File[]) => {
    setFiles(selectedFiles);
    setTransactions([]);
    setError(null);
  };

  const handleProcessStatement = useCallback(async () => {
    if (files.length === 0) {
      setError('Please select one or more files first.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setTransactions([]);
    setLoadingMessage('Preparing your documents...');

    try {
      const result = await processStatementFiles(files, setLoadingMessage);
      setTransactions(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred.');
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  }, [files]);

  const resetState = () => {
    setFiles([]);
    setTransactions([]);
    setError(null);
    setIsLoading(false);
  };

  return (
    <div className="bg-gray-100 text-gray-800 min-h-screen font-sans flex flex-col items-center p-4 sm:p-6 md:p-8">
      <div className="w-full max-w-4xl mx-auto">
        <header className="text-center mb-8">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-teal-500 to-blue-600">
            Bank Statement OCR
          </h1>
          <p className="text-gray-600 mt-4 text-lg">
            Upload statement(s) (PDF or image) to extract transactions with Gemini.
          </p>
        </header>

        <main className="bg-white rounded-2xl shadow-2xl p-6 sm:p-8 border border-gray-200">
          {!isLoading && transactions.length === 0 && (
            <div className="flex flex-col items-center space-y-6">
              <FileUpload onFilesChange={handleFilesChange} files={files} />
              {files.length > 0 && (
                <button
                  onClick={handleProcessStatement}
                  disabled={isLoading}
                  className="w-full sm:w-auto px-8 py-3 bg-teal-500 text-white font-bold rounded-lg hover:bg-teal-600 transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-teal-500/50 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  Analyze Statement(s)
                </button>
              )}
            </div>
          )}

          {isLoading && (
            <div className="flex flex-col items-center justify-center p-10">
              <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-teal-500"></div>
              <p className="mt-4 text-lg text-gray-700 font-medium">{loadingMessage}</p>
            </div>
          )}

          {error && (
            <div className="text-center p-6 bg-red-50 border border-red-200 rounded-lg">
              <p className="font-bold text-red-600">An Error Occurred</p>
              <p className="text-red-500 mt-1">{error}</p>
              <button
                onClick={resetState}
                className="mt-4 px-6 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-colors"
              >
                Try Again
              </button>
            </div>
          )}

          {!isLoading && transactions.length > 0 && (
            <div className="space-y-8">
              <TransactionSummary transactions={transactions} />
              <TransactionTable transactions={transactions} />
              <div className="text-center">
                 <button
                    onClick={resetState}
                    className="px-8 py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-blue-500/50"
                  >
                   Analyze Another Statement
                  </button>
              </div>
            </div>
          )}
        </main>
        
        <footer className="text-center mt-8 text-gray-600 text-sm">
            <p>Powered by Google Gemini</p>
        </footer>
      </div>
    </div>
  );
};

export default App;
