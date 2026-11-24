import React, {useState} from 'react';
import {X, UserPlus} from 'lucide-react';
import {Practitioner} from '../types/clinical';
import {SERVICES_CSPLZ} from '../data/initialData';

interface PractitionerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (practitioner: Practitioner) => void;
}

const WEEK_DAYS = [
  {value: 1, label: 'Lun'},
  {value: 2, label: 'Mar'},
  {value: 3, label: 'Mer'},
  {value: 4, label: 'Jeu'},
  {value: 5, label: 'Ven'},
  {value: 6, label: 'Sam'},
  {value: 0, label: 'Dim'},
];

export const PractitionerModal: React.FC<PractitionerModalProps> = ({
  isOpen,
  onClose,
  onSave,
}) => {
  const [nom, setNom] = useState('');
  const [qualification, setQualification] = useState('Médecin Consultant');
  const [service, setService] = useState(SERVICES_CSPLZ[0]);
  const [customService, setCustomService] = useState('');
  const [telephone, setTelephone] = useState('');
  const [email, setEmail] = useState('');
  const [heureDebut, setHeureDebut] = useState('08:30');
  const [heureFin, setHeureFin] = useState('16:30');
  const [dureeCreneauMin, setDureeCreneauMin] = useState(30);
  const [joursDisponibles, setJoursDisponibles] = useState<number[]>([1, 2, 3, 4, 5]);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const toggleDay = (day: number) => {
    setJoursDisponibles((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day],
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nom.trim()) {
      setError('Veuillez saisir le nom du consultant ou prescripteur.');
      return;
    }
    if (joursDisponibles.length === 0) {
      setError('Sélectionnez au moins un jour de consultation.');
      return;
    }

    const finalService =
      service === '__custom__' ? customService.trim() || 'Consultation Spécialisée' : service;

    const newPractitioner: Practitioner = {
      id: `prac-${Date.now()}`,
      nom: nom.trim(),
      qualification: qualification.trim() || 'Médecin Consultant / Prescripteur',
      service: finalService,
      telephone: telephone.trim() || '+237 6XX XX XX XX',
      email: email.trim(),
      heureDebut,
      heureFin,
      dureeCreneauMin,
      joursDisponibles,
      isCustom: true,
    };

    onSave(newPractitioner);
    setNom('');
    setQualification('Médecin Consultant');
    setTelephone('');
    setEmail('');
    setCustomService('');
    setError(null);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="practitioner-modal-title"
    >
      <div className="bg-white border border-slate-200 rounded-xl w-full max-w-lg shadow-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <div className="flex items-center gap-2.5">
            <UserPlus className="w-4 h-4 text-teal-700" />
            <h2
              id="practitioner-modal-title"
              className="font-display text-base font-bold text-slate-900"
            >
              Ajouter un autre consultant ou prescripteur
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded cursor-pointer"
            aria-label="Fermer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="px-3 py-2 rounded-md border border-red-200 bg-red-50 text-xs font-medium text-red-800">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Nom & Titre du consultant / prescripteur <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                value={nom}
                onChange={(e) => setNom(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-700"
                placeholder="Ex. : Dr. Essomba Paul ou Mme Kouamé (Sage-Femme)"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Qualification / Spécialité
              </label>
              <input
                type="text"
                value={qualification}
                onChange={(e) => setQualification(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-700"
                placeholder="Ex. : Cardiologue, Infirmier Major..."
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Service de rattachement
              </label>
              <select
                value={service}
                onChange={(e) => setService(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md bg-white"
              >
                {SERVICES_CSPLZ.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
                <option value="__custom__">Autre spécialité...</option>
              </select>
            </div>

            {service === '__custom__' && (
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Préciser la spécialité / service
                </label>
                <input
                  type="text"
                  value={customService}
                  onChange={(e) => setCustomService(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
                  placeholder="Ex. : Ophtalmologie, Kinésithérapie, Dermatologie..."
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Téléphone
              </label>
              <input
                type="tel"
                value={telephone}
                onChange={(e) => setTelephone(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono tabular-nums border border-slate-300 rounded-md"
                placeholder="+237 6XX XX XX XX"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Email professionnel
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
                placeholder="consultant@csplz-sante.cm"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Début de plage horaire
              </label>
              <input
                type="time"
                value={heureDebut}
                onChange={(e) => setHeureDebut(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono tabular-nums border border-slate-300 rounded-md"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Fin de plage horaire
              </label>
              <input
                type="time"
                value={heureFin}
                onChange={(e) => setHeureFin(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono tabular-nums border border-slate-300 rounded-md"
              />
            </div>

            <div className="sm:col-span-2">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-slate-700">
                  Jours de consultation
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">Durée créneau :</span>
                  <select
                    value={dureeCreneauMin}
                    onChange={(e) => setDureeCreneauMin(Number(e.target.value))}
                    className="px-2 py-1 text-xs font-mono border border-slate-300 rounded bg-white"
                  >
                    <option value={15}>15 min</option>
                    <option value={20}>20 min</option>
                    <option value={30}>30 min</option>
                    <option value={45}>45 min</option>
                    <option value={60}>60 min</option>
                  </select>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {WEEK_DAYS.map((d) => {
                  const active = joursDisponibles.includes(d.value);
                  return (
                    <button
                      key={d.value}
                      type="button"
                      onClick={() => toggleDay(d.value)}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-md border transition-colors cursor-pointer ${
                        active
                          ? 'bg-teal-700 border-teal-700 text-white'
                          : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {d.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold text-white bg-teal-700 rounded-lg hover:bg-teal-800 cursor-pointer"
            >
              Enregistrer le consultant
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
