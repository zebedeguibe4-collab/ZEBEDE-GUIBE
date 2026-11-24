import React, {useMemo, useState} from 'react';
import {
  FileText,
  Printer,
  Download,
  FileSpreadsheet,
  ArrowRightCircle,
  Plus,
  Trash2,
  Save,
  Search,
  History,
  Eye,
  ClipboardList,
  RotateCcw,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import {
  ConsultationRecord,
  ConsultationType,
  MedicationCatalogItem,
  PaymentStatus,
  Practitioner,
  PrescribedMedication,
  Sex,
} from '../types/clinical';
import {
  COMMON_COMPLEMENTARY_EXAMS,
  SERVICES_CSPLZ,
} from '../data/initialData';
import {
  calculateAgeFromBirthdate,
  calculateImc,
  evaluateVitalAlerts,
  formatFcfa,
} from '../utils/clinicalCalculations';
import {
  exportConsultationToPdf,
  exportConsultationsToExcel,
} from '../utils/exportUtils';
import {A4ConsultationPreview} from './A4ConsultationPreview';

interface ConsultationWorkspaceProps {
  draft: ConsultationRecord;
  onChangeDraft: (updated: ConsultationRecord) => void;
  consultations: ConsultationRecord[];
  catalog: MedicationCatalogItem[];
  practitioners: Practitioner[];
  onOpenAddPractitioner: () => void;
  onSaveConsultation: (record: ConsultationRecord) => void;
  onDeleteConsultation: (id: string) => void;
  onLoadConsultation: (record: ConsultationRecord) => void;
  onNewConsultation: () => void;
  onTransferToOrdonnancier: (record: ConsultationRecord) => void;
}

type SubView = 'formulaire' | 'apercu' | 'historique';

export const ConsultationWorkspace: React.FC<ConsultationWorkspaceProps> = ({
  draft,
  onChangeDraft,
  consultations,
  catalog,
  practitioners,
  onOpenAddPractitioner,
  onSaveConsultation,
  onDeleteConsultation,
  onLoadConsultation,
  onNewConsultation,
  onTransferToOrdonnancier,
}) => {
  const [subView, setSubView] = useState<SubView>('formulaire');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterService, setFilterService] = useState('Tous');
  const [selectedCatalogId, setSelectedCatalogId] = useState<string>(
    catalog.find((c) => c.disponible)?.id || catalog[0]?.id || '',
  );
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const imc = useMemo(
    () => calculateImc(draft.constantes.poids, draft.constantes.taille),
    [draft.constantes.poids, draft.constantes.taille],
  );

  const vitalAlerts = useMemo(
    () => evaluateVitalAlerts(draft.constantes),
    [draft.constantes],
  );

  const showToast = (msg: string) => {
    setFeedbackMessage(msg);
    window.setTimeout(() => {
      setFeedbackMessage((curr) => (curr === msg ? null : curr));
    }, 3200);
  };

  const updatePatient = (field: keyof ConsultationRecord['patient'], value: string) => {
    const nextPatient = {...draft.patient, [field]: value};
    if (field === 'dateNaissance') {
      const computed = calculateAgeFromBirthdate(value);
      if (computed) {
        nextPatient.age = computed;
      }
    }
    onChangeDraft({...draft, patient: nextPatient});
  };

  const updateConstantes = (field: keyof ConsultationRecord['constantes'], value: string) => {
    onChangeDraft({
      ...draft,
      constantes: {...draft.constantes, [field]: value},
    });
  };

  const updateAntecedents = (field: keyof ConsultationRecord['antecedents'], value: string) => {
    onChangeDraft({
      ...draft,
      antecedents: {...draft.antecedents, [field]: value},
    });
  };

  const updateExam = (field: keyof ConsultationRecord['examenPhysique'], value: string) => {
    onChangeDraft({
      ...draft,
      examenPhysique: {...draft.examenPhysique, [field]: value},
    });
  };

  const toggleComplementaryExam = (exam: string) => {
    const exists = draft.examensComplementaires.includes(exam);
    const next = exists
      ? draft.examensComplementaires.filter((e) => e !== exam)
      : [...draft.examensComplementaires, exam];
    onChangeDraft({...draft, examensComplementaires: next});
  };

  const handleAddMedicationFromCatalog = () => {
    const item = catalog.find((c) => c.id === selectedCatalogId);
    if (!item) return;
    const newLine: PrescribedMedication = {
      id: `med-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
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
    onChangeDraft({...draft, traitement: [...draft.traitement, newLine]});
  };

  const handleAddCustomMedication = () => {
    const newLine: PrescribedMedication = {
      id: `med-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      medicament: '',
      dci: '',
      forme: 'Comprimé',
      dosage: '',
      posologie: '',
      frequence: '2 fois / jour',
      duree: '5 jours',
      quantite: '1 boîte',
      voie: 'Orale',
      instructions: '',
    };
    onChangeDraft({...draft, traitement: [...draft.traitement, newLine]});
  };

  const updateMedicationLine = (
    id: string,
    field: keyof PrescribedMedication,
    value: string,
  ) => {
    onChangeDraft({
      ...draft,
      traitement: draft.traitement.map((m) => (m.id === id ? {...m, [field]: value} : m)),
    });
  };

  const removeMedicationLine = (id: string) => {
    onChangeDraft({
      ...draft,
      traitement: draft.traitement.filter((m) => m.id !== id),
    });
  };

  const handleSave = () => {
    if (!draft.patient.nomComplet.trim()) {
      showToast('Veuillez renseigner le nom complet du patient avant d’enregistrer.');
      return;
    }
    const saved: ConsultationRecord = {
      ...draft,
      statut: draft.statut === 'En cours' ? 'Validée' : draft.statut,
      updatedAt: new Date().toISOString(),
    };
    onSaveConsultation(saved);
    showToast(`Dossier ${saved.numeroConsultation} enregistré dans l’historique local.`);
  };

  const handleTransfer = () => {
    if (!draft.patient.nomComplet.trim()) {
      showToast('Veuillez renseigner le nom du patient avant de transférer vers l’ordonnancier.');
      return;
    }
    onTransferToOrdonnancier(draft);
  };

  const filteredConsultations = useMemo(() => {
    return consultations.filter((c) => {
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        c.patient.nomComplet.toLowerCase().includes(q) ||
        c.patient.numeroDossier.toLowerCase().includes(q) ||
        c.numeroConsultation.toLowerCase().includes(q) ||
        c.diagnosticPrincipal.toLowerCase().includes(q) ||
        c.medecin.toLowerCase().includes(q);
      const matchesService = filterService === 'Tous' || c.service === filterService;
      return matchesSearch && matchesService;
    });
  }, [consultations, searchQuery, filterService]);

  const imcBadgeStyles =
    imc.tone === 'normal'
      ? 'text-emerald-800 bg-emerald-50 border-emerald-200'
      : imc.tone === 'warning'
        ? 'text-amber-800 bg-amber-50 border-amber-200'
        : imc.tone === 'alert'
          ? 'text-red-800 bg-red-50 border-red-200'
          : 'text-slate-600 bg-slate-100 border-slate-200';

  return (
    <div className="space-y-5">
      {/* Workspace Action & Sub-navigation Toolbar */}
      <div className="no-print bg-white border border-slate-200 rounded-lg px-4 py-3 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
          <button
            type="button"
            onClick={() => setSubView('formulaire')}
            className={`inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              subView === 'formulaire'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ClipboardList className="w-3.5 h-3.5" />
            Dossier Clinique
          </button>
          <button
            type="button"
            onClick={() => setSubView('apercu')}
            className={`inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              subView === 'apercu'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            Aperçu A4 Officiel
          </button>
          <button
            type="button"
            onClick={() => setSubView('historique')}
            className={`inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              subView === 'historique'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            Historique ({consultations.length})
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handleSave}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg border border-slate-300 bg-white text-slate-800 hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Save className="w-3.5 h-3.5 text-teal-700" />
            Enregistrer Dossier
          </button>

          <button
            type="button"
            onClick={handleTransfer}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-teal-700 text-white hover:bg-teal-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <ArrowRightCircle className="w-3.5 h-3.5" />
            Transférer vers Ordonnancier
          </button>

          <button
            type="button"
            onClick={() => exportConsultationToPdf(draft)}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg border border-slate-300 bg-white text-slate-800 hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-slate-600" />
            Télécharger PDF
          </button>

          <button
            type="button"
            onClick={() => exportConsultationsToExcel(consultations)}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg border border-slate-300 bg-white text-slate-800 hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
            Excel (.xlsx)
          </button>
        </div>
      </div>

      {feedbackMessage && (
        <div
          role="status"
          className="no-print flex items-center justify-between gap-3 px-4 py-2.5 rounded-lg border border-teal-200 bg-teal-50 text-teal-900 text-xs font-medium"
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-teal-700 shrink-0" />
            <span>{feedbackMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedbackMessage(null)}
            className="text-teal-700 hover:text-teal-900 font-semibold cursor-pointer"
          >
            Fermer
          </button>
        </div>
      )}

      {/* SUBVIEW 1: CLINICAL FORM */}
      {subView === 'formulaire' && (
        <div className="no-print grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Main Clinical Column (8 cols) */}
          <div className="lg:col-span-8 space-y-5">
            {/* Administrative & Context Header */}
            <section className="bg-white border border-slate-200 rounded-lg p-5">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3.5 mb-4 border-b border-slate-200">
                <div>
                  <h2 className="font-display text-base font-bold text-slate-900">
                    01. Consultation & Identification Patient
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5 tabular-nums">
                    {draft.numeroConsultation} · {draft.dateConsultation} · {draft.statut}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onNewConsultation();
                    showToast('Nouvelle fiche de consultation prête.');
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 border border-slate-200 rounded-md hover:bg-slate-50 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Réinitialiser fiche
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    N° Dossier Patient
                  </label>
                  <input
                    type="text"
                    value={draft.patient.numeroDossier}
                    onChange={(e) => updatePatient('numeroDossier', e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono tabular-nums border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-700"
                    placeholder="CSPLZ-2026-0105"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Nom complet du patient <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    value={draft.patient.nomComplet}
                    onChange={(e) => updatePatient('nomComplet', e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-700"
                    placeholder="Ex. : Nkoumou Jean-Baptiste"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Date de naissance
                  </label>
                  <input
                    type="date"
                    value={draft.patient.dateNaissance}
                    onChange={(e) => updatePatient('dateNaissance', e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono tabular-nums border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-700"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Âge
                  </label>
                  <input
                    type="text"
                    value={draft.patient.age}
                    onChange={(e) => updatePatient('age', e.target.value)}
                    className="w-full px-3 py-2 text-sm tabular-nums border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-700"
                    placeholder="Ex. : 34 ans"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Sexe
                  </label>
                  <select
                    value={draft.patient.sexe}
                    onChange={(e) => updatePatient('sexe', e.target.value as Sex)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-700"
                  >
                    <option value="F">Féminin (F)</option>
                    <option value="M">Masculin (M)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Téléphone
                  </label>
                  <input
                    type="tel"
                    value={draft.patient.telephone}
                    onChange={(e) => updatePatient('telephone', e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono tabular-nums border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-700"
                    placeholder="+237 6XX XX XX XX"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Groupe sanguin
                  </label>
                  <select
                    value={draft.patient.groupeSanguin}
                    onChange={(e) => updatePatient('groupeSanguin', e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-700"
                  >
                    <option value="Non précisé">Non précisé</option>
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Personne à contacter
                  </label>
                  <input
                    type="text"
                    value={draft.patient.personneContact}
                    onChange={(e) => updatePatient('personneContact', e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-700"
                    placeholder="Nom & téléphone"
                  />
                </div>

                <div className="sm:col-span-3">
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Adresse / Quartier
                  </label>
                  <input
                    type="text"
                    value={draft.patient.adresse}
                    onChange={(e) => updatePatient('adresse', e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-700"
                    placeholder="Quartier, Secteur, Ville"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-medium text-slate-700">
                      Consultant / Prescripteur
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
                      const doc = practitioners.find((m) => m.nom === e.target.value);
                      onChangeDraft({
                        ...draft,
                        medecin: e.target.value,
                        qualificationMedecin: doc ? doc.qualification : draft.qualificationMedecin,
                      });
                    }}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-700"
                  >
                    {practitioners.map((m) => (
                      <option key={m.id} value={m.nom}>
                        {m.nom}
                      </option>
                    ))}
                    <option value="__add_new__">+ Ajouter un autre consultant / prescripteur...</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Service clinique
                  </label>
                  <select
                    value={draft.service}
                    onChange={(e) => onChangeDraft({...draft, service: e.target.value})}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-700"
                  >
                    {SERVICES_CSPLZ.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Type de visite
                  </label>
                  <select
                    value={draft.typeConsultation}
                    onChange={(e) =>
                      onChangeDraft({
                        ...draft,
                        typeConsultation: e.target.value as ConsultationType,
                      })
                    }
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-700"
                  >
                    <option value="Première visite">Première visite</option>
                    <option value="Suivi">Suivi</option>
                    <option value="Contrôle">Contrôle</option>
                    <option value="Urgence">Urgence</option>
                  </select>
                </div>
              </div>
            </section>

            {/* Section 02: Motif & Antecedents */}
            <section className="bg-white border border-slate-200 rounded-lg p-5">
              <h2 className="font-display text-base font-bold text-slate-900 pb-3 mb-4 border-b border-slate-200">
                02. Motif de Consultation, Histoire & Antécédents
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Motif principal de consultation
                  </label>
                  <input
                    type="text"
                    value={draft.motif}
                    onChange={(e) => onChangeDraft({...draft, motif: e.target.value})}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-700"
                    placeholder="Ex. : Fièvre depuis 48h, céphalées, toux..."
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Histoire de la maladie
                  </label>
                  <textarea
                    rows={2}
                    value={draft.histoireMaladie}
                    onChange={(e) => onChangeDraft({...draft, histoireMaladie: e.target.value})}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-700"
                    placeholder="Mode d’installation, évolution, signes associés..."
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Antécédents médicaux
                    </label>
                    <input
                      type="text"
                      value={draft.antecedents.medicaux}
                      onChange={(e) => updateAntecedents('medicaux', e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-700"
                      placeholder="HTA, diabète, asthme, drépanocytose..."
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Antécédents chirurgicaux
                    </label>
                    <input
                      type="text"
                      value={draft.antecedents.chirurgicaux}
                      onChange={(e) => updateAntecedents('chirurgicaux', e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-700"
                      placeholder="Interventions antérieures, césarienne..."
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Allergies connues
                    </label>
                    <input
                      type="text"
                      value={draft.antecedents.allergies}
                      onChange={(e) => updateAntecedents('allergies', e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-700"
                      placeholder="Pénicilline, sulfamides, AINS, aucune..."
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Traitements en cours
                    </label>
                    <input
                      type="text"
                      value={draft.antecedents.traitementsEnCours}
                      onChange={(e) => updateAntecedents('traitementsEnCours', e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-700"
                      placeholder="Automédication ou traitement chronique..."
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* Section 03: Examen Physique & Examens Complémentaires */}
            <section className="bg-white border border-slate-200 rounded-lg p-5">
              <h2 className="font-display text-base font-bold text-slate-900 pb-3 mb-4 border-b border-slate-200">
                03. Examen Physique & Examens Complémentaires
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    État général
                  </label>
                  <input
                    type="text"
                    value={draft.examenPhysique.etatGeneral}
                    onChange={(e) => updateExam('etatGeneral', e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-700"
                    placeholder="Conscience, coloration des conjonctives, hydratation..."
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Appareil cardiovasculaire
                  </label>
                  <input
                    type="text"
                    value={draft.examenPhysique.cardioVasculaire}
                    onChange={(e) => updateExam('cardioVasculaire', e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-700"
                    placeholder="Bruits du cœur, pouls périphériques, OMI..."
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Appareil pleuro-pulmonaire
                  </label>
                  <input
                    type="text"
                    value={draft.examenPhysique.pulmonaire}
                    onChange={(e) => updateExam('pulmonaire', e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-700"
                    placeholder="Murmure vésiculaire, râles, tirage..."
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Examen abdominal
                  </label>
                  <input
                    type="text"
                    value={draft.examenPhysique.abdominal}
                    onChange={(e) => updateExam('abdominal', e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-700"
                    placeholder="Souplesse, sensibilité, organomégalie..."
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Examen neurologique & ORL
                  </label>
                  <input
                    type="text"
                    value={draft.examenPhysique.neuroOrl}
                    onChange={(e) => updateExam('neuroOrl', e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-700"
                    placeholder="Gorge, tympans, réflexes, raideur méningée..."
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Autres observations cliniques
                  </label>
                  <input
                    type="text"
                    value={draft.examenPhysique.autresObservations}
                    onChange={(e) => updateExam('autresObservations', e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-700"
                    placeholder="Cutané, ostéo-articulaire, TDR sur place..."
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200">
                <label className="block text-xs font-semibold text-slate-700 mb-2.5">
                  Examens complémentaires demandés (Laboratoire / Imagerie)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 mb-3">
                  {COMMON_COMPLEMENTARY_EXAMS.map((exam) => {
                    const checked = draft.examensComplementaires.includes(exam);
                    return (
                      <label
                        key={exam}
                        className={`flex items-center gap-2 px-2.5 py-2 rounded-md border text-xs cursor-pointer transition-colors ${
                          checked
                            ? 'bg-teal-50 border-teal-300 text-teal-900 font-medium'
                            : 'bg-slate-50/70 border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleComplementaryExam(exam)}
                          className="accent-teal-700 rounded"
                        />
                        <span className="truncate">{exam}</span>
                      </label>
                    );
                  })}
                </div>
                <input
                  type="text"
                  value={draft.notesExamens}
                  onChange={(e) => onChangeDraft({...draft, notesExamens: e.target.value})}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-700"
                  placeholder="Résultats immédiats ou précisions sur d'autres examens demandés..."
                />
              </div>
            </section>

            {/* Section 04: Diagnostic & Conduite à Tenir */}
            <section className="bg-white border border-slate-200 rounded-lg p-5">
              <h2 className="font-display text-base font-bold text-slate-900 pb-3 mb-4 border-b border-slate-200">
                04. Diagnostic Retenu & Conduite à Tenir
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="sm:col-span-3">
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Diagnostic principal retenu
                  </label>
                  <input
                    type="text"
                    value={draft.diagnosticPrincipal}
                    onChange={(e) =>
                      onChangeDraft({...draft, diagnosticPrincipal: e.target.value})
                    }
                    className="w-full px-3 py-2 text-sm font-medium border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-700"
                    placeholder="Ex. : Accès palustre simple à Plasmodium falciparum"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Code CIM-10
                  </label>
                  <input
                    type="text"
                    value={draft.codeCim10}
                    onChange={(e) => onChangeDraft({...draft, codeCim10: e.target.value})}
                    className="w-full px-3 py-2 text-sm font-mono tabular-nums border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-700"
                    placeholder="Ex. : B50.9"
                  />
                </div>
                <div className="sm:col-span-4">
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Diagnostics différentiels / Hypothèses
                  </label>
                  <input
                    type="text"
                    value={draft.diagnosticsDifferentiels}
                    onChange={(e) =>
                      onChangeDraft({...draft, diagnosticsDifferentiels: e.target.value})
                    }
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-700"
                    placeholder="Diagnostics à écarter..."
                  />
                </div>
                <div className="sm:col-span-4">
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Conduite à tenir, recommandations & consignes de surveillance
                  </label>
                  <textarea
                    rows={2}
                    value={draft.conduiteATenir}
                    onChange={(e) => onChangeDraft({...draft, conduiteATenir: e.target.value})}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-700"
                    placeholder="Mesures hygiéno-diététiques, signes d’alarme, suivi..."
                  />
                </div>
              </div>
            </section>

            {/* Section 05: Traitement Prescrit depuis le Catalogue */}
            <section className="bg-white border border-slate-200 rounded-lg p-5">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 mb-4 border-b border-slate-200">
                <div>
                  <h2 className="font-display text-base font-bold text-slate-900">
                    05. Traitement Prescrit (Catalogue CSPLZ)
                  </h2>
                  <p className="text-xs text-slate-500">
                    Sélectionnez depuis votre catalogue synchronisé pour pré-remplir l’ordonnancier.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleAddCustomMedication}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 border border-slate-300 rounded-md hover:bg-slate-50 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Ligne libre
                </button>
              </div>

              {/* Catalog Selector Bar */}
              <div className="flex flex-col sm:flex-row gap-2.5 mb-4 p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <select
                  value={selectedCatalogId}
                  onChange={(e) => setSelectedCatalogId(e.target.value)}
                  className="flex-1 px-3 py-2 text-sm border border-slate-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-700"
                >
                  {catalog
                    .filter((item) => item.disponible)
                    .map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.nomCommercial} ({item.forme} · {item.dosage}) — Stock : {item.stock} ·{' '}
                        {formatFcfa(item.prixUnitaire)}
                      </option>
                    ))}
                </select>
                <button
                  type="button"
                  onClick={handleAddMedicationFromCatalog}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold rounded-md bg-teal-700 text-white hover:bg-teal-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Prescrire ce produit
                </button>
              </div>

              {draft.traitement.length === 0 ? (
                <div className="py-6 text-center text-sm text-slate-500 border border-dashed border-slate-200 rounded-lg">
                  Aucun médicament prescrit pour le moment. Sélectionnez un produit du catalogue ci-dessus.
                </div>
              ) : (
                <div className="space-y-3">
                  {draft.traitement.map((med, index) => (
                    <div
                      key={med.id}
                      className="p-3.5 border border-slate-200 rounded-lg bg-slate-50/40 space-y-3"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-xs font-bold text-teal-800 font-mono">
                          Ligne #{index + 1} {med.dci ? `· ${med.dci}` : ''}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeMedicationLine(med.id)}
                          className="inline-flex items-center gap-1 text-xs text-red-600 hover:text-red-800 font-medium cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Retirer
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                        <div className="sm:col-span-2">
                          <label className="block text-[11px] font-medium text-slate-600 mb-1">
                            Nom du médicament
                          </label>
                          <input
                            type="text"
                            value={med.medicament}
                            onChange={(e) =>
                              updateMedicationLine(med.id, 'medicament', e.target.value)
                            }
                            className="w-full px-2.5 py-1.5 text-sm border border-slate-300 rounded bg-white"
                            placeholder="Nom commercial / DCI"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-medium text-slate-600 mb-1">
                            Forme
                          </label>
                          <input
                            type="text"
                            value={med.forme}
                            onChange={(e) => updateMedicationLine(med.id, 'forme', e.target.value)}
                            className="w-full px-2.5 py-1.5 text-sm border border-slate-300 rounded bg-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-medium text-slate-600 mb-1">
                            Dosage
                          </label>
                          <input
                            type="text"
                            value={med.dosage}
                            onChange={(e) => updateMedicationLine(med.id, 'dosage', e.target.value)}
                            className="w-full px-2.5 py-1.5 text-sm border border-slate-300 rounded bg-white"
                          />
                        </div>

                        <div className="sm:col-span-2">
                          <label className="block text-[11px] font-medium text-slate-600 mb-1">
                            Posologie détaillée
                          </label>
                          <input
                            type="text"
                            value={med.posologie}
                            onChange={(e) =>
                              updateMedicationLine(med.id, 'posologie', e.target.value)
                            }
                            className="w-full px-2.5 py-1.5 text-sm border border-slate-300 rounded bg-white"
                            placeholder="Ex. : 1 comprimé matin et soir"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-medium text-slate-600 mb-1">
                            Durée
                          </label>
                          <input
                            type="text"
                            value={med.duree}
                            onChange={(e) => updateMedicationLine(med.id, 'duree', e.target.value)}
                            className="w-full px-2.5 py-1.5 text-sm border border-slate-300 rounded bg-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-medium text-slate-600 mb-1">
                            Quantité délivrée
                          </label>
                          <input
                            type="text"
                            value={med.quantite}
                            onChange={(e) =>
                              updateMedicationLine(med.id, 'quantite', e.target.value)
                            }
                            className="w-full px-2.5 py-1.5 text-sm border border-slate-300 rounded bg-white"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          {/* Right Sticky Vital Signs, IMC & Clinical Actions Rail (4 cols) */}
          <aside className="lg:col-span-4 space-y-5 lg:sticky lg:top-20">
            <section className="bg-white border border-slate-200 rounded-lg p-5">
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-200">
                <h2 className="font-display text-base font-bold text-slate-900">
                  Constantes Vitales & IMC
                </h2>
                <span className="text-xs text-slate-500 font-mono tabular-nums">
                  Calcul en direct
                </span>
              </div>

              {/* Automatic IMC Box */}
              <div className={`p-3.5 rounded-lg border mb-4 ${imcBadgeStyles}`}>
                <div className="flex items-baseline justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wide">
                    Indice de Masse Corporelle (IMC)
                  </span>
                  <span className="font-mono text-xl font-bold tabular-nums">
                    {imc.formatted} {imc.value !== null ? 'kg/m²' : ''}
                  </span>
                </div>
                <p className="text-xs font-semibold mt-1">{imc.category}</p>
                {imc.value !== null && (
                  <div className="mt-2.5 h-1.5 w-full bg-white/70 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-current transition-all duration-200"
                      style={{
                        width: `${Math.min(100, Math.max(8, ((imc.value - 12) / 30) * 100))}%`,
                      }}
                    />
                  </div>
                )}
              </div>

              {/* Vital Signs Inputs */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Poids (kg)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={draft.constantes.poids}
                    onChange={(e) => updateConstantes('poids', e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono tabular-nums border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-700"
                    placeholder="64"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Taille (cm)
                  </label>
                  <input
                    type="number"
                    step="1"
                    value={draft.constantes.taille}
                    onChange={(e) => updateConstantes('taille', e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono tabular-nums border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-700"
                    placeholder="168"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Température (°C)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={draft.constantes.temperature}
                    onChange={(e) => updateConstantes('temperature', e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono tabular-nums border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-700"
                    placeholder="37.2"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Pouls (bpm)
                  </label>
                  <input
                    type="number"
                    value={draft.constantes.pouls}
                    onChange={(e) => updateConstantes('pouls', e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono tabular-nums border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-700"
                    placeholder="76"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    TA Systolique (mmHg)
                  </label>
                  <input
                    type="number"
                    value={draft.constantes.tensionSystolique}
                    onChange={(e) => updateConstantes('tensionSystolique', e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono tabular-nums border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-700"
                    placeholder="120"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    TA Diastolique (mmHg)
                  </label>
                  <input
                    type="number"
                    value={draft.constantes.tensionDiastolique}
                    onChange={(e) => updateConstantes('tensionDiastolique', e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono tabular-nums border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-700"
                    placeholder="80"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Fréq. Resp. (/min)
                  </label>
                  <input
                    type="number"
                    value={draft.constantes.frequenceRespiratoire}
                    onChange={(e) => updateConstantes('frequenceRespiratoire', e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono tabular-nums border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-700"
                    placeholder="18"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Saturation SpO₂ (%)
                  </label>
                  <input
                    type="number"
                    value={draft.constantes.spo2}
                    onChange={(e) => updateConstantes('spo2', e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono tabular-nums border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-700"
                    placeholder="98"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Glycémie capillaire (g/L)
                  </label>
                  <input
                    type="text"
                    value={draft.constantes.glycemie}
                    onChange={(e) => updateConstantes('glycemie', e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono tabular-nums border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-700"
                    placeholder="Ex. : 0.95"
                  />
                </div>
              </div>

              {vitalAlerts.length > 0 && (
                <div className="mt-4 p-3 rounded-lg border border-amber-200 bg-amber-50 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-900">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                    Signes vitaux hors normes
                  </div>
                  {vitalAlerts.map((a) => (
                    <div
                      key={a.label}
                      className={`text-xs flex items-center justify-between ${
                        a.level === 'alert' ? 'text-red-800 font-semibold' : 'text-amber-800'
                      }`}
                    >
                      <span>{a.label}</span>
                      <span className="font-mono tabular-nums">{a.detail}</span>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Follow-up & Consultation Fee */}
            <section className="bg-white border border-slate-200 rounded-lg p-5 space-y-3">
              <h3 className="font-display text-sm font-bold text-slate-900 pb-2 border-b border-slate-200">
                Suivi & Facturation Acte
              </h3>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Date du prochain rendez-vous
                </label>
                <input
                  type="date"
                  value={draft.prochainRendezVous}
                  onChange={(e) =>
                    onChangeDraft({...draft, prochainRendezVous: e.target.value})
                  }
                  className="w-full px-3 py-2 text-sm font-mono tabular-nums border border-slate-300 rounded-md"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Acte (FCFA)
                  </label>
                  <input
                    type="number"
                    step="500"
                    value={draft.montantConsultation}
                    onChange={(e) =>
                      onChangeDraft({
                        ...draft,
                        montantConsultation: Number(e.target.value) || 0,
                      })
                    }
                    className="w-full px-3 py-2 text-sm font-mono tabular-nums border border-slate-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Paiement
                  </label>
                  <select
                    value={draft.statutPaiement}
                    onChange={(e) =>
                      onChangeDraft({
                        ...draft,
                        statutPaiement: e.target.value as PaymentStatus,
                      })
                    }
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md bg-white"
                  >
                    <option value="Réglé">Réglé</option>
                    <option value="En attente">En attente</option>
                    <option value="Prise en charge">Prise en charge</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={handleTransfer}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-lg bg-teal-700 text-white hover:bg-teal-800 transition-colors cursor-pointer"
                >
                  <ArrowRightCircle className="w-4 h-4" />
                  Transférer vers Ordonnancier
                </button>
                <button
                  type="button"
                  onClick={() => setSubView('apercu')}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg border border-slate-300 bg-white text-slate-800 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  <FileText className="w-4 h-4 text-teal-700" />
                  Aperçu A4 Officiel & Impression
                </button>
              </div>
            </section>
          </aside>
        </div>
      )}

      {/* SUBVIEW 2: OFFICIAL A4 PREVIEW */}
      {subView === 'apercu' && (
        <div className="space-y-4">
          <div className="no-print bg-white border border-slate-200 rounded-lg px-4 py-3 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-sm font-bold text-slate-900">
                Aperçu Officiel A4 · Fiche de Consultation CSPLZ
              </h2>
              <p className="text-xs text-slate-500">
                En-tête institutionnel CSPLZ et filigrane officiel intégrés pour impression ou PDF.
              </p>
            </div>
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-teal-700 text-white hover:bg-teal-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                Imprimer A4
              </button>
              <button
                type="button"
                onClick={() => exportConsultationToPdf(draft)}
                className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg border border-slate-300 bg-white text-slate-800 hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                Télécharger PDF
              </button>
            </div>
          </div>

          <div className="print-only-container overflow-x-auto pb-6">
            <A4ConsultationPreview consultation={draft} />
          </div>
        </div>
      )}

      {/* SUBVIEW 3: LOCAL CONSULTATION HISTORY */}
      {subView === 'historique' && (
        <section className="no-print bg-white border border-slate-200 rounded-lg p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="font-display text-base font-bold text-slate-900">
                Historique des Dossiers de Consultation
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Archives locales consultables, rechargeables dans l’éditeur et exportables en Excel (.xlsx).
              </p>
            </div>
            <button
              type="button"
              onClick={() => exportConsultationsToExcel(filteredConsultations)}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-teal-700 text-white hover:bg-teal-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              Exporter la sélection (.xlsx)
            </button>
          </div>

          {/* Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-700"
                placeholder="Rechercher par patient, N° dossier, diagnostic ou médecin..."
              />
            </div>
            <select
              value={filterService}
              onChange={(e) => setFilterService(e.target.value)}
              className="px-3 py-2 text-sm border border-slate-300 rounded-md bg-white"
            >
              <option value="Tous">Tous les services</option>
              {SERVICES_CSPLZ.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          {filteredConsultations.length === 0 ? (
            <div className="py-12 text-center border border-dashed border-slate-200 rounded-lg">
              <p className="text-sm font-medium text-slate-700">
                Aucun dossier trouvé pour cette recherche.
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Modifiez vos filtres ou créez une nouvelle consultation médicale.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                    <th className="py-2.5 px-3 whitespace-nowrap">Date / Réf.</th>
                    <th className="py-2.5 px-3">Patient</th>
                    <th className="py-2.5 px-3 whitespace-nowrap">Constantes & IMC</th>
                    <th className="py-2.5 px-3">Diagnostic retenu</th>
                    <th className="py-2.5 px-3">Médecin</th>
                    <th className="py-2.5 px-3">Statut</th>
                    <th className="py-2.5 px-3 text-right whitespace-nowrap">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredConsultations.map((c) => {
                    const rowImc = calculateImc(c.constantes.poids, c.constantes.taille);
                    return (
                      <tr key={c.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-2.5 px-3 align-top whitespace-nowrap">
                          <div className="font-mono text-xs font-semibold text-slate-900 tabular-nums">
                            {c.dateConsultation}
                          </div>
                          <div className="font-mono text-[11px] text-slate-500 tabular-nums">
                            {c.numeroConsultation}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 align-top">
                          <div className="font-semibold text-slate-900">
                            {c.patient.nomComplet}
                          </div>
                          <div className="text-xs text-slate-500 font-mono tabular-nums">
                            {c.patient.numeroDossier} · {c.patient.sexe} · {c.patient.age}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 align-top whitespace-nowrap">
                          <div className="font-mono text-xs text-slate-800 tabular-nums">
                            {c.constantes.temperature || '—'} °C ·{' '}
                            {c.constantes.tensionSystolique || '—'}/
                            {c.constantes.tensionDiastolique || '—'}
                          </div>
                          <div className="text-xs text-teal-800 font-mono tabular-nums">
                            IMC : {rowImc.formatted} ({rowImc.category})
                          </div>
                        </td>
                        <td className="py-2.5 px-3 align-top max-w-xs">
                          <div className="text-xs font-medium text-slate-900 line-clamp-2">
                            {c.diagnosticPrincipal || 'Non renseigné'}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {c.traitement.length} médicament{c.traitement.length > 1 ? 's' : ''}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 align-top text-xs text-slate-700 whitespace-nowrap">
                          {c.medecin}
                        </td>
                        <td className="py-2.5 px-3 align-top text-xs whitespace-nowrap">
                          <span
                            className={`font-medium ${
                              c.statut === 'Transférée à l’ordonnancier'
                                ? 'text-teal-700'
                                : c.statut === 'Validée'
                                  ? 'text-emerald-700'
                                  : 'text-amber-700'
                            }`}
                          >
                            {c.statut}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 align-top text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                onLoadConsultation(c);
                                setSubView('formulaire');
                                showToast(`Dossier ${c.numeroConsultation} chargé.`);
                              }}
                              className="px-2.5 py-1 text-xs font-medium text-slate-700 border border-slate-300 rounded hover:bg-slate-100 cursor-pointer"
                            >
                              Ouvrir
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                onLoadConsultation(c);
                                setSubView('apercu');
                              }}
                              className="px-2.5 py-1 text-xs font-medium text-teal-800 border border-teal-200 bg-teal-50 rounded hover:bg-teal-100 cursor-pointer"
                            >
                              A4
                            </button>
                            <button
                              type="button"
                              onClick={() => exportConsultationToPdf(c)}
                              className="px-2.5 py-1 text-xs font-medium text-slate-700 border border-slate-300 rounded hover:bg-slate-100 cursor-pointer"
                              title="Télécharger PDF"
                            >
                              PDF
                            </button>
                            {confirmDeleteId === c.id ? (
                              <button
                                type="button"
                                onClick={() => {
                                  onDeleteConsultation(c.id);
                                  setConfirmDeleteId(null);
                                }}
                                className="px-2.5 py-1 text-xs font-semibold text-white bg-red-600 rounded hover:bg-red-700 cursor-pointer"
                              >
                                Confirmer
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteId(c.id)}
                                className="p-1.5 text-slate-400 hover:text-red-600 rounded cursor-pointer"
                                aria-label="Supprimer le dossier"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </div>
  );
};
