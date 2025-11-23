import React, { useState, useEffect } from 'react';
import { VaultItem } from '../types';

interface Props {
  isOpen: boolean;
  item: VaultItem | null;
  onClose: () => void;
  onSave: (item: VaultItem) => void;
}

export const EditModal: React.FC<Props> = ({ isOpen, item, onClose, onSave }) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [summary, setSummary] = useState('');
  const [tags, setTags] = useState('');

  useEffect(() => {
    if (item) {
      setTitle(item.title);
      setContent(item.content);
      setSummary(item.summary || '');
      setTags(item.tags.join(', '));
    }
  }, [item]);

  if (!isOpen || !item) return null;

  const handleSave = () => {
    const tagArray = tags.split(/[,，]/).map(t => t.trim()).filter(Boolean);
    
    const updatedItem: VaultItem = {
      ...item,
      title,
      content,
      summary,
      tags: tagArray
    };

    onSave(updatedItem);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-2xl w-full max-w-lg p-6 shadow-2xl animate-fade-in flex flex-col max-h-[90vh]">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-6">
          编辑资料
        </h2>
        
        <div className="space-y-4 overflow-y-auto pr-2">
          <div>
            <label className="block text-xs font-bold text-gray-500 dark:text-slate-500 uppercase mb-1">标题</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-2 text-gray-900 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 dark:text-slate-500 uppercase mb-1">内容 / URL</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full h-24 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-2 text-gray-900 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none resize-none text-sm font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 dark:text-slate-500 uppercase mb-1">摘要</label>
            <textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              className="w-full h-20 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-2 text-gray-900 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 dark:text-slate-500 uppercase mb-1">标签 (用逗号分隔)</label>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-2 text-gray-900 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100 dark:border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-500 dark:text-slate-400 hover:text-gray-800 dark:hover:text-white transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-medium shadow-lg shadow-indigo-600/20"
          >
            保存修改
          </button>
        </div>
      </div>
    </div>
  );
};