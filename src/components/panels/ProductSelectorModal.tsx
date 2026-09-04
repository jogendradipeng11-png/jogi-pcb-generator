import React, { useState } from 'react';
import { SchematicComponent } from '../../types';
import { REAL_PRODUCT_CATALOG, RealProductPart } from '../../data/realComponents';
import {
  Search,
  Check,
  Package,
  Layers,
  Cpu,
  DollarSign,
  ExternalLink,
  ShieldCheck,
  Filter,
} from 'lucide-react';

interface ProductSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  component: SchematicComponent | null;
  onSelectProduct: (part: RealProductPart) => void;
}

export const ProductSelectorModal: React.FC<ProductSelectorModalProps> = ({
  isOpen,
  onClose,
  component,
  onSelectProduct,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  if (!isOpen || !component) return null;

  // Filter products by search term and category
  const categories = ['all', ...Array.from(new Set(REAL_PRODUCT_CATALOG.map((p) => p.category)))];

  const filtered = REAL_PRODUCT_CATALOG.filter((part) => {
    const matchesSearch =
      part.manufacturerPartNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      part.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      part.manufacturer.toLowerCase().includes(searchTerm.toLowerCase()) ||
      part.packageFootprint.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory = selectedCategory === 'all' || part.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-850">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-sky-950 text-sky-400 rounded-lg border border-sky-800">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <span>Select Real Hardware Part for</span>
                <span className="font-mono text-sky-400 bg-sky-950/80 px-2 py-0.5 rounded border border-sky-800/80">
                  {component.designator} ({component.value})
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Choose verified manufacturer parts from DigiKey, Mouser, LCSC for real PCB fabrication
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 text-lg p-1 rounded-lg hover:bg-slate-850"
          >
            ✕
          </button>
        </div>

        {/* Search & Filter Bar */}
        <div className="p-4 border-b border-slate-800 flex flex-col sm:flex-row items-center gap-3 bg-slate-900/50">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by part number (NE555, 1N4148), manufacturer, or footprint (0805, DIP-8)..."
              className="w-full pl-9 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
            >
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c === 'all' ? 'All Categories' : c}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Part List Table */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5 divide-y divide-slate-800/40">
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs">
              No matching hardware components found. Try broadening your search.
            </div>
          ) : (
            filtered.map((part) => {
              const isCurrentVal =
                component.value.toLowerCase() === part.manufacturerPartNumber.toLowerCase() ||
                component.footprint.toLowerCase() === part.packageFootprint.toLowerCase();

              return (
                <div
                  key={part.id}
                  className="pt-2.5 first:pt-0 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 rounded-lg hover:bg-slate-800/60 border border-transparent hover:border-slate-700/60 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-bold text-sm text-sky-400">
                        {part.manufacturerPartNumber}
                      </span>
                      <span className="text-xs font-medium text-slate-300">
                        {part.manufacturer}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-300 border border-slate-700">
                        {part.packageFootprint}
                      </span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-800 font-mono">
                        {part.supplier}: {part.supplierPartNumber}
                      </span>
                    </div>

                    <p className="text-xs text-slate-300 mt-1">
                      {part.description}
                    </p>

                    <div className="flex items-center gap-4 mt-1.5 text-[11px] text-slate-400 font-mono">
                      {part.voltageRating && <span>Rating: {part.voltageRating}</span>}
                      {part.powerRating && <span>Power: {part.powerRating}</span>}
                      {part.tolerance && <span>Tol: {part.tolerance}</span>}
                      <span className="text-emerald-400 font-semibold">Unit: {part.unitPrice}</span>
                      {part.inStock && (
                        <span className="text-emerald-400 flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3" /> In Stock
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Select Part Button */}
                  <div className="flex items-center gap-2 self-end sm:self-center">
                    {part.datasheetUrl && (
                      <a
                        href={part.datasheetUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs border border-slate-700 flex items-center gap-1"
                        title="View Official Datasheet"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>Datasheet</span>
                      </a>
                    )}
                    <button
                      onClick={() => {
                        onSelectProduct(part);
                        onClose();
                      }}
                      className="px-3.5 py-1.5 bg-sky-600 hover:bg-sky-500 text-white font-semibold rounded text-xs flex items-center gap-1.5 shadow-sm transition-all"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Select Part</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-850 flex items-center justify-between text-xs text-slate-400">
          <span>{filtered.length} qualified parts available in verified hardware library</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
