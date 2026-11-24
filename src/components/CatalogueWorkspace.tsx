import React, {useMemo, useState} from 'react';
import {
  Plus,
  Search,
  FileSpreadsheet,
  Trash2,
  CheckCircle2,
  Edit3,
  X,
} from 'lucide-react';
import {MedicationCatalogItem} from '../types/clinical';
import {formatFcfa} from '../utils/clinicalCalculations';
import {exportCatalogToExcel} from '../utils/exportUtils';

interface CatalogueWorkspaceProps {
  catalog: MedicationCatalogItem[];
  onSaveItem: (item: MedicationCatalogItem) => void;
  onDeleteItem: (id: string) => void;
  onToggleDisponible: (id: string) => void;
}

const EMPTY_FORM = (nextIndex: number): MedicationCatalogItem => ({
  id: `cat-${Date.now()}`,
  code: `MED-${String(nextIndex).padStart(3, '0')}`,
  nomCommercial: '',
  dci: '',
  forme: 'Comprimé',
  dosage: '',
  categorie: 'Antibiotique',
  voieDefaut: 'Orale',
  posologieDefaut: '',
  prixUnitaire: 1000,
  stock: 50,
  disponible: true,
});

export const CatalogueWorkspace: React.FC<CatalogueWorkspaceProps> = ({
  catalog,
  onSaveItem,
  onDeleteItem,
  onToggleDisponible,
}) => {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Toutes');
  const [showForm, setShowForm] = useState(false);
  const [formItem, setFormItem] = useState<MedicationCatalogItem>(() =>
    EMPTY_FORM(catalog.length + 1),
  );
  const [toast, setToast] = useState<string | null>(null);

  const categories = useMemo(() => {
    const set = new Set(catalog.map((c) => c.categorie));
    return ['Toutes', ...Array.from(set)];
  }, [catalog]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return catalog.filter((item) => {
      const matchesQuery =
        !q ||
        item.nomCommercial.toLowerCase().includes(q) ||
        item.dci.toLowerCase().includes(q) ||
        item.code.toLowerCase().includes(q);
      const matchesCat =
        selectedCategory === 'Toutes' || item.categorie === selectedCategory;
      return matchesQuery && matchesCat;
    });
  }, [catalog, search, selectedCategory]);

  const notify = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast((curr) => (curr === msg ? null : curr)), 2800);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formItem.nomCommercial.trim()) return;
    onSaveItem(formItem);
    setShowForm(false);
    notify(`Produit « ${formItem.nomCommercial} » synchronisé avec les fiches de prescription.`);
  };

  const openNew = () => {
    setFormItem(EMPTY_FORM(catalog.length + 1));
    setShowForm(true);
  };

  const openEdit = (item: MedicationCatalogItem) => {
    setFormItem(item);
    setShowForm(true);
  };

  return (
    <div className="space-y-5">
      {/* Header Toolbar */}
      <div className="bg-white border border-slate-200 rounded-lg px-5 py-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-base font-bold text-slate-900">
            Catalogue Pharmaceutique CSPLZ
          </h2>
          <p className="text-xs text-slate-500 mt-0.5 tabular-nums">
            {catalog.length} références enregistrées · Synchronisé en temps réel avec la Consultation et l’Ordonnancier
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => exportCatalogToExcel(catalog)}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg border border-slate-300 bg-white text-slate-800 hover:bg-slate-50 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
            Exporter Catalogue (.xlsx)
          </button>
          <button
            type="button"
            onClick={openNew}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-teal-700 text-white hover:bg-teal-800 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Ajouter un médicament
          </button>
        </div>
      </div>

      {toast && (
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-teal-200 bg-teal-50 text-teal-900 text-xs font-medium">
          <CheckCircle2 className="w-4 h-4 text-teal-700 shrink-0" />
          <span>{toast}</span>
        </div>
      )}

      {/* Add/Edit Inline Panel */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="bg-white border border-teal-300 rounded-lg p-5 space-y-4"
        >
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <h3 className="font-display text-sm font-bold text-slate-900">
              {catalog.some((c) => c.id === formItem.id)
                ? 'Modifier le produit pharmaceutique'
                : 'Nouveau produit au catalogue CSPLZ'}
            </h3>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Code interne
              </label>
              <input
                type="text"
                value={formItem.code}
                onChange={(e) => setFormItem({...formItem, code: e.target.value})}
                className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-md"
                required
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Nom commercial <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                value={formItem.nomCommercial}
                onChange={(e) =>
                  setFormItem({...formItem, nomCommercial: e.target.value})
                }
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
                placeholder="Ex. : Amoxicilline 500 mg"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                DCI (Molécule)
              </label>
              <input
                type="text"
                value={formItem.dci}
                onChange={(e) => setFormItem({...formItem, dci: e.target.value})}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Forme galénique
              </label>
              <input
                type="text"
                value={formItem.forme}
                onChange={(e) => setFormItem({...formItem, forme: e.target.value})}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Dosage
              </label>
              <input
                type="text"
                value={formItem.dosage}
                onChange={(e) => setFormItem({...formItem, dosage: e.target.value})}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
                placeholder="Ex. : 500 mg"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Catégorie thérapeutique
              </label>
              <input
                type="text"
                value={formItem.categorie}
                onChange={(e) => setFormItem({...formItem, categorie: e.target.value})}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Voie d’administration
              </label>
              <input
                type="text"
                value={formItem.voieDefaut}
                onChange={(e) => setFormItem({...formItem, voieDefaut: e.target.value})}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Posologie standard pré-remplie
              </label>
              <input
                type="text"
                value={formItem.posologieDefaut}
                onChange={(e) =>
                  setFormItem({...formItem, posologieDefaut: e.target.value})
                }
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
                placeholder="Ex. : 1 comprimé matin et soir pendant 7 jours"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Prix unitaire (FCFA)
              </label>
              <input
                type="number"
                value={formItem.prixUnitaire}
                onChange={(e) =>
                  setFormItem({...formItem, prixUnitaire: Number(e.target.value) || 0})
                }
                className="w-full px-3 py-2 text-sm font-mono tabular-nums border border-slate-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Quantité en stock
              </label>
              <input
                type="number"
                value={formItem.stock}
                onChange={(e) =>
                  setFormItem({...formItem, stock: Number(e.target.value) || 0})
                }
                className="w-full px-3 py-2 text-sm font-mono tabular-nums border border-slate-300 rounded-md"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold text-white bg-teal-700 rounded-lg hover:bg-teal-800 cursor-pointer"
            >
              Enregistrer dans le catalogue
            </button>
          </div>
        </form>
      )}

      {/* Search & Table */}
      <section className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-md"
              placeholder="Rechercher par nom commercial, DCI ou code..."
            />
          </div>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 text-sm border border-slate-300 rounded-md bg-white"
          >
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        <div className="overflow-x-auto border border-slate-200 rounded-lg">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                <th className="py-2.5 px-3 whitespace-nowrap">Code</th>
                <th className="py-2.5 px-3">Médicament / DCI</th>
                <th className="py-2.5 px-3">Forme & Dosage</th>
                <th className="py-2.5 px-3">Catégorie</th>
                <th className="py-2.5 px-3 text-right whitespace-nowrap">Prix</th>
                <th className="py-2.5 px-3 text-right whitespace-nowrap">Stock</th>
                <th className="py-2.5 px-3">Disponibilité</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filtered.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/70">
                  <td className="py-2.5 px-3 font-mono text-xs text-slate-600 whitespace-nowrap tabular-nums">
                    {item.code}
                  </td>
                  <td className="py-2.5 px-3">
                    <div className="font-semibold text-slate-900">{item.nomCommercial}</div>
                    <div className="text-xs text-slate-500">{item.dci}</div>
                  </td>
                  <td className="py-2.5 px-3 text-xs text-slate-700 whitespace-nowrap">
                    {item.forme} · {item.dosage}
                  </td>
                  <td className="py-2.5 px-3 text-xs text-slate-600">{item.categorie}</td>
                  <td className="py-2.5 px-3 text-right font-mono text-xs font-semibold text-slate-900 whitespace-nowrap tabular-nums">
                    {formatFcfa(item.prixUnitaire)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-xs tabular-nums">
                    <span
                      className={
                        item.stock <= 20 ? 'text-amber-700 font-semibold' : 'text-slate-700'
                      }
                    >
                      {item.stock}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-xs whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => onToggleDisponible(item.id)}
                      className={`font-medium cursor-pointer underline-offset-2 hover:underline ${
                        item.disponible ? 'text-emerald-700' : 'text-red-700'
                      }`}
                    >
                      {item.disponible ? 'Disponible' : 'Rupture'}
                    </button>
                  </td>
                  <td className="py-2.5 px-3 text-right whitespace-nowrap">
                    <div className="inline-flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => openEdit(item)}
                        className="p-1.5 text-slate-500 hover:text-teal-700 rounded cursor-pointer"
                        aria-label="Modifier"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteItem(item.id)}
                        className="p-1.5 text-slate-400 hover:text-red-600 rounded cursor-pointer"
                        aria-label="Supprimer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
