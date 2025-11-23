import React from 'react';
import { VaultItem } from '../types';

interface Props {
  isOpen: boolean;
  newItem: VaultItem | null;
  existingItem: VaultItem | null;
  remainingCount: number;
  onResolve: (action: 'keep' | 'skip' | 'skip-all') => void;
}

export const ImportConflictModal: React.FC<Props> = ({ isOpen, newItem, existingItem, remainingCount, onResolve }) => {
  if (!isOpen || !newItem) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      
      <div className="relative bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-2xl w-full max-w-xl p-6 shadow-2xl animate-fade-in">
        <div className="flex items-center gap-2 mb-6 text-yellow-600 dark:text-yellow-500">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <h2 className="text-lg font-bold">发现重复内容</h2>
        </div>

        <div className="mb-6 space-y-4">
          <div className="bg-gray-50 dark:bg-slate-800 p-4 rounded-xl border border-gray-200 dark:border-slate-700">
            <div className="text-xs font-bold text-gray-400 uppercase mb-1">准备导入的新条目</div>
            <div className="font-medium text-gray-800 dark:text-white truncate">{newItem.title}</div>
            <div className="text-xs text-gray-500 mt-1 font-mono truncate">{newItem.content}</div>
          </div>

          <div className="flex justify-center text-gray-400">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          </div>

          <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-xl border border-indigo-100 dark:border-indigo-800/50">
            <div className="text-xs font-bold text-indigo-400 uppercase mb-1">库中已存在</div>
            <div className="font-medium text-indigo-900 dark:text-indigo-100 truncate">{existingItem?.title}</div>
            <div className="text-xs text-indigo-500 mt-1">创建于: {existingItem ? new Date(existingItem.createdAt).toLocaleDateString() : '-'}</div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button
            onClick={() => onResolve('skip')}
            className="px-4 py-3 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-300 rounded-xl font-medium transition-colors"
          >
            跳过此条
          </button>
          <button
            onClick={() => onResolve('keep')}
            className="px-4 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-medium shadow-lg shadow-indigo-600/20 transition-colors"
          >
            保留重复
          </button>
          <button
            onClick={() => onResolve('skip-all')}
            className="px-4 py-3 bg-white dark:bg-slate-900 border-2 border-gray-200 dark:border-slate-700 hover:border-red-400 text-gray-600 dark:text-slate-400 hover:text-red-500 rounded-xl font-medium transition-colors"
          >
            全部跳过
          </button>
        </div>
        
        {remainingCount > 0 && (
          <p className="text-center text-xs text-gray-400 mt-4">
            队列中还有 {remainingCount} 个潜在冲突
          </p>
        )}
      </div>
    </div>
  );
};