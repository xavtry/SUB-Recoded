import React, { useState, useRef, useEffect } from "react";
import { Plus, X, RefreshCcw } from "lucide-react";
import "../index.css";

const Tab = ({ tab, isActive, onClick, onClose }) => {
  return (
    <div
      onClick={() => onClick(tab.id)}
      className={`flex items-center gap-2 px-3 py-2 cursor-pointer select-none rounded-t-md border-b-2 transition-all ${
        isActive
          ? "bg-zinc-800 text-white border-blue-400"
          : "bg-zinc-900 text-zinc-400 border-transparent hover:text-white"
      }`}
    >
      <span className="truncate max-w-[120px]">{tab.title}</span>
      <X
        size={14}
        className="hover:text-red-400"
        onClick={(e) => {
          e.stopPropagation();
          onClose(tab.id);
        }}
      />
    </div>
  );
};

export default function Tabs({ onNewTab, onSelectTab, onCloseTab, tabs, activeId }) {
  const [scrollX, setScrollX] = useState(0);
  const scrollRef = useRef(null);

  const scroll = (dir) => {
    const el = scrollRef.current;
    if (!el) return;
    const amt = dir === "left" ? -150 : 150;
    el.scrollBy({ left: amt, behavior: "smooth" });
  };

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const activeIndex = tabs.findIndex((t) => t.id === activeId);
    if (activeIndex !== -1) {
      const activeTab = el.children[activeIndex];
      activeTab?.scrollIntoView({ behavior: "smooth", inline: "center" });
    }
  }, [activeId, tabs.length]);

  return (
    <div className="flex flex-col bg-zinc-900 border-b border-zinc-800 shadow-md">
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center overflow-x-auto app-scrollbar" ref={scrollRef}>
          {tabs.map((tab) => (
            <Tab
              key={tab.id}
              tab={tab}
              isActive={tab.id === activeId}
              onClick={onSelectTab}
              onClose={onCloseTab}
            />
          ))}
          <button
            onClick={onNewTab}
            className="px-2 py-2 ml-1 rounded-md hover:bg-zinc-800 transition-colors"
            title="New Tab"
          >
            <Plus size={16} />
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="p-2 hover:bg-zinc-800 rounded-md"
            title="Scroll left"
            onClick={() => scroll("left")}
          >
            ◀
          </button>
          <button
            className="p-2 hover:bg-zinc-800 rounded-md"
            title="Scroll right"
            onClick={() => scroll("right")}
          >
            ▶
          </button>
        </div>
      </div>
      <div className="bg-zinc-800 h-[2px] w-full" />
    </div>
  );
}

// Utility hook for tab management (100+ lines total continues)
export function useTabs(defaultUrl = "https://example.com") {
  const [tabs, setTabs] = useState([
    { id: crypto.randomUUID(), title: "New Tab", url: defaultUrl },
  ]);
  const [activeId, setActiveId] = useState(tabs[0].id);

  const newTab = (url = defaultUrl) => {
    const newT = { id: crypto.randomUUID(), title: "New Tab", url };
    setTabs((t) => [...t, newT]);
    setActiveId(newT.id);
  };

  const closeTab = (id) => {
    setTabs((t) => {
      const updated = t.filter((tb) => tb.id !== id);
      if (id === activeId && updated.length > 0) {
        setActiveId(updated[updated.length - 1].id);
      }
      return updated;
    });
  };

  const updateTitle = (id, title) => {
    setTabs((t) =>
      t.map((tb) => (tb.id === id ? { ...tb, title: title.slice(0, 32) } : tb))
    );
  };

  const updateUrl = (id, url) => {
    setTabs((t) => t.map((tb) => (tb.id === id ? { ...tb, url } : tb)));
  };

  const selectTab = (id) => setActiveId(id);

  return {
    tabs,
    activeId,
    newTab,
    closeTab,
    updateTitle,
    updateUrl,
    selectTab,
  };
}
