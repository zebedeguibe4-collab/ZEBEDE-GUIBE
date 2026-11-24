import * as XLSX from 'xlsx';
import {jsPDF} from 'jspdf';
import {
  ConsultationRecord,
  MedicationCatalogItem,
  OrdonnanceRecord,
} from '../types/clinical';
import {calculateImc} from './clinicalCalculations';

function sanitizeFilename(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

export function exportConsultationsToExcel(consultations: ConsultationRecord[]): void {
  const rows = consultations.map((c) => {
    const imc = calculateImc(c.constantes.poids, c.constantes.taille);
    const medsSummary = c.traitement
      .map((m) => `${m.medicament} (${m.posologie}, ${m.duree})`)
      .join(' | ');

    return {
      'N° Consultation': c.numeroConsultation,
      'N° Dossier': c.patient.numeroDossier,
      'Date': c.dateConsultation,
      'Heure': c.heureConsultation,
      'Type': c.typeConsultation,
      'Service': c.service,
      'Patient': c.patient.nomComplet,
      'Sexe': c.patient.sexe,
      'Âge': c.patient.age,
      'Téléphone': c.patient.telephone,
      'Groupe sanguin': c.patient.groupeSanguin,
      'Température (°C)': c.constantes.temperature,
      'TA (mmHg)': `${c.constantes.tensionSystolique}/${c.constantes.tensionDiastolique}`,
      'Pouls (bpm)': c.constantes.pouls,
      'SpO2 (%)': c.constantes.spo2,
      'Poids (kg)': c.constantes.poids,
      'Taille (cm)': c.constantes.taille,
      'IMC (kg/m²)': imc.formatted,
      'Interprétation IMC': imc.category,
      'Motif de consultation': c.motif,
      'Allergies': c.antecedents.allergies,
      'Examens complémentaires': c.examensComplementaires.join(', '),
      'Diagnostic retenu': c.diagnosticPrincipal,
      'Code CIM-10': c.codeCim10,
      'Traitement prescrit': medsSummary,
      'Médecin': c.medecin,
      'Statut dossier': c.statut,
      'Montant (FCFA)': c.montantConsultation,
      'Paiement': c.statutPaiement,
    };
  });

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Consultations CSPLZ');
  const today = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `CSPLZ_Registre_Consultations_${today}.xlsx`);
}

export function exportCatalogToExcel(catalog: MedicationCatalogItem[]): void {
  const rows = catalog.map((item) => ({
    'Code': item.code,
    'Nom commercial': item.nomCommercial,
    'DCI': item.dci,
    'Forme': item.forme,
    'Dosage': item.dosage,
    'Catégorie': item.categorie,
    'Voie': item.voieDefaut,
    'Posologie standard': item.posologieDefaut,
    'Prix unitaire (FCFA)': item.prixUnitaire,
    'Stock': item.stock,
    'Disponible': item.disponible ? 'Oui' : 'Non',
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Catalogue Pharmacie');
  const today = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `CSPLZ_Catalogue_Medicaments_${today}.xlsx`);
}

export function exportRegistryToExcel(
  consultations: ConsultationRecord[],
  ordonnances: OrdonnanceRecord[],
): void {
  const rows = consultations.map((c) => {
    const linkedOrd = ordonnances.find((o) => o.consultationId === c.id);
    const imc = calculateImc(c.constantes.poids, c.constantes.taille);
    return {
      'Date': c.dateConsultation,
      'N° Dossier': c.patient.numeroDossier,
      'Patient': c.patient.nomComplet,
      'Sexe / Âge': `${c.patient.sexe} · ${c.patient.age}`,
      'Téléphone': c.patient.telephone,
      'Service': c.service,
      'Médecin': c.medecin,
      'Diagnostic': c.diagnosticPrincipal,
      'IMC': `${imc.formatted} (${imc.category})`,
      'N° Ordonnance liée': linkedOrd ? linkedOrd.numeroOrdonnance : 'Non transférée',
      'Nb Médicaments': c.traitement.length,
      'Acte (FCFA)': c.montantConsultation,
      'Statut Paiement': c.statutPaiement,
      'Prochain RDV': c.prochainRendezVous || '—',
    };
  });

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Registre Patients CSPLZ');
  const today = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `CSPLZ_Suivi_Patients_${today}.xlsx`);
}

function drawPdfHeaderAndWatermark(
  doc: jsPDF,
  docTitle: string,
  refNumber: string,
  dateStr: string,
) {
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();

  // Subtle centered watermark
  doc.saveGraphicsState();
  doc.setTextColor(232, 244, 242);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(42);
  doc.text('CSPLZ · ZOUABI', pageW / 2, pageH / 2, {
    align: 'center',
    angle: 32,
  });
  doc.setFontSize(14);
  doc.text('CENTRE DE SANTE PRIVE LAIC ZOUABI', pageW / 2, pageH / 2 + 12, {
    align: 'center',
    angle: 32,
  });
  doc.restoreGraphicsState();

  // Official Top Emblem (vector cross + circle)
  doc.setDrawColor(15, 118, 110);
  doc.setFillColor(240, 253, 250);
  doc.circle(23, 20, 8.5, 'FD');
  doc.setFillColor(15, 118, 110);
  doc.rect(21.4, 14.5, 3.2, 11, 'F');
  doc.rect(17.5, 18.4, 11, 3.2, 'F');

  // Header Institution Info
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('CENTRE DE SANTE PRIVE LAIC ZOUABI (CSPLZ)', 35, 17);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text('Medecine Generale · Pediatrie · Soins Primaires · Pharmacie · Laboratoire', 35, 21.8);
  doc.text('Agrement N° 042/MSP/CSPLZ · Quartier Zouabi · Tel : +237 6XX XX XX XX', 35, 26);

  // Right Document Box
  doc.setDrawColor(15, 118, 110);
  doc.setFillColor(240, 253, 250);
  doc.roundedRect(138, 12, 58, 17, 1.5, 1.5, 'FD');
  doc.setTextColor(15, 118, 110);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text(docTitle, 167, 17.5, {align: 'center'});
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(8);
  doc.text(`Ref : ${refNumber}`, 167, 22.3, {align: 'center'});
  doc.setFont('helvetica', 'normal');
  doc.text(`Date : ${dateStr}`, 167, 26.5, {align: 'center'});

  // Divider line
  doc.setDrawColor(15, 118, 110);
  doc.setLineWidth(0.6);
  doc.line(14, 33, 196, 33);
}

function drawSectionHeading(doc: jsPDF, y: number, title: string): number {
  doc.setFillColor(241, 245, 249);
  doc.rect(14, y, 182, 6.2, 'F');
  doc.setTextColor(15, 118, 110);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text(title.toUpperCase(), 16.5, y + 4.3);
  return y + 9.5;
}

export function exportConsultationToPdf(c: ConsultationRecord): void {
  const doc = new jsPDF({unit: 'mm', format: 'a4'});
  const imc = calculateImc(c.constantes.poids, c.constantes.taille);
  const pageH = doc.internal.pageSize.getHeight();

  drawPdfHeaderAndWatermark(
    doc,
    'CONSULTATION MEDICALE',
    c.numeroConsultation,
    `${c.dateConsultation} ${c.heureConsultation}`,
  );

  let y = 38;

  // Section 1: Patient Identification
  y = drawSectionHeading(doc, y, '1. Identification du patient');
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(8.5);

  doc.setFont('helvetica', 'bold');
  doc.text('Patient :', 16, y);
  doc.setFont('helvetica', 'normal');
  doc.text(`${c.patient.nomComplet || '—'} (${c.patient.sexe}, ${c.patient.age || '—'})`, 35, y);

  doc.setFont('helvetica', 'bold');
  doc.text('N° Dossier :', 125, y);
  doc.setFont('helvetica', 'normal');
  doc.text(c.patient.numeroDossier || '—', 147, y);
  y += 5;

  doc.setFont('helvetica', 'bold');
  doc.text('Telephone :', 16, y);
  doc.setFont('helvetica', 'normal');
  doc.text(c.patient.telephone || '—', 35, y);

  doc.setFont('helvetica', 'bold');
  doc.text('Gr. Sanguin :', 125, y);
  doc.setFont('helvetica', 'normal');
  doc.text(c.patient.groupeSanguin || 'Non precise', 147, y);
  y += 5;

  doc.setFont('helvetica', 'bold');
  doc.text('Adresse :', 16, y);
  doc.setFont('helvetica', 'normal');
  doc.text(c.patient.adresse || '—', 35, y);

  doc.setFont('helvetica', 'bold');
  doc.text('Service :', 125, y);
  doc.setFont('helvetica', 'normal');
  doc.text(c.service || 'Medecine Generale', 147, y);
  y += 7;

  // Section 2: Constantes vitales & IMC
  y = drawSectionHeading(doc, y, '2. Constantes vitales & Anthropometrie');
  doc.setDrawColor(226, 232, 240);
  doc.rect(14, y - 1, 182, 16);

  doc.setFontSize(8);
  const vitalsRow1 = [
    `Temp : ${c.constantes.temperature || '—'} °C`,
    `TA : ${c.constantes.tensionSystolique || '—'}/${c.constantes.tensionDiastolique || '—'} mmHg`,
    `Pouls : ${c.constantes.pouls || '—'} bpm`,
    `FR : ${c.constantes.frequenceRespiratoire || '—'} /min`,
    `SpO2 : ${c.constantes.spo2 || '—'} %`,
  ];
  doc.text(vitalsRow1.join('    |    '), 17, y + 4.5);

  doc.setFont('helvetica', 'bold');
  doc.text(
    `Poids : ${c.constantes.poids || '—'} kg    |    Taille : ${c.constantes.taille || '—'} cm    |    IMC : ${imc.formatted} kg/m² (${imc.category})`,
    17,
    y + 11,
  );
  doc.setFont('helvetica', 'normal');
  y += 19;

  // Section 3: Motif & Antecedents
  y = drawSectionHeading(doc, y, '3. Motif de consultation & Antecedents');
  const writeWrapped = (label: string, text: string) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.3);
    doc.text(label, 16, y);
    y += 4.2;
    doc.setFont('helvetica', 'normal');
    const lines = doc.splitTextToSize(text || 'Neant / Non renseigne', 178);
    doc.text(lines, 16, y);
    y += lines.length * 4 + 2.5;
  };

  writeWrapped('Motif & Histoire de la maladie :', `${c.motif}${c.histoireMaladie ? ' — ' + c.histoireMaladie : ''}`);
  writeWrapped(
    'Antecedents & Allergies :',
    `Medicaux : ${c.antecedents.medicaux || 'Neant'} | Allergies : ${c.antecedents.allergies || 'Aucune'} | Traitements en cours : ${c.antecedents.traitementsEnCours || 'Aucun'}`,
  );

  // Section 4: Examen physique & Examens complementaires
  y = drawSectionHeading(doc, y, '4. Examen physique & Examens complementaires');
  const examSummary = [
    c.examenPhysique.etatGeneral ? `Etat general : ${c.examenPhysique.etatGeneral}` : '',
    c.examenPhysique.cardioVasculaire ? `Cardio : ${c.examenPhysique.cardioVasculaire}` : '',
    c.examenPhysique.pulmonaire ? `Pulmonaire : ${c.examenPhysique.pulmonaire}` : '',
    c.examenPhysique.abdominal ? `Abdomen : ${c.examenPhysique.abdominal}` : '',
    c.examenPhysique.neuroOrl ? `Neuro/ORL : ${c.examenPhysique.neuroOrl}` : '',
  ]
    .filter(Boolean)
    .join(' · ');

  writeWrapped('Synthese examen clinique :', examSummary || 'Examen clinique sans particularite notable.');
  writeWrapped(
    'Examens complementaires :',
    c.examensComplementaires.length > 0
      ? `${c.examensComplementaires.join(', ')}${c.notesExamens ? ' — ' + c.notesExamens : ''}`
      : c.notesExamens || 'Aucun examen complementaire prescrit.',
  );

  // Section 5: Diagnostic & Conduite
  if (y > pageH - 85) {
    doc.addPage();
    drawPdfHeaderAndWatermark(
      doc,
      'CONSULTATION MEDICALE',
      c.numeroConsultation,
      `${c.dateConsultation} ${c.heureConsultation}`,
    );
    y = 38;
  }

  y = drawSectionHeading(doc, y, '5. Diagnostic retenu & Conduite a tenir');
  writeWrapped(
    'Diagnostic principal :',
    `${c.diagnosticPrincipal || 'En cours d’evaluation'}${c.codeCim10 ? ` [CIM-10 : ${c.codeCim10}]` : ''}`,
  );
  writeWrapped('Conduite a tenir :', c.conduiteATenir || '—');

  // Section 6: Traitement prescrit
  y = drawSectionHeading(doc, y, '6. Traitement prescrit');
  if (c.traitement.length === 0) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8.5);
    doc.text('Aucun medicament prescrit lors de cette consultation.', 16, y);
    y += 8;
  } else {
    c.traitement.forEach((m, idx) => {
      if (y > pageH - 35) {
        doc.addPage();
        drawPdfHeaderAndWatermark(
          doc,
          'CONSULTATION MEDICALE',
          c.numeroConsultation,
          `${c.dateConsultation} ${c.heureConsultation}`,
        );
        y = 38;
      }
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.text(`${idx + 1}. ${m.medicament} (${m.forme} · ${m.dosage}) — Qte : ${m.quantite}`, 16, y);
      y += 4;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.text(`    Posologie : ${m.posologie} | Duree : ${m.duree} | Voie : ${m.voie}`, 16, y);
      y += 5.5;
    });
  }

  // Footer signature
  const footerY = Math.max(y + 8, pageH - 34);
  doc.setDrawColor(203, 213, 225);
  doc.line(14, footerY - 4, 196, footerY - 4);
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text(`Prochain rendez-vous : ${c.prochainRendezVous || 'Selon evolution'}`, 16, footerY + 2);
  doc.text('Cachet du Centre (CSPLZ)', 16, footerY + 12);

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.text(c.medecin, 145, footerY + 2);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text(c.qualificationMedecin, 145, footerY + 6.5);
  doc.text('Signature :', 145, footerY + 14);

  const filename = `Consultation_CSPLZ_${sanitizeFilename(c.patient.numeroDossier)}_${sanitizeFilename(c.patient.nomComplet || 'Patient')}.pdf`;
  doc.save(filename);
}

export function exportOrdonnanceToPdf(ord: OrdonnanceRecord): void {
  const doc = new jsPDF({unit: 'mm', format: 'a4'});
  const pageH = doc.internal.pageSize.getHeight();

  drawPdfHeaderAndWatermark(
    doc,
    'ORDONNANCE MEDICALE',
    ord.numeroOrdonnance,
    ord.dateOrdonnance,
  );

  let y = 40;
  y = drawSectionHeading(doc, y, 'Identite du patient & Prescripteur');

  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.text('Patient :', 16, y);
  doc.setFont('helvetica', 'normal');
  doc.text(
    `${ord.patient.nomComplet} (${ord.patient.sexe}, ${ord.patient.age || '—'}${ord.patient.poids ? ', ' + ord.patient.poids : ''})`,
    35,
    y,
  );
  doc.setFont('helvetica', 'bold');
  doc.text('N° Dossier :', 135, y);
  doc.setFont('helvetica', 'normal');
  doc.text(ord.numeroDossier || '—', 157, y);
  y += 5.5;

  doc.setFont('helvetica', 'bold');
  doc.text('Prescripteur :', 16, y);
  doc.setFont('helvetica', 'normal');
  doc.text(`${ord.medecin} (${ord.qualificationMedecin})`, 38, y);
  y += 9;

  y = drawSectionHeading(doc, y, 'Prescription medicale');
  if (ord.lignes.length === 0) {
    doc.setFont('helvetica', 'italic');
    doc.text('Aucune ligne de prescription.', 16, y);
    y += 10;
  } else {
    ord.lignes.forEach((m, idx) => {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(15, 23, 42);
      doc.text(`${idx + 1}. ${m.medicament}  —  ${m.forme} (${m.dosage})`, 16, y);
      doc.setFontSize(8.5);
      doc.setTextColor(15, 118, 110);
      doc.text(`Qte : ${m.quantite}`, 194, y, {align: 'right'});
      y += 4.8;

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(51, 65, 85);
      const posoLines = doc.splitTextToSize(
        `Posologie : ${m.posologie} · ${m.frequence} · Duree : ${m.duree} · Voie : ${m.voie}`,
        172,
      );
      doc.text(posoLines, 21, y);
      y += posoLines.length * 4.2;

      if (m.instructions) {
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(8);
        const instrLines = doc.splitTextToSize(`Note : ${m.instructions}`, 172);
        doc.text(instrLines, 21, y);
        y += instrLines.length * 3.8;
      }
      y += 3.5;
      doc.setDrawColor(226, 232, 240);
      doc.line(16, y - 1.5, 194, y - 1.5);
    });
  }

  if (ord.recommandations) {
    y += 4;
    y = drawSectionHeading(doc, y, 'Recommandations & Conseils');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    const recLines = doc.splitTextToSize(ord.recommandations, 178);
    doc.text(recLines, 16, y);
    y += recLines.length * 4.2 + 4;
  }

  const footerY = Math.max(y + 10, pageH - 38);
  doc.setDrawColor(203, 213, 225);
  doc.line(14, footerY - 4, 196, footerY - 4);
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text(`Ordonnance valable ${ord.validiteJours} jours · Delivree au CSPLZ`, 16, footerY + 2);
  doc.text('Cachet du Centre', 16, footerY + 12);

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.text(ord.medecin, 140, footerY + 2);
  doc.setFont('helvetica', 'normal');
  doc.text('Signature et cachet du medecin :', 140, footerY + 8);

  const filename = `Ordonnance_CSPLZ_${sanitizeFilename(ord.numeroOrdonnance)}_${sanitizeFilename(ord.patient.nomComplet)}.pdf`;
  doc.save(filename);
}
