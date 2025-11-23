
import React, { useState, useEffect } from 'react';
import { AppConfig } from '../types';
import { getConfig, saveConfig } from '../services/storageService';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const [apiEndpoint, setApiEndpoint] = useState('');
  const [authToken, setAuthToken] = useState('');
  const [activeTab, setActiveTab] = useState<'general' | 'deploy-backend' | 'deploy-frontend'>('general');

  useEffect(() => {
    if (isOpen) {
      const config = getConfig();
      setApiEndpoint(config.apiEndpoint || '');
      setAuthToken(config.authToken || '');
    }
  }, [isOpen]);

  const handleSave = () => {
    let cleanEndpoint = apiEndpoint.trim();
    if (cleanEndpoint && cleanEndpoint.endsWith('/')) {
      cleanEndpoint = cleanEndpoint.slice(0, -1);
    }
    
    saveConfig({ apiEndpoint: cleanEndpoint, authToken });
    window.location.reload();
  };

  const copyCode = () => {
    const code = workerCode.trim();
    navigator.clipboard.writeText(code);
    alert("代码已复制到剪贴板！");
  };

  const workerCode = `
export default {
  async fetch(request, env, ctx) {
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,HEAD,POST,OPTIONS,DELETE",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);
    
    if (url.pathname === "/" && request.method === "GET") {
      return new Response("MindVault Backend is Online.", { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "text/plain" } 
      });
    }

    const auth = request.headers.get("Authorization");
    const expectedToken = env.SECRET_TOKEN || "my-default-password";
    
    if (!auth || auth !== \`Bearer \${expectedToken}\`) {
      return new Response(JSON.stringify({ error: "Unauthorized: Password incorrect" }), { 
        status: 401, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    const path = url.pathname;

    try {
      if (!env.VAULT_KV) {
        throw new Error("KV not bound. Bind 'VAULT_KV' in Cloudflare Settings.");
      }

      // Get All Items
      if (request.method === "GET" && path === "/items") {
        const data = await env.VAULT_KV.get("items");
        return new Response(data || "[]", { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // Add Single Item
      if (request.method === "POST" && path === "/items") {
        const item = await request.json();
        let current = await env.VAULT_KV.get("items", { type: "json" });
        if (!current || !Array.isArray(current)) current = [];
        
        const index = current.findIndex(i => i.id === item.id);
        if (index > -1) current[index] = item;
        else current.unshift(item);

        await env.VAULT_KV.put("items", JSON.stringify(current));
        return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // Batch Add Items (For Import)
      if (request.method === "POST" && path === "/batch_items") {
        const items = await request.json();
        if (!Array.isArray(items)) {
           return new Response(JSON.stringify({ error: "Body must be an array" }), { status: 400, headers: corsHeaders });
        }
        
        let current = await env.VAULT_KV.get("items", { type: "json" });
        if (!current || !Array.isArray(current)) current = [];
        
        // Create map for faster lookup
        const currentMap = new Map(current.map(i => [i.id, i]));
        
        // Merge new items (overwrite existing IDs)
        for (const item of items) {
          currentMap.set(item.id, item);
        }
        
        // Convert back to array and sort by createdAt desc
        const newItems = Array.from(currentMap.values()).sort((a, b) => b.createdAt - a.createdAt);

        await env.VAULT_KV.put("items", JSON.stringify(newItems));
        return new Response(JSON.stringify({ success: true, count: items.length }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // Delete Item
      if (request.method === "DELETE" && path.startsWith("/items/")) {
        const id = path.split("/").pop();
        let current = await env.VAULT_KV.get("items", { type: "json" });
        if (current && Array.isArray(current)) {
          current = current.filter(i => i.id !== id);
          await env.VAULT_KV.put("items", JSON.stringify(current));
        }
        return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      return new Response(JSON.stringify({ error: "API Endpoint Not Found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
  },
};
`;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-2xl w-full max-w-5xl h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-fade-in">
        
        {/* Header */}
        <div className="flex border-b border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-900/50 overflow-x-auto">
          <button 
            onClick={() => setActiveTab('general')}
            className={`flex-shrink-0 px-6 py-4 text-sm font-medium transition-colors ${activeTab === 'general' ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-500 bg-white dark:bg-slate-800/50' : 'text-gray-500 dark:text-slate-400 hover:text-gray-800 dark:hover:text-slate-200'}`}
          >
            1. 连接配置
          </button>
          <button 
            onClick={() => setActiveTab('deploy-backend')}
            className={`flex-shrink-0 px-6 py-4 text-sm font-medium transition-colors ${activeTab === 'deploy-backend' ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-500 bg-white dark:bg-slate-800/50' : 'text-gray-500 dark:text-slate-400 hover:text-gray-800 dark:hover:text-slate-200'}`}
          >
            2. 部署后端 (Worker)
          </button>
          <button 
            onClick={() => setActiveTab('deploy-frontend')}
            className={`flex-shrink-0 px-6 py-4 text-sm font-medium transition-colors ${activeTab === 'deploy-frontend' ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-500 bg-white dark:bg-slate-800/50' : 'text-gray-500 dark:text-slate-400 hover:text-gray-800 dark:hover:text-slate-200'}`}
          >
            3. 部署前端 (Pages)
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto bg-white dark:bg-slate-900">
          
          {/* TAB 1: General Settings */}
          {activeTab === 'general' && (
            <div className="p-8 max-w-lg mx-auto mt-8">
              <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-6">连接您的私有云</h3>
              
              <div className="space-y-6">
                <div className="bg-indigo-50 dark:bg-slate-800/50 p-4 rounded-xl border border-indigo-100 dark:border-indigo-500/20 mb-6">
                  <p className="text-sm text-gray-600 dark:text-slate-300">
                    <span className="text-indigo-600 dark:text-indigo-400 font-bold">状态：</span> 
                    请确保下方填写的 Worker URL 是您部署好的后端地址。
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-slate-500 uppercase mb-2">后端 API 地址 (Worker URL)</label>
                  <input
                    type="text"
                    value={apiEndpoint}
                    onChange={(e) => setApiEndpoint(e.target.value)}
                    placeholder="https://mindvault.yourname.workers.dev"
                    className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-3 text-gray-900 dark:text-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-slate-500 uppercase mb-2">访问密码 (Token)</label>
                  <input
                    type="password"
                    value={authToken}
                    onChange={(e) => setAuthToken(e.target.value)}
                    placeholder="Worker 中设置的 SECRET_TOKEN"
                    className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-3 text-gray-900 dark:text-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Backend Deployment */}
          {activeTab === 'deploy-backend' && (
            <div className="flex h-full flex-col md:flex-row">
              <div className="w-full md:w-1/3 border-r border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-900/50 p-6 overflow-y-auto">
                <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4">Worker 部署步骤</h3>
                <div className="p-3 mb-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg text-xs text-yellow-800 dark:text-yellow-200">
                  <strong>重要更新：</strong> 我们更新了 Worker 代码以支持批量导入。请务必重新部署！
                </div>
                <ol className="space-y-6 text-sm text-gray-600 dark:text-slate-400 list-decimal list-outside ml-4">
                  <li>
                    <strong className="text-gray-700 dark:text-slate-200 block mb-1">创建 Worker</strong>
                    在 Cloudflare Dashboard 中创建一个新 Worker。
                  </li>
                  <li>
                    <strong className="text-indigo-600 dark:text-indigo-300 block mb-1">绑定 KV 数据库</strong>
                    Settings &rarr; Variables &rarr; KV Namespace Bindings。<br/>
                    变量名填: <code className="text-indigo-600 dark:text-indigo-400 font-bold">VAULT_KV</code>
                  </li>
                  <li>
                    <strong className="text-gray-700 dark:text-slate-200 block mb-1">设置密码</strong>
                    添加环境变量: `SECRET_TOKEN`
                  </li>
                  <li>
                    <strong className="text-gray-700 dark:text-slate-200 block mb-1">部署代码</strong>
                    复制右侧代码到 Worker 编辑器并部署。
                  </li>
                </ol>
              </div>
              <div className="w-full md:w-2/3 bg-gray-100 dark:bg-[#0d1117] flex flex-col">
                <div className="flex justify-between items-center px-4 py-2 bg-gray-200 dark:bg-slate-800 border-b border-gray-300 dark:border-slate-700">
                  <span className="text-xs text-gray-600 dark:text-slate-400 font-mono">worker.js</span>
                  <button onClick={copyCode} className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1 rounded">复制</button>
                </div>
                <pre className="flex-1 p-4 overflow-auto text-xs font-mono text-gray-800 dark:text-slate-300 leading-relaxed selection:bg-indigo-500/30">{workerCode}</pre>
              </div>
            </div>
          )}

          {/* TAB 3: Frontend Deployment */}
          {activeTab === 'deploy-frontend' && (
            <div className="p-8 max-w-3xl mx-auto">
              <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-6">前端部署指南</h3>
              <div className="space-y-8">
                <div className="flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-slate-800 flex items-center justify-center font-bold text-indigo-600 dark:text-indigo-400 shrink-0">1</div>
                  <div>
                    <h4 className="text-lg font-medium text-gray-800 dark:text-slate-200 mb-2">进入 Pages 控制台</h4>
                    <p className="text-gray-600 dark:text-slate-400 text-sm mb-2">
                      在 Cloudflare Dashboard &rarr; <strong>Workers & Pages</strong> &rarr; <strong>Pages</strong> &rarr; <strong>Connect to Git</strong>。
                    </p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-slate-800 flex items-center justify-center font-bold text-indigo-600 dark:text-indigo-400 shrink-0">2</div>
                  <div>
                    <h4 className="text-lg font-medium text-gray-800 dark:text-slate-200 mb-2">Build Settings</h4>
                    <div className="bg-gray-100 dark:bg-slate-800 p-4 rounded-lg text-sm font-mono space-y-2 border border-gray-200 dark:border-slate-700">
                      <div>Framework preset: <span className="text-green-600 dark:text-green-400">None</span></div>
                      <div>Build command: <span className="text-green-600 dark:text-green-400">npm run build</span></div>
                      <div>Output directory: <span className="text-green-600 dark:text-green-400">dist</span></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {activeTab === 'general' && (
          <div className="p-4 border-t border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex justify-end gap-3">
            <button onClick={onClose} className="px-4 py-2 text-gray-500 dark:text-slate-400 hover:text-gray-800 dark:hover:text-white transition-colors">取消</button>
            <button onClick={handleSave} className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium shadow-lg">
              保存配置并登录
            </button>
          </div>
        )}
        
        {activeTab !== 'general' && (
          <div className="p-4 border-t border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex justify-end">
             <button onClick={onClose} className="px-4 py-2 text-gray-500 dark:text-slate-400 hover:text-gray-800 dark:hover:text-white transition-colors">关闭</button>
          </div>
        )}
      </div>
    </div>
  );
};
