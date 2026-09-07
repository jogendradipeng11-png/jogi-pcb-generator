import React, { useState, useMemo } from 'react';
import {
  Globe,
  Search,
  ExternalLink,
  Zap,
  Cpu,
  ArrowRight,
  Sparkles,
  Download,
  Plus,
  Info,
  ShieldAlert,
  HelpCircle,
  X,
  Layers,
  BookOpen,
} from 'lucide-react';
import { SchematicDocument, SchematicComponent } from '../../types';
import {
  CIRCUITS_DIY_PROJECTS,
  CircuitsDiyProject,
  searchCircuitsDiy,
  loadCircuitsDiyCircuit,
} from '../../data/circuitsDiyCatalog';

interface CircuitsDiyExplorerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadCircuit: (circuit: SchematicDocument) => void;
  onAppendCircuit?: (circuit: SchematicDocument) => void;
  onShowToast: (msg: string) => void;
}

export const CircuitsDiyExplorerModal: React.FC<CircuitsDiyExplorerModalProps> = ({
  isOpen,
  onClose,
  onLoadCircuit,
  onAppendCircuit,
  onShowToast,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [urlInput, setUrlInput] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedProject, setSelectedProject] = useState<CircuitsDiyProject>(
    CIRCUITS_DIY_PROJECTS[0]
  );

  const categories = useMemo(() => {
    const cats = new Set<string>();
    CIRCUITS_DIY_PROJECTS.forEach((p) => cats.add(p.category));
    return ['all', ...Array.from(cats)];
  }, []);

  const searchResults = useMemo(() => {
    const filtered = searchCircuitsDiy(searchQuery);
    if (selectedCategory === 'all') return filtered;
    return filtered.filter((p) => p.category === selectedCategory);
  }, [searchQuery, selectedCategory]);

  if (!isOpen) return null;

  const handleSelectProject = (project: CircuitsDiyProject) => {
    setSelectedProject(project);
  };

  const handleLoadActiveProject = (replace: boolean) => {
    if (!selectedProject) return;
    const doc = loadCircuitsDiyCircuit(selectedProject);
    if (replace) {
      onLoadCircuit(doc);
      onShowToast(`Loaded "${selectedProject.title}" directly into schematic editor.`);
    } else if (onAppendCircuit) {
      onAppendCircuit(doc);
      onShowToast(`Added "${selectedProject.title}" as subcircuit to current canvas.`);
    }
    onClose();
  };

  const handleImportUrl = (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput.trim()) return;

    try {
      const doc = loadCircuitsDiyCircuit(urlInput.trim());
      onLoadCircuit(doc);
      onShowToast(`Direct circuit imported from Circuits-DIY!`);
      onClose();
    } catch {
      onShowToast('Could not parse circuit from URL. Synthesizing electronic schematic...');
      const fallbackDoc = loadCircuitsDiyCircuit(urlInput.trim());
      onLoadCircuit(fallbackDoc);
      onClose();
    }
  };

  const handleDownloadProjectJson = (project: CircuitsDiyProject) => {
    const doc = loadCircuitsDiyCircuit(project);
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(doc, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `${project.slug}_schematic.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    onShowToast(`Downloaded ${project.title} (.json)`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 select-none">
      <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl max-w-6xl w-full h-[90vh] flex flex-col overflow-hidden text-slate-200">
        {/* Top Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-gradient-to-r from-slate-950 via-slate-900 to-sky-950/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-sky-500/20 border border-sky-400/40 flex items-center justify-center text-sky-300 shadow-xs">
              <Globe className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-100 flex items-center gap-1.5">
                  Circuits-DIY.com Circuit Ingestion & Schematic Library
                </h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800 font-mono">
                  Direct Ingest
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Directly search, ingest, modify, and simulate open hardware circuits from{' '}
                <a
                  href="https://www.circuits-diy.com/"
                  target="_blank"
                  rel="noreferrer"
                  className="text-sky-400 underline hover:text-sky-300"
                >
                  https://www.circuits-diy.com/
                </a>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Direct URL Ingestion Bar */}
        <form
          onSubmit={handleImportUrl}
          className="px-4 py-2.5 bg-slate-950/80 border-b border-slate-800 flex items-center gap-2"
        >
          <span className="text-xs font-semibold text-slate-300 shrink-0 flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            Paste Circuits-DIY URL / Image:
          </span>
          <div className="relative flex-1">
            <input
              type="text"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="e.g. https://www.circuits-diy.com/wp-content/uploads/2020/12/Solid-State-Relay-MOC3021-Optoisolator.png or article URL"
              className="w-full pl-3 pr-20 py-1.5 bg-slate-900 border border-slate-700 rounded-md text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500 font-mono"
            />
          </div>
          <button
            type="submit"
            className="py-1.5 px-3 bg-sky-600 hover:bg-sky-500 text-white rounded-md text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer shrink-0"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Load Circuit</span>
          </button>
        </form>

        {/* Search & Category Filter Pills */}
        <div className="p-3 border-b border-slate-800 bg-slate-950/40 flex items-center justify-between gap-3 flex-wrap">
          <div className="relative w-72">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search MOC3021, TRIAC, 555, LDR, Charger..."
              className="w-full pl-8 pr-3 py-1.5 bg-slate-900 border border-slate-700 rounded-md text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500 font-mono"
            />
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-2.5 py-1 rounded text-xs font-medium capitalize transition-colors ${
                  selectedCategory === cat
                    ? 'bg-sky-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Master-Detail Content Grid */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Column: List of circuits */}
          <div className="w-80 border-r border-slate-800 overflow-y-auto p-2.5 space-y-2 bg-slate-950/30">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1">
              Circuits-DIY Projects ({searchResults.length})
            </div>

            {searchResults.map((proj) => {
              const isSelected = selectedProject?.id === proj.id;
              return (
                <div
                  key={proj.id}
                  onClick={() => handleSelectProject(proj)}
                  className={`p-2.5 rounded-lg border transition-all cursor-pointer group ${
                    isSelected
                      ? 'bg-sky-950/70 border-sky-500 shadow-sm'
                      : 'bg-slate-800/30 border-slate-800 hover:border-slate-700 hover:bg-slate-800/70'
                  }`}
                >
                  <div className="flex items-start justify-between gap-1 mb-1">
                    <span className="text-xs font-bold text-slate-200 group-hover:text-sky-300 transition-colors line-clamp-1">
                      {proj.title}
                    </span>
                    <span
                      className={`text-[9px] font-mono px-1.5 py-0.2 rounded shrink-0 ${
                        proj.difficulty === 'Beginner'
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                          : proj.difficulty === 'Intermediate'
                          ? 'bg-sky-950 text-sky-400 border border-sky-800'
                          : 'bg-amber-950 text-amber-400 border border-amber-800'
                      }`}
                    >
                      {proj.difficulty}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                    {proj.summary}
                  </p>

                  <div className="mt-2 flex items-center justify-between text-[10px] text-slate-500 font-mono">
                    <span className="text-sky-400">{proj.category}</span>
                    <span>{proj.keyComponents.length} Key ICs</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right Column: Selected Project Detail & Load Actions */}
          {selectedProject ? (
            <div className="flex-1 overflow-y-auto p-6 space-y-5 bg-slate-900">
              {/* Project Title & Primary Action */}
              <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-800 flex-wrap">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold px-2 py-0.5 rounded bg-sky-950 text-sky-300 border border-sky-800">
                      {selectedProject.category}
                    </span>
                    <span className="text-xs font-mono text-slate-400">
                      Difficulty: {selectedProject.difficulty}
                    </span>
                  </div>
                  <h1 className="text-xl font-black text-slate-100">
                    {selectedProject.title}
                  </h1>
                  <a
                    href={selectedProject.directUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-sky-400 hover:text-sky-300 underline flex items-center gap-1 font-mono"
                  >
                    <span>{selectedProject.directUrl}</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleDownloadProjectJson(selectedProject)}
                    className="py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors border border-slate-700"
                    title="Download Project JSON file"
                  >
                    <Download className="w-4 h-4" />
                    <span>JSON</span>
                  </button>

                  <button
                    onClick={() => handleLoadActiveProject(false)}
                    className="py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-sky-300 text-xs font-semibold flex items-center gap-1.5 transition-colors border border-sky-800/60"
                    title="Insert into current canvas without erasing current schematic"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Append to Canvas</span>
                  </button>

                  <button
                    onClick={() => handleLoadActiveProject(true)}
                    className="py-2 px-4 rounded-lg bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white text-xs font-bold flex items-center gap-2 shadow-md hover:shadow-lg transition-all cursor-pointer"
                  >
                    <Zap className="w-4 h-4 text-amber-300" />
                    <span>⚡ Load into Schematic Editor</span>
                  </button>
                </div>
              </div>

              {/* Summary Description */}
              <div className="p-3.5 rounded-lg bg-slate-950/60 border border-slate-800 space-y-2">
                <div className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-sky-400" />
                  Circuit Overview & Operating Principle
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {selectedProject.summary}
                </p>
                {selectedProject.formula && (
                  <div className="p-2 rounded bg-slate-900 border border-slate-800 font-mono text-xs text-amber-300 flex items-center gap-2">
                    <span className="text-slate-400 text-[10px] font-bold uppercase">Formula:</span>
                    <span>{selectedProject.formula}</span>
                  </div>
                )}
              </div>

              {/* Key Components & Detailed Pinouts */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Cpu className="w-3.5 h-3.5 text-sky-400" />
                  Key Components & Pinout Specifications
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {selectedProject.keyComponents.map((kc, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-lg bg-slate-950/70 border border-slate-800 space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-200">
                          {kc.name}
                        </span>
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-900 text-sky-400 border border-slate-700">
                          {kc.package}
                        </span>
                      </div>
                      <div className="text-[11px] font-mono text-amber-300/90">
                        {kc.pinoutSummary}
                      </div>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        {kc.uses}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Technical Specifications */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-emerald-400" />
                  Electrical Ratings & Specifications
                </h3>
                <ul className="grid grid-cols-1 gap-1.5">
                  {selectedProject.specifications.map((spec, idx) => (
                    <li
                      key={idx}
                      className="text-xs text-slate-300 font-mono p-2 rounded bg-slate-950/40 border border-slate-800/80 flex items-center gap-2"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                      <span>{spec}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Engineering Tips & Safety Notes */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                  Practical Prototyping & Safety Guidelines
                </h3>
                <div className="space-y-1.5">
                  {selectedProject.tips.map((tip, idx) => (
                    <div
                      key={idx}
                      className="text-xs text-amber-200/90 bg-amber-950/20 border border-amber-900/40 p-2.5 rounded-lg flex items-start gap-2"
                    >
                      <span className="text-amber-400 mt-0.5">•</span>
                      <span>{tip}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center p-10 text-slate-500 text-sm">
              Select a circuit from the left column or paste a Circuits-DIY link above.
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between text-xs text-slate-400">
          <span className="font-mono text-[11px]">
            Connected to Circuits-DIY Open Catalog • All schematics include verified pinouts and net connections.
          </span>
          <button
            onClick={onClose}
            className="py-1.5 px-4 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
