import React from 'react';
import {ConsultationRecord} from '../types/clinical';
import {calculateImc, evaluateVitalAlerts} from '../utils/clinicalCalculations';
import {CsplzLogo, CsplzWatermark} from './CsplzLogo';

interface A4ConsultationPreviewProps {
  consultation: ConsultationRecord;
}

export const A4ConsultationPreview: React.FC<A4ConsultationPreviewProps> = ({
  consultation: c,
}) => {
  const imc = calculateImc(c.constantes.poids, c.constantes.taille);
  const alerts = evaluateVitalAlerts(c.constantes);

  return (
    <div className="a4-sheet mx-auto p-[14mm] border border-slate-200 text-[11px] leading-[1.45] print:border-0">
      <CsplzWatermark />

      <div className="relative z-10 flex flex-col min-h-[268mm]">
        {/* Official Institutional Header */}
        <header className="flex items-start justify-between gap-4 pb-4 border-b-2 border-teal-700">
          <div className="flex items-center gap-3.5">
            <CsplzLogo size={54} />
            <div>
              <p className="font-display text-[15px] font-bold tracking-tight text-slate-900 uppercase">
                Centre de Santé Privé Laïc Zouabi
              </p>
              <p className="text-[10px] font-semibold text-teal-800 tracking-wide">
                CSPLZ · Médecine Générale · Pédiatrie · Soins Primaires · Pharmacie · Laboratoire
              </p>
              <p className="text-[9.5px] text-slate-500 mt-0.5">
                Agrément N° 042/MSP/CSPLZ · Quartier Zouabi · Tél : +237 6XX XX XX XX
              </p>
            </div>
          </div>

          <div className="text-right border border-teal-700/30 bg-teal-50/70 px-3.5 py-2 rounded">
            <p className="font-display text-[11px] font-bold text-teal-800 uppercase tracking-wider">
              Dossier de Consultation
            </p>
            <p className="font-mono text-[10px] font-semibold text-slate-900 tabular-nums mt-0.5">
              {c.numeroConsultation}
            </p>
            <p className="font-mono text-[9.5px] text-slate-600 tabular-nums">
              {c.dateConsultation} à {c.heureConsultation}
            </p>
          </div>
        </header>

        {/* Section 1: Patient & Administrative Metadata */}
        <section className="mt-4">
          <div className="bg-slate-100 px-2.5 py-1 border-y border-slate-200">
            <h2 className="font-display text-[10px] font-bold uppercase tracking-wider text-teal-800">
              1. Identification du Patient & Cadre de Prise en Charge
            </h2>
          </div>
          <div className="grid grid-cols-3 gap-x-4 gap-y-1.5 px-2.5 py-2.5 border-b border-slate-200">
            <div>
              <span className="text-slate-500">Nom & Prénom : </span>
              <span className="font-semibold text-slate-900">{c.patient.nomComplet || '—'}</span>
            </div>
            <div>
              <span className="text-slate-500">N° Dossier : </span>
              <span className="font-mono font-medium text-slate-900 tabular-nums">
                {c.patient.numeroDossier || '—'}
              </span>
            </div>
            <div>
              <span className="text-slate-500">Sexe / Âge : </span>
              <span className="font-medium text-slate-900 tabular-nums">
                {c.patient.sexe === 'F' ? 'Féminin' : 'Masculin'} · {c.patient.age || '—'}
              </span>
            </div>
            <div>
              <span className="text-slate-500">Téléphone : </span>
              <span className="font-mono text-slate-900 tabular-nums">
                {c.patient.telephone || '—'}
              </span>
            </div>
            <div>
              <span className="text-slate-500">Groupe sanguin : </span>
              <span className="font-mono font-semibold text-slate-900">
                {c.patient.groupeSanguin || 'Non précisé'}
              </span>
            </div>
            <div>
              <span className="text-slate-500">Service : </span>
              <span className="font-medium text-slate-900">{c.service}</span>
            </div>
            <div className="col-span-2">
              <span className="text-slate-500">Adresse : </span>
              <span className="text-slate-900">{c.patient.adresse || '—'}</span>
            </div>
            <div>
              <span className="text-slate-500">Type : </span>
              <span className="font-medium text-slate-900">{c.typeConsultation}</span>
            </div>
          </div>
        </section>

        {/* Section 2: Constantes Vitales & IMC */}
        <section className="mt-3">
          <div className="bg-slate-100 px-2.5 py-1 border-y border-slate-200 flex items-center justify-between">
            <h2 className="font-display text-[10px] font-bold uppercase tracking-wider text-teal-800">
              2. Constantes Vitales & Indice de Masse Corporelle (IMC)
            </h2>
            {alerts.length > 0 && (
              <span className="text-[9.5px] font-semibold text-red-700">
                Points de vigilance : {alerts.map((a) => `${a.label} (${a.detail})`).join(' · ')}
              </span>
            )}
          </div>
          <div className="grid grid-cols-5 border-x border-b border-slate-200 divide-x divide-slate-200 text-center">
            <div className="py-2 px-1">
              <div className="text-[9px] text-slate-500 uppercase">Température</div>
              <div className="font-mono font-semibold text-[12px] tabular-nums mt-0.5">
                {c.constantes.temperature ? `${c.constantes.temperature} °C` : '—'}
              </div>
            </div>
            <div className="py-2 px-1">
              <div className="text-[9px] text-slate-500 uppercase">Tension Artérielle</div>
              <div className="font-mono font-semibold text-[12px] tabular-nums mt-0.5">
                {c.constantes.tensionSystolique && c.constantes.tensionDiastolique
                  ? `${c.constantes.tensionSystolique}/${c.constantes.tensionDiastolique} mmHg`
                  : '—'}
              </div>
            </div>
            <div className="py-2 px-1">
              <div className="text-[9px] text-slate-500 uppercase">Pouls / FR</div>
              <div className="font-mono font-semibold text-[12px] tabular-nums mt-0.5">
                {c.constantes.pouls || '—'} bpm · {c.constantes.frequenceRespiratoire || '—'}/m
              </div>
            </div>
            <div className="py-2 px-1">
              <div className="text-[9px] text-slate-500 uppercase">SpO₂ / Glycémie</div>
              <div className="font-mono font-semibold text-[12px] tabular-nums mt-0.5">
                {c.constantes.spo2 ? `${c.constantes.spo2}%` : '—'}
                {c.constantes.glycemie ? ` · ${c.constantes.glycemie} g/L` : ''}
              </div>
            </div>
            <div className="py-2 px-1 bg-teal-50/60">
              <div className="text-[9px] text-teal-800 font-semibold uppercase">
                IMC ({c.constantes.poids || '—'} kg / {c.constantes.taille || '—'} cm)
              </div>
              <div className="font-mono font-bold text-[12px] text-teal-900 tabular-nums mt-0.5">
                {imc.formatted} {imc.value !== null ? 'kg/m²' : ''}
              </div>
              <div className="text-[9px] font-medium text-teal-800">{imc.category}</div>
            </div>
          </div>
        </section>

        {/* Section 3: Motif & Antécédents */}
        <section className="mt-3">
          <div className="bg-slate-100 px-2.5 py-1 border-y border-slate-200">
            <h2 className="font-display text-[10px] font-bold uppercase tracking-wider text-teal-800">
              3. Motif de Consultation, Histoire & Antécédents
            </h2>
          </div>
          <div className="px-2.5 py-2 space-y-1.5 border-b border-slate-200">
            <div>
              <span className="font-semibold text-slate-800">Motif : </span>
              <span>{c.motif || '—'}</span>
            </div>
            {c.histoireMaladie && (
              <div>
                <span className="font-semibold text-slate-800">Histoire de la maladie : </span>
                <span>{c.histoireMaladie}</span>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <span className="font-semibold text-slate-800">Antécédents médicaux & chirurgicaux : </span>
                <span>
                  {[c.antecedents.medicaux, c.antecedents.chirurgicaux].filter(Boolean).join(' · ') || 'Néant'}
                </span>
              </div>
              <div>
                <span className="font-semibold text-slate-800">Allergies & Traitements en cours : </span>
                <span className={c.antecedents.allergies && !c.antecedents.allergies.toLowerCase().includes('aucun') ? 'text-red-700 font-medium' : ''}>
                  {c.antecedents.allergies || 'Aucune'} · {c.antecedents.traitementsEnCours || 'Aucun'}
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Section 4: Examen Physique & Examens Complémentaires */}
        <section className="mt-3">
          <div className="bg-slate-100 px-2.5 py-1 border-y border-slate-200">
            <h2 className="font-display text-[10px] font-bold uppercase tracking-wider text-teal-800">
              4. Examen Physique & Bilan Complémentaire
            </h2>
          </div>
          <div className="px-2.5 py-2 space-y-1.5 border-b border-slate-200">
            <div className="grid grid-cols-2 gap-x-4 gap-y-1">
              <div>
                <span className="font-semibold text-slate-800">État général : </span>
                <span>{c.examenPhysique.etatGeneral || '—'}</span>
              </div>
              <div>
                <span className="font-semibold text-slate-800">Cardiovasculaire : </span>
                <span>{c.examenPhysique.cardioVasculaire || '—'}</span>
              </div>
              <div>
                <span className="font-semibold text-slate-800">Pulmonaire : </span>
                <span>{c.examenPhysique.pulmonaire || '—'}</span>
              </div>
              <div>
                <span className="font-semibold text-slate-800">Abdominal : </span>
                <span>{c.examenPhysique.abdominal || '—'}</span>
              </div>
              <div>
                <span className="font-semibold text-slate-800">Neurologique / ORL : </span>
                <span>{c.examenPhysique.neuroOrl || '—'}</span>
              </div>
              {c.examenPhysique.autresObservations && (
                <div>
                  <span className="font-semibold text-slate-800">Observations : </span>
                  <span>{c.examenPhysique.autresObservations}</span>
                </div>
              )}
            </div>
            <div className="pt-1 border-t border-slate-100">
              <span className="font-semibold text-slate-800">Examens complémentaires demandés : </span>
              <span>
                {c.examensComplementaires.length > 0
                  ? c.examensComplementaires.join(' · ')
                  : 'Aucun examen demandé'}
              </span>
              {c.notesExamens && <span className="text-slate-600"> — {c.notesExamens}</span>}
            </div>
          </div>
        </section>

        {/* Section 5: Diagnostic & Conduite à tenir */}
        <section className="mt-3">
          <div className="bg-slate-100 px-2.5 py-1 border-y border-slate-200">
            <h2 className="font-display text-[10px] font-bold uppercase tracking-wider text-teal-800">
              5. Diagnostic Retenu & Conduite à Tenir
            </h2>
          </div>
          <div className="px-2.5 py-2 space-y-1 border-b border-slate-200">
            <div className="flex items-baseline justify-between gap-4">
              <div>
                <span className="font-semibold text-slate-800">Diagnostic principal : </span>
                <span className="font-bold text-slate-900">
                  {c.diagnosticPrincipal || 'En cours d’évaluation clinique'}
                </span>
              </div>
              {c.codeCim10 && (
                <span className="font-mono text-[10px] font-semibold text-teal-800 shrink-0">
                  CIM-10 : {c.codeCim10}
                </span>
              )}
            </div>
            {c.diagnosticsDifferentiels && (
              <div>
                <span className="font-semibold text-slate-800">Diagnostics différentiels : </span>
                <span className="text-slate-700">{c.diagnosticsDifferentiels}</span>
              </div>
            )}
            <div>
              <span className="font-semibold text-slate-800">Conduite à tenir & Conseils : </span>
              <span>{c.conduiteATenir || '—'}</span>
            </div>
          </div>
        </section>

        {/* Section 6: Traitement Prescrit */}
        <section className="mt-3 flex-1">
          <div className="bg-slate-100 px-2.5 py-1 border-y border-slate-200">
            <h2 className="font-display text-[10px] font-bold uppercase tracking-wider text-teal-800">
              6. Traitement Prescrit
            </h2>
          </div>
          {c.traitement.length === 0 ? (
            <p className="px-2.5 py-3 text-slate-500 italic">
              Aucun médicament prescrit sur cette fiche.
            </p>
          ) : (
            <table className="w-full text-left border-collapse mt-1">
              <thead>
                <tr className="border-b border-slate-300 text-[9.5px] uppercase text-slate-600">
                  <th className="py-1.5 px-2">Médicament / DCI</th>
                  <th className="py-1.5 px-2">Forme & Dosage</th>
                  <th className="py-1.5 px-2">Posologie</th>
                  <th className="py-1.5 px-2">Durée</th>
                  <th className="py-1.5 px-2 text-right">Quantité</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {c.traitement.map((m, idx) => (
                  <tr key={m.id}>
                    <td className="py-1.5 px-2 align-top">
                      <div className="font-semibold text-slate-900">
                        {idx + 1}. {m.medicament}
                      </div>
                      {m.dci && <div className="text-[9.5px] text-slate-500">{m.dci}</div>}
                    </td>
                    <td className="py-1.5 px-2 align-top text-slate-700">
                      {m.forme} · {m.dosage}
                    </td>
                    <td className="py-1.5 px-2 align-top text-slate-800">
                      <div>{m.posologie}</div>
                      {m.instructions && (
                        <div className="text-[9.5px] text-slate-500 italic">{m.instructions}</div>
                      )}
                    </td>
                    <td className="py-1.5 px-2 align-top font-mono text-slate-800 tabular-nums">
                      {m.duree}
                    </td>
                    <td className="py-1.5 px-2 align-top text-right font-mono font-medium text-slate-900 tabular-nums">
                      {m.quantite}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        {/* Official Signature & Stamp Footer */}
        <footer className="mt-6 pt-3 border-t border-slate-300 grid grid-cols-2 gap-6 items-end">
          <div className="space-y-1">
            <p className="text-[10px] text-slate-700">
              <span className="font-semibold">Prochain rendez-vous : </span>
              <span className="font-mono tabular-nums">
                {c.prochainRendezVous || 'Selon évolution clinique'}
              </span>
            </p>
            <div className="mt-3 h-16 w-48 border border-dashed border-slate-300 rounded flex items-center justify-center text-[9px] text-slate-400 uppercase tracking-wider">
              Cachet du Centre · CSPLZ
            </div>
          </div>

          <div className="text-right">
            <p className="text-[10px] text-slate-500">Fait à Zouabi, le {c.dateConsultation}</p>
            <p className="font-display font-bold text-[12px] text-slate-900 mt-0.5">{c.medecin}</p>
            <p className="text-[9.5px] text-slate-600">{c.qualificationMedecin}</p>
            <div className="mt-6 pt-1 border-t border-slate-300 inline-block w-48 text-center text-[9px] text-slate-400">
              Signature du praticien
            </div>
          </div>
        </footer>

        <p className="mt-4 pt-2 border-t border-slate-200 text-center text-[8.5px] text-slate-400">
          Document médical confidentiel · Centre de Santé Privé Laïc Zouabi (CSPLZ) · Secret médical protégé par la loi.
        </p>
      </div>
    </div>
  );
};
