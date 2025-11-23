import React from 'react';
import { VaultItem } from '../types';

interface Props {
  item: VaultItem;
  onDelete: (id: string) => void;
  onEdit: (item: VaultItem) => void;
  onAiAnalyze: (item: VaultItem) => void;
}

export const ItemCard: React.FC<Props> = ({ item, onDelete, onEdit, onAiAnalyze }) => {
  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (confirm('确定要删除吗？')) {
      onDelete(item.id);
    }
  };

  const handleEditClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onEdit(item);
  };

  const handleAiClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onAiAnalyze(item);
  };

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData("text/plain", item.id);
    e.dataTransfer.effectAllowed = "copy";
  };

  const formatDate = (ts: number) => {
    return new Date(ts).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
  };

  const getIcon = () => {
    switch (item.type) {
      case 'link': return (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
        </svg>
      );
      case 'snippet': return (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
        </svg>
      );
      default: return (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      );
    }
  };

  const handleCardClick = () => {
    if (item.type === 'link') {
      window.open(item.content, '_blank');
    }
  };

  return (
    <div 
      draggable
      onDragStart={handleDragStart}
      onClick={handleCardClick}
      className={`
        group relative rounded-xl p-5 
        bg-white dark:bg-slate-800 
        border border-transparent dark:border-slate-700
        shadow-md hover:shadow-xl dark:shadow-none
        hover:-translate-y-1
        transition-all duration-300 cursor-pointer overflow-hidden
      `}
    >
      <div className="flex justify-between items-start mb-3">
        <div className={`p-2.5 rounded-lg ${
          item.type === 'link' ? 'bg-blue-50 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400' : 
          item.type === 'snippet' ? 'bg-pink-50 text-pink-600 dark:bg-pink-500/20 dark:text-pink-400' : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400'
        }`}>
          {getIcon()}
        </div>
        <span className="text-xs text-gray-400 dark:text-slate-500 font-mono">{formatDate(item.createdAt)}</span>
      </div>

      <h3 className="text-lg font-bold text-gray-800 dark:text-slate-100 mb-2 line-clamp-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
        {item.title}
      </h3>

      <p className="text-sm text-gray-500 dark:text-slate-400 mb-4 line-clamp-3 leading-relaxed min-h-[3rem]">
        {item.summary || item.content}
      </p>

      <div className="flex flex-wrap gap-2 mt-auto">
        {item.tags.slice(0, 4).map(tag => (
          <span key={tag} className="text-[10px] uppercase tracking-wider px-2 py-1 rounded bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300">
            {tag}
          </span>
        ))}
        {item.tags.length > 4 && (
           <span className="text-[10px] px-2 py-1 text-gray-400">+{item.tags.length - 4}</span>
        )}
      </div>

      <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity translate-x-2 group-hover:translate-x-0 duration-200">
        <button 
          onClick={handleAiClick}
          className="p-2 text-purple-500 hover:text-purple-600 bg-gray-50 dark:bg-slate-700 rounded shadow-sm transition-colors"
          title="AI 重新分析"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </button>
        <button 
          onClick={handleEditClick}
          className="p-2 text-gray-500 hover:text-indigo-500 dark:text-slate-400 dark:hover:text-indigo-400 bg-gray-50 dark:bg-slate-700 rounded shadow-sm transition-colors"
          title="编辑"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
        </button>
        <button 
          onClick={handleDelete}
          className="p-2 text-gray-500 hover:text-red-500 dark:text-slate-400 dark:hover:text-red-400 bg-gray-50 dark:bg-slate-700 rounded shadow-sm transition-colors"
          title="删除"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    </div>
  );
};