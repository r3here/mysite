import React, { useState } from 'react';
import { analyzeContent } from '../services/geminiService';
import { VaultItem } from '../types';

// Simple ID generator to avoid deps
const generateId = () => Math.random().toString(36).substring(2, 15);

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (item: VaultItem) => void;
}

export const AddModal: React.FC<Props> = ({ isOpen, onClose, onSave }) => {
  const [content, setContent] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleAnalyzeAndSave = async () => {
    if (!content.trim()) return;

    setIsAnalyzing(true);
    setError(null);

    try {
      // 1. AI Analysis
      const analysis = await analyzeContent(content);
      
      // 2. Construct Item
      const newItem: VaultItem = {
        id: generateId(),
        content: content,
        title: analysis.title,
        summary: analysis.summary,
        tags: analysis.tags,
        type: analysis.type,
        createdAt: Date.now()
      };

      // 3. Save
      onSave(newItem);
      setContent('');
      onClose();
    } catch (e) {
      setError("AI 分析失败，请检查 API Key 或重试");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSimpleSave = () => {
    if (!content.trim()) return;

    const trimmed = content.trim();
    // Simple detection
    const isUrl = /^https?:\/\//i.test(trimmed);
    
    // Generate simple title based on content
    let title = "未命名记录";
    if (isUrl) {
      try {
        title = new URL(trimmed).hostname;
      } catch {
        title = trimmed.substring(0, 30);
      }
    } else {
      title = trimmed.split('\n')[0].substring(0, 20);
      if (title.length < trimmed.length) title += "...";
    }

    const newItem: VaultItem = {
      id: generateId(),
      content: trimmed,
      title: title,
      summary: '', // Empty summary for manual add
      tags: ['手动添加'],
      type: isUrl ? 'link' : 'note',
      createdAt: Date.now()
    };

    onSave(newItem);
    setContent('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-2xl w-full max-w-lg p-6 shadow-2xl animate-fade-in">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
          <span className="text-indigo-500 dark:text-indigo-400">✨</span> 添加新资料
        </h2>
        
        <div className="mb-6">
          <label className="block text-sm text-gray-600 dark:text-slate-400 mb-2">
            粘贴 URL 或 文本笔记
          </label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full h-40 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-4 text-gray-900 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none resize-none transition-colors"
            placeholder="https://... or 这是一个想法..."
            autoFocus
          />
          {error && <p className="text-red-500 dark:text-red-400 text-sm mt-2">{error}</p>}
        </div>

        <div className="flex justify-between items-center">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-500 dark:text-slate-400 hover:text-gray-800 dark:hover:text-white transition-colors"
          >
            取消
          </button>
          
          <div className="flex gap-3">
            <button
              onClick={handleSimpleSave}
              disabled={isAnalyzing || !content.trim()}
              className="px-4 py-2 bg-gray-200 dark:bg-slate-700 hover:bg-gray-300 dark:hover:bg-slate-600 disabled:opacity-50 text-gray-700 dark:text-slate-200 rounded-xl font-medium transition-all"
            >
              直接保存
            </button>
            
            <button
              onClick={handleAnalyzeAndSave}
              disabled={isAnalyzing || !content.trim()}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-300 dark:disabled:bg-slate-700 disabled:text-gray-500 dark:disabled:text-slate-500 text-white px-6 py-2 rounded-xl font-medium transition-all shadow-lg shadow-indigo-600/20"
            >
              {isAnalyzing ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  分析中...
                </>
              ) : (
                '智能添加'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};