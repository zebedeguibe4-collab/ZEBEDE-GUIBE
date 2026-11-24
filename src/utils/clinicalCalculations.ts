import {VitalSigns} from '../types/clinical';

export interface ImcResult {
  value: number | null;
  formatted: string;
  category: string;
  tone: 'neutral' | 'normal' | 'warning' | 'alert';
}

export function calculateImc(poidsStr: string, tailleStr: string): ImcResult {
  const poids = parseFloat(poidsStr.replace(',', '.'));
  const tailleCm = parseFloat(tailleStr.replace(',', '.'));

  if (!poids || !tailleCm || poids <= 0 || tailleCm <= 0) {
    return {
      value: null,
      formatted: '—',
      category: 'Renseigner poids et taille',
      tone: 'neutral',
    };
  }

  const tailleM = tailleCm > 3 ? tailleCm / 100 : tailleCm;
  if (tailleM <= 0) {
    return {
      value: null,
      formatted: '—',
      category: 'Taille invalide',
      tone: 'neutral',
    };
  }

  const imc = poids / (tailleM * tailleM);
  const rounded = Math.round(imc * 10) / 10;
  const formatted = rounded.toFixed(1);

  if (rounded < 18.5) {
    return {
      value: rounded,
      formatted,
      category: 'Insuffisance pondérale',
      tone: 'warning',
    };
  }
  if (rounded < 25) {
    return {
      value: rounded,
      formatted,
      category: 'Corpulence normale',
      tone: 'normal',
    };
  }
  if (rounded < 30) {
    return {
      value: rounded,
      formatted,
      category: 'Surpoids',
      tone: 'warning',
    };
  }
  if (rounded < 35) {
    return {
      value: rounded,
      formatted,
      category: 'Obésité modérée (Classe I)',
      tone: 'alert',
    };
  }
  if (rounded < 40) {
    return {
      value: rounded,
      formatted,
      category: 'Obésité sévère (Classe II)',
      tone: 'alert',
    };
  }
  return {
    value: rounded,
    formatted,
    category: 'Obésité morbide (Classe III)',
    tone: 'alert',
  };
}

export interface VitalAlert {
  label: string;
  detail: string;
  level: 'warning' | 'alert';
}

export function evaluateVitalAlerts(v: VitalSigns): VitalAlert[] {
  const alerts: VitalAlert[] = [];
  const temp = parseFloat(v.temperature.replace(',', '.'));
  const sys = parseFloat(v.tensionSystolique);
  const dia = parseFloat(v.tensionDiastolique);
  const spo2 = parseFloat(v.spo2);
  const pouls = parseFloat(v.pouls);

  if (!isNaN(temp)) {
    if (temp >= 38.5) {
      alerts.push({label: 'Forte fièvre', detail: `${temp.toFixed(1)} °C`, level: 'alert'});
    } else if (temp >= 37.8) {
      alerts.push({label: 'Fébricule', detail: `${temp.toFixed(1)} °C`, level: 'warning'});
    } else if (temp < 35.5) {
      alerts.push({label: 'Hypothermie', detail: `${temp.toFixed(1)} °C`, level: 'alert'});
    }
  }

  if (!isNaN(sys) && !isNaN(dia)) {
    if (sys >= 160 || dia >= 100) {
      alerts.push({label: 'HTA sévère', detail: `${sys}/${dia} mmHg`, level: 'alert'});
    } else if (sys >= 140 || dia >= 90) {
      alerts.push({label: 'Hypertension artérielle', detail: `${sys}/${dia} mmHg`, level: 'warning'});
    } else if (sys < 90 || dia < 60) {
      alerts.push({label: 'Hypotension', detail: `${sys}/${dia} mmHg`, level: 'warning'});
    }
  }

  if (!isNaN(spo2) && spo2 < 94) {
    alerts.push({label: 'Désaturation SpO₂', detail: `${spo2}%`, level: 'alert'});
  }

  if (!isNaN(pouls)) {
    if (pouls > 110) {
      alerts.push({label: 'Tachycardie', detail: `${pouls} bpm`, level: 'warning'});
    } else if (pouls < 50) {
      alerts.push({label: 'Bradycardie', detail: `${pouls} bpm`, level: 'warning'});
    }
  }

  return alerts;
}

export function formatFcfa(amount: number): string {
  return new Intl.NumberFormat('fr-FR').format(Math.round(amount)) + ' FCFA';
}

export function generateReferenceCode(prefix: string, existingCount: number): string {
  const now = new Date();
  const year = now.getFullYear();
  const seq = String(existingCount + 1).padStart(4, '0');
  return `${prefix}-${year}-${seq}`;
}

export function calculateAgeFromBirthdate(dateStr: string): string {
  if (!dateStr) return '';
  const birth = new Date(dateStr);
  if (isNaN(birth.getTime())) return '';
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  if (age < 0) return '';
  return `${age} ans`;
}
