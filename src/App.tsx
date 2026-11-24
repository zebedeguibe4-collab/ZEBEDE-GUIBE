import React, {useEffect, useState} from 'react';
import {
  Plus,
  Stethoscope,
  Calendar,
  FileText,
  Pill,
  ClipboardList,
} from 'lucide-react';
import {
  ActiveTab,
  AppointmentRecord,
  ConsultationRecord,
  MedicationCatalogItem,
  OrdonnanceRecord,
  PaymentStatus,
  Practitioner,
} from './types/clinical';
import {
  INITIAL_APPOINTMENTS,
  INITIAL_CATALOG,
  INITIAL_CONSULTATIONS,
  INITIAL_ORDONNANCES,
  INITIAL_PRACTITIONERS,
  MEDECINS_CSPLZ,
  SERVICES_CSPLZ,
} from './data/initialData';
import {generateReferenceCode} from './utils/clinicalCalculations';
import {CsplzLogo} from './components/CsplzLogo';
import {ConsultationWorkspace} from './components/ConsultationWorkspace';
import {RendezVousWorkspace} from './components/RendezVousWorkspace';
import {OrdonnancierWorkspace} from './components/OrdonnancierWorkspace';
import {CatalogueWorkspace} from './components/CatalogueWorkspace';
import {RegistreWorkspace} from './components/RegistreWorkspace';
import {PractitionerModal} from './components/PractitionerModal';
import {PWAInstallButton} from './components/PWAInstallButton';
import {OfflineIndicator} from './components/OfflineIndicator';

const STORAGE_KEYS = {
  consultations: 'csplz_consultations_v1',
  ordonnances: 'csplz_ordonnances_v1',
  catalog: 'csplz_catalog_v1',
  practitioners: 'csplz_practitioners_v1',
  appointments: 'csplz_appointments_v1',
};

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

function createEmptyConsultation(existingCount: number): ConsultationRecord {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10);
  const timeStr = now.toTimeString().slice(0, 5);
  return {
    id: `cons-${Date.now()}`,
    numeroConsultation: generateReferenceCode('CONS', existingCount),
    dateConsultation: dateStr,
    heureConsultation: timeStr,
    medecin: MEDECINS_CSPLZ[0].nom,
    qualificationMedecin: MEDECINS_CSPLZ[0].qualification,
    service: SERVICES_CSPLZ[0],
    typeConsultation: 'Première visite',
    patient: {
      numeroDossier: generateReferenceCode('CSPLZ', existingCount + 104),
      nomComplet: '',
      dateNaissance: '',
      age: '',
      sexe: 'F',
      telephone: '',
      adresse: '',
      groupeSanguin: 'Non précisé',
      personneContact: '',
    },
    constantes: {
      temperature: '',
      tensionSystolique: '',
      tensionDiastolique: '',
      pouls: '',
      frequenceRespiratoire: '',
      spo2: '',
      poids: '',
      taille: '',
      glycemie: '',
    },
    motif: '',
    histoireMaladie: '',
    antecedents: {
      medicaux: '',
      chirurgicaux: '',
      allergies: '',
      traitementsEnCours: '',
    },
    examenPhysique: {
      etatGeneral: '',
      cardioVasculaire: '',
      pulmonaire: '',
      abdominal: '',
      neuroOrl: '',
      autresObservations: '',
    },
    examensComplementaires: [],
    notesExamens: '',
    diagnosticPrincipal: '',
    codeCim10: '',
    diagnosticsDifferentiels: '',
    conduiteATenir: '',
    prochainRendezVous: '',
    traitement: [],
    montantConsultation: 5000,
    statutPaiement: 'Réglé',
    statut: 'En cours',
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };
}

function createEmptyOrdonnance(existingCount: number): OrdonnanceRecord {
  const now = new Date();
  return {
    id: `ord-${Date.now()}`,
    numeroOrdonnance: generateReferenceCode('ORD', existingCount),
    numeroDossier: '',
    dateOrdonnance: now.toISOString().slice(0, 10),
    medecin: MEDECINS_CSPLZ[0].nom,
    qualificationMedecin: MEDECINS_CSPLZ[0].qualification,
    patient: {
      nomComplet: '',
      age: '',
      sexe: 'F',
      poids: '',
      telephone: '',
      adresse: '',
    },
    diagnosticIndication: '',
    lignes: [],
    recommandations: '',
    validiteJours: 30,
    createdAt: now.toISOString(),
  };
}

function getInitialTab(): ActiveTab {
  if (typeof window === 'undefined') return 'consultation';
  const param = new URLSearchParams(window.location.search).get('tab');
  const valid: ActiveTab[] = [
    'consultation',
    'rendez-vous',
    'ordonnancier',
    'catalogue',
    'registre',
  ];
  return valid.includes(param as ActiveTab)
    ? (param as ActiveTab)
    : 'consultation';
}

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>(getInitialTab);

  const [consultations, setConsultations] = useState<ConsultationRecord[]>(() =>
    loadFromStorage(STORAGE_KEYS.consultations, INITIAL_CONSULTATIONS),
  );
  const [ordonnances, setOrdonnances] = useState<OrdonnanceRecord[]>(() =>
    loadFromStorage(STORAGE_KEYS.ordonnances, INITIAL_ORDONNANCES),
  );
  const [catalog, setCatalog] = useState<MedicationCatalogItem[]>(() =>
    loadFromStorage(STORAGE_KEYS.catalog, INITIAL_CATALOG),
  );
  const [practitioners, setPractitioners] = useState<Practitioner[]>(() =>
    loadFromStorage(STORAGE_KEYS.practitioners, INITIAL_PRACTITIONERS),
  );
  const [appointments, setAppointments] = useState<AppointmentRecord[]>(() =>
    loadFromStorage(STORAGE_KEYS.appointments, INITIAL_APPOINTMENTS),
  );
  const [isPractitionerModalOpen, setIsPractitionerModalOpen] = useState(false);

  const [consultationDraft, setConsultationDraft] = useState<ConsultationRecord>(() =>
    createEmptyConsultation(
      loadFromStorage<ConsultationRecord[]>(
        STORAGE_KEYS.consultations,
        INITIAL_CONSULTATIONS,
      ).length,
    ),
  );

  const [ordonnanceDraft, setOrdonnanceDraft] = useState<OrdonnanceRecord>(
    () =>
      loadFromStorage<OrdonnanceRecord[]>(
        STORAGE_KEYS.ordonnances,
        INITIAL_ORDONNANCES,
      )[0] || createEmptyOrdonnance(0),
  );

  const [transferredBanner, setTransferredBanner] = useState<string | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEYS.consultations,
        JSON.stringify(consultations),
      );
    } catch {
      // Ignore storage quota errors
    }
  }, [consultations]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.ordonnances, JSON.stringify(ordonnances));
    } catch {
      // Ignore storage quota errors
    }
  }, [ordonnances]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.catalog, JSON.stringify(catalog));
    } catch {
      // Ignore storage quota errors
    }
  }, [catalog]);

  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEYS.practitioners,
        JSON.stringify(practitioners),
      );
    } catch {
      // Ignore storage quota errors
    }
  }, [practitioners]);

  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEYS.appointments,
        JSON.stringify(appointments),
      );
    } catch {
      // Ignore storage quota errors
    }
  }, [appointments]);

  const handleSaveConsultation = (record: ConsultationRecord) => {
    setConsultationDraft(record);
    setConsultations((prev) => {
      const exists = prev.some((c) => c.id === record.id);
      if (exists) {
        return prev.map((c) => (c.id === record.id ? record : c));
      }
      return [record, ...prev];
    });
  };

  const handleDeleteConsultation = (id: string) => {
    setConsultations((prev) => prev.filter((c) => c.id !== id));
  };

  const handleNewConsultation = () => {
    setConsultationDraft(createEmptyConsultation(consultations.length));
    setActiveTab('consultation');
  };

  const handleTransferToOrdonnancier = (record: ConsultationRecord) => {
    const updatedConsultation: ConsultationRecord = {
      ...record,
      statut: 'Transférée à l’ordonnancier',
      updatedAt: new Date().toISOString(),
    };
    handleSaveConsultation(updatedConsultation);

    const existingOrd = ordonnances.find(
      (o) => o.consultationId === updatedConsultation.id,
    );

    const nextOrd: OrdonnanceRecord = {
      id: existingOrd ? existingOrd.id : `ord-${Date.now()}`,
      numeroOrdonnance: existingOrd
        ? existingOrd.numeroOrdonnance
        : generateReferenceCode('ORD', ordonnances.length),
      consultationId: updatedConsultation.id,
      numeroDossier: updatedConsultation.patient.numeroDossier,
      dateOrdonnance: updatedConsultation.dateConsultation,
      medecin: updatedConsultation.medecin,
      qualificationMedecin: updatedConsultation.qualificationMedecin,
      patient: {
        nomComplet: updatedConsultation.patient.nomComplet,
        age: updatedConsultation.patient.age,
        sexe: updatedConsultation.patient.sexe,
        poids: updatedConsultation.constantes.poids
          ? `${updatedConsultation.constantes.poids} kg`
          : '',
        telephone: updatedConsultation.patient.telephone,
        adresse: updatedConsultation.patient.adresse,
      },
      diagnosticIndication: updatedConsultation.diagnosticPrincipal
        ? `${updatedConsultation.diagnosticPrincipal}${updatedConsultation.codeCim10 ? ` (${updatedConsultation.codeCim10})` : ''}`
        : '',
      lignes: updatedConsultation.traitement.map((t) => ({...t})),
      recommandations: updatedConsultation.conduiteATenir,
      validiteJours: 30,
      createdAt: existingOrd ? existingOrd.createdAt : new Date().toISOString(),
    };

    setOrdonnances((prev) => {
      const exists = prev.some((o) => o.id === nextOrd.id);
      if (exists) {
        return prev.map((o) => (o.id === nextOrd.id ? nextOrd : o));
      }
      return [nextOrd, ...prev];
    });
    setOrdonnanceDraft(nextOrd);
    setTransferredBanner(
      `Dossier de ${updatedConsultation.patient.nomComplet} transféré vers l’ordonnance ${nextOrd.numeroOrdonnance} (${nextOrd.lignes.length} produit${nextOrd.lignes.length > 1 ? 's' : ''}).`,
    );
    setActiveTab('ordonnancier');
  };

  const handleSaveOrdonnance = (record: OrdonnanceRecord) => {
    setOrdonnanceDraft(record);
    setOrdonnances((prev) => {
      const exists = prev.some((o) => o.id === record.id);
      if (exists) {
        return prev.map((o) => (o.id === record.id ? record : o));
      }
      return [record, ...prev];
    });
  };

  const handleDeleteOrdonnance = (id: string) => {
    setOrdonnances((prev) => prev.filter((o) => o.id !== id));
  };

  const handleSaveCatalogItem = (item: MedicationCatalogItem) => {
    setCatalog((prev) => {
      const exists = prev.some((c) => c.id === item.id);
      if (exists) {
        return prev.map((c) => (c.id === item.id ? item : c));
      }
      return [item, ...prev];
    });
  };

  const handleDeleteCatalogItem = (id: string) => {
    setCatalog((prev) => prev.filter((c) => c.id !== id));
  };

  const handleToggleCatalogDisponibility = (id: string) => {
    setCatalog((prev) =>
      prev.map((c) => (c.id === id ? {...c, disponible: !c.disponible} : c)),
    );
  };

  const handleUpdatePaymentStatus = (
    consultationId: string,
    status: PaymentStatus,
  ) => {
    setConsultations((prev) =>
      prev.map((c) =>
        c.id === consultationId ? {...c, statutPaiement: status} : c,
      ),
    );
    if (consultationDraft.id === consultationId) {
      setConsultationDraft((prev) => ({...prev, statutPaiement: status}));
    }
  };

  const handleSaveAppointment = (record: AppointmentRecord) => {
    setAppointments((prev) => {
      const exists = prev.some((a) => a.id === record.id);
      if (exists) {
        return prev.map((a) => (a.id === record.id ? record : a));
      }
      return [record, ...prev];
    });
  };

  const handleSavePractitioner = (newPrac: Practitioner) => {
    setPractitioners((prev) => [...prev, newPrac]);
    if (activeTab === 'consultation') {
      setConsultationDraft((prev) => ({
        ...prev,
        medecin: newPrac.nom,
        qualificationMedecin: newPrac.qualification,
        service: newPrac.service,
      }));
    } else if (activeTab === 'ordonnancier') {
      setOrdonnanceDraft((prev) => ({
        ...prev,
        medecin: newPrac.nom,
        qualificationMedecin: newPrac.qualification,
      }));
    }
  };

  const handleStartConsultationFromAppointment = (rdv: AppointmentRecord) => {
    const base = createEmptyConsultation(consultations.length);
    const matchingExisting = consultations.find(
      (c) =>
        (rdv.patientDossier && c.patient.numeroDossier === rdv.patientDossier) ||
        c.patient.nomComplet.toLowerCase() === rdv.patientNom.toLowerCase(),
    );

    const populated: ConsultationRecord = {
      ...base,
      dateConsultation: rdv.date,
      heureConsultation: rdv.heure,
      medecin: rdv.practitionerNom,
      qualificationMedecin: rdv.practitionerQualification,
      service: rdv.service,
      motif: rdv.motif,
      patient: matchingExisting
        ? {...matchingExisting.patient}
        : {
            ...base.patient,
            numeroDossier: rdv.patientDossier || base.patient.numeroDossier,
            nomComplet: rdv.patientNom,
            telephone: rdv.patientTelephone,
          },
    };
    setConsultationDraft(populated);
    setActiveTab('consultation');
  };

  const navItems: {
    id: ActiveTab;
    label: string;
    shortLabel: string;
    icon: React.ComponentType<{className?: string}>;
  }[] = [
    {id: 'consultation', label: 'Consultation', shortLabel: 'Consult.', icon: Stethoscope},
    {id: 'rendez-vous', label: 'Rendez-vous', shortLabel: 'RDV', icon: Calendar},
    {id: 'ordonnancier', label: 'Ordonnancier', shortLabel: 'Ordonn.', icon: FileText},
    {id: 'catalogue', label: 'Catalogue', shortLabel: 'Produits', icon: Pill},
    {id: 'registre', label: 'Registre', shortLabel: 'Registre', icon: ClipboardList},
  ];

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      {/* Clean 3-Zone Top Bar */}
      <header className="no-print sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-[1360px] mx-auto px-4 sm:px-6 h-14 md:h-16 flex items-center justify-between gap-4 md:gap-8">
          {/* Zone 1: Single-line Brand Wordmark */}
          <button
            type="button"
            onClick={() => setActiveTab('consultation')}
            className="flex items-center gap-2.5 text-left whitespace-nowrap shrink-0 cursor-pointer"
          >
            <CsplzLogo size={32} />
            <span className="font-display text-sm sm:text-base font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0">
              CSPLZ · Portail Clinique
            </span>
          </button>

          {/* Zone 2: 5 Single-line Navigation Tabs (Desktop) */}
          <nav
            aria-label="Navigation principale CSPLZ"
            className="hidden md:flex items-center gap-7"
          >
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={`py-5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    isActive
                      ? 'border-teal-700 text-teal-800 font-semibold'
                      : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Zone 3: 1 Primary Action Button */}
          <div className="shrink-0">
            <button
              type="button"
              onClick={handleNewConsultation}
              className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 text-xs font-semibold text-white bg-teal-700 rounded-lg hover:bg-teal-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Nouvelle Consultation</span>
              <span className="sm:hidden">Nouveau</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="flex-1 max-w-[1360px] w-full mx-auto px-4 sm:px-6 pt-4 pb-24 md:py-6 print:p-0 print:max-w-none">
        {/* Mobile & Play Store Install Strip */}
        <div className="no-print mb-4 bg-white border border-slate-200 rounded-lg px-4 py-2.5 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-slate-600">
            <span className="font-semibold text-slate-900">Application Mobile CSPLZ :</span>{' '}
            installez sur smartphone Android/iOS ou préparez le package Play Store.
          </div>
          <PWAInstallButton />
        </div>
        {activeTab === 'consultation' && (
          <ConsultationWorkspace
            draft={consultationDraft}
            onChangeDraft={setConsultationDraft}
            consultations={consultations}
            catalog={catalog}
            practitioners={practitioners}
            onOpenAddPractitioner={() => setIsPractitionerModalOpen(true)}
            onSaveConsultation={handleSaveConsultation}
            onDeleteConsultation={handleDeleteConsultation}
            onLoadConsultation={(record) => setConsultationDraft(record)}
            onNewConsultation={handleNewConsultation}
            onTransferToOrdonnancier={handleTransferToOrdonnancier}
          />
        )}

        {activeTab === 'rendez-vous' && (
          <RendezVousWorkspace
            appointments={appointments}
            practitioners={practitioners}
            consultations={consultations}
            onSaveAppointment={handleSaveAppointment}
            onOpenAddPractitioner={() => setIsPractitionerModalOpen(true)}
            onStartConsultationFromAppointment={handleStartConsultationFromAppointment}
          />
        )}

        {activeTab === 'ordonnancier' && (
          <OrdonnancierWorkspace
            draft={ordonnanceDraft}
            onChangeDraft={setOrdonnanceDraft}
            ordonnances={ordonnances}
            catalog={catalog}
            practitioners={practitioners}
            onOpenAddPractitioner={() => setIsPractitionerModalOpen(true)}
            onSaveOrdonnance={handleSaveOrdonnance}
            onDeleteOrdonnance={handleDeleteOrdonnance}
            onNewOrdonnance={() =>
              setOrdonnanceDraft(createEmptyOrdonnance(ordonnances.length))
            }
            transferredBanner={transferredBanner}
            onDismissBanner={() => setTransferredBanner(null)}
          />
        )}

        {activeTab === 'catalogue' && (
          <CatalogueWorkspace
            catalog={catalog}
            onSaveItem={handleSaveCatalogItem}
            onDeleteItem={handleDeleteCatalogItem}
            onToggleDisponible={handleToggleCatalogDisponibility}
          />
        )}

        {activeTab === 'registre' && (
          <RegistreWorkspace
            consultations={consultations}
            ordonnances={ordonnances}
            onUpdatePaymentStatus={handleUpdatePaymentStatus}
            onOpenConsultation={(record) => {
              setConsultationDraft(record);
              setActiveTab('consultation');
            }}
            onOpenOrdonnance={(ord) => {
              setOrdonnanceDraft(ord);
              setActiveTab('ordonnancier');
            }}
          />
        )}
      </main>

      <PractitionerModal
        isOpen={isPractitionerModalOpen}
        onClose={() => setIsPractitionerModalOpen(false)}
        onSave={handleSavePractitioner}
      />

      <OfflineIndicator />

      {/* Mobile Bottom Tab Bar (Thumb-Zone Ergonomics) */}
      <nav
        aria-label="Navigation mobile CSPLZ"
        className="no-print md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 pb-safe"
      >
        <div className="grid grid-cols-5 items-center h-14">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`min-h-[44px] flex flex-col items-center justify-center gap-0.5 px-1 transition-colors cursor-pointer ${
                  isActive ? 'text-teal-700 font-semibold' : 'text-slate-500'
                }`}
              >
                <Icon className="w-[18px] h-[18px]" />
                <span className="text-[10px] tracking-tight truncate max-w-full">
                  {item.shortLabel}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Quiet Institutional Footer */}
      <footer className="no-print hidden md:block border-t border-slate-200 bg-white mt-auto">
        <div className="max-w-[1360px] mx-auto px-4 sm:px-6 py-4 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
          <span>
            Centre de Santé Privé Laïc Zouabi (CSPLZ) · Espace Clinique Synchronisé
          </span>
          <span className="tabular-nums">
            Données archivées localement sur ce poste · {consultations.length} dossiers ·{' '}
            {appointments.length} rendez-vous · {ordonnances.length} ordonnances ·{' '}
            {catalog.length} produits
          </span>
        </div>
      </footer>
    </div>
  );
}
