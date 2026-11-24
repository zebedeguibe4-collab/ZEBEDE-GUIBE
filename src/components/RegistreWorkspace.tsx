import React, {useMemo, useState} from 'react';
import {FileSpreadsheet, Search, ArrowUpRight} from 'lucide-react';
import {
  ConsultationRecord,
  OrdonnanceRecord,
  PaymentStatus,
} from '../types/clinical';
import {calculateImc, formatFcfa} from '../utils/clinicalCalculations';
import {exportRegistryToExcel} from '../utils/exportUtils';

interface RegistreWorkspaceProps {
  consultations: ConsultationRecord[];
  ordonnances: OrdonnanceRecord[];
  onUpdatePaymentStatus: (consultationId: string, status: PaymentStatus) => void;
  onOpenConsultation: (record: ConsultationRecord) => void;
  onOpenOrdonnance: (ord: OrdonnanceRecord) => void;
}

export const RegistreWorkspace: React.FC<RegistreWorkspaceProps> = ({
  consultations,
  ordonnances,
  onUpdatePaymentStatus,
  onOpenConsultation,
  onOpenOrdonnance,
}) => {
  const [search, setSearch] = useState('');
  const [paymentFilter, setPaymentFilter] = useState<string>('Tous');

  const stats = useMemo(() => {
    const uniquePatients = new Set(
      consultations.map((c) => c.patient.numeroDossier || c.patient.nomComplet),
    ).size;
    const totalRevenue = consultations.reduce(
      (sum, c) => sum + (c.statutPaiement === 'Réglé' ? c.montantConsultation : 0),
      0,
    );
    const pendingCount = consultations.filter(
      (c) => c.statutPaiement === 'En attente',
    ).length;

    return {
      totalConsultations: consultations.length,
      uniquePatients,
      totalOrdonnances: ordonnances.length,
      totalRevenue,
      pendingCount,
    };
  }, [consultations, ordonnances]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return consultations.filter((c) => {
      const matchesQ =
        !q ||
        c.patient.nomComplet.toLowerCase().includes(q) ||
        c.patient.numeroDossier.toLowerCase().includes(q) ||
        c.diagnosticPrincipal.toLowerCase().includes(q) ||
        c.medecin.toLowerCase().includes(q);
      const matchesPay =
        paymentFilter === 'Tous' || c.statutPaiement === paymentFilter;
      return matchesQ && matchesPay;
    });
  }, [consultations, search, paymentFilter]);

  return (
    <div className="space-y-5">
      {/* Real Computed KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="text-xs font-medium text-slate-500">Consultations enregistrées</div>
          <div className="font-mono text-2xl font-bold text-slate-900 tabular-nums mt-1">
            {stats.totalConsultations}
          </div>
          <div className="text-xs text-slate-500 mt-0.5 tabular-nums">
            {stats.uniquePatients} patient{stats.uniquePatients > 1 ? 's' : ''} unique{stats.uniquePatients > 1 ? 's' : ''}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="text-xs font-medium text-slate-500">Ordonnances liées</div>
          <div className="font-mono text-2xl font-bold text-teal-800 tabular-nums mt-1">
            {stats.totalOrdonnances}
          </div>
          <div className="text-xs text-slate-500 mt-0.5">
            Synchronisées avec l’ordonnancier
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="text-xs font-medium text-slate-500">Actes encaissés</div>
          <div className="font-mono text-2xl font-bold text-slate-900 tabular-nums mt-1">
            {formatFcfa(stats.totalRevenue)}
          </div>
          <div className="text-xs text-slate-500 mt-0.5">
            Consultations réglées au centre
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="text-xs font-medium text-slate-500">Règlements en attente</div>
          <div className="font-mono text-2xl font-bold text-slate-900 tabular-nums mt-1">
            {stats.pendingCount}
          </div>
          <div className="text-xs text-slate-500 mt-0.5">
            Dossiers à régulariser
          </div>
        </div>
      </div>

      {/* Synchronized Registry Table */}
      <section className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-base font-bold text-slate-900">
              Registre Centralisé & Suivi Patients CSPLZ
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Vue consolidée automatiquement à partir des consultations et des ordonnances.
            </p>
          </div>
          <button
            type="button"
            onClick={() => exportRegistryToExcel(filtered, ordonnances)}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-teal-700 text-white hover:bg-teal-800 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            Exporter Registre (.xlsx)
          </button>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-md"
              placeholder="Filtrer par patient, N° dossier, diagnostic ou médecin..."
            />
          </div>
          <select
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value)}
            className="px-3 py-2 text-sm border border-slate-300 rounded-md bg-white"
          >
            <option value="Tous">Tous les statuts de paiement</option>
            <option value="Réglé">Réglé</option>
            <option value="En attente">En attente</option>
            <option value="Prise en charge">Prise en charge</option>
          </select>
        </div>

        <div className="overflow-x-auto border border-slate-200 rounded-lg">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                <th className="py-2.5 px-3 whitespace-nowrap">Date</th>
                <th className="py-2.5 px-3">Patient & Dossier</th>
                <th className="py-2.5 px-3">Diagnostic & IMC</th>
                <th className="py-2.5 px-3">Ordonnance</th>
                <th className="py-2.5 px-3 text-right whitespace-nowrap">Acte</th>
                <th className="py-2.5 px-3">Paiement</th>
                <th className="py-2.5 px-3 text-right">Navigation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filtered.map((c) => {
                const linkedOrd = ordonnances.find((o) => o.consultationId === c.id);
                const imc = calculateImc(c.constantes.poids, c.constantes.taille);
                return (
                  <tr key={c.id} className="hover:bg-slate-50/70">
                    <td className="py-2.5 px-3 font-mono text-xs text-slate-700 whitespace-nowrap tabular-nums">
                      {c.dateConsultation}
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="font-semibold text-slate-900">
                        {c.patient.nomComplet}
                      </div>
                      <div className="text-xs text-slate-500 font-mono tabular-nums">
                        {c.patient.numeroDossier} · {c.patient.sexe} · {c.patient.age}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 max-w-xs">
                      <div className="text-xs font-medium text-slate-800 line-clamp-1">
                        {c.diagnosticPrincipal || '—'}
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono tabular-nums">
                        IMC : {imc.formatted} ({imc.category})
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-xs whitespace-nowrap">
                      {linkedOrd ? (
                        <button
                          type="button"
                          onClick={() => onOpenOrdonnance(linkedOrd)}
                          className="inline-flex items-center gap-1 font-mono font-semibold text-teal-700 hover:underline cursor-pointer"
                        >
                          {linkedOrd.numeroOrdonnance}
                          <ArrowUpRight className="w-3 h-3" />
                        </button>
                      ) : (
                        <span className="text-slate-400">Non transférée</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-xs font-semibold text-slate-900 whitespace-nowrap tabular-nums">
                      {formatFcfa(c.montantConsultation)}
                    </td>
                    <td className="py-2.5 px-3">
                      <select
                        value={c.statutPaiement}
                        onChange={(e) =>
                          onUpdatePaymentStatus(c.id, e.target.value as PaymentStatus)
                        }
                        className="px-2 py-1 text-xs border border-slate-300 rounded bg-white"
                      >
                        <option value="Réglé">Réglé</option>
                        <option value="En attente">En attente</option>
                        <option value="Prise en charge">Prise en charge</option>
                      </select>
                    </td>
                    <td className="py-2.5 px-3 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => onOpenConsultation(c)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-700 border border-slate-300 rounded hover:bg-slate-100 cursor-pointer"
                      >
                        Dossier
                        <ArrowUpRight className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
