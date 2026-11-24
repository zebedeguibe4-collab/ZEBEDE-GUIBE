import React, {useMemo, useState} from 'react';
import {
  Download,
  Printer,
  Plus,
  Trash2,
  Save,
  Eye,
  FileEdit,
  History,
  CheckCircle2,
  Search,
} from 'lucide-react';
import {
  MedicationCatalogItem,
  OrdonnanceRecord,
  Practitioner,
  PrescribedMedication,
  Sex,
} from '../types/clinical';
import {exportOrdonnanceToPdf} from '../utils/exportUtils';
import {A4OrdonnancePreview} from './A4OrdonnancePreview';

interface OrdonnancierWorkspaceProps {
  draft: OrdonnanceRecord;
  onChangeDraft: (updated: OrdonnanceRecord) => void;
  ordonnances: OrdonnanceRecord[];
  catalog: MedicationCatalogItem[];
  practitioners: Practitioner[];
  onOpenAddPractitioner: () => void;
  onSaveOrdonnance: (record: OrdonnanceRecord) => void;
  onDeleteOrdonnance: (id: string) => void;
  onNewOrdonnance: () => void;
  transferredBanner: string | null;
  onDismissBanner: () => void;
}

type OrdView = 'edition' | 'apercu' | 'historique';

export const OrdonnancierWorkspace: React.FC<OrdonnancierWorkspaceProps> = ({
  draft,
  onChangeDraft,
  ordonnances,
  catalog,
  practitioners,
  onOpenAddPractitioner,
  onSaveOrdonnance,
  onDeleteOrdonnance,
  onNewOrdonnance,
  transferredBanner,
  onDismissBanner,
}) => {
  const [view, setView] = useState<OrdView>('apercu');
  const [selectedCatalogId, setSelectedCatalogId] = useState<string>(
    catalog.find((c) => c.disponible)?.id || catalog[0]?.id || '',
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [toast, setToast] = useState<string | null>(null);

  const notify = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast((curr) => (curr === msg ? null : curr)), 3000);
  };

  const handleAddFromCatalog = () => {
    const item = catalog.find((c) => c.id === selectedCatalogId);
    if (!item) return;
    const line: PrescribedMedication = {
      id: `ord-line-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      catalogId: item.id,
      medicament: item.nomCommercial,
      dci: item.dci,
      forme: item.forme,
      dosage: item.dosage,
      posologie: item.posologieDefaut,
      frequence: '2 fois / jour',
      duree: '5 jours',
      quantite: '1 boîte',
      voie: item.voieDefaut,
      instructions: '',
    };
    onChangeDraft({...draft, lignes: [...draft.lignes, line]});
  };

  const updateLine = (
    id: string,
    field: keyof PrescribedMedication,
    value: string,
  ) => {
    onChangeDraft({
      ...draft,
      lignes: draft.lignes.map((l) => (l.id === id ? {...l, [field]: value} : l)),
    });
  };

  const removeLine = (id: string) => {
    onChangeDraft({
      ...draft,
      lignes: draft.lignes.filter((l) => l.id !== id),
    });
  };

  const handleSave = () => {
    if (!draft.patient.nomComplet.trim()) {
      notify('Veuillez renseigner le nom du patient sur l’ordonnance.');
      return;
    }
    onSaveOrdonnance(draft);
    notify(`Ordonnance ${draft.numeroOrdonnance} enregistrée.`);
  };

  const filteredOrdonnances = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return ordonnances.filter(
      (o) =>
        !q ||
        o.patient.nomComplet.toLowerCase().includes(q) ||
        o.numeroOrdonnance.toLowerCase().includes(q) ||
        o.numeroDossier.toLowerCase().includes(q) ||
        o.medecin.toLowerCase().includes(q),
    );
  }, [ordonnances, searchQuery]);

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="no-print bg-white border border-slate-200 rounded-lg px-4 py-3 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
          <button
            type="button"
            onClick={() => setView('apercu')}
            className={`inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              view === 'apercu'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            Aperçu A4 Officiel
          </button>
          <button
            type="button"
            onClick={() => setView('edition')}
            className={`inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              view === 'edition'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileEdit className="w-3.5 h-3.5" />
            Éditer Ordonnance
          </button>
          <button
            type="button"
            onClick={() => setView('historique')}
            className={`inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              view === 'historique'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            Archives ({ordonnances.length})
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => {
              onNewOrdonnance();
              setView('edition');
            }}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border border-slate-300 bg-white text-slate-800 hover:bg-slate-50 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Nouvelle Ordonnance
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg border border-slate-300 bg-white text-slate-800 hover:bg-slate-50 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Save className="w-3.5 h-3.5 text-teal-700" />
            Enregistrer
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-teal-700 text-white hover:bg-teal-800 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            Imprimer A4
          </button>
          <button
            type="button"
            onClick={() => exportOrdonnanceToPdf(draft)}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg border border-slate-300 bg-white text-slate-800 hover:bg-slate-50 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-slate-600" />
            Télécharger PDF
          </button>
        </div>
      </div>

      {transferredBanner && (
        <div
          role="status"
          className="no-print flex items-center justify-between gap-3 px-4 py-2.5 rounded-lg border border-teal-200 bg-teal-50 text-teal-900 text-xs font-medium"
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-teal-700 shrink-0" />
            <span>{transferredBanner}</span>
          </div>
          <button
            type="button"
            onClick={onDismissBanner}
            className="text-teal-800 hover:text-teal-950 font-semibold cursor-pointer"
          >
            OK
          </button>
        </div>
      )}

      {toast && (
        <div className="no-print flex items-center gap-2 px-4 py-2.5 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-900 text-xs font-medium">
          <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
          <span>{toast}</span>
        </div>
      )}

      {view === 'apercu' && (
        <div className="print-only-container overflow-x-auto pb-6">
          <A4OrdonnancePreview ordonnance={draft} />
        </div>
      )}

      {view === 'edition' && (
        <div className="no-print bg-white border border-slate-200 rounded-lg p-5 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pb-4 border-b border-slate-200">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                N° Ordonnance
              </label>
              <input
                type="text"
                value={draft.numeroOrdonnance}
                onChange={(e) =>
                  onChangeDraft({...draft, numeroOrdonnance: e.target.value})
                }
                className="w-full px-3 py-2 text-sm font-mono tabular-nums border border-slate-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Date
              </label>
              <input
                type="date"
                value={draft.dateOrdonnance}
                onChange={(e) =>
                  onChangeDraft({...draft, dateOrdonnance: e.target.value})
                }
                className="w-full px-3 py-2 text-sm font-mono tabular-nums border border-slate-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                N° Dossier Patient
              </label>
              <input
                type="text"
                value={draft.numeroDossier}
                onChange={(e) =>
                  onChangeDraft({...draft, numeroDossier: e.target.value})
                }
                className="w-full px-3 py-2 text-sm font-mono tabular-nums border border-slate-300 rounded-md"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-slate-700">
                  Prescripteur / Consultant
                </label>
                <button
                  type="button"
                  onClick={onOpenAddPractitioner}
                  className="text-[11px] font-semibold text-teal-700 hover:text-teal-900 cursor-pointer"
                >
                  + Autre...
                </button>
              </div>
              <select
                value={draft.medecin}
                onChange={(e) => {
                  if (e.target.value === '__add_new__') {
                    onOpenAddPractitioner();
                    return;
                  }
                  const found = practitioners.find((m) => m.nom === e.target.value);
                  onChangeDraft({
                    ...draft,
                    medecin: e.target.value,
                    qualificationMedecin: found
                      ? found.qualification
                      : draft.qualificationMedecin,
                  });
                }}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md bg-white"
              >
                {practitioners.map((m) => (
                  <option key={m.id} value={m.nom}>
                    {m.nom}
                  </option>
                ))}
                <option value="__add_new__">+ Ajouter un autre prescripteur...</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Patient
              </label>
              <input
                type="text"
                value={draft.patient.nomComplet}
                onChange={(e) =>
                  onChangeDraft({
                    ...draft,
                    patient: {...draft.patient, nomComplet: e.target.value},
                  })
                }
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Âge & Poids
              </label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={draft.patient.age}
                  onChange={(e) =>
                    onChangeDraft({
                      ...draft,
                      patient: {...draft.patient, age: e.target.value},
                    })
                  }
                  className="px-2.5 py-2 text-sm border border-slate-300 rounded-md"
                  placeholder="35 ans"
                />
                <input
                  type="text"
                  value={draft.patient.poids}
                  onChange={(e) =>
                    onChangeDraft({
                      ...draft,
                      patient: {...draft.patient, poids: e.target.value},
                    })
                  }
                  className="px-2.5 py-2 text-sm border border-slate-300 rounded-md"
                  placeholder="64 kg"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Sexe
              </label>
              <select
                value={draft.patient.sexe}
                onChange={(e) =>
                  onChangeDraft({
                    ...draft,
                    patient: {...draft.patient, sexe: e.target.value as Sex},
                  })
                }
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md bg-white"
              >
                <option value="F">Féminin</option>
                <option value="M">Masculin</option>
              </select>
            </div>
          </div>

          {/* Add medication from catalog */}
          <div>
            <h3 className="font-display text-sm font-bold text-slate-900 mb-2.5">
              Lignes de prescription (Catalogue CSPLZ synchronisé)
            </h3>
            <div className="flex flex-col sm:flex-row gap-2.5 mb-4 p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <select
                value={selectedCatalogId}
                onChange={(e) => setSelectedCatalogId(e.target.value)}
                className="flex-1 px-3 py-2 text-sm border border-slate-300 rounded-md bg-white"
              >
                {catalog
                  .filter((i) => i.disponible)
                  .map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.nomCommercial} · {i.forme} ({i.dosage})
                    </option>
                  ))}
              </select>
              <button
                type="button"
                onClick={handleAddFromCatalog}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold rounded-md bg-teal-700 text-white hover:bg-teal-800 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Ajouter à l’ordonnance
              </button>
            </div>

            <div className="space-y-3">
              {draft.lignes.map((line, idx) => (
                <div
                  key={line.id}
                  className="p-3.5 border border-slate-200 rounded-lg bg-slate-50/40 grid grid-cols-1 sm:grid-cols-6 gap-3 items-end"
                >
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">
                      {idx + 1}. Médicament
                    </label>
                    <input
                      type="text"
                      value={line.medicament}
                      onChange={(e) => updateLine(line.id, 'medicament', e.target.value)}
                      className="w-full px-2.5 py-1.5 text-sm border border-slate-300 rounded bg-white"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">
                      Posologie
                    </label>
                    <input
                      type="text"
                      value={line.posologie}
                      onChange={(e) => updateLine(line.id, 'posologie', e.target.value)}
                      className="w-full px-2.5 py-1.5 text-sm border border-slate-300 rounded bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">
                      Durée / Qté
                    </label>
                    <div className="grid grid-cols-2 gap-1.5">
                      <input
                        type="text"
                        value={line.duree}
                        onChange={(e) => updateLine(line.id, 'duree', e.target.value)}
                        className="px-2 py-1.5 text-xs border border-slate-300 rounded bg-white"
                      />
                      <input
                        type="text"
                        value={line.quantite}
                        onChange={(e) => updateLine(line.id, 'quantite', e.target.value)}
                        className="px-2 py-1.5 text-xs border border-slate-300 rounded bg-white"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => removeLine(line.id)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs text-red-600 hover:bg-red-50 rounded cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Supprimer
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Recommandations & Conseils au patient
            </label>
            <textarea
              rows={2}
              value={draft.recommandations}
              onChange={(e) =>
                onChangeDraft({...draft, recommandations: e.target.value})
              }
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
            />
          </div>
        </div>
      )}

      {view === 'historique' && (
        <section className="no-print bg-white border border-slate-200 rounded-lg p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-base font-bold text-slate-900">
              Historique des Ordonnances Délivrées
            </h2>
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-md"
                placeholder="Rechercher patient ou N°..."
              />
            </div>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-lg">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                  <th className="py-2.5 px-3">Date / Réf.</th>
                  <th className="py-2.5 px-3">Patient</th>
                  <th className="py-2.5 px-3">Prescripteur</th>
                  <th className="py-2.5 px-3">Produits</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredOrdonnances.map((ord) => (
                  <tr key={ord.id} className="hover:bg-slate-50/70">
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <div className="font-mono text-xs font-semibold tabular-nums">
                        {ord.dateOrdonnance}
                      </div>
                      <div className="font-mono text-[11px] text-slate-500 tabular-nums">
                        {ord.numeroOrdonnance}
                      </div>
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="font-semibold text-slate-900">
                        {ord.patient.nomComplet}
                      </div>
                      <div className="text-xs text-slate-500 font-mono tabular-nums">
                        {ord.numeroDossier} · {ord.patient.age}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-xs text-slate-700">{ord.medecin}</td>
                    <td className="py-2.5 px-3 text-xs text-slate-700 tabular-nums">
                      {ord.lignes.length} ligne{ord.lignes.length > 1 ? 's' : ''}
                    </td>
                    <td className="py-2.5 px-3 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            onChangeDraft(ord);
                            setView('apercu');
                          }}
                          className="px-2.5 py-1 text-xs font-medium text-teal-800 border border-teal-200 bg-teal-50 rounded hover:bg-teal-100 cursor-pointer"
                        >
                          Ouvrir A4
                        </button>
                        <button
                          type="button"
                          onClick={() => exportOrdonnanceToPdf(ord)}
                          className="px-2.5 py-1 text-xs font-medium text-slate-700 border border-slate-300 rounded hover:bg-slate-100 cursor-pointer"
                        >
                          PDF
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteOrdonnance(ord.id)}
                          className="p-1.5 text-slate-400 hover:text-red-600 rounded cursor-pointer"
                          aria-label="Supprimer ordonnance"
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
      )}
    </div>
  );
};
