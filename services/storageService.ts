
import { VaultItem, AppConfig } from "../types";

const LOCAL_STORAGE_KEY = 'mindvault_data';
const CONFIG_KEY = 'mindvault_config';

// --- Configuration Management ---

export const saveConfig = (config: AppConfig) => {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
};

export const getConfig = (): AppConfig => {
  const stored = localStorage.getItem(CONFIG_KEY);
  return stored ? JSON.parse(stored) : {};
};

// --- Helper to parse error response ---
const handleResponse = async (res: Response) => {
  if (!res.ok) {
    let errorMessage = `请求失败 (${res.status})`;
    try {
      const json = await res.json();
      if (json && json.error) {
        errorMessage = json.error;
      }
    } catch (e) {
      try {
        const text = await res.text();
        if (text) errorMessage = `${errorMessage}: ${text.slice(0, 50)}`;
      } catch (e2) {
        // ignore
      }
    }
    
    // Specialized friendly messages
    if (res.status === 401) {
      throw new Error("认证失败：访问密码错误。请检查设置中的 Token 是否与 Cloudflare 环境变量 SECRET_TOKEN 一致。");
    }
    
    throw new Error(errorMessage);
  }
  return res;
};

// --- Connection Verification ---

export const verifyConnection = async (endpoint: string, token: string): Promise<boolean> => {
  try {
    const cleanEndpoint = endpoint.replace(/\/$/, "");
    const res = await fetch(`${cleanEndpoint}/items`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    await handleResponse(res);
    return true;
  } catch (e: any) {
    console.error("Connection check failed:", e);
    throw e;
  }
};

// --- Data Management ---

export const getItems = async (): Promise<VaultItem[]> => {
  const config = getConfig();
  
  if (config.apiEndpoint && config.authToken) {
    try {
      const cleanEndpoint = config.apiEndpoint.replace(/\/$/, "");
      const res = await fetch(`${cleanEndpoint}/items`, {
        headers: { 'Authorization': `Bearer ${config.authToken}` }
      });
      await handleResponse(res);
      return await res.json();
    } catch (e) {
      console.error("Sync error:", e);
      throw e; 
    }
  } else {
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  }
};

export const saveItem = async (item: VaultItem): Promise<void> => {
  const config = getConfig();
  
  if (config.apiEndpoint && config.authToken) {
    const cleanEndpoint = config.apiEndpoint.replace(/\/$/, "");
    const res = await fetch(`${cleanEndpoint}/items`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.authToken}`
      },
      body: JSON.stringify(item)
    });
    await handleResponse(res);
  } else {
    const currentItems = await getItems();
    const existingIndex = currentItems.findIndex(i => i.id === item.id);
    let newItems = [...currentItems];
    if (existingIndex >= 0) {
      newItems[existingIndex] = item;
    } else {
      newItems = [item, ...newItems];
    }
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(newItems));
  }
};

// New Batch Save Function
export const saveBatchItems = async (items: VaultItem[]): Promise<void> => {
  const config = getConfig();
  
  if (config.apiEndpoint && config.authToken) {
    const cleanEndpoint = config.apiEndpoint.replace(/\/$/, "");
    const res = await fetch(`${cleanEndpoint}/batch_items`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.authToken}`
      },
      body: JSON.stringify(items)
    });
    await handleResponse(res);
  } else {
    const currentItems = await getItems();
    // Local storage merge
    const itemMap = new Map(currentItems.map(i => [i.id, i]));
    items.forEach(i => itemMap.set(i.id, i));
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(Array.from(itemMap.values())));
  }
};

export const deleteItem = async (id: string): Promise<void> => {
  const config = getConfig();

  if (config.apiEndpoint && config.authToken) {
    const cleanEndpoint = config.apiEndpoint.replace(/\/$/, "");
    const res = await fetch(`${cleanEndpoint}/items/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${config.authToken}` }
    });
    await handleResponse(res);
  } else {
    const currentItems = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (currentItems) {
      const items: VaultItem[] = JSON.parse(currentItems);
      const newItems = items.filter(i => i.id !== id);
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(newItems));
    }
  }
};
