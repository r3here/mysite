
import { VaultItem } from "../types";

const generateId = () => Math.random().toString(36).substring(2, 15);

// --- Custom JSON Format Parsing ---
interface CustomGroup {
  id: number;
  name: string;
}

interface CustomSite {
  id: number;
  group_id: number;
  name: string;
  url: string;
  description: string;
  notes: string;
  created_at: string;
}

interface CustomJson {
  groups: CustomGroup[];
  sites: CustomSite[];
}

export const parseCustomJson = (jsonString: string): VaultItem[] => {
  try {
    const data: CustomJson = JSON.parse(jsonString);
    
    if (!Array.isArray(data.groups) || !Array.isArray(data.sites)) {
      throw new Error("Invalid Custom JSON format");
    }

    const groupMap = new Map<number, string>();
    data.groups.forEach(g => groupMap.set(g.id, g.name));

    return data.sites.map(site => {
      const groupName = groupMap.get(site.group_id) || "Imported";
      // Combine description and notes safely
      const summary = [site.description, site.notes]
        .filter(s => s && typeof s === 'string' && s.trim() !== "")
        .join('\n');

      // Handle date parsing gracefully
      let createdAt = Date.now();
      try {
        if (site.created_at) {
          const parsed = new Date(site.created_at).getTime();
          if (!isNaN(parsed)) createdAt = parsed;
        }
      } catch (e) {}

      return {
        id: generateId(),
        type: 'link',
        content: site.url || "",
        title: site.name || "无标题",
        summary: summary,
        tags: [groupName],
        createdAt: createdAt
      };
    });
  } catch (e) {
    console.error("Failed to parse custom JSON", e);
    throw new Error("文件格式错误：无法解析自定义 JSON");
  }
};

// --- Chrome Bookmarks HTML Parsing ---

export const parseChromeBookmarks = (htmlString: string): VaultItem[] => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlString, "text/html");
  const items: VaultItem[] = [];

  // Strategy: Find all links (A tags) and traverse upwards to find folders (H3 tags in DT/DL structures)
  // This is more robust than recursive descent for malformed HTML
  const links = doc.querySelectorAll('a');

  links.forEach(a => {
    const url = a.getAttribute("href");
    if (!url || url.startsWith("place:") || url.startsWith("javascript:")) return;

    const title = a.textContent || "无标题";
    let addDate = a.getAttribute("add_date");
    let createdAt = Date.now();
    
    if (addDate) {
      try {
        createdAt = parseInt(addDate) * 1000; // Chrome usually uses unix seconds
      } catch(e) {}
    }

    // Traverse up to find folders
    const tags: string[] = [];
    let parent = a.parentElement; // Start at DT usually
    
    while (parent) {
      // The standard structure is <DT><H3>Folder</H3><DL>...items...</DL></DT>
      // So if we are in a DL, the folder name is in the preceding H3
      if (parent.tagName === 'DL') {
        // Look for the folder name
        // Case 1: DL is inside DT, H3 is sibling of DL
        if (parent.parentElement && parent.parentElement.tagName === 'DT') {
          const h3 = parent.parentElement.querySelector('h3');
          if (h3) tags.unshift(h3.textContent || "Folder");
        }
        // Case 2: H3 is previous sibling of DL (older formats)
        else if (parent.previousElementSibling && parent.previousElementSibling.tagName === 'H3') {
          tags.unshift(parent.previousElementSibling.textContent || "Folder");
        }
      }
      parent = parent.parentElement;
    }

    if (tags.length === 0) tags.push("导入的书签");

    items.push({
      id: generateId(),
      type: 'link',
      content: url,
      title: title,
      summary: "",
      tags: tags,
      createdAt: createdAt
    });
  });

  return items;
};

export const importFile = async (file: File): Promise<VaultItem[]> => {
  const text = await file.text();
  
  if (file.type === "application/json" || file.name.endsWith(".json")) {
    return parseCustomJson(text);
  } else if (file.type === "text/html" || file.name.endsWith(".html")) {
    return parseChromeBookmarks(text);
  } else {
    throw new Error("不支持的文件类型。仅支持 .json (自定义格式) 或 .html (Chrome 书签)");
  }
};
