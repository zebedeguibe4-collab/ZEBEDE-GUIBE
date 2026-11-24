import React from 'react';
import {OrdonnanceRecord} from '../types/clinical';
import {CsplzLogo, CsplzWatermark} from './CsplzLogo';

interface A4OrdonnancePreviewProps {
  ordonnance: OrdonnanceRecord;
}

export const A4OrdonnancePreview: React.FC<A4OrdonnancePreviewProps> = ({
  ordonnance: ord,
}) => {
  return (
    <div className="a4-sheet mx-auto p-[15mm] border border-slate-200 text-[11.5px] leading-[1.5] print:border-0">
      <CsplzWatermark />

      <div className="relative z-10 flex flex-col min-h-[266mm]">
        {/* Official CSPLZ Header */}
        <header className="flex items-start justify-between gap-4 pb-4 border-b-2 border-teal-700">
          <div className="flex items-center gap-3.5">
            <CsplzLogo size={54} />
            <div>
              <p className="font-display text-[15px] font-bold tracking-tight text-slate-900 uppercase">
                Centre de Santé Privé Laïc Zouabi
              </p>
              <p className="text-[10px] font-semibold text-teal-800 tracking-wide">
                CSPLZ · Service de Consultation & Pharmacie Clinique
              </p>
              <p className="text-[9.5px] text-slate-500 mt-0.5">
                Agrément N° 042/MSP/CSPLZ · Quartier Zouabi · Tél : +237 6XX XX XX XX
              </p>
            </div>
          </div>

          <div className="text-right border border-teal-700/30 bg-teal-50/70 px-3.5 py-2 rounded">
            <p className="font-display text-[11px] font-bold text-teal-800 uppercase tracking-wider">
              Ordonnance Médicale
            </p>
            <p className="font-mono text-[10px] font-semibold text-slate-900 tabular-nums mt-0.5">
              {ord.numeroOrdonnance}
            </p>
            <p className="font-mono text-[9.5px] text-slate-600 tabular-nums">
              Date : {ord.dateOrdonnance}
            </p>
          </div>
        </header>

        {/* Prescriber & Patient Identification */}
        <section className="mt-5 grid grid-cols-2 gap-6 pb-4 border-b border-slate-200">
          <div className="space-y-1">
            <p className="text-[9.5px] uppercase tracking-wider font-semibold text-teal-800">
              Médecin Prescripteur
            </p>
            <p className="font-display font-bold text-[13px] text-slate-900">{ord.medecin}</p>
            <p className="text-[10.5px] text-slate-600">{ord.qualificationMedecin}</p>
            {ord.diagnosticIndication && (
              <p className="text-[10px] text-slate-500 pt-1">
                Indication : <span className="text-slate-700">{ord.diagnosticIndication}</span>
              </p>
            )}
          </div>

          <div className="space-y-1 bg-slate-50/90 p-3 rounded border border-slate-200">
            <p className="text-[9.5px] uppercase tracking-wider font-semibold text-teal-800">
              Identification du Patient
            </p>
            <p className="font-display font-bold text-[13px] text-slate-900">
              {ord.patient.nomComplet || 'Patient non renseigné'}
            </p>
            <p className="text-[10.5px] text-slate-700 tabular-nums">
              {ord.patient.sexe === 'F' ? 'Féminin' : 'Masculin'} · {ord.patient.age || '—'}
              {ord.patient.poids ? ` · Poids : ${ord.patient.poids}` : ''}
            </p>
            <p className="text-[10px] text-slate-600 font-mono tabular-nums">
              Dossier : {ord.numeroDossier || '—'} · Tél : {ord.patient.telephone || '—'}
            </p>
          </div>
        </section>

        {/* Rx Section */}
        <section className="mt-6 flex-1">
          <div className="flex items-center justify-between border-b border-slate-300 pb-2 mb-4">
            <span className="font-display text-lg font-bold text-teal-800 tracking-tight">
              Rx / Prescription Médicamenteuse
            </span>
            <span className="text-[10px] text-slate-500 font-mono tabular-nums">
              {ord.lignes.length} produit{ord.lignes.length > 1 ? 's' : ''} prescrit{ord.lignes.length > 1 ? 's' : ''}
            </span>
          </div>

          {ord.lignes.length === 0 ? (
            <p className="py-8 text-center text-slate-500 italic">
              Aucune ligne de médicament inscrite sur cette ordonnance.
            </p>
          ) : (
            <ol className="space-y-4">
              {ord.lignes.map((item, index) => (
                <li
                  key={item.id}
                  className="pb-3.5 border-b border-slate-200 last:border-b-0"
                >
                  <div className="flex items-baseline justify-between gap-4">
                    <div className="font-display font-bold text-[13px] text-slate-900">
                      {index + 1}. {item.medicament}{' '}
                      <span className="font-sans font-normal text-[11px] text-slate-600">
                        — {item.forme} ({item.dosage})
                      </span>
                    </div>
                    <span className="font-mono font-semibold text-[11.5px] text-teal-800 shrink-0 tabular-nums">
                      Qté : {item.quantite}
                    </span>
                  </div>
                  {item.dci && (
                    <div className="text-[10px] text-slate-500 ml-4">DCI : {item.dci}</div>
                  )}
                  <div className="mt-1 ml-4 text-[11.5px] text-slate-800">
                    <span className="font-semibold">Posologie :</span> {item.posologie} ·{' '}
                    <span className="font-medium">{item.frequence}</span> · Durée :{' '}
                    <span className="font-mono font-semibold tabular-nums">{item.duree}</span> · Voie{' '}
                    {item.voie}
                  </div>
                  {item.instructions && (
                    <div className="mt-0.5 ml-4 text-[10.5px] text-slate-600 italic">
                      Consigne : {item.instructions}
                    </div>
                  )}
                </li>
              ))}
            </ol>
          )}

          {ord.recommandations && (
            <div className="mt-6 p-3.5 bg-slate-50 border border-slate-200 rounded">
              <p className="text-[10px] font-bold uppercase tracking-wider text-teal-800 mb-1">
                Recommandations hygiéno-diététiques & suivi
              </p>
              <p className="text-[11px] text-slate-800 whitespace-pre-line">
                {ord.recommandations}
              </p>
            </div>
          )}
        </section>

        {/* Official Stamp & Doctor Signature Footer */}
        <footer className="mt-8 pt-4 border-t border-slate-300 grid grid-cols-2 gap-6 items-end">
          <div>
            <p className="text-[10px] text-slate-600">
              Ordonnance valable <span className="font-semibold">{ord.validiteJours} jours</span> à
              compter de la date d’émission.
            </p>
            <div className="mt-3 h-16 w-48 border border-dashed border-slate-300 rounded flex items-center justify-center text-[9px] text-slate-400 uppercase tracking-wider">
              Cachet Officiel · CSPLZ
            </div>
          </div>

          <div className="text-right">
            <p className="text-[10px] text-slate-500">Délivré à Zouabi, le {ord.dateOrdonnance}</p>
            <p className="font-display font-bold text-[12.5px] text-slate-900 mt-0.5">
              {ord.medecin}
            </p>
            <div className="mt-7 pt-1 border-t border-slate-300 inline-block w-52 text-center text-[9.5px] text-slate-400">
              Signature & Cachet du Médecin
            </div>
          </div>
        </footer>

        <p className="mt-4 pt-2 border-t border-slate-200 text-center text-[8.5px] text-slate-400">
          Centre de Santé Privé Laïc Zouabi (CSPLZ) · Ne pas jeter sur la voie publique · Respectez strictement les doses prescrites.
        </p>
      </div>
    </div>
  );
};
