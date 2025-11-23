
import React, { useState } from 'react';
import { VaultItem } from '../types';

interface Props {
  items: VaultItem[];
  selectedTag: string | null;
  onSelectTag: (tag: string | null) => void;
  onDropOnTag: (itemId: string, tag: string) => void;
  onRenameTag: (oldTag: string, newTag: string) => void;
}

export const Sidebar: React.FC<Props> = ({ items, selectedTag, onSelectTag, onDropOnTag, onRenameTag }) => {
  const [isDragOver, setIsDragOver] = useState<string | null>(null);
  const [editingTag, setEditingTag] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  // Extract unique tags and count
  const tagCounts = items.reduce((acc, item) => {
    item.tags.forEach(tag => {
      acc[tag] = (acc[tag] || 0) + 1;
    });
    return acc;
  }, {} as Record<string, number>);

  const sortedTags = Object.keys(tagCounts).sort();

  const handleDragOver = (e: React.DragEvent, tag: string | null) => {
    e.preventDefault();
    setIsDragOver(tag);
  };

  const handleDragLeave = () => {
    setIsDragOver(null);
  };

  const handleDrop = (e: React.DragEvent, tag: string) => {
    e.preventDefault();
    setIsDragOver(null);
    const itemId = e.dataTransfer.getData("text/plain");
    if (itemId) {
      onDropOnTag(itemId, tag);
    }
  };

  const startEditing = (tag: string) => {
    setEditingTag(tag);
    setEditValue(tag);
  };

  const finishEditing = () => {
    if (editingTag && editValue.trim() && editValue !== editingTag) {
      onRenameTag(editingTag, editValue.trim());
    }
    setEditingTag(null);
  };

  return (
    <div className="w-64 flex-shrink-0 hidden lg:block h-[calc(100vh-5rem)] overflow-y-auto pb-10 pr-2">
      <div className="sticky top-0 z-10 bg-gray-50/90 dark:bg-slate-950/90 backdrop-blur-sm py-2 mb-2">
        <h2 className="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider px-3">
          分类 / 标签
        </h2>
      </div>

      <div className="space-y-1">
        <button
          onClick={() => onSelectTag(null)}
          className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors flex justify-between items-center ${
            selectedTag === null
              ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300'
              : 'text-gray-600 dark:text-slate-400 hover:bg-gray-200 dark:hover:bg-slate-800'
          }`}
        >
          <span>全部资料</span>
          <span className="text-xs opacity-60 bg-gray-200 dark:bg-slate-700 px-1.5 rounded-full">{items.length}</span>
        </button>

        {sortedTags.map(tag => (
          <div
            key={tag}
            onDragOver={(e) => handleDragOver(e, tag)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, tag)}
            className={`relative group rounded-lg transition-colors ${
              isDragOver === tag ? 'ring-2 ring-indigo-500 bg-indigo-50 dark:bg-indigo-900/30' : ''
            }`}
          >
            {editingTag === tag ? (
              <input
                autoFocus
                type="text"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={finishEditing}
                onKeyDown={(e) => e.key === 'Enter' && finishEditing()}
                className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-indigo-500 rounded-lg outline-none"
              />
            ) : (
              <button
                onClick={() => onSelectTag(tag)}
                onDoubleClick={() => startEditing(tag)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors flex justify-between items-center ${
                  selectedTag === tag
                    ? 'bg-white dark:bg-slate-800 shadow-sm text-indigo-600 dark:text-indigo-400'
                    : 'text-gray-600 dark:text-slate-400 hover:bg-gray-200 dark:hover:bg-slate-800 hover:text-gray-900 dark:hover:text-slate-200'
                }`}
              >
                <span className="truncate mr-2"># {tag}</span>
                <span className="text-xs opacity-60 bg-gray-200 dark:bg-slate-700 px-1.5 rounded-full shrink-0">
                  {tagCounts[tag]}
                </span>
              </button>
            )}
          </div>
        ))}
      </div>
      
      <div className="mt-8 px-3">
        <p className="text-xs text-gray-400 dark:text-slate-600 leading-relaxed">
          💡 提示：拖动右侧卡片到左侧标签可快速分类。双击标签名可重命名。
        </p>
      </div>
    </div>
  );
};
