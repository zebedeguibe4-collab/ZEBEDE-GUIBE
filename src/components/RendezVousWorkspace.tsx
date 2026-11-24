import React, {useMemo, useState} from 'react';
import {
  Calendar,
  Clock,
  Mail,
  MessageSquare,
  UserPlus,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Copy,
  Edit3,
  XCircle,
  Stethoscope,
  Search,
  Send,
  X,
} from 'lucide-react';
import {
  AppointmentRecord,
  AppointmentStatus,
  ConfirmationChannel,
  ConfirmationLog,
  ConsultationRecord,
  Practitioner,
} from '../types/clinical';
import {generateReferenceCode} from '../utils/clinicalCalculations';

interface RendezVousWorkspaceProps {
  appointments: AppointmentRecord[];
  practitioners: Practitioner[];
  consultations: ConsultationRecord[];
  onSaveAppointment: (record: AppointmentRecord) => void;
  onOpenAddPractitioner: () => void;
  onStartConsultationFromAppointment: (record: AppointmentRecord) => void;
}

type RdvSubView = 'patient' | 'calendrier';
type CalendarMode = 'semaine' | 'mois' | 'liste';

function toIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function parseIsoDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

function addDays(iso: string, days: number): string {
  const dt = parseIsoDate(iso);
  dt.setDate(dt.getDate() + days);
  return toIsoDate(dt);
}

function getMondayOfWeek(iso: string): string {
  const dt = parseIsoDate(iso);
  const day = dt.getDay(); // 0=Sun..6=Sat
  const diff = day === 0 ? -6 : 1 - day;
  dt.setDate(dt.getDate() + diff);
  return toIsoDate(dt);
}

function formatFrenchDateShort(iso: string): {dayName: string; dayNum: string; month: string} {
  const dt = parseIsoDate(iso);
  const days = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
  const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
  return {
    dayName: days[dt.getDay()],
    dayNum: String(dt.getDate()).padStart(2, '0'),
    month: months[dt.getMonth()],
  };
}

function generateTimeSlots(practitioner: Practitioner): string[] {
  const [sh, sm] = practitioner.heureDebut.split(':').map(Number);
  const [eh, em] = practitioner.heureFin.split(':').map(Number);
  if (isNaN(sh) || isNaN(sm) || isNaN(eh) || isNaN(em)) return [];

  const startMin = sh * 60 + sm;
  const endMin = eh * 60 + em;
  const step = Math.max(15, practitioner.dureeCreneauMin || 30);

  const slots: string[] = [];
  for (let m = startMin; m < endMin; m += step) {
    const hh = String(Math.floor(m / 60)).padStart(2, '0');
    const mm = String(m % 60).padStart(2, '0');
    slots.push(`${hh}:${mm}`);
  }
  return slots;
}

function buildConfirmationMessage(
  rdv: Pick<
    AppointmentRecord,
    'numeroRdv' | 'patientNom' | 'practitionerNom' | 'service' | 'date' | 'heure'
  >,
  type: 'Confirmation' | 'Modification' | 'Annulation',
): string {
  if (type === 'Annulation') {
    return `CSPLZ Zouabi : Bonjour ${rdv.patientNom}, votre rendez-vous ${rdv.numeroRdv} avec ${rdv.practitionerNom} prévu le ${rdv.date} à ${rdv.heure} a été annulé. Contactez le secrétariat pour replanifier.`;
  }
  if (type === 'Modification') {
    return `CSPLZ Zouabi : Bonjour ${rdv.patientNom}, votre rendez-vous ${rdv.numeroRdv} (${rdv.service}) a été mis à jour : ${rdv.date} à ${rdv.heure} avec ${rdv.practitionerNom}.`;
  }
  return `CSPLZ Zouabi : Bonjour ${rdv.patientNom}, votre rendez-vous ${rdv.numeroRdv} (${rdv.service}) avec ${rdv.practitionerNom} est confirmé le ${rdv.date} à ${rdv.heure}. Merci de vous présenter 10 min avant l’heure.`;
}

export const RendezVousWorkspace: React.FC<RendezVousWorkspaceProps> = ({
  appointments,
  practitioners,
  consultations,
  onSaveAppointment,
  onOpenAddPractitioner,
  onStartConsultationFromAppointment,
}) => {
  const todayIso = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [subView, setSubView] = useState<RdvSubView>('patient');

  // Patient Booking State
  const [selectedPractitionerId, setSelectedPractitionerId] = useState<string>(
    practitioners[0]?.id || '',
  );
  const [selectedDate, setSelectedDate] = useState<string>(todayIso);
  const [selectedSlot, setSelectedSlot] = useState<string>('');
  const [patientNom, setPatientNom] = useState('');
  const [patientDossier, setPatientDossier] = useState('');
  const [patientTelephone, setPatientTelephone] = useState('');
  const [patientEmail, setPatientEmail] = useState('');
  const [motif, setMotif] = useState('');
  const [canalConfirmation, setCanalConfirmation] =
    useState<ConfirmationChannel>('Email & SMS');
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [lastBookedRdv, setLastBookedRdv] = useState<AppointmentRecord | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Admin Calendar State
  const [calendarMode, setCalendarMode] = useState<CalendarMode>('semaine');
  const [calendarFocusDate, setCalendarFocusDate] = useState<string>(todayIso);
  const [filterPractitionerId, setFilterPractitionerId] = useState<string>('Tous');
  const [filterStatus, setFilterStatus] = useState<string>('Tous');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingRdv, setEditingRdv] = useState<AppointmentRecord | null>(null);
  const [adminToast, setAdminToast] = useState<string | null>(null);

  const selectedPractitioner = useMemo(
    () =>
      practitioners.find((p) => p.id === selectedPractitionerId) ||
      practitioners[0],
    [practitioners, selectedPractitionerId],
  );

  // Existing patients quick-fill list from consultations
  const knownPatients = useMemo(() => {
    const map = new Map<
      string,
      {nom: string; dossier: string; telephone: string}
    >();
    consultations.forEach((c) => {
      if (c.patient.nomComplet) {
        map.set(c.patient.numeroDossier || c.patient.nomComplet, {
          nom: c.patient.nomComplet,
          dossier: c.patient.numeroDossier,
          telephone: c.patient.telephone,
        });
      }
    });
    return Array.from(map.values());
  }, [consultations]);

  const dateStrip = useMemo(() => {
    return Array.from({length: 7}, (_, idx) => addDays(todayIso, idx));
  }, [todayIso]);

  const getBookedSlotsFor = (
    practitionerId: string,
    dateIso: string,
    excludeRdvId?: string,
  ): Set<string> => {
    const set = new Set<string>();
    appointments.forEach((a) => {
      if (
        a.practitionerId === practitionerId &&
        a.date === dateIso &&
        a.statut !== 'Annulé' &&
        a.id !== excludeRdvId
      ) {
        set.add(a.heure);
      }
    });
    return set;
  };

  const slotsForSelectedDay = useMemo(() => {
    if (!selectedPractitioner) return [];
    const dayOfWeek = parseIsoDate(selectedDate).getDay();
    if (!selectedPractitioner.joursDisponibles.includes(dayOfWeek)) {
      return [];
    }
    const allSlots = generateTimeSlots(selectedPractitioner);
    const booked = getBookedSlotsFor(selectedPractitioner.id, selectedDate);
    return allSlots.map((time) => ({
      time,
      isBooked: booked.has(time),
    }));
  }, [selectedPractitioner, selectedDate, appointments]);

  const countFreeSlots = (practitioner: Practitioner, dateIso: string): number => {
    const dayOfWeek = parseIsoDate(dateIso).getDay();
    if (!practitioner.joursDisponibles.includes(dayOfWeek)) return 0;
    const all = generateTimeSlots(practitioner);
    const booked = getBookedSlotsFor(practitioner.id, dateIso);
    return all.filter((t) => !booked.has(t)).length;
  };

  const showAdminToast = (msg: string) => {
    setAdminToast(msg);
    window.setTimeout(() => {
      setAdminToast((curr) => (curr === msg ? null : curr));
    }, 3200);
  };

  const handleCopyText = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      window.setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // Clipboard API may be blocked in some contexts
    }
  };

  const buildLogsForChannel = (
    rdv: Pick<
      AppointmentRecord,
      | 'numeroRdv'
      | 'patientNom'
      | 'practitionerNom'
      | 'service'
      | 'date'
      | 'heure'
      | 'patientEmail'
      | 'patientTelephone'
    >,
    channel: ConfirmationChannel,
    type: 'Confirmation' | 'Modification' | 'Annulation',
  ): ConfirmationLog[] => {
    const msg = buildConfirmationMessage(rdv, type);
    const nowIso = new Date().toISOString();
    const logs: ConfirmationLog[] = [];

    if ((channel === 'Email' || channel === 'Email & SMS') && rdv.patientEmail.trim()) {
      logs.push({
        id: `log-email-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
        channel: 'Email',
        recipient: rdv.patientEmail.trim(),
        sentAt: nowIso,
        type,
        message: msg,
      });
    }
    if ((channel === 'SMS' || channel === 'Email & SMS') && rdv.patientTelephone.trim()) {
      logs.push({
        id: `log-sms-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
        channel: 'SMS',
        recipient: rdv.patientTelephone.trim(),
        sentAt: nowIso,
        type,
        message: msg,
      });
    }
    return logs;
  };

  const handleBookAppointment = (e: React.FormEvent) => {
    e.preventDefault();
    setBookingError(null);

    if (!selectedPractitioner) {
      setBookingError('Veuillez sélectionner un consultant.');
      return;
    }
    if (!selectedSlot) {
      setBookingError('Veuillez sélectionner un créneau horaire disponible.');
      return;
    }
    if (!patientNom.trim()) {
      setBookingError('Veuillez renseigner le nom complet du patient.');
      return;
    }
    if (
      (canalConfirmation === 'SMS' || canalConfirmation === 'Email & SMS') &&
      !patientTelephone.trim()
    ) {
      setBookingError('Un numéro de téléphone est requis pour l’envoi de la confirmation par SMS.');
      return;
    }
    if (
      (canalConfirmation === 'Email' || canalConfirmation === 'Email & SMS') &&
      !patientEmail.trim()
    ) {
      setBookingError('Une adresse email est requise pour l’envoi de la confirmation par email.');
      return;
    }

    const booked = getBookedSlotsFor(selectedPractitioner.id, selectedDate);
    if (booked.has(selectedSlot)) {
      setBookingError('Ce créneau vient d’être réservé. Choisissez un autre horaire.');
      return;
    }

    const nowIso = new Date().toISOString();
    const numeroRdv = generateReferenceCode('RDV', appointments.length);
    const baseData = {
      numeroRdv,
      patientNom: patientNom.trim(),
      practitionerNom: selectedPractitioner.nom,
      service: selectedPractitioner.service,
      date: selectedDate,
      heure: selectedSlot,
      patientEmail: patientEmail.trim(),
      patientTelephone: patientTelephone.trim(),
    };
    const logs = buildLogsForChannel(baseData, canalConfirmation, 'Confirmation');

    const newRecord: AppointmentRecord = {
      id: `rdv-${Date.now()}`,
      numeroRdv,
      date: selectedDate,
      heure: selectedSlot,
      dureeMin: selectedPractitioner.dureeCreneauMin,
      practitionerId: selectedPractitioner.id,
      practitionerNom: selectedPractitioner.nom,
      practitionerQualification: selectedPractitioner.qualification,
      service: selectedPractitioner.service,
      patientNom: patientNom.trim(),
      patientDossier: patientDossier.trim(),
      patientTelephone: patientTelephone.trim(),
      patientEmail: patientEmail.trim(),
      motif: motif.trim() || 'Consultation médicale',
      statut: 'Confirmé',
      canalConfirmation,
      confirmations: logs,
      notes: '',
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    onSaveAppointment(newRecord);
    setLastBookedRdv(newRecord);
    setSelectedSlot('');
    setPatientNom('');
    setPatientDossier('');
    setPatientTelephone('');
    setPatientEmail('');
    setMotif('');
  };

  // Calendar computations
  const weekDays = useMemo(() => {
    const monday = getMondayOfWeek(calendarFocusDate);
    return Array.from({length: 7}, (_, i) => addDays(monday, i));
  }, [calendarFocusDate]);

  const monthCells = useMemo(() => {
    const focus = parseIsoDate(calendarFocusDate);
    const year = focus.getFullYear();
    const month = focus.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startOffset = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;
    const totalDays = lastDay.getDate();

    const cells: {iso: string; inMonth: boolean}[] = [];
    for (let i = startOffset; i > 0; i--) {
      const dt = new Date(year, month, 1 - i);
      cells.push({iso: toIsoDate(dt), inMonth: false});
    }
    for (let d = 1; d <= totalDays; d++) {
      cells.push({iso: toIsoDate(new Date(year, month, d)), inMonth: true});
    }
    while (cells.length % 7 !== 0) {
      const nextIdx = cells.length - startOffset - totalDays + 1;
      cells.push({iso: toIsoDate(new Date(year, month + 1, nextIdx)), inMonth: false});
    }
    return cells;
  }, [calendarFocusDate]);

  const filteredAppointments = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return appointments
      .filter((a) => {
        const matchPrac =
          filterPractitionerId === 'Tous' || a.practitionerId === filterPractitionerId;
        const matchStatus = filterStatus === 'Tous' || a.statut === filterStatus;
        const matchSearch =
          !q ||
          a.patientNom.toLowerCase().includes(q) ||
          a.numeroRdv.toLowerCase().includes(q) ||
          a.practitionerNom.toLowerCase().includes(q) ||
          a.motif.toLowerCase().includes(q);
        return matchPrac && matchStatus && matchSearch;
      })
      .sort((a, b) => `${a.date} ${a.heure}`.localeCompare(`${b.date} ${b.heure}`));
  }, [appointments, filterPractitionerId, filterStatus, searchQuery]);

  const handleDispatchConfirmation = (
    rdv: AppointmentRecord,
    channel: 'Email' | 'SMS',
    type: 'Confirmation' | 'Modification' | 'Annulation',
  ) => {
    const recipient =
      channel === 'Email' ? rdv.patientEmail.trim() : rdv.patientTelephone.trim();
    if (!recipient) {
      showAdminToast(
        channel === 'Email'
          ? 'Aucune adresse email renseignée pour ce patient.'
          : 'Aucun numéro de téléphone renseigné pour ce patient.',
      );
      return;
    }
    const log: ConfirmationLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      channel,
      recipient,
      sentAt: new Date().toISOString(),
      type,
      message: buildConfirmationMessage(rdv, type),
    };
    const updated: AppointmentRecord = {
      ...rdv,
      confirmations: [log, ...rdv.confirmations],
      updatedAt: new Date().toISOString(),
    };
    onSaveAppointment(updated);
    if (editingRdv?.id === rdv.id) {
      setEditingRdv(updated);
    }
    showAdminToast(`${type} envoyée par ${channel} à ${recipient}.`);
  };

  const handleSaveEditedRdv = (notifyChannel?: ConfirmationChannel) => {
    if (!editingRdv) return;
    const prac = practitioners.find((p) => p.id === editingRdv.practitionerId);
    const updatedBase: AppointmentRecord = {
      ...editingRdv,
      practitionerNom: prac ? prac.nom : editingRdv.practitionerNom,
      practitionerQualification: prac
        ? prac.qualification
        : editingRdv.practitionerQualification,
      service: prac ? prac.service : editingRdv.service,
      updatedAt: new Date().toISOString(),
    };

    if (updatedBase.statut !== 'Annulé') {
      const conflict = appointments.some(
        (a) =>
          a.id !== updatedBase.id &&
          a.practitionerId === updatedBase.practitionerId &&
          a.date === updatedBase.date &&
          a.heure === updatedBase.heure &&
          a.statut !== 'Annulé',
      );
      if (conflict) {
        showAdminToast(
          `Conflit d’horaire : ${updatedBase.practitionerNom} a déjà un RDV le ${updatedBase.date} à ${updatedBase.heure}.`,
        );
        return;
      }
    }

    let finalRecord = updatedBase;
    if (notifyChannel) {
      const notifType =
        updatedBase.statut === 'Annulé' ? 'Annulation' : 'Modification';
      const newLogs = buildLogsForChannel(updatedBase, notifyChannel, notifType);
      finalRecord = {
        ...updatedBase,
        confirmations: [...newLogs, ...updatedBase.confirmations],
      };
    }

    onSaveAppointment(finalRecord);
    setEditingRdv(finalRecord);
    showAdminToast(
      notifyChannel
        ? `Rendez-vous ${finalRecord.numeroRdv} mis à jour et notification préparée (${notifyChannel}).`
        : `Rendez-vous ${finalRecord.numeroRdv} mis à jour.`,
    );
  };

  const handleCancelRdv = (rdv: AppointmentRecord) => {
    const cancelled: AppointmentRecord = {
      ...rdv,
      statut: 'Annulé',
      updatedAt: new Date().toISOString(),
    };
    const logs = buildLogsForChannel(cancelled, cancelled.canalConfirmation, 'Annulation');
    const finalRdv = {
      ...cancelled,
      confirmations: [...logs, ...cancelled.confirmations],
    };
    onSaveAppointment(finalRdv);
    setEditingRdv(finalRdv);
    showAdminToast(`Rendez-vous ${finalRdv.numeroRdv} annulé.`);
  };

  const statusTextStyle = (statut: AppointmentStatus) => {
    switch (statut) {
      case 'Confirmé':
        return 'text-emerald-800 bg-emerald-50 border-emerald-200';
      case 'En attente':
        return 'text-amber-800 bg-amber-50 border-amber-200';
      case 'Honoré':
        return 'text-teal-800 bg-teal-50 border-teal-200';
      case 'Annulé':
        return 'text-red-800 bg-red-50 border-red-200';
    }
  };

  const calendarMonthLabel = useMemo(() => {
    const dt = parseIsoDate(calendarFocusDate);
    const months = [
      'Janvier',
      'Février',
      'Mars',
      'Avril',
      'Mai',
      'Juin',
      'Juillet',
      'Août',
      'Septembre',
      'Octobre',
      'Novembre',
      'Décembre',
    ];
    return `${months[dt.getMonth()]} ${dt.getFullYear()}`;
  }, [calendarFocusDate]);

  return (
    <div className="space-y-5">
      {/* Top Toolbar */}
      <div className="bg-white border border-slate-200 rounded-lg px-4 py-3 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
          <button
            type="button"
            onClick={() => setSubView('patient')}
            className={`inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              subView === 'patient'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            Prise de RDV & Disponibilités
          </button>
          <button
            type="button"
            onClick={() => setSubView('calendrier')}
            className={`inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              subView === 'calendrier'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            Calendrier & Gestion ({appointments.length})
          </button>
        </div>

        <button
          type="button"
          onClick={onOpenAddPractitioner}
          className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg border border-teal-700 text-teal-800 bg-teal-50/70 hover:bg-teal-100 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <UserPlus className="w-3.5 h-3.5" />
          Ajouter un autre consultant / prescripteur
        </button>
      </div>

      {/* SUBVIEW 1: PATIENT BOOKING & DOCTOR AVAILABILITY */}
      {subView === 'patient' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left 7 cols: Practitioner Selection + Date Strip + Live Time Slots */}
          <div className="lg:col-span-7 space-y-5">
            {/* Step 1: Select Practitioner */}
            <section className="bg-white border border-slate-200 rounded-lg p-5">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 mb-4 border-b border-slate-200">
                <div>
                  <h2 className="font-display text-base font-bold text-slate-900">
                    01. Choisir un Consultant ou Prescripteur
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Consultez les horaires et le nombre de créneaux libres par praticien.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onOpenAddPractitioner}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal-700 hover:text-teal-900 cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  Autre consultant...
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {practitioners.map((prac) => {
                  const isSelected = selectedPractitioner?.id === prac.id;
                  const freeCount = countFreeSlots(prac, selectedDate);
                  return (
                    <button
                      key={prac.id}
                      type="button"
                      onClick={() => {
                        setSelectedPractitionerId(prac.id);
                        setSelectedSlot('');
                      }}
                      className={`text-left p-3.5 rounded-lg border transition-colors cursor-pointer ${
                        isSelected
                          ? 'border-teal-700 bg-teal-50/60'
                          : 'border-slate-200 bg-white hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="font-display font-bold text-sm text-slate-900">
                          {prac.nom}
                        </div>
                        <span
                          className={`text-[11px] font-mono font-semibold tabular-nums shrink-0 ${
                            freeCount > 0 ? 'text-emerald-700' : 'text-slate-400'
                          }`}
                        >
                          {freeCount} libre{freeCount > 1 ? 's' : ''}
                        </span>
                      </div>
                      <div className="text-xs text-slate-600 mt-0.5">
                        {prac.qualification}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-1.5 font-mono tabular-nums">
                        {prac.service} · {prac.heureDebut}–{prac.heureFin}
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* Step 2: Select Date & Time Slot */}
            <section className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200">
                <div>
                  <h2 className="font-display text-base font-bold text-slate-900">
                    02. Disponibilités & Sélection du Créneau
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {selectedPractitioner
                      ? `${selectedPractitioner.nom} · Créneaux de ${selectedPractitioner.dureeCreneauMin} min`
                      : 'Sélectionnez un praticien'}
                  </p>
                </div>
                <input
                  type="date"
                  value={selectedDate}
                  min={todayIso}
                  onChange={(e) => {
                    if (e.target.value) {
                      setSelectedDate(e.target.value);
                      setSelectedSlot('');
                    }
                  }}
                  className="px-3 py-1.5 text-xs font-mono tabular-nums border border-slate-300 rounded-md"
                />
              </div>

              {/* 7-day quick strip */}
              <div className="grid grid-cols-7 gap-2">
                {dateStrip.map((iso) => {
                  const {dayName, dayNum, month} = formatFrenchDateShort(iso);
                  const active = selectedDate === iso;
                  const free = selectedPractitioner
                    ? countFreeSlots(selectedPractitioner, iso)
                    : 0;
                  return (
                    <button
                      key={iso}
                      type="button"
                      onClick={() => {
                        setSelectedDate(iso);
                        setSelectedSlot('');
                      }}
                      className={`py-2 px-1 rounded-lg border text-center transition-colors cursor-pointer ${
                        active
                          ? 'bg-teal-700 border-teal-700 text-white'
                          : 'bg-white border-slate-200 text-slate-800 hover:bg-slate-50'
                      }`}
                    >
                      <div
                        className={`text-[10px] uppercase ${
                          active ? 'text-teal-100' : 'text-slate-500'
                        }`}
                      >
                        {dayName}
                      </div>
                      <div className="font-mono text-sm font-bold tabular-nums mt-0.5">
                        {dayNum}
                      </div>
                      <div
                        className={`text-[10px] ${
                          active ? 'text-teal-100' : 'text-slate-400'
                        }`}
                      >
                        {month} · {free}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Slots Grid */}
              {slotsForSelectedDay.length === 0 ? (
                <div className="py-8 text-center border border-dashed border-slate-200 rounded-lg">
                  <p className="text-sm font-medium text-slate-700">
                    Le consultant n’assure pas de permanence à cette date.
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Sélectionnez un autre jour ou choisissez un autre praticien disponible.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2.5">
                  {slotsForSelectedDay.map(({time, isBooked}) => {
                    const isPicked = selectedSlot === time;
                    return (
                      <button
                        key={time}
                        type="button"
                        disabled={isBooked}
                        onClick={() => setSelectedSlot(time)}
                        className={`py-2.5 px-2 rounded-md border text-center transition-colors ${
                          isBooked
                            ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed line-through'
                            : isPicked
                              ? 'bg-teal-700 border-teal-700 text-white font-semibold cursor-pointer'
                              : 'bg-white border-slate-300 text-slate-800 hover:border-teal-700 hover:bg-teal-50/50 cursor-pointer'
                        }`}
                      >
                        <div className="font-mono text-xs font-semibold tabular-nums">
                          {time}
                        </div>
                        <div
                          className={`text-[10px] mt-0.5 ${
                            isBooked
                              ? 'text-slate-400 no-underline'
                              : isPicked
                                ? 'text-teal-100'
                                : 'text-emerald-700'
                          }`}
                        >
                          {isBooked ? 'Réservé' : 'Libre'}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </section>
          </div>

          {/* Right 5 cols: Booking Form & Confirmation Dispatch */}
          <div className="lg:col-span-5 space-y-5">
            <form
              onSubmit={handleBookAppointment}
              className="bg-white border border-slate-200 rounded-lg p-5 space-y-4"
            >
              <div className="pb-3 border-b border-slate-200">
                <h2 className="font-display text-base font-bold text-slate-900">
                  03. Réserver le Rendez-vous
                </h2>
                <p className="text-xs text-slate-500 mt-0.5 tabular-nums">
                  {selectedSlot
                    ? `Créneau sélectionné : ${selectedDate} à ${selectedSlot} · ${selectedPractitioner?.nom}`
                    : 'Sélectionnez un créneau libre à gauche pour finaliser.'}
                </p>
              </div>

              {bookingError && (
                <div className="px-3 py-2.5 rounded-md border border-red-200 bg-red-50 text-xs font-medium text-red-800">
                  {bookingError}
                </div>
              )}

              {/* Quick pick existing CSPLZ patient */}
              {knownPatients.length > 0 && (
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Patient déjà suivi au CSPLZ (optionnel)
                  </label>
                  <select
                    defaultValue=""
                    onChange={(e) => {
                      const found = knownPatients.find(
                        (p) => (p.dossier || p.nom) === e.target.value,
                      );
                      if (found) {
                        setPatientNom(found.nom);
                        setPatientDossier(found.dossier);
                        setPatientTelephone(found.telephone);
                      }
                    }}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-md bg-slate-50"
                  >
                    <option value="">— Pré-remplir depuis un dossier existant —</option>
                    {knownPatients.map((p) => (
                      <option key={p.dossier || p.nom} value={p.dossier || p.nom}>
                        {p.nom} ({p.dossier})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Nom complet du patient <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    value={patientNom}
                    onChange={(e) => setPatientNom(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
                    placeholder="Ex. : Mballa Esther"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Téléphone (SMS)
                  </label>
                  <input
                    type="tel"
                    value={patientTelephone}
                    onChange={(e) => setPatientTelephone(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono tabular-nums border border-slate-300 rounded-md"
                    placeholder="+237 6XX XX XX XX"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Email (Confirmation)
                  </label>
                  <input
                    type="email"
                    value={patientEmail}
                    onChange={(e) => setPatientEmail(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
                    placeholder="patient@exemple.cm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    N° Dossier (si connu)
                  </label>
                  <input
                    type="text"
                    value={patientDossier}
                    onChange={(e) => setPatientDossier(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono tabular-nums border border-slate-300 rounded-md"
                    placeholder="CSPLZ-2026-..."
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Confirmation souhaitée
                  </label>
                  <select
                    value={canalConfirmation}
                    onChange={(e) =>
                      setCanalConfirmation(e.target.value as ConfirmationChannel)
                    }
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md bg-white"
                  >
                    <option value="Email & SMS">Email & SMS</option>
                    <option value="SMS">SMS uniquement</option>
                    <option value="Email">Email uniquement</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Motif de la consultation
                  </label>
                  <textarea
                    rows={2}
                    value={motif}
                    onChange={(e) => setMotif(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
                    placeholder="Ex. : Bilan annuel, douleur abdominale, renouvellement..."
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-lg bg-teal-700 text-white hover:bg-teal-800 transition-colors cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                Confirmer & Envoyer la Confirmation
              </button>
            </form>

            {/* Instant Confirmation Recap & Dispatch Card */}
            {lastBookedRdv && (
              <section className="bg-white border border-teal-300 rounded-lg p-5 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 text-teal-800 font-display font-bold text-sm">
                    <CheckCircle2 className="w-4 h-4 text-teal-700 shrink-0" />
                    Rendez-vous confirmé · {lastBookedRdv.numeroRdv}
                  </div>
                  <button
                    type="button"
                    onClick={() => setLastBookedRdv(null)}
                    className="text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <p className="text-xs text-slate-700 tabular-nums">
                  <span className="font-semibold">{lastBookedRdv.patientNom}</span> ·{' '}
                  {lastBookedRdv.date} à {lastBookedRdv.heure} avec{' '}
                  <span className="font-semibold">{lastBookedRdv.practitionerNom}</span>
                </p>

                <div className="p-3 rounded-md bg-slate-50 border border-slate-200 text-xs text-slate-700">
                  {buildConfirmationMessage(lastBookedRdv, 'Confirmation')}
                </div>

                <div className="flex flex-wrap gap-2">
                  {lastBookedRdv.patientEmail && (
                    <a
                      href={`mailto:${encodeURIComponent(lastBookedRdv.patientEmail)}?subject=${encodeURIComponent(`Confirmation RDV CSPLZ ${lastBookedRdv.numeroRdv}`)}&body=${encodeURIComponent(buildConfirmationMessage(lastBookedRdv, 'Confirmation'))}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md border border-slate-300 bg-white text-slate-800 hover:bg-slate-50"
                    >
                      <Mail className="w-3.5 h-3.5 text-teal-700" />
                      Ouvrir Email
                    </a>
                  )}
                  {lastBookedRdv.patientTelephone && (
                    <a
                      href={`sms:${lastBookedRdv.patientTelephone}?body=${encodeURIComponent(buildConfirmationMessage(lastBookedRdv, 'Confirmation'))}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md border border-slate-300 bg-white text-slate-800 hover:bg-slate-50"
                    >
                      <MessageSquare className="w-3.5 h-3.5 text-teal-700" />
                      Ouvrir SMS
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={() =>
                      handleCopyText(
                        buildConfirmationMessage(lastBookedRdv, 'Confirmation'),
                        lastBookedRdv.id,
                      )
                    }
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md border border-slate-300 bg-white text-slate-800 hover:bg-slate-50 cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    {copiedId === lastBookedRdv.id ? 'Copié' : 'Copier'}
                  </button>
                </div>

                <div className="text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                  Journal d’envoi :{' '}
                  {lastBookedRdv.confirmations
                    .map((l) => `${l.channel} (${l.recipient})`)
                    .join(' · ') || 'Enregistré'}
                </div>
              </section>
            )}
          </div>
        </div>
      )}

      {/* SUBVIEW 2: ADMIN & DOCTORS CALENDAR MANAGEMENT */}
      {subView === 'calendrier' && (
        <div className="space-y-5">
          {adminToast && (
            <div
              role="status"
              className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-lg border border-teal-200 bg-teal-50 text-teal-900 text-xs font-medium"
            >
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-teal-700 shrink-0" />
                <span>{adminToast}</span>
              </div>
              <button
                type="button"
                onClick={() => setAdminToast(null)}
                className="text-teal-800 font-semibold cursor-pointer"
              >
                Fermer
              </button>
            </div>
          )}

          {/* Calendar Filter & View Controls */}
          <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setCalendarFocusDate(
                      addDays(calendarFocusDate, calendarMode === 'mois' ? -30 : -7),
                    )
                  }
                  className="p-2 border border-slate-300 rounded-md hover:bg-slate-50 cursor-pointer"
                  aria-label="Période précédente"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setCalendarFocusDate(todayIso)}
                  className="px-3 py-1.5 text-xs font-semibold border border-slate-300 rounded-md hover:bg-slate-50 cursor-pointer"
                >
                  Aujourd’hui
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setCalendarFocusDate(
                      addDays(calendarFocusDate, calendarMode === 'mois' ? 30 : 7),
                    )
                  }
                  className="p-2 border border-slate-300 rounded-md hover:bg-slate-50 cursor-pointer"
                  aria-label="Période suivante"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <span className="font-display font-bold text-sm text-slate-900 ml-2">
                  {calendarMonthLabel}
                </span>
              </div>

              <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
                <button
                  type="button"
                  onClick={() => setCalendarMode('semaine')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md cursor-pointer ${
                    calendarMode === 'semaine'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600'
                  }`}
                >
                  Semaine
                </button>
                <button
                  type="button"
                  onClick={() => setCalendarMode('mois')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md cursor-pointer ${
                    calendarMode === 'mois'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600'
                  }`}
                >
                  Mois
                </button>
                <button
                  type="button"
                  onClick={() => setCalendarMode('liste')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md cursor-pointer ${
                    calendarMode === 'liste'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600'
                  }`}
                >
                  Liste
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-md"
                  placeholder="Rechercher patient, N° RDV, motif..."
                />
              </div>
              <select
                value={filterPractitionerId}
                onChange={(e) => setFilterPractitionerId(e.target.value)}
                className="px-3 py-2 text-xs border border-slate-300 rounded-md bg-white"
              >
                <option value="Tous">Tous les consultants / prescripteurs</option>
                {practitioners.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nom} ({p.service})
                  </option>
                ))}
              </select>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 text-xs border border-slate-300 rounded-md bg-white"
              >
                <option value="Tous">Tous les statuts</option>
                <option value="Confirmé">Confirmé</option>
                <option value="En attente">En attente</option>
                <option value="Honoré">Honoré</option>
                <option value="Annulé">Annulé</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            {/* Calendar Viewport */}
            <div className={editingRdv ? 'lg:col-span-8' : 'lg:col-span-12'}>
              {calendarMode === 'semaine' && (
                <div className="bg-white border border-slate-200 rounded-lg overflow-x-auto">
                  <div className="min-w-[820px] grid grid-cols-7 divide-x divide-slate-200">
                    {weekDays.map((iso) => {
                      const {dayName, dayNum, month} = formatFrenchDateShort(iso);
                      const dayRdvs = filteredAppointments.filter((a) => a.date === iso);
                      const isToday = iso === todayIso;
                      return (
                        <div key={iso} className="min-h-[340px] flex flex-col">
                          <div
                            className={`px-2.5 py-2 border-b border-slate-200 text-center ${
                              isToday ? 'bg-teal-50' : 'bg-slate-50'
                            }`}
                          >
                            <div className="text-[11px] font-medium text-slate-500 uppercase">
                              {dayName}
                            </div>
                            <div
                              className={`font-mono text-sm font-bold tabular-nums ${
                                isToday ? 'text-teal-800' : 'text-slate-900'
                              }`}
                            >
                              {dayNum} {month}
                            </div>
                          </div>

                          <div className="p-2 space-y-2 flex-1">
                            {dayRdvs.length === 0 ? (
                              <p className="text-[11px] text-slate-400 text-center pt-6">
                                Aucun RDV
                              </p>
                            ) : (
                              dayRdvs.map((rdv) => (
                                <button
                                  key={rdv.id}
                                  type="button"
                                  onClick={() => setEditingRdv(rdv)}
                                  className={`w-full text-left p-2 rounded-md border transition-colors cursor-pointer ${
                                    editingRdv?.id === rdv.id
                                      ? 'border-teal-700 bg-teal-50'
                                      : 'border-slate-200 bg-white hover:bg-slate-50'
                                  }`}
                                >
                                  <div className="flex items-center justify-between gap-1">
                                    <span className="font-mono text-xs font-bold text-slate-900 tabular-nums">
                                      {rdv.heure}
                                    </span>
                                    <span
                                      className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${statusTextStyle(
                                        rdv.statut,
                                      )}`}
                                    >
                                      {rdv.statut}
                                    </span>
                                  </div>
                                  <div className="text-xs font-semibold text-slate-900 truncate mt-1">
                                    {rdv.patientNom}
                                  </div>
                                  <div className="text-[11px] text-slate-500 truncate">
                                    {rdv.practitionerNom}
                                  </div>
                                </button>
                              ))
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {calendarMode === 'mois' && (
                <div className="bg-white border border-slate-200 rounded-lg overflow-x-auto">
                  <div className="min-w-[760px]">
                    <div className="grid grid-cols-7 bg-slate-50 border-b border-slate-200 text-center text-xs font-semibold text-slate-600">
                      {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map((d) => (
                        <div key={d} className="py-2 border-r last:border-r-0 border-slate-200">
                          {d}
                        </div>
                      ))}
                    </div>
                    <div className="grid grid-cols-7 divide-x divide-y divide-slate-200">
                      {monthCells.map((cell) => {
                        const cellRdvs = filteredAppointments.filter(
                          (a) => a.date === cell.iso,
                        );
                        const dayNum = cell.iso.slice(8, 10);
                        const isToday = cell.iso === todayIso;
                        return (
                          <div
                            key={cell.iso}
                            className={`min-h-[104px] p-1.5 ${
                              cell.inMonth ? 'bg-white' : 'bg-slate-50/70 text-slate-400'
                            }`}
                          >
                            <div
                              className={`text-right font-mono text-xs tabular-nums mb-1 ${
                                isToday ? 'font-bold text-teal-700' : ''
                              }`}
                            >
                              {dayNum}
                            </div>
                            <div className="space-y-1">
                              {cellRdvs.slice(0, 3).map((rdv) => (
                                <button
                                  key={rdv.id}
                                  type="button"
                                  onClick={() => setEditingRdv(rdv)}
                                  className="w-full text-left px-1.5 py-1 rounded border border-slate-200 bg-slate-50 hover:bg-teal-50 text-[10px] truncate cursor-pointer"
                                >
                                  <span className="font-mono font-bold">{rdv.heure}</span>{' '}
                                  {rdv.patientNom}
                                </button>
                              ))}
                              {cellRdvs.length > 3 && (
                                <div className="text-[10px] text-teal-700 font-semibold px-1">
                                  +{cellRdvs.length - 3} autres
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {calendarMode === 'liste' && (
                <div className="bg-white border border-slate-200 rounded-lg overflow-x-auto">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                        <th className="py-2.5 px-3 whitespace-nowrap">Date & Heure</th>
                        <th className="py-2.5 px-3">Patient</th>
                        <th className="py-2.5 px-3">Consultant / Prescripteur</th>
                        <th className="py-2.5 px-3">Motif</th>
                        <th className="py-2.5 px-3">Statut</th>
                        <th className="py-2.5 px-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {filteredAppointments.map((rdv) => (
                        <tr key={rdv.id} className="hover:bg-slate-50/70">
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <div className="font-mono text-xs font-semibold tabular-nums">
                              {rdv.date} · {rdv.heure}
                            </div>
                            <div className="font-mono text-[11px] text-slate-500 tabular-nums">
                              {rdv.numeroRdv}
                            </div>
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="font-semibold text-slate-900">
                              {rdv.patientNom}
                            </div>
                            <div className="text-xs text-slate-500 font-mono tabular-nums">
                              {rdv.patientTelephone || rdv.patientEmail || '—'}
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-xs text-slate-800">
                            <div className="font-medium">{rdv.practitionerNom}</div>
                            <div className="text-slate-500">{rdv.service}</div>
                          </td>
                          <td className="py-2.5 px-3 text-xs text-slate-700 max-w-xs truncate">
                            {rdv.motif}
                          </td>
                          <td className="py-2.5 px-3 text-xs whitespace-nowrap">
                            <span
                              className={`px-2 py-0.5 rounded border font-semibold ${statusTextStyle(
                                rdv.statut,
                              )}`}
                            >
                              {rdv.statut}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => setEditingRdv(rdv)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-teal-800 border border-teal-200 bg-teal-50 rounded hover:bg-teal-100 cursor-pointer"
                            >
                              <Edit3 className="w-3 h-3" />
                              Gérer
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Selected Appointment Editor & Confirmation Panel */}
            {editingRdv && (
              <aside className="lg:col-span-4 bg-white border border-slate-200 rounded-lg p-5 space-y-4">
                <div className="flex items-start justify-between gap-2 pb-3 border-b border-slate-200">
                  <div>
                    <h3 className="font-display text-sm font-bold text-slate-900">
                      Gestion RDV · {editingRdv.numeroRdv}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Consulter, modifier, annuler ou envoyer une confirmation.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditingRdv(null)}
                    className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Patient
                    </label>
                    <input
                      type="text"
                      value={editingRdv.patientNom}
                      onChange={(e) =>
                        setEditingRdv({...editingRdv, patientNom: e.target.value})
                      }
                      className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-md"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        Téléphone
                      </label>
                      <input
                        type="tel"
                        value={editingRdv.patientTelephone}
                        onChange={(e) =>
                          setEditingRdv({
                            ...editingRdv,
                            patientTelephone: e.target.value,
                          })
                        }
                        className="w-full px-2.5 py-1.5 text-xs font-mono border border-slate-300 rounded-md"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        Email
                      </label>
                      <input
                        type="email"
                        value={editingRdv.patientEmail}
                        onChange={(e) =>
                          setEditingRdv({...editingRdv, patientEmail: e.target.value})
                        }
                        className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-md"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Consultant / Prescripteur
                    </label>
                    <select
                      value={editingRdv.practitionerId}
                      onChange={(e) =>
                        setEditingRdv({...editingRdv, practitionerId: e.target.value})
                      }
                      className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-md bg-white"
                    >
                      {practitioners.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.nom} ({p.service})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        Date
                      </label>
                      <input
                        type="date"
                        value={editingRdv.date}
                        onChange={(e) =>
                          setEditingRdv({...editingRdv, date: e.target.value})
                        }
                        className="w-full px-2.5 py-1.5 text-xs font-mono border border-slate-300 rounded-md"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        Heure
                      </label>
                      <input
                        type="time"
                        value={editingRdv.heure}
                        onChange={(e) =>
                          setEditingRdv({...editingRdv, heure: e.target.value})
                        }
                        className="w-full px-2.5 py-1.5 text-xs font-mono border border-slate-300 rounded-md"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Statut du rendez-vous
                    </label>
                    <select
                      value={editingRdv.statut}
                      onChange={(e) =>
                        setEditingRdv({
                          ...editingRdv,
                          statut: e.target.value as AppointmentStatus,
                        })
                      }
                      className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-md bg-white"
                    >
                      <option value="Confirmé">Confirmé</option>
                      <option value="En attente">En attente</option>
                      <option value="Honoré">Honoré</option>
                      <option value="Annulé">Annulé</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Motif & Notes internes
                    </label>
                    <textarea
                      rows={2}
                      value={editingRdv.motif}
                      onChange={(e) =>
                        setEditingRdv({...editingRdv, motif: e.target.value})
                      }
                      className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-md"
                    />
                  </div>
                </div>

                {/* Action buttons */}
                <div className="space-y-2 pt-2 border-t border-slate-200">
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => handleSaveEditedRdv()}
                      className="px-3 py-2 text-xs font-semibold rounded-md bg-teal-700 text-white hover:bg-teal-800 cursor-pointer"
                    >
                      Enregistrer modifs
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        handleSaveEditedRdv(editingRdv.canalConfirmation)
                      }
                      className="inline-flex items-center justify-center gap-1 px-3 py-2 text-xs font-semibold rounded-md border border-teal-700 text-teal-800 bg-teal-50 hover:bg-teal-100 cursor-pointer"
                    >
                      <Send className="w-3 h-3" />
                      Sauver + Notifier
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => onStartConsultationFromAppointment(editingRdv)}
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-md border border-slate-300 bg-white text-slate-800 hover:bg-slate-50 cursor-pointer"
                    >
                      <Stethoscope className="w-3.5 h-3.5 text-teal-700" />
                      Consultation
                    </button>
                    {editingRdv.statut !== 'Annulé' && (
                      <button
                        type="button"
                        onClick={() => handleCancelRdv(editingRdv)}
                        className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-md border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 cursor-pointer"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        Annuler RDV
                      </button>
                    )}
                  </div>
                </div>

                {/* Email & SMS Confirmation Dispatch Controls */}
                <div className="pt-3 border-t border-slate-200 space-y-2">
                  <div className="text-xs font-bold text-slate-800">
                    Envoyer confirmation Email / SMS
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        handleDispatchConfirmation(
                          editingRdv,
                          'Email',
                          editingRdv.statut === 'Annulé'
                            ? 'Annulation'
                            : 'Confirmation',
                        )
                      }
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium border border-slate-300 rounded hover:bg-slate-50 cursor-pointer"
                    >
                      <Mail className="w-3.5 h-3.5 text-teal-700" />
                      Confirmer Email
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        handleDispatchConfirmation(
                          editingRdv,
                          'SMS',
                          editingRdv.statut === 'Annulé'
                            ? 'Annulation'
                            : 'Confirmation',
                        )
                      }
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium border border-slate-300 rounded hover:bg-slate-50 cursor-pointer"
                    >
                      <MessageSquare className="w-3.5 h-3.5 text-teal-700" />
                      Confirmer SMS
                    </button>
                  </div>

                  {editingRdv.confirmations.length > 0 && (
                    <div className="space-y-1.5 pt-1 max-h-36 overflow-y-auto">
                      {editingRdv.confirmations.map((log) => (
                        <div
                          key={log.id}
                          className="p-2 rounded bg-slate-50 border border-slate-200 text-[11px]"
                        >
                          <div className="flex items-center justify-between font-semibold text-slate-700">
                            <span>
                              {log.type} · {log.channel}
                            </span>
                            <span className="font-mono text-slate-500 tabular-nums">
                              {log.sentAt.slice(0, 16).replace('T', ' ')}
                            </span>
                          </div>
                          <div className="text-slate-600 truncate mt-0.5">
                            À : {log.recipient}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </aside>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
