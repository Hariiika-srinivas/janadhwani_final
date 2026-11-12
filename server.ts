import express from 'express';
import { createServer as createViteServer } from 'vite';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

let aiClient: GoogleGenAI | null = null;
if (process.env.GEMINI_API_KEY) {
  try {
    aiClient = new GoogleGenAI({});
  } catch (err) {
    console.warn('Gemini AI initialization notice:', err);
  }
}

// Simulated Time
let simulatedTimeOffsetHours = 0;

function getCurrentSimulatedDate(): Date {
  const d = new Date();
  d.setHours(d.getHours() + simulatedTimeOffsetHours);
  return d;
}

// Hospitals (Organizations) in Kalyana Karnataka
const organizations = [
  {
    id: 1,
    name: 'District Hospital Kalaburagi',
    kannada_name: 'ಕಲಬುರಗಿ ಜಿಲ್ಲಾ ಆಸ್ಪತ್ರೆ (GIMS)',
    district: 'Kalaburagi',
    code: 'GIMS_KLB',
    department_code: 'HEALTH',
    phone: '08472-278650',
    beds: 750,
  },
  {
    id: 2,
    name: 'District Hospital Raichur',
    kannada_name: 'ರಾಯಚೂರು ಜಿಲ್ಲಾ ಆಸ್ಪತ್ರೆ (RIMS)',
    district: 'Raichur',
    code: 'RIMS_RCR',
    department_code: 'HEALTH',
    phone: '08532-235488',
    beds: 600,
  },
  {
    id: 3,
    name: 'District Hospital Bidar',
    kannada_name: 'ಬೀದರ್ ಜಿಲ್ಲಾ ಆಸ್ಪತ್ರೆ (BRIMS)',
    district: 'Bidar',
    code: 'BRIMS_BDR',
    department_code: 'HEALTH',
    phone: '08482-228366',
    beds: 550,
  },
  {
    id: 4,
    name: 'District Hospital Koppal',
    kannada_name: 'ಕೊಪ್ಪಳ ಜಿಲ್ಲಾ ಆಸ್ಪತ್ರೆ (KIMS)',
    district: 'Koppal',
    code: 'KIMS_KPL',
    department_code: 'HEALTH',
    phone: '08539-225230',
    beds: 450,
  },
  {
    id: 5,
    name: 'District Hospital Yadgir',
    kannada_name: 'ಯಾದಗಿರಿ ಜಿಲ್ಲಾ ಆಸ್ಪತ್ರೆ',
    district: 'Yadgir',
    code: 'DH_YDG',
    department_code: 'HEALTH',
    phone: '08473-253700',
    beds: 400,
  },
  {
    id: 6,
    name: 'District Hospital Ballari (VIMS)',
    kannada_name: 'ಬಳ್ಳಾರಿ ವಿಮ್ಸ್ ಆಸ್ಪತ್ರೆ (VIMS)',
    district: 'Ballari',
    code: 'VIMS_BLR',
    department_code: 'HEALTH',
    phone: '08392-235201',
    beds: 800,
  },
];

// Wards in each hospital
const wards = [
  { id: 101, org_id: 1, name: 'Maternity & Labour Ward (ಹೆರಿಗೆ ವಾರ್ಡ್)', code: 'MATERNITY' },
  { id: 102, org_id: 1, name: 'Intensive Care Unit - ICU (ತುರ್ತು ನಿಗಾ ಘಟಕ)', code: 'ICU' },
  { id: 103, org_id: 1, name: 'Emergency & Trauma (ತುರ್ತು ಚಿಕಿತ್ಸಾ ವಿಭಾಗ)', code: 'EMERGENCY' },
  { id: 104, org_id: 1, name: 'Out-Patient Department - OPD (ಹೊರರೋಗಿ)', code: 'OPD' },
  { id: 105, org_id: 1, name: 'Hospital Pharmacy Desk (ಔಷಧಾಲಯ)', code: 'PHARMACY' },
  { id: 106, org_id: 1, name: 'General Inpatient Ward (ಸಾಮಾನ್ಯ ವಾರ್ಡ್)', code: 'GENERAL' },

  { id: 201, org_id: 2, name: 'Maternity Ward (ಹೆರಿಗೆ ವಾರ್ಡ್)', code: 'MATERNITY' },
  { id: 202, org_id: 2, name: 'Hospital Pharmacy Desk (ಔಷಧಾಲಯ)', code: 'PHARMACY' },
  { id: 203, org_id: 2, name: 'Emergency Casualty (ತುರ್ತು ವಿಭಾಗ)', code: 'EMERGENCY' },
  { id: 204, org_id: 2, name: 'Dialysis & Renal Care (ಡಯಾಲಿಸಿಸ್ ಘಟಕ)', code: 'DIALYSIS' },
  { id: 205, org_id: 2, name: 'Pediatric Child Ward (ಮಕ್ಕಳ ವಾರ್ಡ್)', code: 'PEDIATRICS' },

  { id: 301, org_id: 3, name: 'Emergency & ICU (ತುರ್ತು ಮತ್ತು ಐಸಿಯು)', code: 'EMERGENCY' },
  { id: 302, org_id: 3, name: 'Hospital Pharmacy & Stores (ಔಷಧಾಲಯ)', code: 'PHARMACY' },
  { id: 303, org_id: 3, name: 'OPD Counter (ಹೊರರೋಗಿ ಕೌಂಟರ್)', code: 'OPD' },

  { id: 401, org_id: 4, name: 'General Ward & Sanitation (ಸಾಮಾನ್ಯ ವಾರ್ಡ್)', code: 'GENERAL' },
  { id: 402, org_id: 4, name: 'Maternity Section (ಹೆರಿಗೆ ವಿಭಾಗ)', code: 'MATERNITY' },

  { id: 501, org_id: 5, name: 'Emergency Ward (ತುರ್ತು ಘಟಕ)', code: 'EMERGENCY' },
  { id: 502, org_id: 5, name: 'Water & Sanitation Desk', code: 'SANITATION' },

  { id: 601, org_id: 6, name: 'Trauma & Ortho Ward', code: 'TRAUMA' },
  { id: 602, org_id: 6, name: 'Main Pharmacy Store', code: 'PHARMACY' },
];

// Officers List
const officers = [
  {
    id: 'officer_sneha',
    name: 'Dr. Sneha Patil',
    role: 'Duty Medical Officer L1',
    designation: 'DMO - Ward Incharge',
    hospital: 'District Hospital Raichur',
    org_id: 2,
    dept: 'HEALTH',
    phone: '9845012399',
    email: 'dr.sneha.patil@karnataka.gov.in',
  },
  {
    id: 'officer_vijay',
    name: 'Dr. Vijaykumar Shastry',
    role: 'Duty Medical Officer L1',
    designation: 'Resident Medical Officer L1',
    hospital: 'District Hospital Kalaburagi',
    org_id: 1,
    dept: 'HEALTH',
    phone: '9845012401',
    email: 'dr.vijay.kalaburagi@karnataka.gov.in',
  },
  {
    id: 'officer_priya',
    name: 'Dr. Priya Biradar',
    role: 'Duty Medical Officer L1',
    designation: 'DMO - Clinical Operations',
    hospital: 'District Hospital Bidar',
    org_id: 3,
    dept: 'HEALTH',
    phone: '9845012402',
    email: 'dr.priya.bidar@karnataka.gov.in',
  },
  {
    id: 'officer_dho',
    name: 'Dr. Anand Kulkarni',
    role: 'DISTRICT_OFFICER',
    designation: 'District Health Officer L2 (Escalation Authority)',
    hospital: 'District Health Office Kalaburagi',
    org_id: 1,
    dept: 'HEALTH',
    phone: '9845012405',
    email: 'dho.kalaburagi@karnataka.gov.in',
  },
  {
    id: 'officer_raichur_dho',
    name: 'Dr. Mahantesh Hiremath',
    role: 'DISTRICT_OFFICER',
    designation: 'District Health Officer L2 - Raichur',
    hospital: 'District Hospital Raichur',
    org_id: 2,
    dept: 'HEALTH',
    phone: '9845012408',
    email: 'dho.raichur@karnataka.gov.in',
  },
];

// SHA-256 Cryptographic Audit Ledger
interface AuditBlock {
  id: number;
  complaint_id: number;
  public_id: string;
  action: string;
  actor: string;
  actor_role: string;
  details: string;
  timestamp: string;
  prev_hash: string;
  hash: string;
}

const auditLedger: AuditBlock[] = [];

function computeBlockHash(block: Omit<AuditBlock, 'hash'>): string {
  const payload = `${block.prev_hash}|${block.id}|${block.public_id}|${block.action}|${block.actor}|${block.timestamp}|${block.details}`;
  return crypto.createHash('sha256').update(payload).digest('hex');
}

function appendAuditEntry(
  complaint_id: number,
  public_id: string,
  action: string,
  actor: string,
  actor_role: string,
  details: string
): AuditBlock {
  const prevHash = auditLedger.length > 0
    ? auditLedger[auditLedger.length - 1].hash
    : '0000000000000000000000000000000000000000000000000000000000000000';

  const newBlockRaw = {
    id: auditLedger.length + 1,
    complaint_id,
    public_id,
    action,
    actor,
    actor_role,
    details,
    timestamp: getCurrentSimulatedDate().toISOString(),
    prev_hash: prevHash,
  };

  const hash = computeBlockHash(newBlockRaw);
  const block: AuditBlock = { ...newBlockRaw, hash };
  auditLedger.push(block);
  return block;
}

interface ActionRecord {
  action_type: string;
  notes: string;
  timestamp: string;
  officer_id: string;
  officer_name: string;
  photo_url?: string | null;
  location_gps?: string;
}

interface Complaint {
  id: number;
  public_id: string; // e.g. JD-2026-1001
  department_code: string;
  organization_id: number;
  org_name: string;
  org_kn_name: string;
  district: string;
  ward_id: number;
  ward_name: string;
  category: string;
  original_text: string;
  english_text: string;
  language: string;
  channel: 'PHONE' | 'KIOSK' | 'VOICE_WEB' | 'QR';
  phone: string;
  citizen_name: string;
  is_anonymous: boolean;
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  status: 'PENDING' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED' | 'ESCALATED' | 'REOPENED' | 'REJECTED';
  officer_id: string;
  officer_name: string;
  officer_role: string;
  created_at: string;
  sla_deadline: string;
  sla_hours: number;
  is_overdue: boolean;
  actions: ActionRecord[];
  rating?: number;
  rating_feedback?: string;
  verification_notes?: string;
  snooze_count: number;
  snooze_hours_total: number;
}

let complaintCounter = 1005;

const complaints: Complaint[] = [
  {
    id: 1,
    public_id: 'JD-2026-1001',
    department_code: 'HEALTH',
    organization_id: 1,
    org_name: 'District Hospital Kalaburagi',
    org_kn_name: 'ಕಲಬುರಗಿ ಜಿಲ್ಲಾ ಆಸ್ಪತ್ರೆ (GIMS)',
    district: 'Kalaburagi',
    ward_id: 101,
    ward_name: 'Maternity & Labour Ward (ಹೆರಿಗೆ ವಾರ್ಡ್)',
    category: 'Drinking Water & Sanitation',
    original_text: 'ಕಲಬುರಗಿ ಜಿಲ್ಲಾ ಆಸ್ಪತ್ರೆಯ ಹೆರಿಗೆ ವಾರ್ಡ್‌ನಲ್ಲಿ ಕುಡಿಯುವ ನೀರಿನ ಫಿಲ್ಟರ್ ಕೆಟ್ಟುಹೋಗಿದೆ, ಬಾಣಂತಿಯರಿಗೆ ಮತ್ತು ರೋಗಿಗಳಿಗೆ ಕುಡಿಯಲು ನೀರಿಲ್ಲದೆ ಪರದಾಡುತ್ತಿದ್ದಾರೆ.',
    english_text: 'Drinking water purification filter broken in Kalaburagi GIMS Maternity Ward. Postpartum mothers have no clean drinking water.',
    language: 'kn',
    channel: 'KIOSK',
    phone: '9845012345',
    citizen_name: 'ಬಸವರಾಜ ಕಲಬುರಗಿ',
    is_anonymous: false,
    priority: 'HIGH',
    status: 'IN_PROGRESS',
    officer_id: 'officer_vijay',
    officer_name: 'Dr. Vijaykumar Shastry',
    officer_role: 'Duty Medical Officer L1',
    created_at: new Date(Date.now() - 6 * 3600 * 1000).toISOString(),
    sla_deadline: new Date(Date.now() + 6 * 3600 * 1000).toISOString(),
    sla_hours: 12,
    is_overdue: false,
    snooze_count: 0,
    snooze_hours_total: 0,
    actions: [
      {
        action_type: 'INITIAL_REGISTRATION',
        notes: 'Grievance token registered via Hospital Touchscreen Kiosk.',
        timestamp: new Date(Date.now() - 6 * 3600 * 1000).toISOString(),
        officer_id: 'SYSTEM',
        officer_name: 'JanaDhwani Kiosk Bot',
      },
      {
        action_type: 'INSPECTION_STARTED',
        notes: 'Clinical engineer dispatched to inspect UV water filter filtration membrane in 2nd floor Maternity block.',
        timestamp: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
        officer_id: 'officer_vijay',
        officer_name: 'Dr. Vijaykumar Shastry',
        location_gps: '17.3297, 76.8343',
      },
    ],
  },
  {
    id: 2,
    public_id: 'JD-2026-1002',
    department_code: 'HEALTH',
    organization_id: 2,
    org_name: 'District Hospital Raichur',
    org_kn_name: 'ರಾಯಚೂರು ಜಿಲ್ಲಾ ಆಸ್ಪತ್ರೆ (RIMS)',
    district: 'Raichur',
    ward_id: 202,
    ward_name: 'Hospital Pharmacy Desk (ಔಷಧಾಲಯ)',
    category: 'Medicine Shortage',
    original_text: 'ರಾಯಚೂರು ಆಸ್ಪತ್ರೆಯಲ್ಲಿ ಇನ್ಸುಲಿನ್ ಮತ್ತು ಆಂಟಿಬಯೋಟಿಕ್ ಇಂಜೆಕ್ಷನ್ ಲಭ್ಯವಿಲ್ಲ ಎಂದು ಔಷಧಾಲಯದವರು ಹೊರಗೆ ಬರೆಯುತ್ತಿದ್ದಾರೆ.',
    english_text: 'Severe shortage of regular human insulin and emergency antibiotics at RIMS Raichur pharmacy counter.',
    language: 'kn',
    channel: 'PHONE',
    phone: '9845098765',
    citizen_name: 'ಮಂಜುನಾಥ ರಾಯಚೂರು',
    is_anonymous: false,
    priority: 'CRITICAL',
    status: 'PENDING',
    officer_id: 'officer_sneha',
    officer_name: 'Dr. Sneha Patil',
    officer_role: 'Duty Medical Officer L1',
    created_at: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
    sla_deadline: new Date(Date.now() + 1 * 3600 * 1000).toISOString(),
    sla_hours: 4,
    is_overdue: false,
    snooze_count: 0,
    snooze_hours_total: 0,
    actions: [
      {
        action_type: 'PHONE_IVR_LOGGED',
        notes: 'Caller registered voice grievance via 1800-425-0026 BSNL toll-free IVR.',
        timestamp: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
        officer_id: 'SYSTEM_IVR',
        officer_name: 'JanaDhwani IVR Engine',
      },
    ],
  },
  {
    id: 3,
    public_id: 'JD-2026-1003',
    department_code: 'HEALTH',
    organization_id: 3,
    org_name: 'District Hospital Bidar',
    org_kn_name: 'ಬೀದರ್ ಜಿಲ್ಲಾ ಆಸ್ಪತ್ರೆ (BRIMS)',
    district: 'Bidar',
    ward_id: 301,
    ward_name: 'Emergency & ICU (ತುರ್ತು ಮತ್ತು ಐಸಿಯು)',
    category: 'Doctor/Staff Absent',
    original_text: 'ಬೀದರ್ ಜಿಲ್ಲಾ ಆಸ್ಪತ್ರೆಯ ತುರ್ತು ಚಿಕಿತ್ಸಾ ಘಟಕದಲ್ಲಿ ವೈದ್ಯರು ಗೈರುಹಾಜರಾಗಿದ್ದಾರೆ, ತೀವ್ರ ರೋಗಿಗಳಿಗೆ ಚಿಕಿತ್ಸೆ ಸಿಗುತ್ತಿಲ್ಲ.',
    english_text: 'Duty doctors missing in emergency trauma unit at BRIMS Bidar for over 3 hours.',
    language: 'kn',
    channel: 'VOICE_WEB',
    phone: '9448123456',
    citizen_name: 'ಶಿವಾನಂದ ಬೀದರ್',
    is_anonymous: false,
    priority: 'CRITICAL',
    status: 'ESCALATED',
    officer_id: 'officer_dho',
    officer_name: 'Dr. Anand Kulkarni',
    officer_role: 'DISTRICT_OFFICER',
    created_at: new Date(Date.now() - 28 * 3600 * 1000).toISOString(),
    sla_deadline: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
    sla_hours: 24,
    is_overdue: true,
    snooze_count: 0,
    snooze_hours_total: 0,
    actions: [
      {
        action_type: 'WEB_VOICE_INTAKE',
        notes: 'Citizen submitted Kannada voice recording from hospital lobby.',
        timestamp: new Date(Date.now() - 28 * 3600 * 1000).toISOString(),
        officer_id: 'SYSTEM',
        officer_name: 'Web Voice Engine',
      },
      {
        action_type: 'AUTO_ESCALATION',
        notes: 'SLA exceeded 24 hours without L1 medical clearance. Auto-escalated to District Health Officer L2.',
        timestamp: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
        officer_id: 'SYSTEM_SLA',
        officer_name: 'JanaDhwani Escalation Daemon',
      },
    ],
  },
  {
    id: 4,
    public_id: 'JD-2026-1004',
    department_code: 'HEALTH',
    organization_id: 1,
    org_name: 'District Hospital Kalaburagi',
    org_kn_name: 'ಕಲಬುರಗಿ ಜಿಲ್ಲಾ ಆಸ್ಪತ್ರೆ (GIMS)',
    district: 'Kalaburagi',
    ward_id: 104,
    ward_name: 'Out-Patient Department - OPD (ಹೊರರೋಗಿ)',
    category: 'Beds, Wheelchairs & Stretchers',
    original_text: 'ಕಲಬುರಗಿ ಹೊರರೋಗಿ ವಿಭಾಗದಲ್ಲಿ ಹಿರಿಯ ನಾಗರಿಕರಿಗೆ ಗಾಲಿಕುರ್ಚಿ (ವೀಲ್‌ಚೇರ್) ಲಭ್ಯವಿಲ್ಲ ಮತ್ತು ೩ ಕುರ್ಚಿಗಳು ಮುರಿದಿವೆ.',
    english_text: 'Shortage of wheelchairs at GIMS OPD counter; senior citizens struggling to reach consultation rooms.',
    language: 'kn',
    channel: 'KIOSK',
    phone: '9845112233',
    citizen_name: 'ಅಂಬಿಕಾ ಪಾಟೀಲ್',
    is_anonymous: false,
    priority: 'MEDIUM',
    status: 'RESOLVED',
    officer_id: 'officer_vijay',
    officer_name: 'Dr. Vijaykumar Shastry',
    officer_role: 'Duty Medical Officer L1',
    created_at: new Date(Date.now() - 14 * 3600 * 1000).toISOString(),
    sla_deadline: new Date(Date.now() + 10 * 3600 * 1000).toISOString(),
    sla_hours: 24,
    is_overdue: false,
    snooze_count: 0,
    snooze_hours_total: 0,
    rating: 5,
    rating_feedback: 'ತುಂಬಾ ಬೇಗ ೪ ಹೊಸ ವೀಲ್‌ಚೇರ್‌ಗಳನ್ನು ಒದಗಿಸಲಾಗಿದೆ. ಧನ್ಯವಾದಗಳು!',
    actions: [
      {
        action_type: 'INITIAL_REGISTRATION',
        notes: 'Kiosk icon button press registered.',
        timestamp: new Date(Date.now() - 14 * 3600 * 1000).toISOString(),
        officer_id: 'SYSTEM',
        officer_name: 'Kiosk Terminal',
      },
      {
        action_type: 'RESOLVED',
        notes: '4 brand new calibrated wheelchairs deployed to OPD entrance. Tested and tagged.',
        timestamp: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
        officer_id: 'officer_vijay',
        officer_name: 'Dr. Vijaykumar Shastry',
        photo_url: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&w=400&q=80',
        location_gps: '17.3297, 76.8343',
      },
      {
        action_type: 'CITIZEN_VERIFIED',
        notes: 'Basavaraj verified repair and provided 5-star rating.',
        timestamp: new Date(Date.now() - 1 * 3600 * 1000).toISOString(),
        officer_id: 'CITIZEN',
        officer_name: 'Citizen Basavaraj',
      },
    ],
  },
  {
    id: 5,
    public_id: 'JD-2026-1005',
    department_code: 'HEALTH',
    organization_id: 4,
    org_name: 'District Hospital Koppal',
    org_kn_name: 'ಕೊಪ್ಪಳ ಜಿಲ್ಲಾ ಆಸ್ಪತ್ರೆ (KIMS)',
    district: 'Koppal',
    ward_id: 401,
    ward_name: 'General Ward & Sanitation (ಸಾಮಾನ್ಯ ವಾರ್ಡ್)',
    category: 'Hygiene & Cleanliness',
    original_text: 'ಕೊಪ್ಪಳ ಆಸ್ಪತ್ರೆಯ ಜನರಲ್ ವಾರ್ಡ್ ಶೌಚಾಲಯಗಳು ಕಸದಿಂದ ತುಂಬಿದ್ದು ದುರ್ನಾತ ಬರುತ್ತಿದೆ, ಸ್ವಚ್ಛತೆ ಮಾಡಿಲ್ಲ.',
    english_text: 'Restrooms in Koppal district hospital general ward blocked; urgent sanitation and deep cleaning required.',
    language: 'kn',
    channel: 'PHONE',
    phone: '9845223344',
    citizen_name: 'ರಮೇಶ್ ಕೊಪ್ಪಳ',
    is_anonymous: false,
    priority: 'HIGH',
    status: 'IN_PROGRESS',
    officer_id: 'officer_sneha',
    officer_name: 'Dr. Sneha Patil',
    officer_role: 'Duty Medical Officer L1',
    created_at: new Date(Date.now() - 8 * 3600 * 1000).toISOString(),
    sla_deadline: new Date(Date.now() + 4 * 3600 * 1000).toISOString(),
    sla_hours: 12,
    is_overdue: false,
    snooze_count: 0,
    snooze_hours_total: 0,
    actions: [
      {
        action_type: 'INITIAL_REGISTRATION',
        notes: 'Phone call intake from BSNL helpline.',
        timestamp: new Date(Date.now() - 8 * 3600 * 1000).toISOString(),
        officer_id: 'SYSTEM_IVR',
        officer_name: 'IVR Bot',
      },
    ],
  },
];

complaints.forEach((c) => {
  appendAuditEntry(
    c.id,
    c.public_id,
    'CREATION',
    'CITIZEN_INTAKE',
    'CITIZEN',
    `Grievance registered via ${c.channel}. Category: ${c.category}. Hospital: ${c.org_name}. Priority: ${c.priority}.`
  );
  if (c.status === 'RESOLVED') {
    appendAuditEntry(
      c.id,
      c.public_id,
      'RESOLUTION',
      c.officer_name,
      'MEDICAL_OFFICER',
      'Clinical inspection completed and resolved with photographic evidence.'
    );
  }
  if (c.status === 'ESCALATED') {
    appendAuditEntry(
      c.id,
      c.public_id,
      'AUTO_ESCALATION',
      'SYSTEM_SLA_DAEMON',
      'AUTOMATION',
      'SLA deadline elapsed. Cryptographic auto-escalation trigger transferred case to District Officer.'
    );
  }
});

interface TelephonySession {
  call_sid: string;
  from: string;
  to: string;
  step: 'WELCOME_LANG' | 'SELECT_CATEGORY' | 'EXPLAIN_COMPLAINT' | 'CONFIRM' | 'COMPLETED' | 'EMERGENCY';
  language: string;
  category_num?: string;
  category_text?: string;
  speech_text?: string;
  org_id?: number;
  public_id?: string;
  created_at: string;
  last_active: string;
}

const telephonySessions: Map<string, TelephonySession> = new Map();

telephonySessions.set('EX-2026-98741', {
  call_sid: 'EX-2026-98741',
  from: '+919845012345',
  to: '1800-425-0026',
  step: 'COMPLETED',
  language: 'kn',
  category_num: '1',
  category_text: 'Drinking Water & Sanitation',
  speech_text: 'ಕಲಬುರಗಿ ಆಸ್ಪತ್ರೆಯಲ್ಲಿ ಕುಡಿಯುವ ನೀರಿಲ್ಲ',
  org_id: 1,
  public_id: 'JD-2026-1001',
  created_at: new Date(Date.now() - 3600 * 1000).toISOString(),
  last_active: new Date(Date.now() - 3500 * 1000).toISOString(),
});

function checkSlaDeadlines() {
  const now = getCurrentSimulatedDate().getTime();
  complaints.forEach((c) => {
    if (c.status === 'PENDING' || c.status === 'IN_PROGRESS') {
      const deadline = new Date(c.sla_deadline).getTime();
      if (now > deadline) {
        c.is_overdue = true;
        c.status = 'ESCALATED';
        c.officer_id = 'officer_dho';
        c.officer_name = 'Dr. Anand Kulkarni';
        c.officer_role = 'DISTRICT_OFFICER';
        c.actions.push({
          action_type: 'AUTO_ESCALATED',
          notes: `Simulated clock exceeded SLA deadline (${c.sla_deadline.substring(0, 19)}). Auto-escalated to District Health Officer L2 Dr. Anand Kulkarni.`,
          timestamp: getCurrentSimulatedDate().toISOString(),
          officer_id: 'SYSTEM_SLA_ENGINE',
          officer_name: 'JanaDhwani SLA Watchdog',
        });
        appendAuditEntry(
          c.id,
          c.public_id,
          'AUTO_ESCALATION',
          'SLA_ENGINE',
          'SYSTEM',
          `SLA breached by ${Math.round((now - deadline) / 3600000)}h. Auto-escalated to DHO.`
        );
      }
    }
  });
}

// REST API Endpoints
app.get('/api/orgs', (req, res) => {
  res.json(organizations);
});

app.get('/api/wards', (req, res) => {
  const org_id = req.query.org_id ? parseInt(req.query.org_id as string) : null;
  if (org_id) {
    const list = wards.filter((w) => w.org_id === org_id);
    return res.json(list.length > 0 ? list : wards.slice(0, 4));
  }
  res.json(wards);
});

app.get('/api/officers/list', (req, res) => {
  res.json(officers);
});

app.get('/api/officer/complaints', (req, res) => {
  checkSlaDeadlines();
  const officer_id = req.query.officer_id as string | undefined;
  if (officer_id) {
    const filtered = complaints.filter((c) => c.officer_id === officer_id);
    return res.json(filtered);
  }
  res.json([...complaints].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
});

app.get('/api/transparency/complaints', (req, res) => {
  checkSlaDeadlines();
  const sanitized = complaints.map((c) => ({
    id: c.id,
    public_id: c.public_id,
    org_name: c.org_name,
    org_kn_name: c.org_kn_name,
    district: c.district,
    ward_name: c.ward_name,
    category: c.category,
    summary_kn: c.original_text,
    summary_en: c.english_text,
    channel: c.channel,
    priority: c.priority,
    status: c.status,
    officer_name: c.officer_name,
    created_at: c.created_at,
    sla_deadline: c.sla_deadline,
    is_overdue: c.is_overdue,
    rating: c.rating,
    action_count: c.actions.length,
    last_action: c.actions[c.actions.length - 1]?.action_type || 'REGISTERED',
  }));
  res.json(sanitized);
});

app.get('/api/complaints/:id/status', (req, res) => {
  checkSlaDeadlines();
  const rawId = req.params.id.trim().toUpperCase();
  const complaint = complaints.find(
    (c) => c.public_id.toUpperCase() === rawId || c.id.toString() === rawId
  );

  if (!complaint) {
    return res.status(404).json({
      error: 'Token not found',
      message: `Grievance token ${rawId} was not found in the district health records.`,
      message_kn: `ದೂರು ಸಂಖ್ಯೆ '${rawId}' ಕಂಡುಬಂದಿಲ್ಲ. ದಯವಿಟ್ಟು ಸರಿಯಾದ ಸಂಖ್ಯೆಯನ್ನು ಪರಿಶೀಲಿಸಿ (ಉದಾ: JD-2026-1001).`,
    });
  }

  const trail = auditLedger.filter((b) => b.public_id === complaint.public_id);

  res.json({
    complaint,
    audit_trail: trail,
    audio_text_en: `Grievance token ${complaint.public_id} at ${complaint.org_name}. Category: ${complaint.category}. Current status: ${complaint.status}. Assigned Medical Officer: ${complaint.officer_name}. Target resolution: ${complaint.sla_deadline.substring(0, 10)}.`,
    audio_text_kn: `ದೂರು ಸಂಖ್ಯೆ ${complaint.public_id}. ಆಸ್ಪತ್ರೆ: ${complaint.org_kn_name}. ವಾರ್ಡ್: ${complaint.ward_name}. ಪ್ರಸ್ತುತ ಸ್ಥಿತಿ: ${complaint.status}. ಜವಾಬ್ದಾರಿಯುತ ವೈದ್ಯಾಧಿಕಾರಿ: ${complaint.officer_name}. ಪರಿಹಾರ ದಿನಾಂಕ: ${complaint.sla_deadline.substring(0, 10)}.`,
  });
});

app.get('/api/complaints/:id', (req, res) => {
  const rawId = req.params.id.trim().toUpperCase();
  const complaint = complaints.find(
    (c) => c.public_id.toUpperCase() === rawId || c.id.toString() === rawId
  );
  if (!complaint) {
    return res.status(404).json({ error: 'Not found' });
  }
  res.json(complaint);
});

app.post('/api/complaints', async (req, res) => {
  try {
    const {
      text,
      organization_id,
      ward_id,
      department_code = 'HEALTH',
      language = 'kn',
      channel = 'KIOSK',
      phone = '9845012345',
      citizen_name = 'ಆಸ್ಪತ್ರೆ ನಾಗರಿಕ',
      is_anonymous = false,
      priority: customPriority,
    } = req.body;

    const rawText =
      req.body.text ||
      req.body.original_text ||
      req.body.description ||
      req.body.message ||
      req.body.complaint ||
      req.body.SpeechResult ||
      'ಆಸ್ಪತ್ರೆಯಲ್ಲಿ ಅಗತ್ಯ ಸೌಲಭ್ಯಗಳ ಕೊರತೆ ಮತ್ತು ತುರ್ತು ಪರಿಶೀಲನೆ ಅಗತ್ಯವಿದೆ';

    const orgIdNum = organization_id ? parseInt(organization_id) : 1;
    const org = organizations.find((o) => o.id === orgIdNum) || organizations[0];
    const wardIdNum = ward_id ? parseInt(ward_id) : (wards.find((w) => w.org_id === org.id)?.id || 101);
    const ward = wards.find((w) => w.id === wardIdNum) || wards[0];

    let category = 'Hospital Facilities & Hygiene';
    let priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' = (customPriority as any) || 'MEDIUM';
    let englishText = rawText;

    const lower = rawText.toLowerCase();
    if (lower.includes('ನೀರು') || lower.includes('water') || lower.includes('ಶೌಚಾಲಯ') || lower.includes('toilet') || lower.includes('filter')) {
      category = 'Drinking Water & Sanitation';
      priority = 'HIGH';
    } else if (lower.includes('ಔಷಧಿ') || lower.includes('medicine') || lower.includes('tablet') || lower.includes('insulin') || lower.includes('ಮಾತ್ರೆ') || lower.includes('injection')) {
      category = 'Medicine Shortage';
      priority = 'CRITICAL';
    } else if (lower.includes('ಸ್ವಚ್ಛತೆ') || lower.includes('ಕಸ') || lower.includes('waste') || lower.includes('clean') || lower.includes('hygiene') || lower.includes('ದುರ್ನಾತ')) {
      category = 'Hygiene & Cleanliness';
      priority = 'MEDIUM';
    } else if (lower.includes('ವೈದ್ಯ') || lower.includes('doctor') || lower.includes('nurse') || lower.includes('ನರ್ಸ್') || lower.includes('ಬಂದಿಲ್ಲ') || lower.includes('absent')) {
      category = 'Doctor/Staff Absent';
      priority = 'CRITICAL';
    } else if (lower.includes('ವೀಲ್‌ಚೇರ್') || lower.includes('wheelchair') || lower.includes('ಬೆಡ್') || lower.includes('bed') || lower.includes('stretcher') || lower.includes('ಸ್ಟ್ರೆಚರ್')) {
      category = 'Beds, Wheelchairs & Stretchers';
      priority = 'MEDIUM';
    } else if (lower.includes('ambulance') || lower.includes('ಆಂಬ್ಯುಲೆನ್ಸ್') || lower.includes('oxygen') || lower.includes('ಆಕ್ಸಿಜನ್') || lower.includes('ತುರ್ತು')) {
      category = 'Ambulance & Emergency Care';
      priority = 'CRITICAL';
    }

    if (aiClient && process.env.GEMINI_API_KEY) {
      try {
        const prompt = `You are the backend AI for JanaDhwani, a Karnataka government public hospital grievance system.
Analyze this citizen complaint: "${rawText}".
Return JSON:
{
  "category": "one of: Drinking Water & Sanitation, Medicine Shortage, Hygiene & Cleanliness, Doctor/Staff Absent, Beds Wheelchairs & Stretchers, Ambulance & Emergency Care, Other Hospital Complaints",
  "priority": "CRITICAL, HIGH, MEDIUM, or LOW",
  "english_summary": "one clear sentence in English describing the issue"
}`;
        const geminiPromise = aiClient.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
          config: { responseMimeType: 'application/json' },
        });
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('AI timeout')), 1500)
        );
        const response: any = await Promise.race([geminiPromise, timeoutPromise]);
        if (response && response.text) {
          const parsed = JSON.parse(response.text);
          if (parsed.category) category = parsed.category;
          if (parsed.priority) priority = parsed.priority;
          if (parsed.english_summary) englishText = parsed.english_summary;
        }
      } catch (geminiErr) {
        // Fallback rule-based classifier is already assigned safely!
      }
    }

    const assignedOfficer = officers.find((o) => o.org_id === org.id && o.role === 'Duty Medical Officer L1') || officers[0];

    let slaHours = 24;
    if (priority === 'CRITICAL') slaHours = 4;
    else if (priority === 'HIGH') slaHours = 12;
    else if (priority === 'LOW') slaHours = 48;

    const createdAt = getCurrentSimulatedDate();
    const deadline = new Date(createdAt.getTime() + slaHours * 3600 * 1000);

    complaintCounter++;
    const public_id = `JD-2026-${complaintCounter}`;

    const newComplaint: Complaint = {
      id: complaints.length + 1,
      public_id,
      department_code,
      organization_id: org.id,
      org_name: org.name,
      org_kn_name: org.kannada_name,
      district: org.district,
      ward_id: ward.id,
      ward_name: ward.name,
      category,
      original_text: rawText,
      english_text: englishText,
      language,
      channel: channel as any,
      phone,
      citizen_name,
      is_anonymous,
      priority,
      status: 'PENDING',
      officer_id: assignedOfficer.id,
      officer_name: assignedOfficer.name,
      officer_role: assignedOfficer.role,
      created_at: createdAt.toISOString(),
      sla_deadline: deadline.toISOString(),
      sla_hours: slaHours,
      is_overdue: false,
      snooze_count: 0,
      snooze_hours_total: 0,
      actions: [
        {
          action_type: 'INITIAL_REGISTRATION',
          notes: `Grievance registered via ${channel}. SLA resolution target: ${slaHours} hours.`,
          timestamp: createdAt.toISOString(),
          officer_id: 'SYSTEM',
          officer_name: 'JanaDhwani Engine',
        },
      ],
    };

    complaints.unshift(newComplaint);

    appendAuditEntry(
      newComplaint.id,
      newComplaint.public_id,
      'GRIEVANCE_REGISTERED',
      citizen_name || 'CITIZEN',
      'CITIZEN',
      `Registered issue '${category}' at ${org.name}. Priority: ${priority}. Target SLA: ${slaHours}h.`
    );

    res.status(201).json({
      ...newComplaint,
      deadline: deadline.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
      message: `Grievance token ${public_id} successfully created!`,
      message_kn: `ನಿಮ್ಮ ಆಸ್ಪತ್ರೆ ದೂರು ಸಂಖ್ಯೆ ${public_id} ಯಶಸ್ವಿಯಾಗಿ ದಾಖಲಾಗಿದೆ.`,
      english_ack: `JanaDhwani: Your hospital grievance token ${public_id} is registered at ${org.name}. Target resolution within ${slaHours} hours.`,
    });
  } catch (err: any) {
    console.error('Error in complaint registration:', err);
    res.status(500).json({ error: 'Registration failed', message: err.message });
  }
});

app.post('/api/complaints/:id/action', (req, res) => {
  const rawId = req.params.id.trim();
  const complaint = complaints.find(
    (c) => c.public_id === rawId || c.id.toString() === rawId
  );
  if (!complaint) {
    return res.status(404).json({ error: 'Complaint not found' });
  }

  const { action_type, notes, officer_id, photo_url, location_gps } = req.body;
  const officer = officers.find((o) => o.id === officer_id) || {
    id: officer_id || 'officer_system',
    name: 'Duty Medical Officer',
    role: 'Duty Medical Officer L1',
  };

  const actionTime = getCurrentSimulatedDate().toISOString();

  if (action_type === 'RESOLVED') {
    complaint.status = 'RESOLVED';
  } else if (action_type === 'IN_PROGRESS') {
    complaint.status = 'IN_PROGRESS';
  } else if (action_type === 'REJECTED') {
    complaint.status = 'REJECTED';
  } else if (action_type === 'PENDING') {
    complaint.status = 'PENDING';
  }

  complaint.actions.push({
    action_type,
    notes: notes || `Duty officer performed ${action_type} action.`,
    timestamp: actionTime,
    officer_id: officer.id,
    officer_name: officer.name,
    photo_url: photo_url || null,
    location_gps: location_gps || '16.2076, 77.3463',
  });

  appendAuditEntry(
    complaint.id,
    complaint.public_id,
    action_type,
    officer.name,
    officer.role,
    `Action: ${action_type}. Notes: ${notes || 'Updated duty notes'}.`
  );

  res.json({
    success: true,
    message: `Status updated to ${complaint.status}. Action recorded with SHA-256 cryptographic proof.`,
    complaint,
  });
});

app.post('/api/complaints/:id/snooze', (req, res) => {
  const rawId = req.params.id.trim();
  const complaint = complaints.find(
    (c) => c.public_id === rawId || c.id.toString() === rawId
  );
  if (!complaint) {
    return res.status(404).json({ error: 'Complaint not found' });
  }

  const { hours = 24, reason, officer_id } = req.body;
  const currentDeadline = new Date(complaint.sla_deadline);
  currentDeadline.setHours(currentDeadline.getHours() + hours);
  complaint.sla_deadline = currentDeadline.toISOString();
  complaint.snooze_count += 1;
  complaint.snooze_hours_total += hours;
  complaint.is_overdue = false;

  const officer = officers.find((o) => o.id === officer_id) || officers[0];

  complaint.actions.push({
    action_type: 'SLA_EXTENDED',
    notes: `SLA extended by +${hours} hours. Justification: ${reason || 'Awaiting specialist equipment / clinical supplies shipment.'}`,
    timestamp: getCurrentSimulatedDate().toISOString(),
    officer_id: officer.id,
    officer_name: officer.name,
  });

  appendAuditEntry(
    complaint.id,
    complaint.public_id,
    'SLA_SNOOZE',
    officer.name,
    officer.role,
    `SLA extended by +${hours}h. Reason: ${reason}`
  );

  res.json({
    success: true,
    message: `SLA successfully extended by +${hours} hours. New deadline: ${complaint.sla_deadline.substring(0, 16)}.`,
    complaint,
  });
});

app.post('/api/complaints/:id/reassign', (req, res) => {
  const rawId = req.params.id.trim();
  const complaint = complaints.find(
    (c) => c.public_id === rawId || c.id.toString() === rawId
  );
  if (!complaint) {
    return res.status(404).json({ error: 'Complaint not found' });
  }

  const { new_officer_id, reason, actor_id } = req.body;
  const newOfficer = officers.find((o) => o.id === new_officer_id);
  if (!newOfficer) {
    return res.status(400).json({ error: 'Target medical officer not found' });
  }

  const prevOfficerName = complaint.officer_name;
  complaint.officer_id = newOfficer.id;
  complaint.officer_name = newOfficer.name;
  complaint.officer_role = newOfficer.role;

  complaint.actions.push({
    action_type: 'REASSIGNED',
    notes: `Reassigned from ${prevOfficerName} to ${newOfficer.name}. Reason: ${reason || 'Transferred for specialised clinical review.'}`,
    timestamp: getCurrentSimulatedDate().toISOString(),
    officer_id: actor_id || 'ADMIN',
    officer_name: 'Medical Superintendent',
  });

  appendAuditEntry(
    complaint.id,
    complaint.public_id,
    'REASSIGN',
    'Medical Superintendent',
    'ADMIN',
    `Reassigned case from ${prevOfficerName} to ${newOfficer.name}. Reason: ${reason}`
  );

  res.json({
    success: true,
    message: `Complaint reassigned to ${newOfficer.name} (${newOfficer.designation}).`,
    complaint,
  });
});

app.post('/api/complaints/:id/verify', (req, res) => {
  const rawId = req.params.id.trim();
  const complaint = complaints.find(
    (c) => c.public_id === rawId || c.id.toString() === rawId
  );
  if (!complaint) {
    return res.status(404).json({ error: 'Complaint not found' });
  }

  const { action, notes } = req.body;
  const time = getCurrentSimulatedDate().toISOString();

  if (action === 'confirm') {
    complaint.status = 'CLOSED';
    complaint.verification_notes = notes || 'Citizen confirmed issue resolution at hospital ward.';
    complaint.actions.push({
      action_type: 'CITIZEN_CONFIRMED',
      notes: notes || 'Citizen confirmed satisfactory resolution.',
      timestamp: time,
      officer_id: 'CITIZEN',
      officer_name: complaint.citizen_name || 'Citizen',
    });
    appendAuditEntry(
      complaint.id,
      complaint.public_id,
      'CLOSED_BY_CITIZEN',
      complaint.citizen_name || 'CITIZEN',
      'CITIZEN',
      'Citizen validated resolution and closed case.'
    );
    res.json({
      success: true,
      status: 'CLOSED',
      message: 'Thank you! Grievance has been verified and permanently closed.',
      message_kn: 'ಧನ್ಯವಾದಗಳು! ನಿಮ್ಮ ಆಸ್ಪತ್ರೆ ದೂರು ಯಶಸ್ವಿಯಾಗಿ ಪರಿಶೀಲಿಸಲ್ಪಟ್ಟು ಮುಕ್ತಾಯಗೊಂಡಿದೆ.',
    });
  } else {
    complaint.status = 'REOPENED';
    complaint.officer_id = 'officer_dho';
    complaint.officer_name = 'Dr. Anand Kulkarni';
    complaint.officer_role = 'DISTRICT_OFFICER';
    complaint.actions.push({
      action_type: 'CITIZEN_REOPENED',
      notes: notes || 'Citizen reported issue is NOT resolved. Automatically escalated to District Health Officer.',
      timestamp: time,
      officer_id: 'CITIZEN',
      officer_name: complaint.citizen_name || 'Citizen',
    });
    appendAuditEntry(
      complaint.id,
      complaint.public_id,
      'REOPENED_BY_CITIZEN',
      complaint.citizen_name || 'CITIZEN',
      'CITIZEN',
      `Citizen reported unsatisfactory resolution. Escalated to District Officer. Notes: ${notes}`
    );
    res.json({
      success: true,
      status: 'REOPENED',
      message: 'Grievance reopened and escalated to District Health Officer for immediate oversight.',
      message_kn: 'ದೂರನ್ನು ಮರುತೆರೆಯಲಾಗಿದೆ ಹಾಗೂ ಆಸ್ಪತ್ರೆಯ ಮೇಲ್ವಿಚಾರಕ ಜಿಲ್ಲಾ ವೈದ್ಯಾಧಿಕಾರಿಗಳಿಗೆ ಮತ್ತು ಅಧೀಕ್ಷಕರಿಗೆ ತುರ್ತಾಗಿ ವರ್ಗಾಯಿಸಲಾಗಿದೆ.',
    });
  }
});

app.post('/api/complaints/:id/rating', (req, res) => {
  const rawId = req.params.id.trim();
  const complaint = complaints.find(
    (c) => c.public_id === rawId || c.id.toString() === rawId
  );
  if (!complaint) {
    return res.status(404).json({ error: 'Complaint not found' });
  }

  const { stars, feedback } = req.body;
  complaint.rating = parseInt(stars) || 5;
  complaint.rating_feedback = feedback || 'Rating submitted via portal';

  appendAuditEntry(
    complaint.id,
    complaint.public_id,
    'CITIZEN_RATING',
    complaint.citizen_name || 'CITIZEN',
    'CITIZEN',
    `Citizen submitted ${stars} star rating. Feedback: ${feedback}`
  );

  res.json({
    success: true,
    message: `Thank you! ${stars} star rating recorded.`,
  });
});

// Telephony IVR Endpoints
app.get('/api/telephony/sessions', (req, res) => {
  const sessions = Array.from(telephonySessions.values()).sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
  res.json(sessions);
});

app.post('/api/telephony/incoming', (req, res) => {
  const phone = req.body.phone || req.body.From || '9845012345';
  const call_sid = `CALL-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;

  const promptText = 'ಜನಧ್ವನಿ ಸರ್ಕಾರಿ ಆಸ್ಪತ್ರೆ ನಾಗರಿಕ ಸಹಾಯವಾಣಿಗೆ ಸ್ವಾಗತ. ಕನ್ನಡಕ್ಕಾಗಿ 1, English press 2, हिन्दी 3, తెలుగు 4, தமிழ் 5 ಒತ್ತಿರಿ.';

  const session: TelephonySession = {
    call_sid,
    from: phone,
    to: '1800-425-0026',
    step: 'WELCOME_LANG',
    language: 'kn',
    created_at: getCurrentSimulatedDate().toISOString(),
    last_active: getCurrentSimulatedDate().toISOString(),
  };

  telephonySessions.set(call_sid, session);

  res.json({
    call_sid,
    status: 'CONTINUE',
    step: 'WELCOME_LANG',
    audio_lang: 'kn',
    prompt_audio_text: promptText,
    twiml: `<Response><Say language="kn-IN">${promptText}</Say><Gather numDigits="1" action="/api/telephony/dtmf" timeout="10" /></Response>`,
  });
});

app.post('/api/telephony/dtmf', (req, res) => {
  const { CallSid, Digits } = req.body;
  const activeSid = CallSid || `CALL-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
  let session = telephonySessions.get(activeSid);

  if (!session) {
    session = {
      call_sid: activeSid,
      from: req.body.From || req.body.phone || '9845012345',
      to: '1800-425-0026',
      step: 'WELCOME_LANG',
      language: 'kn',
      created_at: getCurrentSimulatedDate().toISOString(),
      last_active: getCurrentSimulatedDate().toISOString(),
    };
    telephonySessions.set(activeSid, session);
  }

  session.last_active = getCurrentSimulatedDate().toISOString();
  const digit = Digits ? Digits.toString().trim() : '1';

  if (session.step === 'WELCOME_LANG') {
    let lang = 'kn';
    let langName = 'ಕನ್ನಡ (Kannada)';
    if (digit === '2') { lang = 'en'; langName = 'English'; }
    else if (digit === '3') { lang = 'hi'; langName = 'हिन्दी (Hindi)'; }
    else if (digit === '4') { lang = 'te'; langName = 'తెలుగు (Telugu)'; }
    else if (digit === '5') { lang = 'ta'; langName = 'தமிழ் (Tamil)'; }

    session.language = lang;
    session.step = 'SELECT_CATEGORY';

    const promptText = lang === 'kn'
      ? 'ಆಸ್ಪತ್ರೆ ದೂರು ವಿಭಾಗ ಆಯ್ಕೆಮಾಡಿ: ನೀರು ಮತ್ತು ಶೌಚಾಲಯಕ್ಕಾಗಿ 1, ಔಷಧಿ ಕೊರತೆಗಾಗಿ 2, ಸ್ವಚ್ಛತೆಗಾಗಿ 3, ವೈದ್ಯರ ಗೈರುಹಾಜರಿಗೆ 4, ಹಾಸಿಗೆ ಮತ್ತು ವೀಲ್‌ಚೇರ್‌ಗಾಗಿ 5, ಇತರ ಸಮಸ್ಯೆಗಾಗಿ 7 ಒತ್ತಿರಿ.'
      : 'Select hospital complaint category: Press 1 for Water and Sanitation, 2 for Medicine Shortage, 3 for Ward Hygiene, 4 for Doctor Absence, 5 for Wheelchairs/Beds, 7 for Other Issues.';

    return res.json({
      call_sid: activeSid,
      status: 'CONTINUE',
      step: 'SELECT_CATEGORY',
      selected_language: { code: lang, name: langName },
      audio_lang: lang,
      prompt_audio_text: promptText,
    });
  }

  if (session.step === 'SELECT_CATEGORY') {
    const catMapKn: Record<string, string> = {
      '1': 'ಕುಡಿಯುವ ನೀರು ಮತ್ತು ಶೌಚಾಲಯ (Drinking Water & Sanitation)',
      '2': 'ಔಷಧಿ ಮತ್ತು ಇಂಜೆಕ್ಷನ್ ಕೊರತೆ (Medicine Shortage)',
      '3': 'ಆಸ್ಪತ್ರೆ ಸ್ವಚ್ಛತೆ ಮತ್ತು ನೈರ್ಮಲ್ಯ (Hygiene & Cleanliness)',
      '4': 'ವೈದ್ಯರ ಗೈರುಹಾಜರಿ (Doctor/Staff Absent)',
      '5': 'ಹಾಸಿಗೆಗಳು ಮತ್ತು ವೀಲ್‌ಚೇರ್ (Beds & Wheelchairs)',
      '6': 'ವಿದ್ಯುತ್ ಮತ್ತು ವೈದ್ಯಕೀಯ ಉಪಕರಣ (Equipment & Repairs)',
      '7': 'ಇತರ ಆಸ್ಪತ್ರೆ ದೂರು (Other Hospital Issues)',
    };

    session.category_num = digit;
    session.category_text = catMapKn[digit] || 'ಇತರ ಆಸ್ಪತ್ರೆ ದೂರು';
    session.step = 'EXPLAIN_COMPLAINT';

    const promptText = session.language === 'kn'
      ? 'ನಿಮ್ಮ ಜಿಲ್ಲಾ ಆಸ್ಪತ್ರೆಯ ಹೆಸರು (ಉದಾ: ಕಲಬುರಗಿ, ರಾಯಚೂರು, ಬೀದರ್, ಕೊಪ್ಪಳ, ಯಾದಗಿರಿ) ಮತ್ತು ಸಮಸ್ಯೆಯ ಪೂರ್ಣ ವಿವರವನ್ನು ಸ್ಪಷ್ಟವಾಗಿ ಮಾತನಾಡಿ.'
      : 'Please state your hospital name (e.g. Kalaburagi, Raichur, Bidar, Koppal, Yadgir) and explain your issue clearly.';

    return res.json({
      call_sid: activeSid,
      status: 'CONTINUE',
      step: 'EXPLAIN_COMPLAINT',
      category: session.category_text,
      audio_lang: session.language,
      prompt_audio_text: promptText,
    });
  }

  if (session.step === 'CONFIRM') {
    if (digit === '1') {
      complaintCounter++;
      const public_id = `JD-2026-${complaintCounter}`;
      session.public_id = public_id;
      session.step = 'COMPLETED';

      const org = organizations.find((o) => o.id === (session.org_id || 1)) || organizations[0];
      const deadline = new Date(getCurrentSimulatedDate().getTime() + 12 * 3600 * 1000);

      const newComplaint: Complaint = {
        id: complaints.length + 1,
        public_id,
        department_code: 'HEALTH',
        organization_id: org.id,
        org_name: org.name,
        org_kn_name: org.kannada_name,
        district: org.district,
        ward_id: 101,
        ward_name: 'Helpline Intake Ward',
        category: session.category_text || 'Drinking Water & Sanitation',
        original_text: session.speech_text || 'ದೂರವಾಣಿ ೧೮೦೦ ಮೂಲಕ ದಾಖಲಾದ ದೂರು',
        english_text: session.speech_text || 'Complaint registered via 1800 IVR Toll-Free',
        language: session.language,
        channel: 'PHONE',
        phone: session.from,
        citizen_name: 'ದೂರವಾಣಿ ನಾಗರಿಕ',
        is_anonymous: false,
        priority: 'HIGH',
        status: 'PENDING',
        officer_id: 'officer_vijay',
        officer_name: 'Dr. Vijaykumar Shastry',
        officer_role: 'Duty Medical Officer L1',
        created_at: getCurrentSimulatedDate().toISOString(),
        sla_deadline: deadline.toISOString(),
        sla_hours: 12,
        is_overdue: false,
        snooze_count: 0,
        snooze_hours_total: 0,
        actions: [
          {
            action_type: 'IVR_REGISTERED',
            notes: `Registered via 1800-425-0026 BSNL IVR. Call SID: ${CallSid}`,
            timestamp: getCurrentSimulatedDate().toISOString(),
            officer_id: 'SYSTEM_IVR',
            officer_name: 'JanaDhwani Telephony Node',
          },
        ],
      };

      complaints.unshift(newComplaint);

      appendAuditEntry(
        newComplaint.id,
        newComplaint.public_id,
        'PHONE_IVR_SUBMITTED',
        session.from,
        'CITIZEN_PHONE',
        `Phone intake confirmed from ${session.from}. Token: ${public_id}. Cryptographic block committed.`
      );

      const promptText = session.language === 'kn'
        ? `ಧನ್ಯವಾದಗಳು! ನಿಮ್ಮ ಆಸ್ಪತ್ರೆ ದೂರು ಯಶಸ್ವಿಯಾಗಿ ದಾಖಲಾಗಿದೆ. ನಿಮ್ಮ ದೂರು ಸಂಖ್ಯೆ ${public_id}. ಪರಿಹಾರದ ವಿವರಗಳನ್ನು ನಿಮ್ಮ ಮೊಬೈಲ್ ಸಂಖ್ಯೆಗೆ ಎಸ್‌ಎಂಎಸ್ ಮೂಲಕ ಕಳುಹಿಸಲಾಗಿದೆ.`
        : `Thank you! Your hospital grievance is registered successfully. Your grievance token number is ${public_id}. Confirmation sent to your phone via SMS.`;

      return res.json({
        call_sid: activeSid,
        status: 'COMPLETED',
        public_id,
        audio_lang: session.language,
        prompt_audio_text: promptText,
      });
    } else {
      session.step = 'EXPLAIN_COMPLAINT';
      const promptText = session.language === 'kn'
        ? 'ದಯವಿಟ್ಟು ನಿಮ್ಮ ಆಸ್ಪತ್ರೆಯ ಹೆಸರು ಮತ್ತು ದೂರನ್ನು ಮತ್ತೊಮ್ಮೆ ಮಾತನಾಡಿ.'
        : 'Please explain your grievance and hospital name again.';
      return res.json({
        call_sid: activeSid,
        status: 'CONTINUE',
        step: 'EXPLAIN_COMPLAINT',
        audio_lang: session.language,
        prompt_audio_text: promptText,
      });
    }
  }

  res.json({
    call_sid: activeSid,
    status: 'CONTINUE',
    step: session.step,
    prompt_audio_text: 'ಕೀಪ್ಯಾಡ್ ಇನ್‌ಪುಟ್ ಸ್ವೀಕರಿಸಲಾಗಿದೆ.',
  });
});

app.post('/api/telephony/speech', (req, res) => {
  const { CallSid, SpeechResult } = req.body;
  const activeSid = CallSid || `CALL-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
  let session = telephonySessions.get(activeSid);

  if (!session) {
    session = {
      call_sid: activeSid,
      from: '9845012345',
      to: '1800-425-0026',
      step: 'EXPLAIN_COMPLAINT',
      language: 'kn',
      created_at: getCurrentSimulatedDate().toISOString(),
      last_active: getCurrentSimulatedDate().toISOString(),
    };
    telephonySessions.set(activeSid, session);
  }

  session.speech_text = SpeechResult || '';
  session.last_active = getCurrentSimulatedDate().toISOString();

  const textLower = (SpeechResult || '').toLowerCase();

  const isEmergency =
    textLower.includes('108') ||
    textLower.includes('accident') ||
    textLower.includes('heart attack') ||
    textLower.includes('stoppage of breathing') ||
    textLower.includes('ತುರ್ತು') ||
    textLower.includes('ಸಾವು') ||
    textLower.includes('ರಕ್ತಸ್ರಾವ');

  if (isEmergency) {
    session.step = 'EMERGENCY';
    const emergencyText = session.language === 'kn'
      ? '🚨 ಗಂಭೀರ ತುರ್ತು ಪರಿಸ್ಥಿತಿ ಪತ್ತೆಯಾಗಿದೆ! ನಿಮ್ಮ ಕರೆಯನ್ನು ತಕ್ಷಣ ಕರ್ನಾಟಕ ತುರ್ತು ಆಂಬ್ಯುಲೆನ್ಸ್ ಸಹಾಯವಾಣಿ 108 ಗೆ ಸಂಪರ್ಕ ಕಲ್ಪಿಸಲಾಗುತ್ತಿದೆ. ದಯವಿಟ್ಟು ಲೈನ್‌ನಲ್ಲಿರಿ.'
      : '🚨 Critical medical emergency detected! Connecting your call immediately to Karnataka Emergency Ambulance 108. Please stay on the line.';

    return res.json({
      call_sid: activeSid,
      status: 'EMERGENCY_REFERRED',
      step: 'EMERGENCY',
      audio_lang: session.language,
      prompt_audio_text: emergencyText,
    });
  }

  if (textLower.includes('raichur') || textLower.includes('ರಾಯಚೂರು')) session.org_id = 2;
  else if (textLower.includes('bidar') || textLower.includes('ಬೀದರ್')) session.org_id = 3;
  else if (textLower.includes('koppal') || textLower.includes('ಕೊಪ್ಪಳ')) session.org_id = 4;
  else if (textLower.includes('yadgir') || textLower.includes('ಯಾದಗಿರಿ')) session.org_id = 5;
  else session.org_id = 1;

  session.step = 'CONFIRM';
  const org = organizations.find((o) => o.id === session.org_id) || organizations[0];

  const confirmText = session.language === 'kn'
    ? `ನಾವು ಸ್ವೀಕರಿಸಿದ ವಿವರ: ಆಸ್ಪತ್ರೆ: ${org.kannada_name}. ದೂರು: ${SpeechResult}. ದೃಢೀಕರಿಸಿ ದೂರು ಸಂಖ್ಯೆ ಪಡೆಯಲು ಕೀಪ್ಯಾಡ್‌ನಲ್ಲಿ 1 ಒತ್ತಿರಿ, ತಿದ್ದುಪಡಿ ಮಾಡಲು 2 ಒತ್ತಿರಿ.`
    : `We recorded: Hospital: ${org.name}. Issue: ${SpeechResult}. Press 1 to confirm and generate Grievance Token, or 2 to retry.`;

  res.json({
    call_sid: activeSid,
    status: 'CONTINUE',
    step: 'CONFIRM',
    extracted_hospital: org.name,
    audio_lang: session.language,
    prompt_audio_text: confirmText,
  });
});

app.post('/api/telephony/confirm', (req, res) => {
  const { CallSid, Digits } = req.body;
  req.body.Digits = Digits || '1';
  return app._router.handle(
    { ...req, url: '/api/telephony/dtmf', method: 'POST' },
    res,
    () => {}
  );
});

// Dashboard Endpoints
app.get('/api/dashboard/summary', (req, res) => {
  checkSlaDeadlines();

  const total = complaints.length;
  const resolved = complaints.filter((c) => c.status === 'RESOLVED' || c.status === 'CLOSED').length;
  const inProgress = complaints.filter((c) => c.status === 'IN_PROGRESS').length;
  const escalated = complaints.filter((c) => c.status === 'ESCALATED').length;
  const pending = complaints.filter((c) => c.status === 'PENDING').length;
  const overdueCount = complaints.filter((c) => c.is_overdue).length;

  const complianceRate = total > 0 ? Math.round((resolved / total) * 100) : 85;

  res.json({
    total_complaints: total,
    resolved_count: resolved,
    in_progress_count: inProgress,
    escalated_count: escalated,
    pending_count: pending,
    overdue_count: overdueCount,
    sla_compliance_rate: complianceRate,
    avg_resolution_hours: 8.4,
    critical_alerts_count: escalated + complaints.filter((c) => c.priority === 'CRITICAL' && c.status !== 'RESOLVED').length,
    simulated_time_offset: simulatedTimeOffsetHours,
    simulated_clock: getCurrentSimulatedDate().toISOString(),
  });
});

app.get('/api/dashboard/by-category', (req, res) => {
  const catMap: Record<string, { total: number; resolved: number; pending: number }> = {};
  complaints.forEach((c) => {
    if (!catMap[c.category]) {
      catMap[c.category] = { total: 0, resolved: 0, pending: 0 };
    }
    catMap[c.category].total += 1;
    if (c.status === 'RESOLVED' || c.status === 'CLOSED') {
      catMap[c.category].resolved += 1;
    } else {
      catMap[c.category].pending += 1;
    }
  });

  const formatted = Object.keys(catMap).map((cat) => ({
    category: cat,
    total: catMap[cat].total,
    resolved: catMap[cat].resolved,
    pending: catMap[cat].pending,
    rate: Math.round((catMap[cat].resolved / catMap[cat].total) * 100),
  }));

  res.json(formatted);
});

app.get('/api/dashboard/hospital-scores', (req, res) => {
  const scores = organizations.map((org) => {
    const orgComplaints = complaints.filter((c) => c.organization_id === org.id);
    const resolved = orgComplaints.filter((c) => c.status === 'RESOLVED' || c.status === 'CLOSED').length;
    const score = orgComplaints.length > 0 ? Math.round((resolved / orgComplaints.length) * 100) : 90;
    return {
      org_id: org.id,
      name: org.name,
      kannada_name: org.kannada_name,
      district: org.district,
      total_complaints: orgComplaints.length,
      resolved_complaints: resolved,
      efficiency_score: Math.max(score, 65),
      grade: score >= 85 ? 'A+' : score >= 70 ? 'A' : 'B',
    };
  });
  res.json(scores);
});

app.get('/api/dashboard/early-warnings', (req, res) => {
  const warnings = [
    {
      id: 1,
      type: 'CLUSTER_DETECTED',
      severity: 'HIGH',
      title: 'Water Filtration Fault - Kalaburagi Maternity Block',
      title_kn: 'ಕಲಬುರಗಿ ಹೆರಿಗೆ ವಾರ್ಡ್ ಕುಡಿಯುವ ನೀರು ಫಿಲ್ಟರ್ ಕ್ಲಸ್ಟರ್ ಪತ್ತೆ',
      description: '3 repeated grievances filed in 24 hours regarding broken RO membrane on 2nd floor.',
      hospital: 'District Hospital Kalaburagi',
      action_recommended: 'Immediate replacement of 500 LPH RO commercial cartridge.',
    },
    {
      id: 2,
      type: 'MEDICINE_STOCKOUT',
      severity: 'CRITICAL',
      title: 'Insulin Injection Depletion Alert - Raichur RIMS',
      title_kn: 'ರಾಯಚೂರು ಆಸ್ಪತ್ರೆ ಇನ್ಸುಲಿನ್ ಔಷಧಿ ಕೊರತೆ ಎಚ್ಚರಿಕೆ',
      description: 'Multiple patients reported out-of-stock emergency insulin at OPD pharmacy window.',
      hospital: 'District Hospital Raichur',
      action_recommended: 'Emergency indent dispatch from Karnataka State Drugs Logistics Warehouse.',
    },
    {
      id: 3,
      type: 'SLA_NEAR_BREACH',
      severity: 'MEDIUM',
      title: 'Doctor Absenteeism Inquiry - Bidar BRIMS',
      title_kn: 'ಬೀದರ್ ಆಸ್ಪತ್ರೆ ತುರ್ತು ಘಟಕ ವೈದ್ಯರ ಗೈರುಹಾಜರಿ ಪರಿಶೀಲನೆ',
      description: 'Grievance JD-2026-1003 is overdue. Escalated to District Health Officer L2.',
      hospital: 'District Hospital Bidar',
      action_recommended: 'DHO clinical inspection ordered.',
    },
  ];
  res.json(warnings);
});

app.get('/api/dashboard/overdue', (req, res) => {
  checkSlaDeadlines();
  const overdue = complaints.filter((c) => c.is_overdue || c.status === 'ESCALATED');
  res.json(overdue);
});

app.get('/api/dashboard/clusters', (req, res) => {
  const clusters = [
    {
      district: 'Kalaburagi',
      hospital: 'District Hospital Kalaburagi',
      category: 'Drinking Water & Sanitation',
      count: 4,
      lat: 17.3297,
      lng: 76.8343,
      level: 'ELEVATED',
    },
    {
      district: 'Raichur',
      hospital: 'District Hospital Raichur',
      category: 'Medicine Shortage',
      count: 3,
      lat: 16.2076,
      lng: 77.3463,
      level: 'CRITICAL',
    },
    {
      district: 'Bidar',
      hospital: 'District Hospital Bidar',
      category: 'Doctor/Staff Absent',
      count: 2,
      lat: 17.9104,
      lng: 77.5199,
      level: 'MODERATE',
    },
  ];
  res.json(clusters);
});

app.get('/api/dashboard/export-csv', (req, res) => {
  let csv = 'Token_ID,Hospital,District,Ward,Category,Priority,Status,Officer,Created_At,SLA_Deadline,Rating\n';
  complaints.forEach((c) => {
    csv += `"${c.public_id}","${c.org_name}","${c.district}","${c.ward_name}","${c.category}","${c.priority}","${c.status}","${c.officer_name}","${c.created_at}","${c.sla_deadline}","${c.rating || 'N/A'}"\n`;
  });
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="janadhwani_grievance_export.csv"');
  res.send(csv);
});

// Demo, Cryptographic Audit & Time Machine
app.get('/api/demo/audit-verify', (req, res) => {
  let isValid = true;
  let brokenBlockId: number | null = null;
  let reason = 'All blocks verified with SHA-256 cryptographic hashes.';

  for (let i = 0; i < auditLedger.length; i++) {
    const current = auditLedger[i];
    const prev = i > 0 ? auditLedger[i - 1] : null;

    if (i > 0 && prev && current.prev_hash !== prev.hash) {
      isValid = false;
      brokenBlockId = current.id;
      reason = `Cryptographic link severed at Block #${current.id}: prev_hash does not match previous block hash!`;
      break;
    }

    const computed = computeBlockHash({
      id: current.id,
      complaint_id: current.complaint_id,
      public_id: current.public_id,
      action: current.action,
      actor: current.actor,
      actor_role: current.actor_role,
      details: current.details,
      timestamp: current.timestamp,
      prev_hash: current.prev_hash,
    });

    if (computed !== current.hash) {
      isValid = false;
      brokenBlockId = current.id;
      reason = `Data Tampering Detected in Block #${current.id}! Stored hash (${current.hash.substring(0, 10)}...) does not match recalculated hash (${computed.substring(0, 10)}...). Database record was altered!`;
      break;
    }
  }

  res.json({
    isValid,
    chainLength: auditLedger.length,
    lastVerifiedBlock: auditLedger.length > 0 ? auditLedger[auditLedger.length - 1].id : 0,
    tamperedBlockId: brokenBlockId,
    tamperReason: isValid ? null : reason,
    auditTrail: [...auditLedger].reverse().slice(0, 20),
  });
});

app.post('/api/demo/tamper-audit', (req, res) => {
  if (auditLedger.length > 0) {
    const target = auditLedger[0];
    target.details = '⚠️ [TAMPER ATTACK]: Illegally wiped hospital penalty record from database.';
    return res.json({
      success: true,
      message: `Simulated unauthorized SQL edit: Block #${target.id} details altered without updating cryptographic signature.`,
      tamperedBlockId: target.id,
    });
  }
  res.status(400).json({ error: 'No audit records to tamper' });
});

app.post('/api/demo/repair-audit', (req, res) => {
  let prevHash = '0000000000000000000000000000000000000000000000000000000000000000';
  for (let i = 0; i < auditLedger.length; i++) {
    auditLedger[i].prev_hash = prevHash;
    if (auditLedger[i].details.includes('[TAMPER ATTACK]')) {
      auditLedger[i].details = 'Grievance registered via KIOSK. Category: Drinking Water & Sanitation. Hospital: District Hospital Kalaburagi.';
    }
    auditLedger[i].hash = computeBlockHash(auditLedger[i]);
    prevHash = auditLedger[i].hash;
  }
  res.json({
    success: true,
    message: 'Cryptographic chain re-signed and restored to 100% verified integrity!',
    chainLength: auditLedger.length,
  });
});

app.post('/api/demo/advance-time', (req, res) => {
  const { hours = 24 } = req.body;
  simulatedTimeOffsetHours += parseInt(hours);
  checkSlaDeadlines();
  res.json({
    success: true,
    message: `Advanced simulation time by +${hours} hours. Active simulated offset: +${simulatedTimeOffsetHours} hours.`,
    simulated_date: getCurrentSimulatedDate().toISOString(),
    overdue_count: complaints.filter((c) => c.is_overdue).length,
  });
});

app.post('/api/demo/reset-time', (req, res) => {
  simulatedTimeOffsetHours = 0;
  complaints.forEach((c) => {
    if (c.public_id === 'JD-2026-1001') {
      c.status = 'IN_PROGRESS';
      c.is_overdue = false;
    }
  });
  res.json({
    success: true,
    message: 'Simulated clock reset to real-time.',
    current_time: new Date().toISOString(),
  });
});

async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (req, res) => {
        res.sendFile(path.resolve(distPath, 'index.html'));
      });
    }
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n======================================================`);
    console.log(`  JanaDhwani Server running at http://0.0.0.0:${PORT}`);
    console.log(`  Kalyana Karnataka Hospital Grievance & Telephony API`);
    console.log(`======================================================\n`);
  });
}

startServer();
