import React, { useEffect, useState, useRef } from 'react';
import { Header } from './components/Header';
import { ItemCard } from './components/ItemCard';
import { AddModal } from './components/AddModal';
import { EditModal } from './components/EditModal';
import { SettingsModal } from './components/SettingsModal';
import { Sidebar } from './components/Sidebar';
import { DeduplicateModal } from './components/DeduplicateModal';
import { ImportConflictModal } from './components/ImportConflictModal';
import { getItems, saveItem, saveBatchItems, deleteItem, getConfig, saveConfig, verifyConnection } from './services/storageService';
import { importFile } from './services/importService';
import { analyzeContent } from './services/geminiService';
import { VaultItem } from './types';

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [items, setItems] = useState<VaultItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<VaultItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeduplicateOpen, setIsDeduplicateOpen] = useState(false);
  
  // Import Conflict State
  const [conflictQueue, setConflictQueue] = useState<{newItem: VaultItem, existing: VaultItem}[]>([]);
  const [isConflictOpen, setIsConflictOpen] = useState(false);
  const [skipAllConflicts, setSkipAllConflicts] = useState(false);

  const [editingItem, setEditingItem] = useState<VaultItem | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState<{ current: number; total: number; label: string } | null>(null);

  // Auth State
  const [authEndpoint, setAuthEndpoint] = useState('');
  const [authToken, setAuthToken] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isCheckingAuth, setIsCheckingAuth] = useState(false);

  // Theme State
  const [isDark, setIsDark] = useState(true);
  
  useEffect(() => {
    const config = getConfig();
    if (config.authToken) {
      setAuthToken(config.authToken);
      setAuthEndpoint(config.apiEndpoint || '');
      handleLogin(config.apiEndpoint || '', config.authToken);
    }

    if (localStorage.getItem('theme') === 'light') {
      setIsDark(false);
      document.documentElement.classList.remove('dark');
    } else {
      setIsDark(true);
      document.documentElement.classList.add('dark');
    }
  }, []);

  const toggleTheme = () => {
    const newDark = !isDark;
    setIsDark(newDark);
    if (newDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  useEffect(() => {
    let result = items;

    if (selectedTag) {
      result = result.filter(i => i.tags.includes(selectedTag));
    }

    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      result = result.filter(i => 
        i.title.toLowerCase().includes(lower) || 
        i.tags.some(t => t.toLowerCase().includes(lower)) ||
        (i.summary && i.summary.toLowerCase().includes(lower))
      );
    }

    setFilteredItems(result);
  }, [searchTerm, items, selectedTag]);

  const handleLogin = async (endpoint: string, token: string) => {
    setIsCheckingAuth(true);
    setLoginError('');
    
    try {
      if (endpoint) {
        const isValid = await verifyConnection(endpoint, token);
        if (!isValid) {
          throw new Error("连接失败：密码错误或服务端地址无效");
        }
      }
      
      saveConfig({ apiEndpoint: endpoint, authToken: token });
      setIsAuthenticated(true);
      loadData();
    } catch (e: any) {
      setLoginError(e.message || "登录失败");
      setIsAuthenticated(false);
    } finally {
      setIsCheckingAuth(false);
    }
  };

  const loadData = async () => {
    setIsLoading(true);
    try {
      const data = await getItems();
      data.sort((a, b) => b.createdAt - a.createdAt);
      setItems(data);
    } catch (error) {
      console.error("Failed to load items", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveItem = async (item: VaultItem) => {
    setItems(prev => {
      const idx = prev.findIndex(i => i.id === item.id);
      if (idx >= 0) {
        const newItems = [...prev];
        newItems[idx] = item;
        return newItems;
      }
      return [item, ...prev];
    });
    await saveItem(item);
    loadData(); 
  };

  const handleDeleteItems = async (ids: string[]) => {
    setItems(prev => prev.filter(i => !ids.includes(i.id)));
    for (const id of ids) {
      await deleteItem(id);
    }
  };

  const handleOpenEdit = (item: VaultItem) => {
    setEditingItem(item);
    setIsEditOpen(true);
  };

  // --- AI Analysis Logic ---

  const handleSingleAiAnalyze = async (item: VaultItem) => {
    setIsLoading(true);
    try {
      const analysis = await analyzeContent(item.content);
      const updatedItem = { ...item, ...analysis };
      await handleSaveItem(updatedItem);
    } catch (e) {
      alert("AI 分析失败");
    } finally {
      setIsLoading(false);
    }
  };

  const handleBatchAiAnalyze = async () => {
    const targetItems = filteredItems.length > 0 ? filteredItems : items;
    const confirmMsg = `即将对 ${targetItems.length} 个项目进行 AI 分析。这将消耗较多时间，确定继续吗？`;
    
    if (!confirm(confirmMsg)) return;

    setIsLoading(true);
    setProgress({ current: 0, total: targetItems.length, label: "正在进行 AI 批量整理..." });

    const batchSize = 5; // Process 5 at a time to avoid rate limits
    let processed = 0;
    const updatedItems: VaultItem[] = [];

    for (let i = 0; i < targetItems.length; i += batchSize) {
      const batch = targetItems.slice(i, i + batchSize);
      const promises = batch.map(async (item) => {
        try {
          // Only analyze if description is short or generic
          if (!item.summary || item.summary.length < 10 || item.tags.includes("未分类") || item.title === "无标题") {
             const analysis = await analyzeContent(item.content);
             return { ...item, ...analysis };
          }
          return item;
        } catch (e) {
          return item;
        }
      });

      const results = await Promise.all(promises);
      updatedItems.push(...results);
      processed += results.length;
      setProgress({ current: processed, total: targetItems.length, label: "正在进行 AI 批量整理..." });
    }

    // Save all updated items
    await saveBatchItems(updatedItems);
    await loadData();
    
    setIsLoading(false);
    setProgress(null);
    alert("AI 整理完成！");
  };

  // --- Import Logic with Conflict Handling ---

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setConflictQueue([]);
    setSkipAllConflicts(false);

    try {
      const rawItems = await importFile(file);
      const newQueue: {newItem: VaultItem, existing: VaultItem}[] = [];
      const readyToImport: VaultItem[] = [];

      // Check for duplicates locally
      for (const newItem of rawItems) {
        // Only check URL duplicates for links
        if (newItem.type === 'link') {
          const existing = items.find(i => i.type === 'link' && i.content === newItem.content);
          if (existing) {
            newQueue.push({ newItem, existing });
          } else {
            readyToImport.push(newItem);
          }
        } else {
          readyToImport.push(newItem);
        }
      }

      // 1. Import non-conflicting items immediately
      if (readyToImport.length > 0) {
        const chunkSize = 50;
        for (let i = 0; i < readyToImport.length; i += chunkSize) {
          const chunk = readyToImport.slice(i, i + chunkSize);
          await saveBatchItems(chunk);
        }
      }

      // 2. Handle conflicts
      if (newQueue.length > 0) {
        setConflictQueue(newQueue);
        setIsConflictOpen(true);
      } else {
        await loadData();
        alert(`成功导入 ${readyToImport.length} 条记录！`);
      }

    } catch (err: any) {
      alert(err.message || "导入失败");
    } finally {
      setIsLoading(false);
      if (e.target) e.target.value = ''; 
    }
  };

  const handleResolveConflict = async (action: 'keep' | 'skip' | 'skip-all') => {
    if (conflictQueue.length === 0) {
      setIsConflictOpen(false);
      await loadData();
      return;
    }

    const current = conflictQueue[0];
    const rest = conflictQueue.slice(1);

    if (action === 'skip-all') {
      setSkipAllConflicts(true);
      setIsConflictOpen(false);
      setConflictQueue([]);
      await loadData();
      alert("已跳过剩余重复项并完成导入");
      return;
    }

    if (action === 'keep') {
      await saveItem(current.newItem);
    }

    // Move to next
    setConflictQueue(rest);
    if (rest.length === 0) {
      setIsConflictOpen(false);
      await loadData();
      alert("导入处理完成");
    }
  };

  // --- Drag and Drop Logic ---
  const handleDropOnTag = async (itemId: string, tag: string) => {
    const item = items.find(i => i.id === itemId);
    if (item && !item.tags.includes(tag)) {
      const updatedItem = { ...item, tags: [...item.tags, tag] };
      await handleSaveItem(updatedItem);
    }
  };

  const handleRenameTag = async (oldTag: string, newTag: string) => {
    if (!confirm(`确定要将标签 "${oldTag}" 重命名为 "${newTag}" 吗？`)) return;
    
    setIsLoading(true);
    try {
      const affectedItems = items.filter(i => i.tags.includes(oldTag));
      const batchToUpdate = affectedItems.map(item => ({
        ...item,
        tags: item.tags.map(t => t === oldTag ? newTag : t)
      }));

      await saveBatchItems(batchToUpdate);
      await loadData();
    } catch (e) {
      alert("重命名失败");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setAuthToken('');
    localStorage.removeItem('mindvault_config');
    window.location.reload();
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-slate-950 flex items-center justify-center p-4 transition-colors duration-300">
        <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl p-8 border border-gray-200 dark:border-slate-800 animate-slide-up">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-2xl mx-auto flex items-center justify-center shadow-lg shadow-indigo-500/30 mb-4">
              <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-2 tracking-tight">MindVault</h1>
            <p className="text-gray-500 dark:text-slate-400">您的私人数字花园</p>
          </div>

          <div className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-gray-500 dark:text-slate-500 uppercase mb-2 ml-1">
                访问密码
              </label>
              <input
                type="password"
                value={authToken}
                onChange={(e) => setAuthToken(e.target.value)}
                placeholder="输入 Access Token"
                className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-3.5 text-gray-900 dark:text-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all"
                onKeyDown={(e) => e.key === 'Enter' && handleLogin(authEndpoint, authToken)}
              />
            </div>

            <div className="pt-2">
              <button
                type="button" 
                onClick={() => setAuthEndpoint(authEndpoint ? '' : 'https://')}
                className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline mb-3 inline-block font-medium"
              >
                {authEndpoint ? '收起高级设置' : '配置 Cloudflare 同步 (可选)'}
              </button>
              
              {authEndpoint !== '' && (
                 <div className="animate-fade-in">
                   <label className="block text-xs font-bold text-gray-500 dark:text-slate-500 uppercase mb-2 ml-1">
                     Worker URL
                   </label>
                   <input
                     type="text"
                     value={authEndpoint}
                     onChange={(e) => setAuthEndpoint(e.target.value)}
                     placeholder="https://..."
                     className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-3.5 text-gray-900 dark:text-slate-200 focus:border-indigo-500 outline-none text-sm"
                   />
                 </div>
              )}
            </div>

            {loginError && (
              <div className="p-4 bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 rounded-xl text-red-600 dark:text-red-400 text-sm text-center flex items-center justify-center gap-2">
                <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                {loginError}
              </div>
            )}

            <button
              onClick={() => handleLogin(authEndpoint, authToken)}
              disabled={isCheckingAuth || !authToken}
              className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-300 dark:disabled:bg-slate-800 disabled:text-gray-500 dark:disabled:text-slate-600 text-white font-bold py-4 rounded-xl shadow-xl shadow-indigo-600/20 transition-all active:scale-[0.98] flex justify-center items-center gap-2"
            >
              {isCheckingAuth ? '验证中...' : '解锁资料库'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-slate-950 text-gray-900 dark:text-slate-200 font-sans selection:bg-indigo-500/30 transition-colors duration-300">
      {progress && (
        <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center">
          <div className="w-64 bg-gray-200 dark:bg-slate-700 rounded-full h-2 mb-4 overflow-hidden">
            <div 
              className="bg-indigo-500 h-full transition-all duration-300" 
              style={{ width: `${(progress.current / progress.total) * 100}%` }}
            />
          </div>
          <p className="text-white font-mono">{progress.label} {progress.current} / {progress.total}</p>
        </div>
      )}

      <Header 
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenAdd={() => setIsAddOpen(true)}
        onImport={handleImport}
        onToggleTheme={toggleTheme}
        onDeduplicate={() => setIsDeduplicateOpen(true)}
        onBatchAI={handleBatchAiAnalyze}
        isDark={isDark}
        isSyncing={isLoading && !progress}
        itemCount={items.length}
      />

      <div className="container mx-auto px-4 py-6 flex gap-6">
        <Sidebar 
          items={items}
          selectedTag={selectedTag}
          onSelectTag={setSelectedTag}
          onDropOnTag={handleDropOnTag}
          onRenameTag={handleRenameTag}
        />

        <main className="flex-1 min-w-0">
          {/* Search Bar */}
          <div className="mb-8 relative group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400 dark:text-slate-500 group-focus-within:text-indigo-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              className="block w-full pl-12 pr-4 py-3 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl leading-5 text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all duration-300 shadow-sm hover:shadow-md dark:shadow-none"
              placeholder="搜索书签、笔记或标签..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Grid */}
          {items.length === 0 && !isLoading ? (
            <div className="text-center py-20 animate-fade-in">
              <div className="w-24 h-24 bg-white dark:bg-slate-900 rounded-full flex items-center justify-center mx-auto mb-6 text-4xl shadow-sm">
                📭
              </div>
              <h3 className="text-xl text-gray-800 dark:text-slate-200 font-bold mb-2">资料库为空</h3>
              <p className="text-gray-500 dark:text-slate-400 mb-8 max-w-md mx-auto leading-relaxed">
                您的资料库目前是空的。您可以点击右上角的导入按钮，或者手动添加新的内容。
              </p>
              <button 
                onClick={() => setIsAddOpen(true)}
                className="inline-flex items-center text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 font-medium border-b-2 border-indigo-100 dark:border-indigo-900 hover:border-indigo-500 transition-colors pb-0.5"
              >
                + 添加新内容
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 pb-10">
              {filteredItems.map(item => (
                <ItemCard 
                  key={item.id} 
                  item={item} 
                  onDelete={(id) => handleDeleteItems([id])}
                  onEdit={handleOpenEdit}
                  onAiAnalyze={handleSingleAiAnalyze}
                />
              ))}
            </div>
          )}
        </main>
      </div>

      <AddModal 
        isOpen={isAddOpen} 
        onClose={() => setIsAddOpen(false)} 
        onSave={handleSaveItem} 
      />

      <EditModal
        isOpen={isEditOpen}
        item={editingItem}
        onClose={() => setIsEditOpen(false)}
        onSave={handleSaveItem}
      />
      
      <DeduplicateModal
        isOpen={isDeduplicateOpen}
        items={items}
        onClose={() => setIsDeduplicateOpen(false)}
        onDelete={handleDeleteItems}
      />

      <ImportConflictModal
        isOpen={isConflictOpen}
        newItem={conflictQueue[0]?.newItem}
        existingItem={conflictQueue[0]?.existing}
        remainingCount={Math.max(0, conflictQueue.length - 1)}
        onResolve={handleResolveConflict}
      />
      
      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
      />
    </div>
  );
};

export default App;