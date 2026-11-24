export type ActiveTab =
  | 'consultation'
  | 'rendez-vous'
  | 'ordonnancier'
  | 'catalogue'
  | 'registre';

export type Sex = 'M' | 'F';

export type ConsultationType = 'Première visite' | 'Suivi' | 'Urgence' | 'Contrôle';

export type ConsultationStatus = 'En cours' | 'Validée' | 'Transférée à l’ordonnancier';

export type PaymentStatus = 'Réglé' | 'En attente' | 'Prise en charge';

export type AppointmentStatus = 'Confirmé' | 'En attente' | 'Honoré' | 'Annulé';

export type ConfirmationChannel = 'Email' | 'SMS' | 'Email & SMS';

export interface Practitioner {
  id: string;
  nom: string;
  qualification: string;
  service: string;
  telephone: string;
  email: string;
  heureDebut: string; // e.g. "08:00"
  heureFin: string; // e.g. "17:00"
  dureeCreneauMin: number; // e.g. 30
  joursDisponibles: number[]; // 0=Dimanche .. 6=Samedi
  isCustom?: boolean;
}

export interface ConfirmationLog {
  id: string;
  channel: 'Email' | 'SMS';
  recipient: string;
  sentAt: string;
  type: 'Confirmation' | 'Modification' | 'Annulation';
  message: string;
}

export interface AppointmentRecord {
  id: string;
  numeroRdv: string;
  date: string; // YYYY-MM-DD
  heure: string; // HH:MM
  dureeMin: number;
  practitionerId: string;
  practitionerNom: string;
  practitionerQualification: string;
  service: string;
  patientNom: string;
  patientDossier: string;
  patientTelephone: string;
  patientEmail: string;
  motif: string;
  statut: AppointmentStatus;
  canalConfirmation: ConfirmationChannel;
  confirmations: ConfirmationLog[];
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface PatientInfo {
  numeroDossier: string;
  nomComplet: string;
  dateNaissance: string;
  age: string;
  sexe: Sex;
  telephone: string;
  adresse: string;
  groupeSanguin: string;
  personneContact: string;
}

export interface VitalSigns {
  temperature: string; // °C
  tensionSystolique: string; // mmHg
  tensionDiastolique: string; // mmHg
  pouls: string; // bpm
  frequenceRespiratoire: string; // /min
  spo2: string; // %
  poids: string; // kg
  taille: string; // cm
  glycemie: string; // g/L
}

export interface Antecedents {
  medicaux: string;
  chirurgicaux: string;
  allergies: string;
  traitementsEnCours: string;
}

export interface PhysicalExam {
  etatGeneral: string;
  cardioVasculaire: string;
  pulmonaire: string;
  abdominal: string;
  neuroOrl: string;
  autresObservations: string;
}

export interface PrescribedMedication {
  id: string;
  catalogId?: string;
  medicament: string;
  dci: string;
  forme: string;
  dosage: string;
  posologie: string;
  frequence: string;
  duree: string;
  quantite: string;
  voie: string;
  instructions: string;
}

export interface MedicationCatalogItem {
  id: string;
  code: string;
  nomCommercial: string;
  dci: string;
  forme: string;
  dosage: string;
  categorie: string;
  voieDefaut: string;
  posologieDefaut: string;
  prixUnitaire: number; // FCFA
  stock: number;
  disponible: boolean;
}

export interface ConsultationRecord {
  id: string;
  numeroConsultation: string;
  dateConsultation: string;
  heureConsultation: string;
  medecin: string;
  qualificationMedecin: string;
  service: string;
  typeConsultation: ConsultationType;
  patient: PatientInfo;
  constantes: VitalSigns;
  motif: string;
  histoireMaladie: string;
  antecedents: Antecedents;
  examenPhysique: PhysicalExam;
  examensComplementaires: string[];
  notesExamens: string;
  diagnosticPrincipal: string;
  codeCim10: string;
  diagnosticsDifferentiels: string;
  conduiteATenir: string;
  prochainRendezVous: string;
  traitement: PrescribedMedication[];
  montantConsultation: number;
  statutPaiement: PaymentStatus;
  statut: ConsultationStatus;
  createdAt: string;
  updatedAt: string;
}

export interface OrdonnanceRecord {
  id: string;
  numeroOrdonnance: string;
  consultationId?: string;
  numeroDossier: string;
  dateOrdonnance: string;
  medecin: string;
  qualificationMedecin: string;
  patient: {
    nomComplet: string;
    age: string;
    sexe: Sex;
    poids: string;
    telephone: string;
    adresse: string;
  };
  diagnosticIndication: string;
  lignes: PrescribedMedication[];
  recommandations: string;
  validiteJours: number;
  createdAt: string;
}
