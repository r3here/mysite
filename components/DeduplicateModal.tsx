import React, { useState, useEffect } from 'react';
import { VaultItem } from '../types';

interface Props {
  isOpen: boolean;
  items: VaultItem[];
  onClose: () => void;
  onDelete: (ids: string[]) => void;
}

interface DuplicateGroup {
  url: string;
  items: VaultItem[];
}

export const DeduplicateModal: React.FC<Props> = ({ isOpen, items, onClose, onDelete }) => {
  const [duplicates, setDuplicates] = useState<DuplicateGroup[]>([]);

  useEffect(() => {
    if (isOpen) {
      const urlMap = new Map<string, VaultItem[]>();
      items.forEach(item => {
        if (item.type === 'link') {
          const list = urlMap.get(item.content) || [];
          list.push(item);
          urlMap.set(item.content, list);
        }
      });

      const dups: DuplicateGroup[] = [];
      urlMap.forEach((list, url) => {
        if (list.length > 1) {
          // Sort by creation time desc (newest first)
          list.sort((a, b) => b.createdAt - a.createdAt);
          dups.push({ url, items: list });
        }
      });
      setDuplicates(dups);
    }
  }, [isOpen, items]);

  const handleKeepOldest = () => {
    const idsToDelete: string[] = [];
    duplicates.forEach(group => {
      // group.items is sorted newest first. Keep the last one (oldest).
      const toDelete = group.items.slice(0, group.items.length - 1);
      toDelete.forEach(i => idsToDelete.push(i.id));
    });
    onDelete(idsToDelete);
    onClose();
  };

  const handleKeepNewest = () => {
    const idsToDelete: string[] = [];
    duplicates.forEach(group => {
      // Keep the first one (newest).
      const toDelete = group.items.slice(1);
      toDelete.forEach(i => idsToDelete.push(i.id));
    });
    onDelete(idsToDelete);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl animate-fade-in">
        <div className="p-6 border-b border-gray-100 dark:border-slate-800">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
            🔄 查重清理
            <span className="text-sm font-normal text-gray-500 bg-gray-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
              发现 {duplicates.length} 组重复
            </span>
          </h2>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {duplicates.length === 0 ? (
            <div className="text-center py-10 text-gray-500">
              🎉 太棒了！没有发现重复的书签。
            </div>
          ) : (
            <div className="space-y-6">
              {duplicates.map((group, idx) => (
                <div key={idx} className="bg-gray-50 dark:bg-slate-800/50 rounded-xl p-4 border border-gray-100 dark:border-slate-700">
                  <div className="text-xs text-indigo-500 font-mono mb-2 truncate">{group.url}</div>
                  <div className="space-y-2">
                    {group.items.map(item => (
                      <div key={item.id} className="flex justify-between items-center text-sm bg-white dark:bg-slate-800 p-2 rounded border border-gray-200 dark:border-slate-700">
                        <span className="truncate max-w-[60%] text-gray-700 dark:text-slate-300">{item.title}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-400">
                            {new Date(item.createdAt).toLocaleDateString()}
                          </span>
                          <button 
                            onClick={() => onDelete([item.id])}
                            className="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 p-1 rounded"
                          >
                            删除
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-6 border-t border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-900 flex justify-between items-center">
          <button onClick={onClose} className="text-gray-500 hover:text-gray-800 dark:hover:text-slate-200 px-4 py-2">
            关闭
          </button>
          {duplicates.length > 0 && (
            <div className="flex gap-3">
              <button 
                onClick={handleKeepOldest}
                className="px-4 py-2 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-300 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700"
              >
                保留最早
              </button>
              <button 
                onClick={handleKeepNewest}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg shadow-lg shadow-indigo-600/20"
              >
                保留最新 (一键去重)
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};