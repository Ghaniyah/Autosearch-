import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { 
  Search, X, Loader2, AlertCircle, Clock, ArrowUp, ArrowDown, 
  CornerDownLeft, Check, Terminal, BookOpen, Code2, Sparkles, 
  Settings2, RefreshCw, Layers, ShieldCheck, Zap
} from 'lucide-react';

// ==========================================
// TYPES & INTERFACES
// ==========================================
interface SearchItem {
  id: string;
  title: string;
  category: string;
  description: string;
  popularity: number;
}

interface MockApiResponse {
  results: SearchItem[];
  queryTime: number;
}

// ==========================================
// MOCK DATASET & API
// ==========================================
const MOCK_DATABASE: SearchItem[] = [
  { id: '1', title: 'React Hooks Deep Dive', category: 'Frontend', description: 'Master useEffect, useCallback, useMemo, and custom hooks with practical patterns.', popularity: 98 },
  { id: '2', title: 'Next.js App Router Architecture', category: 'Framework', description: 'Server components, streaming, layouts, and route handlers in Next.js 14/15.', popularity: 95 },
  { id: '3', title: 'TypeScript Advanced Types', category: 'Language', description: 'Conditional types, mapped types, template literal types, and inference.', popularity: 92 },
  { id: '4', title: 'Tailwind CSS Design Systems', category: 'Styling', description: 'Building scalable design tokens, custom plugins, and dark mode variants.', popularity: 88 },
  { id: '5', title: 'State Management with Zustand', category: 'Frontend', description: 'Lightweight, scalable state management without boilerplate context providers.', popularity: 85 },
  { id: '6', title: 'AbortController & Race Conditions', category: 'Network', description: 'Cancel stale HTTP requests and prevent out-of-order UI updates.', popularity: 90 },
  { id: '7', title: 'Debounce & Throttle Optimization', category: 'Performance', description: 'Reduce expensive calculations and frequent network polling efficiently.', popularity: 82 },
  { id: '8', title: 'Web Vitals & Performance Auditing', category: 'Performance', description: 'Improve LCP, FID, and CLS for lightning-fast web applications.', popularity: 79 },
  { id: '9', title: 'GraphQL vs REST in Modern APIs', category: 'Backend', description: 'Comparing over-fetching, caching strategies, and schema stitching.', popularity: 75 },
  { id: '10', title: 'Jest and React Testing Library', category: 'Testing', description: 'Behavior-driven component testing and mocking network requests.', popularity: 80 }
];

// Simulated Async API Call with configurable latency and error simulation
const mockSearchApi = async (
  query: string, 
  latency: number, 
  failRate: number, 
  signal: AbortSignal
): Promise<MockApiResponse> => {
  const startTime = performance.now();
  
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      if (signal.aborted) {
        reject(new DOMException('Aborted', 'AbortError'));
        return;
      }

      if (Math.random() < failRate) {
        reject(new Error('Simulated Network Error: Failed to fetch search results.'));
        return;
      }

      const cleanQuery = query.trim().toLowerCase();
      const filtered = cleanQuery === '' 
        ? MOCK_DATABASE.slice(0, 5) // Return popular items if empty query
        : MOCK_DATABASE.filter(item => 
            item.title.toLowerCase().includes(cleanQuery) || 
            item.description.toLowerCase().includes(cleanQuery) ||
            item.category.toLowerCase().includes(cleanQuery)
          );

      const endTime = performance.now();
      resolve({
        results: filtered,
        queryTime: Math.round(endTime - startTime)
      });
    }, latency);

    signal.addEventListener('abort', () => {
      clearTimeout(timer);
      reject(new DOMException('Aborted', 'AbortError'));
    });
  });
};

// ==========================================
// MAIN APP COMPONENT
// ==========================================
export default function App() {
  // Navigation & View Tabs
  const [activeTab, setActiveTab] = useState<'demo' | 'code' | 'docs'>('demo');

  // Autocomplete Core States
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<SearchItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [searchHistory, setSearchHistory] = useState<string[]>([
    'React Hooks', 'Next.js App Router', 'TypeScript'
  ]);

  // Simulation Controls State
  const [simulatedLatency, setSimulatedLatency] = useState<number>(400);
  const [simulatedErrorRate, setSimulatedErrorRate] = useState<number>(0.1); // 10% fail chance
  const [debounceDelay, setDebounceDelay] = useState<number>(300);
  const [lastQueryTime, setLastQueryTime] = useState<number | null>(null);
  const [activeRequestId, setActiveRequestId] = useState<number>(0);

  // Refs for DOM nodes and active async controllers
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const listboxId = 'autocomplete-listbox';

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Execute Search with AbortController & Stale-Response tracking
  const performSearch = useCallback(async (searchQuery: string) => {
    // Cancel previous ongoing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    const currentRequestId = Date.now();
    setActiveRequestId(currentRequestId);

    setIsLoading(true);
    setError(null);

    try {
      const response = await mockSearchApi(
        searchQuery, 
        simulatedLatency, 
        simulatedErrorRate, 
        controller.signal
      );

      // Stale Response Handling: Ensure this is still the latest request
      if (currentRequestId === activeRequestId || controller.signal.aborted === false) {
        setSuggestions(response.results);
        setLastQueryTime(response.queryTime);
        setIsLoading(false);
        setIsOpen(true);
      }
    } catch (err: any) {
      if (err.name === 'AbortError' || err.code === 20) {
        // Request was aborted intentionally, do not update error state
        return;
      }
      setError(err.message || 'An unexpected error occurred.');
      setIsLoading(false);
      setSuggestions([]);
    }
  }, [simulatedLatency, simulatedErrorRate, activeRequestId]);

  // Debounced Search Effect
  useEffect(() => {
    const timer = setTimeout(() => {
      performSearch(query);
    }, debounceDelay);

    return () => clearTimeout(timer);
  }, [query, debounceDelay, performSearch]);

  // Handle Input Change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    setSelectedIndex(-1);
    if (!isOpen) setIsOpen(true);
  };

  // Select Item & Add to History
  const handleSelectSuggestion = (item: SearchItem) => {
    setQuery(item.title);
    setIsOpen(false);
    setSelectedIndex(-1);

    // Update search history (keep unique, max 5 items)
    setSearchHistory(prev => {
      const filtered = prev.filter(h => h.toLowerCase() !== item.title.toLowerCase());
      return [item.title, ...filtered].slice(0, 5);
    });
  };

  // Clear Input
  const handleClear = () => {
    setQuery('');
    setSuggestions([]);
    setIsOpen(false);
    setSelectedIndex(-1);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  // Keyboard Navigation handler
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      setIsOpen(true);
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => (prev < suggestions.length - 1 ? prev + 1 : 0));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => (prev > 0 ? prev - 1 : suggestions.length - 1));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          handleSelectSuggestion(suggestions[selectedIndex]);
        } else if (query.trim()) {
          // Commit search to history
          setSearchHistory(prev => {
            const filtered = prev.filter(h => h.toLowerCase() !== query.trim().toLowerCase());
            return [query.trim(), ...filtered].slice(0, 5);
          });
          setIsOpen(false);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        setSelectedIndex(-1);
        break;
      default:
        break;
    }
  };

  // Highlight matching text helper
  const highlightMatch = (text: string, highlight: string) => {
    if (!highlight.trim()) return text;
    const parts = text.split(new RegExp(`(${highlight.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')})`, 'gi'));
    return (
      <span>
        {parts.map((part, i) => 
          part.toLowerCase() === highlight.toLowerCase() ? (
            <span key={i} className="bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 font-semibold px-0.5 rounded">
              {part}
            </span>
          ) : (
            part
          )
        )}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* Top Navigation Bar */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-md sticky top-0 z-50 px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/25">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
              Autocomplete Engine 
              <span className="text-xs bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2 py-0.5 rounded-full font-mono">v2.5 TS</span>
            </h1>
            <p className="text-xs text-slate-400">Production-grade search with race-condition & debounce safety</p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-slate-800/80 p-1 rounded-xl border border-slate-700/50">
          <button
            onClick={() => setActiveTab('demo')}
            className={`flex items-center space-x-2 px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'demo' 
                ? 'bg-indigo-600 text-white shadow-md' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Interactive Demo</span>
          </button>
          <button
            onClick={() => setActiveTab('code')}
            className={`flex items-center space-x-2 px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'code' 
                ? 'bg-indigo-600 text-white shadow-md' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>Code Viewer</span>
          </button>
          <button
            onClick={() => setActiveTab('docs')}
            className={`flex items-center space-x-2 px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'docs' 
                ? 'bg-indigo-600 text-white shadow-md' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Documentation</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-8 flex flex-col">
        {activeTab === 'demo' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            
            {/* Left/Center: Search Component & Live Preview */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
                
                <div className="mb-6">
                  <h2 className="text-xl font-semibold text-white mb-1">Try the Autocomplete Search</h2>
                  <p className="text-sm text-slate-400">
                    Type keywords like <span className="text-indigo-400 font-mono">React</span>, <span className="text-indigo-400 font-mono">Next</span>, or <span className="text-indigo-400 font-mono">TypeScript</span>. Use keyboard arrows to navigate.
                  </p>
                </div>

                {/* THE AUTOCOMPLETE SEARCH COMPONENT WRAPPER */}
                <div className="relative" ref={searchContainerRef}>
                  <div className={`flex items-center w-full bg-slate-950 border transition-all rounded-xl shadow-inner ${
                    isOpen ? 'border-indigo-500 ring-2 ring-indigo-500/20' : 'border-slate-800 hover:border-slate-700'
                  }`}>
                    <div className="pl-4 text-slate-400">
                      <Search className="w-5 h-5" />
                    </div>

                    <input
                      ref={inputRef}
                      type="text"
                      value={query}
                      onChange={handleInputChange}
                      onFocus={() => setIsOpen(true)}
                      onKeyDown={handleKeyDown}
                      placeholder="Search topics, tutorials, hooks..."
                      role="combobox"
                      aria-expanded={isOpen}
                      aria-controls={listboxId}
                      aria-autocomplete="list"
                      className="w-full bg-transparent px-3 py-4 text-slate-100 placeholder-slate-500 focus:outline-none text-sm sm:text-base font-medium"
                    />

                    <div className="flex items-center pr-3 space-x-2">
                      {isLoading && (
                        <Loader2 className="w-5 h-5 text-indigo-400 animate-spin" />
                      )}
                      {query && !isLoading && (
                        <button 
                          onClick={handleClear}
                          className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                          title="Clear search"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                      <div className="hidden sm:flex items-center space-x-1 bg-slate-900 border border-slate-800 px-2 py-1 rounded-md text-[10px] font-mono text-slate-400">
                        <span>ESC</span>
                      </div>
                    </div>
                  </div>

                  {/* DROPDOWN RESULTS CONTAINER */}
                  {isOpen && (
                    <div 
                      id={listboxId}
                      role="listbox"
                      className="absolute left-0 right-0 mt-2 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden z-50 divide-y divide-slate-800/60 animate-in fade-in slide-in-from-top-2 duration-150"
                    >
                      {/* Error State */}
                      {error && (
                        <div className="p-4 bg-red-950/30 text-red-400 flex items-center space-x-3 text-sm">
                          <AlertCircle className="w-5 h-5 flex-shrink-0" />
                          <div>
                            <p className="font-semibold">Failed to fetch results</p>
                            <p className="text-xs text-red-300/80">{error}</p>
                          </div>
                        </div>
                      )}

                      {/* Loading State Skeleton */}
                      {isLoading && suggestions.length === 0 && !error && (
                        <div className="p-4 space-y-3">
                          {[1, 2, 3].map((n) => (
                            <div key={n} className="flex items-center space-x-3 animate-pulse">
                              <div className="w-8 h-8 rounded-lg bg-slate-800" />
                              <div className="space-y-2 flex-1">
                                <div className="h-4 bg-slate-800 rounded w-1/3" />
                                <div className="h-3 bg-slate-800/60 rounded w-3/4" />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Empty State */}
                      {!isLoading && !error && suggestions.length === 0 && (
                        <div className="p-8 text-center text-slate-400">
                          <Search className="w-8 h-8 mx-auto mb-2 opacity-40 text-slate-500" />
                          <p className="text-sm font-medium text-slate-300">No results found for "{query}"</p>
                          <p className="text-xs text-slate-500 mt-1">Try searching for terms like "React", "State", or "API"</p>
                        </div>
                      )}

                      {/* Suggestions List */}
                      {!error && suggestions.length > 0 && (
                        <div className="max-h-80 overflow-y-auto py-1">
                          {suggestions.map((item, index) => {
                            const isSelected = index === selectedIndex;
                            return (
                              <div
                                key={item.id}
                                role="option"
                                aria-selected={isSelected}
                                onClick={() => handleSelectSuggestion(item)}
                                className={`px-4 py-3 cursor-pointer flex items-start space-x-3 transition-colors ${
                                  isSelected 
                                    ? 'bg-indigo-600/20 text-white border-l-4 border-indigo-500' 
                                    : 'hover:bg-slate-800/50 text-slate-200'
                                }`}
                              >
                                <div className="mt-0.5 p-2 rounded-lg bg-slate-800 text-indigo-400 flex-shrink-0">
                                  <Layers className="w-4 h-4" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between">
                                    <h4 className="text-sm font-semibold text-white truncate">
                                      {highlightMatch(item.title, query)}
                                    </h4>
                                    <span className="text-[10px] font-mono bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full">
                                      {item.category}
                                    </span>
                                  </div>
                                  <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">
                                    {highlightMatch(item.description, query)}
                                  </p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Recent Searches / History Footer */}
                      {!query && searchHistory.length > 0 && (
                        <div className="bg-slate-950/60 p-3">
                          <div className="flex items-center justify-between mb-2 px-1">
                            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                              <Clock className="w-3 h-3" /> Recent Searches
                            </span>
                            <button 
                              onClick={() => setSearchHistory([])} 
                              className="text-[10px] text-slate-400 hover:text-slate-200 transition-colors"
                            >
                              Clear History
                            </button>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {searchHistory.map((historyItem, idx) => (
                              <button
                                key={idx}
                                onClick={() => {
                                  setQuery(historyItem);
                                  performSearch(historyItem);
                                }}
                                className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1.5"
                              >
                                <span>{historyItem}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Dropdown Footer Stats */}
                      <div className="bg-slate-950 px-4 py-2 text-[11px] text-slate-500 flex items-center justify-between border-t border-slate-800/80">
                        <div className="flex items-center space-x-3">
                          <span className="flex items-center gap-1">
                            <ArrowUp className="w-3 h-3" /> <ArrowDown className="w-3 h-3" /> Navigate
                          </span>
                          <span className="flex items-center gap-1">
                            <CornerDownLeft className="w-3 h-3" /> Select
                          </span>
                        </div>
                        {lastQueryTime !== null && (
                          <span className="text-indigo-400 font-mono">
                            Resolved in {lastQueryTime}ms
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Feature Highlights Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8 pt-6 border-t border-slate-800">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                      <Zap className="w-4 h-4" />
                    </div>
                    <div>
                      <h5 className="text-xs font-semibold text-slate-200">Debounced</h5>
                      <p className="text-[11px] text-slate-400">{debounceDelay}ms delay</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                    <div>
                      <h5 className="text-xs font-semibold text-slate-200">Race-Free</h5>
                      <p className="text-[11px] text-slate-400">AbortController</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="p-2 rounded-lg bg-violet-500/10 text-violet-400">
                      <Terminal className="w-4 h-4" />
                    </div>
                    <div>
                      <h5 className="text-xs font-semibold text-slate-200">Keyboard</h5>
                      <p className="text-[11px] text-slate-400">Full A11y support</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
                      <RefreshCw className="w-4 h-4" />
                    </div>
                    <div>
                      <h5 className="text-xs font-semibold text-slate-200">History</h5>
                      <p className="text-[11px] text-slate-400">Recent searches</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Simulation & Testing Controls */}
            <div className="space-y-6">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-semibold text-white flex items-center gap-2">
                    <Settings2 className="w-4 h-4 text-indigo-400" />
                    Simulation Sandbox
                  </h3>
                  <span className="text-[10px] font-mono bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded">
                    Interactive
                  </span>
                </div>
                <p className="text-xs text-slate-400 mb-6">
                  Test component resilience against poor network conditions, artificial latency, and error states in real time.
                </p>

                <div className="space-y-5">
                  {/* Latency Slider */}
                  <div>
                    <div className="flex justify-between text-xs font-medium mb-2">
                      <span className="text-slate-300">Simulated Latency</span>
                      <span className="text-indigo-400 font-mono">{simulatedLatency} ms</span>
                    </div>
                    <input 
                      type="range" 
                      min="50" 
                      max="2000" 
                      step="50"
                      value={simulatedLatency}
                      onChange={(e) => setSimulatedLatency(Number(e.target.value))}
                      className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                    />
                    <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                      <span>Fast (50ms)</span>
                      <span>Slow (2s)</span>
                    </div>
                  </div>

                  {/* Debounce Delay Slider */}
                  <div>
                    <div className="flex justify-between text-xs font-medium mb-2">
                      <span className="text-slate-300">Debounce Delay</span>
                      <span className="text-indigo-400 font-mono">{debounceDelay} ms</span>
                    </div>
                    <input 
                      type="range" 
                      min="100" 
                      max="1000" 
                      step="50"
                      value={debounceDelay}
                      onChange={(e) => setDebounceDelay(Number(e.target.value))}
                      className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                    />
                    <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                      <span>Instant (100ms)</span>
                      <span>Relaxed (1s)</span>
                    </div>
                  </div>

                  {/* Error Rate Slider */}
                  <div>
                    <div className="flex justify-between text-xs font-medium mb-2">
                      <span className="text-slate-300">Simulated Error Rate</span>
                      <span className="text-red-400 font-mono">{Math.round(simulatedErrorRate * 100)}%</span>
                    </div>
                    <input 
                      type="range" 
                      min="0" 
                      max="0.8" 
                      step="0.1"
                      value={simulatedErrorRate}
                      onChange={(e) => setSimulatedErrorRate(Number(e.target.value))}
                      className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-red-500"
                    />
                    <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                      <span>0% (Stable)</span>
                      <span>80% (Unreliable)</span>
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-6 border-t border-slate-800 bg-slate-950/40 -mx-6 -mb-6 p-6 rounded-b-2xl">
                  <h4 className="text-xs font-semibold text-slate-300 mb-2">Live State Diagnostics</h4>
                  <div className="space-y-1.5 font-mono text-[11px] text-slate-400">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Active Request ID:</span>
                      <span className="text-indigo-300">{activeRequestId || 'None'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Loading State:</span>
                      <span className={isLoading ? 'text-amber-400' : 'text-emerald-400'}>{isLoading ? 'true' : 'false'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Results Count:</span>
                      <span className="text-slate-200">{suggestions.length} items</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* CODE VIEW TAB */}
        {activeTab === 'code' && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col">
            <div className="bg-slate-950 px-6 py-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Code2 className="w-4 h-4 text-indigo-400" />
                <span className="text-xs font-mono text-slate-300">AutocompleteSearch.tsx</span>
              </div>
              <span className="text-xs text-slate-400">React + TypeScript + Tailwind CSS</span>
            </div>
            <div className="p-6 bg-slate-950 overflow-x-auto font-mono text-xs text-slate-300 leading-relaxed">
              <pre>
                {`// Production-grade Autocomplete Component Logic Overview
import React, { useState, useEffect, useRef, useCallback } from 'react';

export function AutocompleteSearch() {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // AbortController ref for race-condition prevention
  const abortControllerRef = useRef(null);

  const fetchResults = useCallback(async (searchTerm) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort(); // Cancel previous stale requests
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsLoading(true);
    try {
      const response = await fetch(\`/api/search?q=\${encodeURIComponent(searchTerm)}\`, {
        signal: controller.signal
      });
      const data = await response.json();
      setSuggestions(data.results);
      setIsLoading(false);
    } catch (err) {
      if (err.name !== 'AbortError') {
        setError(err.message);
        setIsLoading(false);
      }
    }
  }, []);

  // Debounced effect hook
  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.trim()) fetchResults(query);
      else setSuggestions([]);
    }, 300);
    return () => clearTimeout(timer);
  }, [query, fetchResults]);

  return (
    <div className="relative">
      <input 
        type="text" 
        value={query} 
        onChange={(e) => setQuery(e.target.value)} 
        placeholder="Search..."
      />
      {/* Dropdown listbox & keyboard navigation handlers */}
    </div>
  );
}`}
              </pre>
            </div>
          </div>
        )}

        {/* DOCUMENTATION TAB */}
        {activeTab === 'docs' && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-xl space-y-8 max-w-4xl mx-auto">
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">Autocomplete Architecture & Best Practices</h2>
              <p className="text-slate-400 text-sm">
                A deep dive into how this component handles asynchronous race conditions, debouncing, and web accessibility standards.
              </p>
            </div>

            <div className="space-y-6 text-sm text-slate-300">
              <div className="bg-slate-950 p-6 rounded-xl border border-slate-800">
                <h3 className="text-base font-semibold text-white mb-2 flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-indigo-400" />
                  1. Stale-Response & Race Condition Prevention
                </h3>
                <p className="text-slate-400 leading-relaxed">
                  When typing rapidly, network responses can arrive out of order (e.g., request for "Re" resolves after request for "React"). We prevent this by utilizing the browser native <code className="text-indigo-400 font-mono">AbortController</code> API to cancel pending fetch requests whenever a new input event is registered, alongside request ID timestamp validation.
                </p>
              </div>

              <div className="bg-slate-950 p-6 rounded-xl border border-slate-800">
                <h3 className="text-base font-semibold text-white mb-2 flex items-center gap-2">
                  <Zap className="w-5 h-5 text-indigo-400" />
                  2. Debouncing Strategy
                </h3>
                <p className="text-slate-400 leading-relaxed">
                  To avoid flooding the backend API with requests on every keystroke, a configurable debounce timer delays execution until the user pauses typing for the specified duration (default: 300ms).
                </p>
              </div>

              <div className="bg-slate-950 p-6 rounded-xl border border-slate-800">
                <h3 className="text-base font-semibold text-white mb-2 flex items-center gap-2">
                  <Terminal className="w-5 h-5 text-indigo-400" />
                  3. Full Keyboard Navigation & A11y
                </h3>
                <p className="text-slate-400 leading-relaxed">
                  Fully compliant with WAI-ARIA combobox patterns. Supports <code className="text-indigo-400 font-mono">ArrowDown</code> and <code className="text-indigo-400 font-mono">ArrowUp</code> for navigating items, <code className="text-indigo-400 font-mono">Enter</code> to select, and <code className="text-indigo-400 font-mono">Escape</code> to close the suggestions dropdown.
                </p>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-6 px-6 text-center text-xs text-slate-500">
        Autocomplete Search Component &bull; Built with React, TypeScript & Tailwind CSS
      </footer>
    </div>
  );
}