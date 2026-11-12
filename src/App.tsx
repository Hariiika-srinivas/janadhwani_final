import React, { useState, useEffect, useRef } from 'react';
import {
  Phone,
  PhoneCall,
  PhoneOff,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Clock,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Search,
  Building2,
  UserCheck,
  RefreshCw,
  Download,
  Printer,
  QrCode,
  Star,
  ArrowRight,
  Lock,
  FileText,
  Activity,
  Flame,
  ChevronRight,
  Stethoscope,
  Radio,
  Share2,
  Check,
  Calendar,
  Layers,
  Sparkles,
  MapPin,
  HelpCircle,
  Sliders,
  Bell,
  X
} from 'lucide-react';

// Type definitions
interface Organization {
  id: number;
  name: string;
  kannada_name: string;
  district: string;
  code: string;
  phone: string;
  beds: number;
}

interface Ward {
  id: number;
  org_id: number;
  name: string;
  code: string;
}

interface Officer {
  id: string;
  name: string;
  role: string;
  designation: string;
  hospital: string;
  org_id: number;
  dept: string;
  phone: string;
  email: string;
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
  public_id: string;
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
  deadline?: string;
  message_kn?: string;
  english_ack?: string;
}

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

interface DashboardSummary {
  total_complaints: number;
  resolved_count: number;
  in_progress_count: number;
  escalated_count: number;
  pending_count: number;
  overdue_count: number;
  sla_compliance_rate: number;
  avg_resolution_hours: number;
  critical_alerts_count: number;
  simulated_time_offset: number;
  simulated_clock: string;
}

interface HospitalScore {
  org_id: number;
  name: string;
  kannada_name: string;
  district: string;
  total_complaints: number;
  resolved_complaints: number;
  efficiency_score: number;
  grade: string;
}

export default function App() {
  // Navigation & Language
  const [activeTab, setActiveTab] = useState<string>('phone');
  const [lang, setLang] = useState<'kn' | 'en'>('kn');
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);

  // Reference Data
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<number>(1);
  const [wards, setWards] = useState<Ward[]>([]);
  const [selectedWardId, setSelectedWardId] = useState<number>(101);
  const [officers, setOfficers] = useState<Officer[]>([]);
  const [activeOfficerId, setActiveOfficerId] = useState<string>('officer_sneha');

  // Dashboard Data
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [hospitalScores, setHospitalScores] = useState<HospitalScore[]>([]);
  const [earlyWarnings, setEarlyWarnings] = useState<any[]>([]);
  const [overdueList, setOverdueList] = useState<Complaint[]>([]);
  const [clusters, setClusters] = useState<any[]>([]);

  // Officer Queue & Transparency
  const [officerComplaints, setOfficerComplaints] = useState<Complaint[]>([]);
  const [officerFilter, setOfficerFilter] = useState<string>('ALL');
  const [transparencyComplaints, setTransparencyComplaints] = useState<any[]>([]);
  const [transparencyDistrict, setTransparencyDistrict] = useState<string>('ALL');

  // Active Complaint Action Modal
  const [activeModalComplaint, setActiveModalComplaint] = useState<Complaint | null>(null);
  const [actionType, setActionType] = useState<string>('IN_PROGRESS');
  const [actionNotes, setActionNotes] = useState<string>('');
  const [snoozeHours, setSnoozeHours] = useState<number>(24);
  const [reassignOfficerId, setReassignOfficerId] = useState<string>('officer_vijay');
  const [actionLoading, setActionLoading] = useState<boolean>(false);

  // Status & Verification Flow
  const [searchToken, setSearchToken] = useState<string>('JD-2026-1001');
  const [searchedComplaint, setSearchedComplaint] = useState<Complaint | null>(null);
  const [searchedAuditTrail, setSearchedAuditTrail] = useState<AuditBlock[]>([]);
  const [statusLoading, setStatusLoading] = useState<boolean>(false);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [verificationNotes, setVerificationNotes] = useState<string>('');
  const [selectedRating, setSelectedRating] = useState<number>(5);

  // Voice Web Intake
  const [voiceInputText, setVoiceInputText] = useState<string>('');
  const [voiceIsRecording, setVoiceIsRecording] = useState<boolean>(false);
  const [voicePhone, setVoicePhone] = useState<string>('9845012345');
  const [voiceName, setVoiceName] = useState<string>('ಮಂಜುನಾಥ ಕಲಬುರಗಿ');
  const [voiceCategory, setVoiceCategory] = useState<string>('Drinking Water & Sanitation');
  const [voiceSubmitting, setVoiceSubmitting] = useState<boolean>(false);
  const [newlyCreatedTicket, setNewlyCreatedTicket] = useState<Complaint | null>(null);

  // Hospital Kiosk
  const [kioskHospitalId, setKioskHospitalId] = useState<number>(1);
  const [kioskCreatedTicket, setKioskCreatedTicket] = useState<Complaint | null>(null);
  const [kioskSubmitting, setKioskSubmitting] = useState<boolean>(false);

  const [callActive, setCallActive] = useState<boolean>(false);
  const [callConnecting, setCallConnecting] = useState<boolean>(false);
  const [callTimer, setCallTimer] = useState<number>(0);
  const [telephonySession, setTelephonySession] = useState<TelephonySession | null>(null);
  const [callStep, setCallStep] = useState<string>('IDLE');
  const [telephonyPromptText, setTelephonyPromptText] = useState<string>('');
  const [telephonySelectedLang, setTelephonySelectedLang] = useState<string>('kn');
  const [telephonyPhoneInput, setTelephonyPhoneInput] = useState<string>('9845012345');
  const [telephonyLastDigits, setTelephonyLastDigits] = useState<string>('');
  const [telephonyRecognizedSpeech, setTelephonyRecognizedSpeech] = useState<string>('');
  const [telephonyMicRecording, setTelephonyMicRecording] = useState<boolean>(false);
  const [telephonyRecentSessions, setTelephonyRecentSessions] = useState<TelephonySession[]>([]);
  const [telephonyCompletedToken, setTelephonyCompletedToken] = useState<string>('');

  // Toast Notification System (replaces window.alert)
  const [toast, setToast] = useState<{ id: string; type: 'success' | 'error' | 'info'; message: string } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ id: Date.now().toString(), message, type });
    setTimeout(() => {
      setToast((curr) => (curr && curr.message === message ? null : curr));
    }, 4500);
  };

  // Live timer effect
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Call duration timer
  useEffect(() => {
    let interval: any;
    if (callActive) {
      interval = setInterval(() => setCallTimer((prev) => prev + 1), 1000);
    } else {
      setCallTimer(0);
    }
    return () => clearInterval(interval);
  }, [callActive]);

  // Initial Data Fetch
  useEffect(() => {
    fetchInitialData();
  }, []);

  // Auto-refresh data when active tab changes
  useEffect(() => {
    if (activeTab === 'officer') {
      fetchOfficerComplaints();
    } else if (activeTab === 'dashboard') {
      fetchDashboardData();
    } else if (activeTab === 'transparency') {
      fetchTransparencyComplaints();
    } else if (activeTab === 'phone') {
      fetchTelephonySessions();
    }
  }, [activeTab]);

  const fetchInitialData = async () => {
    try {
      const [orgsRes, officersRes] = await Promise.all([
        fetch('/api/orgs').then((r) => r.json()),
        fetch('/api/officers/list').then((r) => r.json()),
      ]);
      setOrgs(orgsRes);
      setOfficers(officersRes);
      if (orgsRes.length > 0) {
        setSelectedOrgId(orgsRes[0].id);
        fetchWardsForOrg(orgsRes[0].id);
      }
      fetchDashboardData();
      fetchOfficerComplaints();
      fetchTelephonySessions();
      // Auto-load sample token
      lookupTokenStatus('JD-2026-1001');
    } catch (err) {
      console.error('Failed to load initial data:', err);
    }
  };

  const fetchWardsForOrg = async (orgId: number) => {
    try {
      const data = await fetch(`/api/wards?org_id=${orgId}`).then((r) => r.json());
      setWards(data);
      if (data.length > 0) setSelectedWardId(data[0].id);
    } catch (err) {
      console.error('Error fetching wards:', err);
    }
  };

  const fetchDashboardData = async () => {
    try {
      const [sum, cats, scores, warns, overdue, clus] = await Promise.all([
        fetch('/api/dashboard/summary').then((r) => r.json()),
        fetch('/api/dashboard/by-category').then((r) => r.json()),
        fetch('/api/dashboard/hospital-scores').then((r) => r.json()),
        fetch('/api/dashboard/early-warnings').then((r) => r.json()),
        fetch('/api/dashboard/overdue').then((r) => r.json()),
        fetch('/api/dashboard/clusters').then((r) => r.json()),
      ]);
      setSummary(sum);
      setCategories(cats);
      setHospitalScores(scores);
      setEarlyWarnings(warns);
      setOverdueList(overdue);
      setClusters(clus);
    } catch (err) {
      console.error('Error loading dashboard data:', err);
    }
  };

  const fetchOfficerComplaints = async () => {
    try {
      const data = await fetch('/api/officer/complaints').then((r) => r.json());
      setOfficerComplaints(data);
    } catch (err) {
      console.error('Error loading officer complaints:', err);
    }
  };

  const fetchTransparencyComplaints = async () => {
    try {
      const data = await fetch('/api/transparency/complaints').then((r) => r.json());
      setTransparencyComplaints(data);
    } catch (err) {
      console.error('Error loading transparency records:', err);
    }
  };

  const fetchTelephonySessions = async () => {
    try {
      const data = await fetch('/api/telephony/sessions').then((r) => r.json());
      setTelephonyRecentSessions(data);
    } catch (err) {
      console.error('Error loading telephony sessions:', err);
    }
  };

  // Audio Tone Synthesizers for realistic phone dialing and ringing
  const playDtmfTone = (digit: string) => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const dtmfFreqs: Record<string, [number, number]> = {
        '1': [697, 1209], '2': [697, 1336], '3': [697, 1477],
        '4': [770, 1209], '5': [770, 1336], '6': [770, 1477],
        '7': [852, 1209], '8': [852, 1336], '9': [852, 1477],
        '*': [941, 1209], '0': [941, 1336], '#': [941, 1477]
      };
      const freqs = dtmfFreqs[digit] || [697, 1209];
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();
      osc1.frequency.value = freqs[0];
      osc2.frequency.value = freqs[1];
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);
      osc1.start();
      osc2.start();
      osc1.stop(ctx.currentTime + 0.16);
      osc2.stop(ctx.currentTime + 0.16);
    } catch {
      // Audio tone is optional enhancement
    }
  };

  const playRingTone = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();
      osc1.frequency.value = 440;
      osc2.frequency.value = 480;
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);
      osc1.start();
      osc2.start();
      osc1.stop(ctx.currentTime + 0.45);
      osc2.stop(ctx.currentTime + 0.45);
    } catch {
      // Ring tone is optional enhancement
    }
  };

  // Text-To-Speech Synthesis helper
  const speakText = (text: string, language: string = 'kn') => {
    try {
      if (!('speechSynthesis' in window) || !text) return;
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = language === 'kn' ? 0.9 : 0.95;
      utterance.pitch = 1.0;

      const voices = window.speechSynthesis.getVoices();
      const targetLang = language.toLowerCase();
      const matchedVoice = voices.find(
        (v) =>
          v.lang.toLowerCase().startsWith(targetLang) ||
          (targetLang === 'kn' && (v.lang.includes('IN') || v.name.toLowerCase().includes('india')))
      );
      if (matchedVoice) {
        utterance.voice = matchedVoice;
      } else {
        utterance.lang = language === 'kn' ? 'kn-IN' : 'en-IN';
      }

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);

      window.speechSynthesis.speak(utterance);
    } catch {
      setIsSpeaking(false);
    }
  };

  const stopSpeaking = () => {
    try {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        setIsSpeaking(false);
      }
    } catch {
      setIsSpeaking(false);
    }
  };

  // -------------------------------------------------------------
  // TAB 1: TELEPHONY SIMULATOR HANDLERS
  // -------------------------------------------------------------
  const startIncomingCall = async () => {
    playRingTone();
    setCallActive(true);
    setCallConnecting(true);
    setCallStep('WELCOME_LANG');
    setTelephonyLastDigits('1');
    setTelephonyCompletedToken('');
    setTelephonyRecognizedSpeech('');
    setTelephonyPromptText('ಜನಧ್ವನಿ ಸರ್ಕಾರಿ ಆಸ್ಪತ್ರೆ ನಾಗರಿಕ ಸಹಾಯವಾಣಿಗೆ ಸ್ವಾಗತ. ಸಂಪರ್ಕಿಸಲಾಗುತ್ತಿದೆ...');

    try {
      const res = await fetch('/api/telephony/incoming', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: telephonyPhoneInput || '9845012345',
          From: telephonyPhoneInput || '9845012345',
          To: '1800-425-0026',
        }),
      }).then((r) => r.json());

      setTelephonySession(res);
      setCallConnecting(false);
      setTelephonyPromptText(res.prompt_audio_text);
      speakText(res.prompt_audio_text, 'kn');
      fetchTelephonySessions();
    } catch {
      setCallConnecting(false);
      const fallbackPrompt = 'ಜನಧ್ವನಿ ಸರ್ಕಾರಿ ಆಸ್ಪತ್ರೆ ನಾಗರಿಕ ಸಹಾಯವಾಣಿಗೆ ಸ್ವಾಗತ. ಕನ್ನಡಕ್ಕಾಗಿ 1, English press 2, हिन्दी 3, తెలుగు 4, தமிழ் 5 ಒತ್ತಿರಿ.';
      setTelephonySession({
        call_sid: `CALL-${Date.now().toString(36).toUpperCase()}-1001`,
        from: telephonyPhoneInput || '9845012345',
        to: '1800-425-0026',
        step: 'WELCOME_LANG',
        language: 'kn',
        created_at: new Date().toISOString(),
        last_active: new Date().toISOString(),
      });
      setTelephonyPromptText(fallbackPrompt);
      speakText(fallbackPrompt, 'kn');
    }
  };

  const endCall = () => {
    setCallActive(false);
    setCallStep('IDLE');
    setTelephonySession(null);
    stopSpeaking();
  };

  const handleDtmfInput = async (digit: string) => {
    playDtmfTone(digit);
    setTelephonyLastDigits(digit);

    // If call is not yet connected, entering numbers lets user type/customize phone number
    if (!callActive) {
      if (['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'].includes(digit)) {
        setTelephonyPhoneInput((prev) => (prev.length < 10 ? prev + digit : digit));
      }
      return;
    }

    let currentSession = telephonySession;
    if (!currentSession) {
      // Auto-reconnect session to avoid any connection loss
      const sid = `CALL-${Date.now().toString(36).toUpperCase()}-1001`;
      currentSession = {
        call_sid: sid,
        from: telephonyPhoneInput || '9845012345',
        to: '1800-425-0026',
        step: 'WELCOME_LANG',
        language: 'kn',
        created_at: new Date().toISOString(),
        last_active: new Date().toISOString(),
      };
      setTelephonySession(currentSession);
    }

    try {
      const res = await fetch('/api/telephony/dtmf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          CallSid: currentSession.call_sid,
          Digits: digit,
        }),
      }).then((r) => r.json());

      if (res.status === 'CONTINUE') {
        setCallStep(res.step);
        if (res.selected_language) {
          setTelephonySelectedLang(res.selected_language.code);
        }
        setTelephonyPromptText(res.prompt_audio_text);
        speakText(res.prompt_audio_text, res.audio_lang || telephonySelectedLang);
      } else if (res.status === 'COMPLETED') {
        setCallStep('COMPLETED');
        setTelephonyCompletedToken(res.public_id);
        setTelephonyPromptText(res.prompt_audio_text);
        speakText(res.prompt_audio_text, res.audio_lang || telephonySelectedLang);
        showToast(
          lang === 'kn'
            ? `ದೂರು ಸಂಖ್ಯೆ ${res.public_id} ದಾಖಲಾಗಿದೆ!`
            : `Grievance Token ${res.public_id} successfully created!`,
          'success'
        );
        fetchDashboardData();
        fetchOfficerComplaints();
      }
      fetchTelephonySessions();
    } catch (err) {
      console.error('DTMF error:', err);
    }
  };

  const handleTelephonySpeechInput = async (spokenText: string) => {
    if (!spokenText.trim()) return;
    setTelephonyRecognizedSpeech(spokenText);

    // Auto-connect call if speech is entered before dialing
    let activeSid = telephonySession?.call_sid;
    if (!callActive || !activeSid) {
      playRingTone();
      setCallActive(true);
      const sid = `CALL-${Date.now().toString(36).toUpperCase()}-1001`;
      activeSid = sid;
      setTelephonySession({
        call_sid: sid,
        from: telephonyPhoneInput || '9845012345',
        to: '1800-425-0026',
        step: 'EXPLAIN_COMPLAINT',
        language: telephonySelectedLang || 'kn',
        created_at: new Date().toISOString(),
        last_active: new Date().toISOString(),
      });
    }

    try {
      const res = await fetch('/api/telephony/speech', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          CallSid: activeSid,
          SpeechResult: spokenText,
        }),
      }).then((r) => r.json());

      if (res.status === 'EMERGENCY_REFERRED') {
        setCallStep('EMERGENCY');
        setTelephonyPromptText(res.prompt_audio_text);
        speakText(res.prompt_audio_text, res.audio_lang || telephonySelectedLang);
      } else {
        setCallStep('CONFIRM');
        setTelephonyPromptText(res.prompt_audio_text);
        speakText(res.prompt_audio_text, res.audio_lang || telephonySelectedLang);
      }
      fetchTelephonySessions();
    } catch (err) {
      console.error('Speech error:', err);
    }
  };

  // Browser Mic for Telephony
  const toggleTelephonyMic = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      showToast('Browser speech recognition not available. Please click preset scenario buttons below.', 'info');
      return;
    }

    if (telephonyMicRecording) {
      setTelephonyMicRecording(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = telephonySelectedLang === 'kn' ? 'kn-IN' : 'en-IN';
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => setTelephonyMicRecording(true);
      recognition.onresult = (event: any) => {
        const text = event.results[0][0].transcript;
        setTelephonyRecognizedSpeech(text);
        handleTelephonySpeechInput(text);
      };
      recognition.onerror = () => setTelephonyMicRecording(false);
      recognition.onend = () => setTelephonyMicRecording(false);
      recognition.start();
    } catch {
      setTelephonyMicRecording(false);
    }
  };

  // -------------------------------------------------------------
  // TAB 2: CITIZEN WEB INTAKE SUBMIT
  // -------------------------------------------------------------
  const submitCitizenWebComplaint = async (e: React.FormEvent) => {
    e.preventDefault();
    const textToSubmit = voiceInputText.trim();
    if (!textToSubmit) {
      showToast(lang === 'kn' ? 'ದಯವಿಟ್ಟು ದೂರನ್ನು ಬರೆಯಿರಿ ಅಥವಾ ಮಾತನಾಡಿ.' : 'Please enter or speak your hospital grievance details.', 'error');
      return;
    }

    setVoiceSubmitting(true);
    try {
      const payload = {
        text: textToSubmit,
        organization_id: selectedOrgId || 1,
        ward_id: selectedWardId || 101,
        department_code: 'HEALTH',
        language: lang,
        channel: 'VOICE_WEB',
        phone: voicePhone || '9845012345',
        citizen_name: voiceName || (lang === 'kn' ? 'ಆಸ್ಪತ್ರೆ ನಾಗರಿಕ' : 'Hospital Patient'),
        is_anonymous: false,
      };

      const res = await fetch('/api/complaints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }).then((r) => r.json());

      if (res && res.public_id) {
        setNewlyCreatedTicket(res);
        setVoiceInputText('');
        const spokenAck = lang === 'kn' ? (res.message_kn || res.message) : (res.english_ack || res.message);
        speakText(spokenAck, lang);
        showToast(
          lang === 'kn' ? `ದೂರು ಸಂಖ್ಯೆ ${res.public_id} ದಾಖಲಾಗಿದೆ!` : `Grievance Token ${res.public_id} successfully created!`,
          'success'
        );
        fetchDashboardData();
        fetchOfficerComplaints();
      } else {
        showToast(res.message || 'Error creating complaint', 'error');
      }
    } catch (err: any) {
      showToast('Submission error: ' + err.message, 'error');
    } finally {
      setVoiceSubmitting(false);
    }
  };

  // Browser Mic for Citizen Web Intake
  const toggleCitizenWebMic = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      showToast('Browser Speech Recognition not supported. Please type or use sample hospital grievances.', 'info');
      return;
    }

    if (voiceIsRecording) {
      setVoiceIsRecording(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = lang === 'kn' ? 'kn-IN' : 'en-IN';
      recognition.interimResults = false;
      recognition.onstart = () => setVoiceIsRecording(true);
      recognition.onresult = (event: any) => {
        const text = event.results[0][0].transcript;
        setVoiceInputText((prev) => (prev ? prev + ' ' + text : text));
      };
      recognition.onerror = () => setVoiceIsRecording(false);
      recognition.onend = () => setVoiceIsRecording(false);
      recognition.start();
    } catch {
      setVoiceIsRecording(false);
    }
  };

  // -------------------------------------------------------------
  // TAB 3: HOSPITAL KIOSK 1-CLICK TICKET GENERATION
  // -------------------------------------------------------------
  const handleKioskCardClick = async (card: {
    title: string;
    text: string;
    cat: string;
  }) => {
    setKioskSubmitting(true);
    try {
      const payload = {
        text: card.text,
        organization_id: kioskHospitalId || 1,
        ward_id: 101,
        department_code: 'HEALTH',
        language: 'kn',
        channel: 'KIOSK',
        phone: '9845000000',
        citizen_name: 'ಆಸ್ಪತ್ರೆ ಕಿಯೋಸ್ಕ್ ನಾಗರಿಕ',
        is_anonymous: false,
      };

      const res = await fetch('/api/complaints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }).then((r) => r.json());

      if (res && res.public_id) {
        setKioskCreatedTicket(res);
        const spokenText = `ಜನಧ್ವನಿ: ನಿಮ್ಮ ${card.title} ದೂರು ಸಂಖ್ಯೆ ${res.public_id} ಯಶಸ್ವಿಯಾಗಿ ದಾಖಲಾಗಿದೆ. ಕರ್ತವ್ಯ ವೈದ್ಯಾಧಿಕಾರಿಗಳು ತಕ್ಷಣ ಪರಿಶೀಲಿಸಲಿದ್ದಾರೆ. ದಯವಿಟ್ಟು ರಸೀದಿ ಮುದ್ರಿಸಿಕೊಳ್ಳಿ.`;
        speakText(spokenText, 'kn');
        showToast(`Token ${res.public_id} created successfully!`, 'success');
        fetchDashboardData();
        fetchOfficerComplaints();
      }
    } catch (err: any) {
      showToast('Kiosk registration notice: ' + err.message, 'error');
    } finally {
      setKioskSubmitting(false);
    }
  };

  // -------------------------------------------------------------
  // TAB 4: TOKEN LOOKUP & CITIZEN VERIFICATION
  // -------------------------------------------------------------
  const lookupTokenStatus = async (tokenId?: string) => {
    const query = (tokenId || searchToken).trim().toUpperCase();
    if (!query) return;

    setStatusLoading(true);
    setStatusError(null);

    try {
      const res = await fetch(`/api/complaints/${encodeURIComponent(query)}/status`);
      if (!res.ok) {
        const errorJson = await res.json();
        setStatusError(lang === 'kn' ? errorJson.message_kn || errorJson.message : errorJson.message);
        setSearchedComplaint(null);
        setSearchedAuditTrail([]);
        return;
      }

      const data = await res.json();
      setSearchedComplaint(data.complaint);
      setSearchedAuditTrail(data.audit_trail || []);

      const audioSpeech = lang === 'kn' ? data.audio_text_kn : data.audio_text_en;
      speakText(audioSpeech, lang);
    } catch (err: any) {
      setStatusError('Lookup error: ' + err.message);
      setSearchedComplaint(null);
    } finally {
      setStatusLoading(false);
    }
  };

  const handleCitizenVerification = async (action: 'confirm' | 'reopen') => {
    if (!searchedComplaint) return;
    try {
      const res = await fetch(`/api/complaints/${searchedComplaint.public_id}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          notes: verificationNotes || 'Citizen verified via hospital portal',
        }),
      }).then((r) => r.json());

      showToast(lang === 'kn' ? res.message_kn || res.message : res.message, 'success');
      lookupTokenStatus(searchedComplaint.public_id);
      fetchDashboardData();
    } catch (err: any) {
      showToast('Verification error: ' + err.message, 'error');
    }
  };

  const handleRatingSubmit = async (stars: number) => {
    if (!searchedComplaint) return;
    try {
      await fetch(`/api/complaints/${searchedComplaint.public_id}/rating`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stars,
          feedback: `Rating from hospital portal: ${stars} Stars`,
        }),
      });
      setSelectedRating(stars);
      showToast(lang === 'kn' ? `ಧನ್ಯವಾದಗಳು! ${stars} Star rating ದಾಖಲಾಗಿದೆ.` : `Thank you! ${stars} Star rating recorded.`, 'success');
      lookupTokenStatus(searchedComplaint.public_id);
    } catch (err: any) {
      showToast('Rating error: ' + err.message, 'error');
    }
  };

  // -------------------------------------------------------------
  // TAB 5: OFFICER ACTION HANDLER (Resolve, In Progress, Snooze, Reassign)
  // -------------------------------------------------------------
  const submitOfficerAction = async () => {
    if (!activeModalComplaint) return;
    setActionLoading(true);

    try {
      const currentOfficer = officers.find((o) => o.id === activeOfficerId) || officers[0];

      if (actionType === 'SNOOZE') {
        const res = await fetch(`/api/complaints/${activeModalComplaint.public_id}/snooze`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            hours: snoozeHours,
            reason: actionNotes || 'Awaiting clinical supplies and biomedical inspection.',
            officer_id: currentOfficer.id,
          }),
        }).then((r) => r.json());
        showToast(res.message, 'success');
      } else if (actionType === 'REASSIGN') {
        const res = await fetch(`/api/complaints/${activeModalComplaint.public_id}/reassign`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            new_officer_id: reassignOfficerId,
            reason: actionNotes || 'Transferred for specialised clinical review.',
            actor_id: currentOfficer.id,
          }),
        }).then((r) => r.json());
        showToast(res.message, 'success');
      } else {
        const res = await fetch(`/api/complaints/${activeModalComplaint.public_id}/action`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action_type: actionType,
            notes: actionNotes || 'Hospital inspection and clinical duty executed.',
            officer_id: currentOfficer.id,
            photo_url: actionType === 'RESOLVED' ? 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&w=600&q=80' : null,
            location_gps: '16.2076, 77.3463',
          }),
        }).then((r) => r.json());
        showToast(res.message, 'success');
      }

      setActiveModalComplaint(null);
      setActionNotes('');
      fetchOfficerComplaints();
      fetchDashboardData();
    } catch (err: any) {
      showToast('Action error: ' + err.message, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Helper for priority badge colors
  const getPriorityBadge = (p: string) => {
    switch (p) {
      case 'CRITICAL':
        return <span className="px-2 py-0.5 text-[11px] font-bold rounded-md bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center gap-1"><Flame className="w-3 h-3 text-rose-400" /> CRITICAL (4h SLA)</span>;
      case 'HIGH':
        return <span className="px-2 py-0.5 text-[11px] font-bold rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30">HIGH (12h SLA)</span>;
      case 'MEDIUM':
        return <span className="px-2 py-0.5 text-[11px] font-bold rounded-md bg-teal-500/20 text-teal-300 border border-teal-500/30">MEDIUM (24h SLA)</span>;
      default:
        return <span className="px-2 py-0.5 text-[11px] font-bold rounded-md bg-slate-500/20 text-slate-300 border border-slate-500/30">LOW (48h)</span>;
    }
  };

  const getStatusBadge = (s: string, isOverdue: boolean) => {
    if (isOverdue || s === 'ESCALATED') {
      return <span className="px-2.5 py-0.5 text-[11px] font-bold rounded-full bg-rose-600 text-white animate-pulse flex items-center gap-1"><ShieldAlert className="w-3 h-3" /> ESCALATED TO DHO</span>;
    }
    switch (s) {
      case 'RESOLVED':
        return <span className="px-2.5 py-0.5 text-[11px] font-bold rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> RESOLVED</span>;
      case 'CLOSED':
        return <span className="px-2.5 py-0.5 text-[11px] font-bold rounded-full bg-slate-700 text-slate-300 border border-slate-600">CLOSED</span>;
      case 'IN_PROGRESS':
        return <span className="px-2.5 py-0.5 text-[11px] font-bold rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 flex items-center gap-1"><Activity className="w-3 h-3 animate-spin" /> IN PROGRESS</span>;
      case 'REOPENED':
        return <span className="px-2.5 py-0.5 text-[11px] font-bold rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">REOPENED</span>;
      default:
        return <span className="px-2.5 py-0.5 text-[11px] font-bold rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">PENDING</span>;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* ------------------------------------------------------------- */}
      {/* TOP STATUS BAR & HEADER */}
      {/* ------------------------------------------------------------- */}
      <header className="bg-slate-900/90 backdrop-blur-md border-b border-slate-800 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs border-b border-slate-800/60">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 font-bold text-teal-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              BSNL 5G · Toll-Free 1800-425-0026
            </span>
            <span className="text-slate-500">|</span>
            <span className="text-slate-400 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>Hospital Clock:</span>
              <span className="font-mono text-slate-200 font-semibold">
                {currentTime.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' })} IST
              </span>
            </span>
          </div>

          <div className="flex items-center gap-3">
            {isSpeaking && (
              <button
                onClick={stopSpeaking}
                className="flex items-center gap-1 px-2 py-1 rounded bg-rose-600/20 text-rose-300 border border-rose-500/30 text-[11px] hover:bg-rose-600/30 transition cursor-pointer"
              >
                <VolumeX className="w-3.5 h-3.5" />
                <span>ಧ್ವನಿ ನಿಲ್ಲಿಸಿ (Stop Audio)</span>
              </button>
            )}

            <button
              onClick={() => setLang((prev) => (prev === 'kn' ? 'en' : 'kn'))}
              className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-500/10 text-teal-300 border border-teal-500/30 font-bold hover:bg-teal-500/20 transition cursor-pointer"
            >
              <Volume2 className="w-3.5 h-3.5 text-teal-400" />
              <span>{lang === 'kn' ? '🔊 ಕನ್ನಡ (Kannada)' : 'English'}</span>
            </button>
          </div>
        </div>

        {/* Main Branding & Navigation Tabs */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-600 to-emerald-400 flex items-center justify-center text-white font-black text-xl shadow-lg shadow-teal-500/20">
              ಜ
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-extrabold tracking-tight text-white flex items-center gap-1.5">
                  <span>ಜನಧ್ವನಿ</span>
                  <span className="text-teal-400 font-mono text-base font-bold">JanaDhwani</span>
                </h1>
                <span className="px-2 py-0.5 text-[10px] uppercase font-bold tracking-wider bg-teal-900/60 text-teal-300 border border-teal-700/50 rounded">
                  Solvathon 2026
                </span>
              </div>
              <p className="text-slate-400 text-xs">
                {lang === 'kn'
                  ? 'ಕಲ್ಯಾಣ ಕರ್ನಾಟಕ ಸಾರ್ವಜನಿಕ ಆಸ್ಪತ್ರೆಗಳ ಧ್ವನಿ ಆಧಾರಿತ ದೂರು ಪರಿಹಾರ ವೇದಿಕೆ'
                  : 'Voice-Based Public Grievance & SLA Escalation Platform for Kalyana Karnataka'}
              </p>
            </div>
          </div>

          {/* Navigation Bar */}
          <nav className="flex items-center gap-1 overflow-x-auto py-1 scrollbar-none text-xs">
            <button
              onClick={() => setActiveTab('phone')}
              className={`px-3 py-2 rounded-lg font-bold flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap ${
                activeTab === 'phone'
                  ? 'bg-teal-600 text-white shadow-md shadow-teal-600/30'
                  : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              <Phone className="w-4 h-4 text-emerald-400" />
              <span>{lang === 'kn' ? '📞 ೧೮೦೦ ಹೆಲ್ಪ್‌ಲೈನ್' : '📞 1800 IVR Phone'}</span>
            </button>

            <button
              onClick={() => setActiveTab('kiosk')}
              className={`px-3 py-2 rounded-lg font-bold flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap ${
                activeTab === 'kiosk'
                  ? 'bg-teal-600 text-white shadow-md shadow-teal-600/30'
                  : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              <Layers className="w-4 h-4 text-cyan-400" />
              <span>{lang === 'kn' ? '🖥️ ಆಸ್ಪತ್ರೆ ಕಿಯೋಸ್ಕ್' : '🖥️ Hospital Kiosk'}</span>
            </button>

            <button
              onClick={() => setActiveTab('voice')}
              className={`px-3 py-2 rounded-lg font-bold flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap ${
                activeTab === 'voice'
                  ? 'bg-teal-600 text-white shadow-md shadow-teal-600/30'
                  : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              <Mic className="w-4 h-4 text-rose-400" />
              <span>{lang === 'kn' ? '🎙️ ಧ್ವನಿ ದೂರು' : '🎙️ Voice Intake'}</span>
            </button>

            <button
              onClick={() => setActiveTab('status')}
              className={`px-3 py-2 rounded-lg font-bold flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap ${
                activeTab === 'status'
                  ? 'bg-teal-600 text-white shadow-md shadow-teal-600/30'
                  : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              <Search className="w-4 h-4 text-amber-400" />
              <span>{lang === 'kn' ? '🔍 ಟೋಕನ್ ಸ್ಥಿತಿ' : '🔍 Token Status'}</span>
            </button>

            <button
              onClick={() => setActiveTab('officer')}
              className={`px-3 py-2 rounded-lg font-bold flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap ${
                activeTab === 'officer'
                  ? 'bg-teal-600 text-white shadow-md shadow-teal-600/30'
                  : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              <Stethoscope className="w-4 h-4 text-teal-400" />
              <span>{lang === 'kn' ? '👨‍⚕️ ವೈದ್ಯಾಧಿಕಾರಿ ಪೋರ್ಟಲ್' : '👨‍⚕️ Doctor Queue'}</span>
            </button>

            <button
              onClick={() => setActiveTab('dashboard')}
              className={`px-3 py-2 rounded-lg font-bold flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap ${
                activeTab === 'dashboard'
                  ? 'bg-teal-600 text-white shadow-md shadow-teal-600/30'
                  : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              <Activity className="w-4 h-4 text-blue-400" />
              <span>{lang === 'kn' ? '📊 ಡ್ಯಾಶ್‌ಬೋರ್ಡ್' : '📊 Executive Dashboard'}</span>
            </button>

            <button
              onClick={() => setActiveTab('transparency')}
              className={`px-3 py-2 rounded-lg font-bold flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap ${
                activeTab === 'transparency'
                  ? 'bg-teal-600 text-white shadow-md shadow-teal-600/30'
                  : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              <FileText className="w-4 h-4 text-purple-400" />
              <span>{lang === 'kn' ? '🌐 ಪಾರದರ್ಶಕತೆ' : '🌐 Transparency'}</span>
            </button>

            <button
              onClick={() => setActiveTab('admin')}
              className={`px-3 py-2 rounded-lg font-bold flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap ${
                activeTab === 'admin'
                  ? 'bg-teal-600 text-white shadow-md shadow-teal-600/30'
                  : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              <QrCode className="w-4 h-4 text-amber-300" />
              <span>{lang === 'kn' ? '📋 ವಾರ್ಡ್ ಕ್ಯೂಆರ್' : '📋 Ward Posters'}</span>
            </button>
          </nav>
        </div>
      </header>

      {/* ------------------------------------------------------------- */}
      {/* MAIN CONTENT AREA */}
      {/* ------------------------------------------------------------- */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">

        {/* ============================================================= */}
        {/* TAB 1: 📞 1800 PHONE HELPLINE & TELEPHONY SIMULATOR */}
        {/* ============================================================= */}
        {activeTab === 'phone' && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl">
                      <Phone className="w-6 h-6" />
                    </span>
                    <div>
                      <h2 className="text-xl font-bold text-white">
                        {lang === 'kn' ? '೧೮೦೦ ದೂರವಾಣಿ ಕಾಲ್ ಸಿಮ್ಯುಲೇಟರ್' : '1800 Toll-Free IVR Telephony Simulator'}
                      </h2>
                      <p className="text-slate-400 text-xs">
                        {lang === 'kn'
                          ? 'ಯಾವುದೇ ಸಾಮಾನ್ಯ ಕೀಪ್ಯಾಡ್ ಫೋನ್‌ನಿಂದ 1800-425-0026 ಗೆ ಕರೆ ಮಾಡಿ ೫ ಭಾಷೆಗಳಲ್ಲಿ ದೂರು ನೋಂದಾಯಿಸುವ ನೈಜ ಅನುಭವ'
                          : 'Carrier Webhook architecture (Twilio / Exotel / BSNL). Accessible from basic 2G feature phones with DTMF + Kannada voice intake.'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="bg-slate-950 px-4 py-2 rounded-xl border border-slate-800 flex items-center gap-3">
                    <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
                    <span className="text-xs font-mono text-emerald-400 font-bold">TOLL-FREE: 1800-425-0026</span>
                  </div>
                </div>
              </div>

              {/* Interactive Phone Layout */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6">
                {/* Phone Device Handset */}
                <div className="lg:col-span-5 bg-slate-950 p-6 rounded-2xl border border-slate-800 shadow-2xl flex flex-col items-center">
                  {/* Phone Screen */}
                  <div className="w-full bg-slate-900 rounded-xl p-4 border border-slate-800 mb-6 shadow-inner text-center">
                    <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono mb-2">
                      <span>BSNL 5G · KALYANA KARNATAKA</span>
                      <span>{currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>

                    <div className="text-2xl font-mono font-bold text-white tracking-widest my-1">
                      {callActive ? '1800-425-0026' : telephonyPhoneInput || '1800-425-0026'}
                    </div>

                    {callActive ? (
                      <div className="space-y-2 mt-3">
                        <div className="flex items-center justify-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                          <span className="text-emerald-400 font-bold text-xs">
                            CALL CONNECTED · {Math.floor(callTimer / 60)}:{(callTimer % 60).toString().padStart(2, '0')}
                          </span>
                        </div>

                        {/* Interactive Steps Progress */}
                        <div className="flex items-center justify-center gap-1.5 text-[11px] font-mono text-slate-400 pt-1">
                          <span className={callStep === 'WELCOME_LANG' ? 'text-teal-400 font-bold underline' : ''}>1. Lang</span>
                          <span>›</span>
                          <span className={callStep === 'SELECT_CATEGORY' ? 'text-teal-400 font-bold underline' : ''}>2. Cat</span>
                          <span>›</span>
                          <span className={callStep === 'EXPLAIN_COMPLAINT' ? 'text-teal-400 font-bold underline' : ''}>3. Speak</span>
                          <span>›</span>
                          <span className={callStep === 'CONFIRM' ? 'text-teal-400 font-bold underline' : ''}>4. Confirm</span>
                          <span>›</span>
                          <span className={callStep === 'COMPLETED' ? 'text-emerald-400 font-bold underline' : ''}>5. ID</span>
                        </div>

                        {/* Voice waveform animation */}
                        <div className="flex items-center justify-center gap-1 my-3 h-5">
                          <span className="w-1 bg-teal-400 rounded-full h-3 animate-pulse" />
                          <span className="w-1 bg-teal-400 rounded-full h-5 animate-pulse" style={{ animationDelay: '150ms' }} />
                          <span className="w-1 bg-teal-400 rounded-full h-2 animate-pulse" style={{ animationDelay: '300ms' }} />
                          <span className="w-1 bg-teal-400 rounded-full h-4 animate-pulse" style={{ animationDelay: '75ms' }} />
                          <span className="w-1 bg-teal-400 rounded-full h-6 animate-pulse" style={{ animationDelay: '200ms' }} />
                        </div>

                        <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-left text-xs text-slate-300 font-sans max-h-32 overflow-y-auto">
                          <span className="text-[10px] text-teal-400 font-bold uppercase block mb-1">
                            IVR Automated Voice Prompt:
                          </span>
                          <p className="leading-relaxed">{telephonyPromptText || 'Connecting to JanaDhwani toll-free helpline...'}</p>
                        </div>
                      </div>
                    ) : (
                      <div className="py-4 text-xs text-slate-500">
                        {lang === 'kn' ? 'ಕರೆ ಆರಂಭಿಸಲು ಕೆಳಗಿನ ಹಸಿರು ಬಟನ್ ಒತ್ತಿರಿ' : 'Press green button below to dial Toll-Free 1800-425-0026'}
                      </div>
                    )}
                  </div>

                  {/* DTMF Keypad Grid */}
                  <div className="grid grid-cols-3 gap-3 w-full max-w-[280px]">
                    {['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'].map((digit) => (
                      <button
                        key={digit}
                        onClick={() => handleDtmfInput(digit)}
                        className="h-12 bg-slate-900 hover:bg-slate-800 active:bg-teal-600 text-white font-mono text-lg font-bold rounded-xl border border-slate-800 hover:border-slate-700 transition flex items-center justify-center cursor-pointer shadow-sm active:scale-95"
                      >
                        {digit}
                      </button>
                    ))}
                  </div>

                  {/* Call Controls */}
                  <div className="flex items-center justify-center gap-4 mt-6 w-full">
                    {!callActive ? (
                      <button
                        onClick={startIncomingCall}
                        disabled={callConnecting}
                        className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 transition cursor-pointer disabled:opacity-75"
                      >
                        {callConnecting ? (
                          <>
                            <RefreshCw className="w-5 h-5 animate-spin" />
                            <span>{lang === 'kn' ? 'ಸಂಪರ್ಕಿಸಲಾಗುತ್ತಿದೆ...' : 'Connecting...'}</span>
                          </>
                        ) : (
                          <>
                            <PhoneCall className="w-5 h-5" />
                            <span>{lang === 'kn' ? 'ಕರೆ ಮಾಡಿ (Dial 1800)' : 'Dial 1800 Toll-Free'}</span>
                          </>
                        )}
                      </button>
                    ) : (
                      <button
                        onClick={endCall}
                        className="flex-1 py-3 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-rose-600/30 transition cursor-pointer"
                      >
                        <PhoneOff className="w-5 h-5" />
                        <span>{lang === 'kn' ? 'ಕರೆ ಕೊನೆಗೊಳಿಸಿ (Hang Up)' : 'End Call'}</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Right Interactive Scenario Controls & Instructions */}
                <div className="lg:col-span-7 space-y-4">
                  {/* Step Guidance Card */}
                  <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800">
                    <h3 className="font-bold text-white text-sm mb-3 flex items-center gap-2">
                      <Sliders className="w-4 h-4 text-teal-400" />
                      <span>Current Call Stage Actions</span>
                    </h3>

                    {!callActive && (
                      <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 text-xs text-slate-400 leading-relaxed space-y-2">
                        <p className="font-semibold text-slate-200">
                          {lang === 'kn'
                            ? 'ಜನಧ್ವನಿ ದೂರವಾಣಿ ಸಹಾಯವಾಣಿ ಹೇಗೆ ಕಾರ್ಯನಿರ್ವಹಿಸುತ್ತದೆ:'
                            : 'How JanaDhwani Toll-Free IVR works in production:'}
                        </p>
                        <ul className="list-disc pl-4 space-y-1 text-slate-400">
                          <li>Citizens dial 1800-425-0026 from basic Nokia/Jio feature phones without internet.</li>
                          <li>Multilingual IVR answers with Kannada greeting and accepts DTMF keypad inputs (1-5).</li>
                          <li>AI Speech recognition converts voice grievances directly into structured tickets.</li>
                          <li>Every intake is stamped into a tamper-evident SHA-256 cryptographic audit block.</li>
                        </ul>
                        <button
                          onClick={startIncomingCall}
                          className="mt-2 px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-lg text-xs flex items-center gap-2 transition cursor-pointer"
                        >
                          <PhoneCall className="w-4 h-4" />
                          <span>Start 1800 Helpline Test Call Now</span>
                        </button>
                      </div>
                    )}

                    {callActive && callStep === 'WELCOME_LANG' && (
                      <div className="space-y-3">
                        <p className="text-xs text-slate-300">
                          {lang === 'kn'
                            ? 'ಭಾಷೆಯನ್ನು ಆಯ್ಕೆ ಮಾಡಲು ಕೀಪ್ಯಾಡ್ ಸಂಖ್ಯೆಯನ್ನು ಒತ್ತಿರಿ ಅಥವಾ ಕೆಳಗಿನ ಆಯ್ಕೆಯನ್ನು ಕ್ಲಿಕ್ ಮಾಡಿ:'
                            : 'Select preferred language by pressing the keypad or clicking below:'}
                        </p>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {[
                            { k: '1', lang: 'ಕನ್ನಡ (Kannada)', code: 'kn' },
                            { k: '2', lang: 'English', code: 'en' },
                            { k: '3', lang: 'हिन्दी (Hindi)', code: 'hi' },
                            { k: '4', lang: 'తెలుగు (Telugu)', code: 'te' },
                            { k: '5', lang: 'தமிழ் (Tamil)', code: 'ta' },
                          ].map((item) => (
                            <button
                              key={item.k}
                              onClick={() => handleDtmfInput(item.k)}
                              className="p-3 bg-slate-950 hover:bg-teal-900/30 border border-slate-800 hover:border-teal-500/50 rounded-xl text-left transition cursor-pointer flex items-center justify-between"
                            >
                              <div>
                                <span className="font-bold text-white text-xs block">{item.lang}</span>
                                <span className="text-[10px] text-slate-400">Press {item.k}</span>
                              </div>
                              <span className="w-6 h-6 rounded-full bg-slate-800 text-slate-200 flex items-center justify-center font-bold text-xs font-mono">
                                {item.k}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {callActive && callStep === 'SELECT_CATEGORY' && (
                      <div className="space-y-3">
                        <p className="text-xs text-slate-300">
                          {lang === 'kn'
                            ? 'ದೂರು ವಿಭಾಗ ಆಯ್ಕೆ ಮಾಡಲು ಸಂಖ್ಯೆ 1 ರಿಂದ 7 ಒತ್ತಿರಿ:'
                            : 'Select complaint category by pressing digits 1 to 7:'}
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                          {[
                            { k: '1', en: 'Drinking Water & Toilets', kn: 'ಕುಡಿಯುವ ನೀರು ಮತ್ತು ಶೌಚಾಲಯ' },
                            { k: '2', en: 'Medicine Shortage', kn: 'ಔಷಧಿ ಮತ್ತು ಇಂಜೆಕ್ಷನ್ ಕೊರತೆ' },
                            { k: '3', en: 'Hygiene & Cleanliness', kn: 'ಆಸ್ಪತ್ರೆ ಸ್ವಚ್ಛತೆ ಮತ್ತು ನೈರ್ಮಲ್ಯ' },
                            { k: '4', en: 'Doctor Absent / Unavailable', kn: 'ವೈದ್ಯರ ಗೈರುಹಾಜರಿ' },
                            { k: '5', en: 'Beds & Wheelchairs', kn: 'ಹಾಸಿಗೆಗಳು ಮತ್ತು ವೀಲ್‌ಚೇರ್' },
                            { k: '6', en: 'Equipment & Repairs', kn: 'ವಿದ್ಯುತ್ ಮತ್ತು ವೈದ್ಯಕೀಯ ಉಪಕರಣ' },
                            { k: '7', en: 'Other Hospital Complaints', kn: 'ಇತರ ಆಸ್ಪತ್ರೆ ಸಮಸ್ಯೆಗಳು' },
                          ].map((item) => (
                            <button
                              key={item.k}
                              onClick={() => handleDtmfInput(item.k)}
                              className="p-2.5 bg-slate-950 hover:bg-teal-900/30 border border-slate-800 hover:border-teal-500/50 rounded-xl text-left transition cursor-pointer flex items-center justify-between"
                            >
                              <span className="font-semibold text-slate-200 text-xs">
                                {telephonySelectedLang === 'kn' ? item.kn : item.en}
                              </span>
                              <span className="w-5 h-5 rounded-full bg-teal-900/60 text-teal-300 flex items-center justify-center font-bold text-xs font-mono">
                                {item.k}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {callActive && callStep === 'EXPLAIN_COMPLAINT' && (
                      <div className="space-y-4">
                        <div className="bg-teal-950/40 border border-teal-800/60 rounded-xl p-3 text-xs text-teal-200">
                          <span className="font-bold block mb-1">🎙️ Speak naturally or test sample speech:</span>
                          <p>
                            {lang === 'kn'
                              ? 'ನಿಮ್ಮ ಆಸ್ಪತ್ರೆಯ ಹೆಸರು (ಉದಾ: ಕಲಬುರಗಿ, ಬೀದರ್, ರಾಯಚೂರು, ಕೊಪ್ಪಳ, ಯಾದಗಿರಿ) ಮತ್ತು ಸಮಸ್ಯೆಯನ್ನು ಮಾತನಾಡಿ.'
                              : 'Mention your district hospital name (e.g. Kalaburagi, Bidar, Raichur, Koppal, Yadgir) and explain your issue.'}
                          </p>
                        </div>

                        <div className="flex items-center gap-3">
                          <button
                            onClick={toggleTelephonyMic}
                            className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 shadow-md transition cursor-pointer ${
                              telephonyMicRecording
                                ? 'bg-rose-600 text-white animate-pulse'
                                : 'bg-teal-600 hover:bg-teal-500 text-white'
                            }`}
                          >
                            {telephonyMicRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                            <span>
                              {telephonyMicRecording
                                ? 'ರೆಕಾರ್ಡಿಂಗ್ ನಿಲ್ಲಿಸಿ (Stop Mic)'
                                : `ಮೈಕ್ರೋಫೋನ್‌ನಲ್ಲಿ ಮಾತನಾಡಿ (${telephonySelectedLang.toUpperCase()} Mic)`}
                            </span>
                          </button>
                        </div>

                        <div>
                          <span className="text-xs font-bold text-slate-400 block mb-2">
                            Quick-Test Realistic Citizen Voice Scenarios:
                          </span>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                            <button
                              onClick={() =>
                                handleTelephonySpeechInput(
                                  'ಕಲಬುರಗಿ ಜಿಲ್ಲಾ ಆಸ್ಪತ್ರೆಯ ಹೆರಿಗೆ ವಾರ್ಡ್‌ನಲ್ಲಿ ಕುಡಿಯುವ ನೀರಿನ ಫಿಲ್ಟರ್ ಕೆಟ್ಟುಹೋಗಿದೆ, ರೋಗಿಗಳಿಗೆ ಕುಡಿಯಲು ನೀರಿಲ್ಲ'
                                )
                              }
                              className="p-3 bg-slate-950 hover:bg-teal-950/50 border border-slate-800 hover:border-teal-500/40 rounded-xl text-left transition cursor-pointer"
                            >
                              <span className="px-1.5 py-0.5 bg-teal-900/60 text-teal-300 text-[10px] font-bold rounded">
                                ಕನ್ನಡ · Kalaburagi
                              </span>
                              <p className="font-bold text-slate-200 mt-1">ಕುಡಿಯುವ ನೀರಿಲ್ಲ (Water Filter)</p>
                              <p className="text-slate-400 text-[11px] truncate">ಕಲಬುರಗಿ ಜಿಲ್ಲಾ ಆಸ್ಪತ್ರೆ ಹೆರಿಗೆ ವಾರ್ಡ್...</p>
                            </button>

                            <button
                              onClick={() =>
                                handleTelephonySpeechInput(
                                  'Raichur District Hospital pharmacy has a severe shortage of insulin and essential antibiotics'
                                )
                              }
                              className="p-3 bg-slate-950 hover:bg-teal-950/50 border border-slate-800 hover:border-teal-500/40 rounded-xl text-left transition cursor-pointer"
                            >
                              <span className="px-1.5 py-0.5 bg-blue-900/60 text-blue-300 text-[10px] font-bold rounded">
                                English · Raichur
                              </span>
                              <p className="font-bold text-slate-200 mt-1">Insulin Shortage (Pharmacy)</p>
                              <p className="text-slate-400 text-[11px] truncate">Severe shortage of insulin tablets...</p>
                            </button>

                            <button
                              onClick={() =>
                                handleTelephonySpeechInput(
                                  'ಬೀದರ್ ಜಿಲ್ಲಾ ಆಸ್ಪತ್ರೆಯ ತುರ್ತು ಚಿಕಿತ್ಸಾ ಘಟಕದಲ್ಲಿ ವೈದ್ಯರು ಗೈರುಹಾಜರಾಗಿದ್ದಾರೆ'
                                )
                              }
                              className="p-3 bg-slate-950 hover:bg-teal-950/50 border border-slate-800 hover:border-teal-500/40 rounded-xl text-left transition cursor-pointer"
                            >
                              <span className="px-1.5 py-0.5 bg-purple-900/60 text-purple-300 text-[10px] font-bold rounded">
                                ಕನ್ನಡ · Bidar
                              </span>
                              <p className="font-bold text-slate-200 mt-1">ಡಾಕ್ಟರ್ ಗೈರುಹಾಜರಿ (Doctor Absent)</p>
                              <p className="text-slate-400 text-[11px] truncate">ಬೀದರ್ ಜಿಲ್ಲಾ ಆಸ್ಪತ್ರೆ ತುರ್ತು ಘಟಕ...</p>
                            </button>

                            <button
                              onClick={() =>
                                handleTelephonySpeechInput(
                                  'ತುರ್ತು ಅಪಘಾತವಾಗಿದೆ, ತೀವ್ರ ರಕ್ತಸ್ರಾವವಾಗುತ್ತಿದೆ, ಆಂಬ್ಯುಲೆನ್ಸ್ 108 ತಕ್ಷಣ ಬೇಕು!'
                                )
                              }
                              className="p-3 bg-rose-950/40 hover:bg-rose-900/40 border border-rose-800/60 rounded-xl text-left transition cursor-pointer"
                            >
                              <span className="px-1.5 py-0.5 bg-rose-900/80 text-rose-200 text-[10px] font-bold rounded">
                                🚨 108 EMERGENCY
                              </span>
                              <p className="font-bold text-rose-200 mt-1">Accident & 108 Routing</p>
                              <p className="text-rose-300 text-[11px] truncate">ಆಂಬ್ಯುಲೆನ್ಸ್ 108 ತಕ್ಷಣ ಬೇಕು...</p>
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {callActive && callStep === 'CONFIRM' && (
                      <div className="space-y-4">
                        <div className="bg-slate-950 p-4 rounded-xl border border-teal-500/30">
                          <span className="text-[11px] font-bold uppercase text-teal-400 block mb-1">
                            Recorded Voice Grievance Summary:
                          </span>
                          <p className="text-sm font-semibold text-white">
                            "{telephonyRecognizedSpeech || 'Hospital facility grievance recorded'}"
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => handleDtmfInput('1')}
                            className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition cursor-pointer"
                          >
                            <Check className="w-4 h-4" />
                            <span>Press 1: Confirm & Register Ticket (ದೃಢೀಕರಿಸಿ)</span>
                          </button>
                          <button
                            onClick={() => handleDtmfInput('2')}
                            className="py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs transition cursor-pointer"
                          >
                            Press 2: Retry (ತಿದ್ದುಪಡಿ)
                          </button>
                        </div>
                      </div>
                    )}

                    {callActive && callStep === 'COMPLETED' && (
                      <div className="space-y-4 text-center py-4 bg-slate-950 rounded-xl border border-emerald-500/40 p-6">
                        <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                          <CheckCircle2 className="w-8 h-8" />
                        </div>
                        <div>
                          <span className="text-xs text-slate-400 uppercase font-mono block">
                            HOSPITAL GRIEVANCE TOKEN NUMBER
                          </span>
                          <span className="text-3xl font-black font-mono text-emerald-400 block mt-1 tracking-wider">
                            {telephonyCompletedToken || 'JD-2026-XXXX'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-300 max-w-md mx-auto">
                          {lang === 'kn'
                            ? 'ನಿಮ್ಮ ಆಸ್ಪತ್ರೆ ದೂರು ಯಶಸ್ವಿಯಾಗಿ ದಾಖಲಾಗಿದೆ. ಕರ್ತವ್ಯ ವೈದ್ಯಾಧಿಕಾರಿಗಳಿಗೆ ತಕ್ಷಣ ಸೂಚನೆ ರವಾನಿಸಲಾಗಿದೆ.'
                            : 'Grievance ticket committed to SHA-256 cryptographic audit ledger. SMS confirmation dispatched.'}
                        </p>
                        <div className="flex items-center justify-center gap-3 pt-2">
                          <button
                            onClick={() => {
                              setSearchToken(telephonyCompletedToken);
                              setActiveTab('status');
                              lookupTokenStatus(telephonyCompletedToken);
                            }}
                            className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-lg text-xs flex items-center gap-2 transition cursor-pointer"
                          >
                            <Search className="w-4 h-4" />
                            <span>Track SLA & Status Now</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {callActive && callStep === 'EMERGENCY' && (
                      <div className="space-y-3 bg-rose-950/60 border border-rose-600 rounded-xl p-5 text-center">
                        <div className="w-12 h-12 rounded-full bg-rose-600/30 text-rose-300 flex items-center justify-center mx-auto animate-bounce">
                          <Flame className="w-7 h-7 text-rose-400" />
                        </div>
                        <h4 className="text-base font-bold text-rose-200">
                          🚨 108 EMERGENCY TRIAGE ACTIVATED!
                        </h4>
                        <p className="text-xs text-rose-200 leading-relaxed">
                          Speech analysis detected life-threatening medical emergency. Call automatically routed to
                          Karnataka State Emergency Ambulance Command Center (108).
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Carrier Webhook Architecture Info */}
                  <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 text-xs font-mono space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-200 font-sans">
                        Telecom Carrier Webhook Architecture (Twilio, Exotel & BSNL Toll-Free)
                      </span>
                      <span className="px-2 py-0.5 bg-slate-800 text-slate-300 rounded text-[10px]">
                        Live API Endpoints
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px]">
                      <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                        <span className="text-emerald-400 font-bold block mb-1">POST /api/telephony/incoming</span>
                        <p className="text-slate-400 font-sans">
                          Initial call answered · Plays multilingual greeting and gathers language DTMF
                        </p>
                      </div>
                      <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                        <span className="text-emerald-400 font-bold block mb-1">POST /api/telephony/dtmf</span>
                        <p className="text-slate-400 font-sans">
                          Handles keypad button presses for Language (1-5), Category (1-7), and Confirm (1-2)
                        </p>
                      </div>
                      <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                        <span className="text-emerald-400 font-bold block mb-1">POST /api/telephony/speech</span>
                        <p className="text-slate-400 font-sans">
                          AI audio processing · Extracts hospital & category · Checks 108 emergency triage
                        </p>
                      </div>
                      <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                        <span className="text-emerald-400 font-bold block mb-1">POST /api/telephony/confirm</span>
                        <p className="text-slate-400 font-sans">
                          Finalizes intake · Issues JD-2026-XXXX ID · Writes to SHA-256 audit log
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Telephony Sessions Table */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-bold text-white text-base">Telephony Call Sessions & Audit Records</h3>
                  <p className="text-xs text-slate-400">Live call logs handled by the 1800-425-0026 IVR subsystem</p>
                </div>
                <button
                  onClick={fetchTelephonySessions}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-lg flex items-center gap-1.5 transition cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Refresh Logs</span>
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400">
                      <th className="pb-3 font-semibold">Call SID</th>
                      <th className="pb-3 font-semibold">Caller Phone</th>
                      <th className="pb-3 font-semibold">Language</th>
                      <th className="pb-3 font-semibold">Hospital & Category</th>
                      <th className="pb-3 font-semibold">Grievance Summary</th>
                      <th className="pb-3 font-semibold">Registered ID</th>
                      <th className="pb-3 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300">
                    {telephonyRecentSessions.map((s) => (
                      <tr key={s.call_sid} className="hover:bg-slate-800/30">
                        <td className="py-3 text-teal-400">{s.call_sid}</td>
                        <td className="py-3">{s.from}</td>
                        <td className="py-3 uppercase">{s.language}</td>
                        <td className="py-3 font-sans">{s.category_text || 'Drinking Water & Sanitation'}</td>
                        <td className="py-3 font-sans max-w-xs truncate">{s.speech_text || 'Hospital grievance logged'}</td>
                        <td className="py-3 font-bold text-emerald-400">{s.public_id || 'IN_PROGRESS'}</td>
                        <td className="py-3">
                          <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            {s.step}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================= */}
        {/* TAB 2: 🖥️ HOSPITAL TOUCHSCREEN KIOSK (1-CLICK CITIZEN FLOW) */}
        {/* ============================================================= */}
        {activeTab === 'kiosk' && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
                <div>
                  <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
                    <span>ಆಸ್ಪತ್ರೆ ಕಿಯೋಸ್ಕ್ - ದೃಶ್ಯ ಐಕಾನ್ ಮೂಲಕ ೧-ಕ್ಲಿಕ್ ದೂರು</span>
                  </h2>
                  <p className="text-slate-400 text-xs mt-1">
                    {lang === 'kn'
                      ? 'ಓದಲು-ಬರೆಯಲು ಬಾರದ ಗ್ರಾಮೀಣ ರೋಗಿಗಳಿಗೆ ದೊಡ್ಡ ಚಿತ್ರಗಳ ಮೂಲಕ ಸುಲಭ ನೋಂದಣಿ ಹಾಗೂ ಕನ್ನಡ ಧ್ವನಿ ರಸೀದಿ'
                      : 'Icon-driven touchscreen flow for rural and non-literate patients with instant spoken Kannada voice feedback'}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400 font-bold">Hospital Location:</span>
                  <select
                    value={kioskHospitalId}
                    onChange={(e) => setKioskHospitalId(parseInt(e.target.value))}
                    className="bg-slate-950 border border-slate-700 text-white text-xs rounded-xl px-3 py-2 font-bold focus:ring-2 focus:ring-teal-500"
                  >
                    {orgs.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.kannada_name} ({o.district})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 6 Large Accessible Visual Kiosk Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
                {[
                  {
                    icon: '🚰',
                    title: 'ಕುಡಿಯುವ ನೀರು / ಶೌಚಾಲಯ',
                    sub: 'Drinking Water & Toilet',
                    text: 'ಆಸ್ಪತ್ರೆಯ ಕುಡಿಯುವ ನೀರಿನ ಪೂರೈಕೆ ಸ್ಥಗಿತಗೊಂಡಿದೆ ನಲ್ಲಿಗಳು ಕೆಲಸ ಮಾಡುತ್ತಿಲ್ಲ',
                    cat: 'Drinking Water & Sanitation',
                    color: 'from-blue-600/30 to-cyan-600/10 border-blue-500/40',
                  },
                  {
                    icon: '💊',
                    title: 'ಔಷಧಿ & ಇಂಜೆಕ್ಷನ್ ಸಿಗುತ್ತಿಲ್ಲ',
                    sub: 'Medicine & Injection Shortage',
                    text: 'ಔಷಧಾಲಯದಲ್ಲಿ ಮಾತ್ರೆಗಳು ಮತ್ತು ಸಿರಪ್ ಲಭ್ಯವಿಲ್ಲ ಔಷಧಿ ಕೊರತೆ ಇದೆ',
                    cat: 'Medicine Shortage',
                    color: 'from-amber-600/30 to-orange-600/10 border-amber-500/40',
                  },
                  {
                    icon: '🧹',
                    title: 'ವಾರ್ಡ್ ಸ್ವಚ್ಛತೆ & ಕಸ',
                    sub: 'Ward Hygiene & Cleanliness',
                    text: 'ವಾರ್ಡ್‌ನಲ್ಲಿ ಕಸ ತುಂಬಿದ್ದು ದುರ್ನಾತ ಬರುತ್ತಿದೆ ಸ್ವಚ್ಛತೆ ಇಲ್ಲ',
                    cat: 'Hygiene & Cleanliness',
                    color: 'from-emerald-600/30 to-teal-600/10 border-emerald-500/40',
                  },
                  {
                    icon: '👨‍⚕️',
                    title: 'ವೈದ್ಯರು / ನರ್ಸ್ ಬಂದಿಲ್ಲ',
                    sub: 'Doctor & Nurse Absent',
                    text: 'ವೈದ್ಯರು ಮತ್ತು ನರ್ಸ್ ಸಮಯಕ್ಕೆ ಸರಿಯಾಗಿ ಬಂದಿಲ್ಲ ರೋಗಿಗಳು ಕಾಯುತ್ತಿದ್ದಾರೆ',
                    cat: 'Doctor/Staff Absent',
                    color: 'from-purple-600/30 to-indigo-600/10 border-purple-500/40',
                  },
                  {
                    icon: '🛏️',
                    title: 'ಹಾಸಿಗೆ / ವೀಲ್‌ಚೇರ್',
                    sub: 'Beds & Wheelchairs',
                    text: 'ರೋಗಿಗಳಿಗೆ ಮಲಗಲು ಬೆಡ್ ಇಲ್ಲ ವೀಲ್‌ಚೇರ್ ಮತ್ತು ಸ್ಟ್ರೆಚರ್ ಮುರಿದಿದೆ',
                    cat: 'Beds, Wheelchairs & Stretchers',
                    color: 'from-pink-600/30 to-rose-600/10 border-pink-500/40',
                  },
                  {
                    icon: '🚑',
                    title: 'ಆಂಬ್ಯುಲೆನ್ಸ್ & ತುರ್ತು ಸೇವೆ',
                    sub: 'Ambulance & Emergency Care',
                    text: 'ತುರ್ತು ಚಿಕಿತ್ಸಾ ವಿಭಾಗದಲ್ಲಿ ಆಂಬ್ಯುಲೆನ್ಸ್ ಮತ್ತು ಆಕ್ಸಿಜನ್ ಲಭ್ಯವಿಲ್ಲ',
                    cat: 'Ambulance & Emergency Care',
                    color: 'from-rose-600/30 to-red-600/10 border-rose-500/40',
                  },
                ].map((card, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleKioskCardClick(card)}
                    disabled={kioskSubmitting}
                    className={`p-6 rounded-2xl bg-gradient-to-b ${card.color} border hover:border-teal-400 active:scale-95 transition cursor-pointer text-left flex flex-col justify-between group shadow-lg`}
                  >
                    <div>
                      <span className="text-4xl block mb-3 group-hover:scale-110 transition-transform">
                        {card.icon}
                      </span>
                      <h3 className="text-lg font-bold text-white leading-snug">{card.title}</h3>
                      <p className="text-xs text-slate-300 mt-1">{card.sub}</p>
                    </div>

                    <div className="mt-5 flex items-center justify-between pt-3 border-t border-slate-700/50">
                      <span className="text-xs font-bold text-teal-300">
                        {lang === 'kn' ? '೧-ಕ್ಲಿಕ್ ದೂರು ದಾಖಲಿಸಿ →' : '1-Click Register →'}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-900/80 text-slate-300">
                        INSTANT TICKET
                      </span>
                    </div>
                  </button>
                ))}
              </div>

              {/* Kiosk Generated Token Modal / Print Slip */}
              {kioskCreatedTicket && (
                <div className="mt-8 bg-slate-950 border-2 border-teal-500/60 rounded-2xl p-6 shadow-2xl max-w-xl mx-auto">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                      <span className="font-bold text-white text-base">HOSPITAL KIOSK PRINT SLIP</span>
                    </div>
                    <span className="text-xs font-mono text-slate-400">{kioskCreatedTicket.channel}</span>
                  </div>

                  <div className="py-6 text-center space-y-2 border-b border-dashed border-slate-800">
                    <span className="text-xs font-mono text-slate-400 uppercase tracking-widest block">
                      HOSPITAL GRIEVANCE TOKEN NUMBER
                    </span>
                    <span className="text-4xl font-black font-mono text-teal-300 tracking-wider block">
                      {kioskCreatedTicket.public_id}
                    </span>
                    <p className="text-xs text-slate-300 mt-1">
                      {kioskCreatedTicket.org_kn_name || kioskCreatedTicket.org_name}
                    </p>
                    <p className="text-xs font-semibold text-teal-400">
                      SLA Target Deadline: {kioskCreatedTicket.sla_deadline ? kioskCreatedTicket.sla_deadline.substring(0, 16) : 'Within 12 Hours'}
                    </p>
                  </div>

                  <div className="py-4 space-y-2 text-xs text-slate-300">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Category:</span>
                      <span className="font-bold text-white">{kioskCreatedTicket.category}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Assigned Officer:</span>
                      <span className="font-bold text-white">{kioskCreatedTicket.officer_name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Priority:</span>
                      <span>{getPriorityBadge(kioskCreatedTicket.priority)}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 pt-3">
                    <button
                      onClick={() => window.print()}
                      className="flex-1 py-2.5 bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition cursor-pointer"
                    >
                      <Printer className="w-4 h-4" />
                      <span>{lang === 'kn' ? 'ರಸೀದಿ ಮುದ್ರಿಸಿ (Print Slip)' : 'Print Token Receipt'}</span>
                    </button>
                    <button
                      onClick={() => setKioskCreatedTicket(null)}
                      className="py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs transition cursor-pointer"
                    >
                      Close
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ============================================================= */}
        {/* TAB 3: 🎙️ CITIZEN VOICE & TEXT INTAKE PORTAL */}
        {/* ============================================================= */}
        {activeTab === 'voice' && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
              <div className="flex items-center gap-3 border-b border-slate-800 pb-5">
                <span className="p-2.5 bg-rose-500/20 text-rose-400 rounded-xl">
                  <Mic className="w-6 h-6" />
                </span>
                <div>
                  <h2 className="text-xl font-bold text-white">
                    {lang === 'kn' ? 'ನಾಗರಿಕ ಧ್ವನಿ & ಆನ್‌ಲೈನ್ ದೂರು ನೋಂದಣಿ' : 'Citizen Voice & Web Grievance Intake'}
                  </h2>
                  <p className="text-slate-400 text-xs">
                    {lang === 'kn'
                      ? 'ಕನ್ನಡದಲ್ಲಿ ಮಾತನಾಡಿ ಅಥವಾ ಬರೆಯಿರಿ - ಕೃತಕ ಬುದ್ಧಿಮತ್ತೆ (AI) ತಕ್ಷಣ ನಿಮ್ಮ ದೂರಿನ ಆದ್ಯತೆಯನ್ನು ವರ್ಗೀಕರಿಸಿ ಟೋಕನ್ ನೀಡುತ್ತದೆ'
                      : 'Multilingual speech recognition with automated clinical severity triage and instant cryptographic token generation.'}
                  </p>
                </div>
              </div>

              <form onSubmit={submitCitizenWebComplaint} className="mt-6 space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-300 block mb-1.5">
                      {lang === 'kn' ? 'ಸರ್ಕಾರಿ ಆಸ್ಪತ್ರೆ ಆಯ್ಕೆಮಾಡಿ:' : 'Select District Hospital:'}
                    </label>
                    <select
                      value={selectedOrgId}
                      onChange={(e) => {
                        const id = parseInt(e.target.value);
                        setSelectedOrgId(id);
                        fetchWardsForOrg(id);
                      }}
                      className="w-full bg-slate-950 border border-slate-700 text-white text-xs rounded-xl px-3 py-2.5 font-bold focus:ring-2 focus:ring-teal-500"
                    >
                      {orgs.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.kannada_name} — {o.district} ({o.beds} Beds)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-300 block mb-1.5">
                      {lang === 'kn' ? 'ವಾರ್ಡ್ / ವಿಭಾಗ:' : 'Hospital Ward / Department:'}
                    </label>
                    <select
                      value={selectedWardId}
                      onChange={(e) => setSelectedWardId(parseInt(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-700 text-white text-xs rounded-xl px-3 py-2.5 font-semibold focus:ring-2 focus:ring-teal-500"
                    >
                      {wards.map((w) => (
                        <option key={w.id} value={w.id}>
                          {w.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Voice Input Box */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-300">
                      {lang === 'kn' ? 'ದೂರಿನ ವಿವರ (ಮಾತನಾಡಿ ಅಥವಾ ಟೈಪ್ ಮಾಡಿ):' : 'Grievance Description (Speak or Type):'}
                    </label>
                    <button
                      type="button"
                      onClick={toggleCitizenWebMic}
                      className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                        voiceIsRecording
                          ? 'bg-rose-600 text-white animate-pulse'
                          : 'bg-teal-500/20 text-teal-300 border border-teal-500/40 hover:bg-teal-500/30'
                      }`}
                    >
                      {voiceIsRecording ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                      <span>{voiceIsRecording ? 'ರೆಕಾರ್ಡಿಂಗ್ ನಿಲ್ಲಿಸಿ' : 'ಮೈಕ್‌ನಲ್ಲಿ ಮಾತನಾಡಿ (Mic)'}</span>
                    </button>
                  </div>

                  <textarea
                    rows={4}
                    value={voiceInputText}
                    onChange={(e) => setVoiceInputText(e.target.value)}
                    placeholder={
                      lang === 'kn'
                        ? 'ಉದಾಹರಣೆ: ಕಲಬುರಗಿ ಜಿಲ್ಲಾ ಆಸ್ಪತ್ರೆಯ ಹೆರಿಗೆ ವಾರ್ಡ್‌ನಲ್ಲಿ ಕುಡಿಯುವ ನೀರಿನ ಫಿಲ್ಟರ್ ಕೆಟ್ಟುಹೋಗಿದೆ, ರೋಗಿಗಳಿಗೆ ನೀರಿಲ್ಲ...'
                        : 'e.g. Kalaburagi District Hospital maternity ward water filter broken, patients have no drinking water...'
                    }
                    className="w-full bg-slate-950 border border-slate-700 text-white text-sm rounded-xl p-3 focus:ring-2 focus:ring-teal-500"
                  />

                  {/* Preset quick buttons */}
                  <div className="flex flex-wrap gap-2 mt-2">
                    <span className="text-[11px] text-slate-500 font-bold self-center">Quick Samples:</span>
                    <button
                      type="button"
                      onClick={() =>
                        setVoiceInputText(
                          'ಕಲಬುರಗಿ ಜಿಲ್ಲಾ ಆಸ್ಪತ್ರೆಯ ಹೆರಿಗೆ ವಾರ್ಡ್‌ನಲ್ಲಿ ಕುಡಿಯುವ ನೀರಿನ ಫಿಲ್ಟರ್ ಕೆಟ್ಟುಹೋಗಿದೆ'
                        )
                      }
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-lg transition"
                    >
                      🚰 Water Filter (Kalaburagi)
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setVoiceInputText(
                          'ರಾಯಚೂರು ಜಿಲ್ಲಾ ಆಸ್ಪತ್ರೆ ಔಷಧಾಲಯದಲ್ಲಿ ಇನ್ಸುಲಿನ್ ಮತ್ತು ಆಂಟಿಬಯೋಟಿಕ್ ಇಂಜೆಕ್ಷನ್ ಲಭ್ಯವಿಲ್ಲ'
                        )
                      }
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-lg transition"
                    >
                      💊 Medicine Shortage (Raichur)
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setVoiceInputText(
                          'ಬೀದರ್ ಜಿಲ್ಲಾ ಆಸ್ಪತ್ರೆಯ ತುರ್ತು ಚಿಕಿತ್ಸಾ ಘಟಕದಲ್ಲಿ ವೈದ್ಯರು ಗೈರುಹಾಜರಾಗಿದ್ದಾರೆ'
                        )
                      }
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-lg transition"
                    >
                      👨‍⚕️ Doctor Absent (Bidar)
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-300 block mb-1">
                      {lang === 'kn' ? 'ನಿಮ್ಮ ಮೊಬೈಲ್ ಸಂಖ್ಯೆ (SMS ಗಾಗಿ):' : 'Mobile Number (For SMS updates):'}
                    </label>
                    <input
                      type="tel"
                      value={voicePhone}
                      onChange={(e) => setVoicePhone(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 text-white text-xs rounded-xl px-3 py-2.5 font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-300 block mb-1">
                      {lang === 'kn' ? 'ನಿಮ್ಮ ಹೆಸರು:' : 'Citizen Name:'}
                    </label>
                    <input
                      type="text"
                      value={voiceName}
                      onChange={(e) => setVoiceName(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 text-white text-xs rounded-xl px-3 py-2.5"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={voiceSubmitting}
                    className="w-full py-3.5 bg-teal-600 hover:bg-teal-500 active:scale-[0.99] text-white font-bold rounded-xl text-sm flex items-center justify-center gap-2 shadow-lg shadow-teal-600/30 transition cursor-pointer disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-5 h-5" />
                    <span>
                      {voiceSubmitting
                        ? 'ದಾಖಲಾಗುತ್ತಿದೆ (Submitting)...'
                        : lang === 'kn'
                        ? 'ದೂರು ಸಲ್ಲಿಸಿ & ಟೋಕನ್ ಪಡೆಯಿರಿ (Generate Token)'
                        : 'Submit Grievance & Generate Token'}
                    </span>
                  </button>
                </div>
              </form>

              {/* Newly Created Ticket Success View */}
              {newlyCreatedTicket && (
                <div className="mt-8 bg-slate-950 border-2 border-emerald-500/50 rounded-2xl p-6 text-center space-y-4">
                  <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-7 h-7" />
                  </div>
                  <div>
                    <span className="text-xs font-mono text-slate-400 uppercase tracking-widest block">
                      NEW GRIEVANCE TOKEN ISSUED
                    </span>
                    <span className="text-3xl font-black font-mono text-emerald-400 block mt-1">
                      {newlyCreatedTicket.public_id}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 max-w-md mx-auto">
                    {lang === 'kn' ? newlyCreatedTicket.message_kn : newlyCreatedTicket.english_ack}
                  </p>
                  <div className="flex items-center justify-center gap-3 pt-2">
                    <button
                      onClick={() => {
                        setSearchToken(newlyCreatedTicket.public_id);
                        setActiveTab('status');
                        lookupTokenStatus(newlyCreatedTicket.public_id);
                      }}
                      className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-lg text-xs flex items-center gap-2 transition cursor-pointer"
                    >
                      <Search className="w-4 h-4" />
                      <span>Track Status & SLA Now</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ============================================================= */}
        {/* TAB 4: 🔍 STATUS LOOKUP & CITIZEN RESOLUTION VERIFICATION */}
        {/* ============================================================= */}
        {activeTab === 'status' && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
                <div className="flex items-center gap-3">
                  <span className="p-2.5 bg-amber-500/20 text-amber-400 rounded-xl">
                    <Search className="w-6 h-6" />
                  </span>
                  <div>
                    <h2 className="text-xl font-bold text-white">
                      {lang === 'kn' ? 'ದೂರು ಟೋಕನ್ ಸ್ಥಿತಿ & ನಾಗರಿಕ ಪರಿಶೀಲನೆ' : 'Grievance Token Status & Verification'}
                    </h2>
                    <p className="text-slate-400 text-xs">
                      {lang === 'kn'
                        ? 'ನಿಮ್ಮ ಟೋಕನ್ ಸಂಖ್ಯೆ ನಮೂದಿಸಿ (ಉದಾ: JD-2026-1001) - ಲೈವ್ ಎಸ್‌ಎಲ್‌ಎ ಮತ್ತು ವೈದ್ಯಾಧಿಕಾರಿ ಪರಿಹಾರ ಪರಿಶೀಲಿಸಿ'
                        : 'Track real-time SLA countdown, assigned duty doctor, photographic proof of repair, and citizen confirmation.'}
                    </p>
                  </div>
                </div>

                {/* Sample quick tokens */}
                <div className="flex flex-wrap gap-1.5 text-xs font-mono">
                  <span className="text-slate-500 self-center text-[11px]">Quick Tokens:</span>
                  {['JD-2026-1001', 'JD-2026-1002', 'JD-2026-1003', 'JD-2026-1004', 'JD-2026-1005'].map((t) => (
                    <button
                      key={t}
                      onClick={() => {
                        setSearchToken(t);
                        lookupTokenStatus(t);
                      }}
                      className="px-2 py-1 bg-slate-950 hover:bg-teal-900/40 border border-slate-800 hover:border-teal-500/40 text-teal-300 rounded text-[11px] transition cursor-pointer"
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Search Bar */}
              <div className="mt-6 flex items-center gap-3">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={searchToken}
                    onChange={(e) => setSearchToken(e.target.value)}
                    placeholder="Enter Grievance Token ID (e.g. JD-2026-1001)"
                    className="w-full bg-slate-950 border border-slate-700 text-white text-sm font-mono rounded-xl px-4 py-3 pl-10 focus:ring-2 focus:ring-teal-500"
                  />
                  <Search className="w-5 h-5 text-slate-500 absolute left-3 top-3.5" />
                </div>
                <button
                  onClick={() => lookupTokenStatus()}
                  disabled={statusLoading}
                  className="px-6 py-3 bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-xl text-xs flex items-center gap-2 transition cursor-pointer disabled:opacity-50"
                >
                  <Search className="w-4 h-4" />
                  <span>{statusLoading ? 'ಹುಡುಕಲಾಗುತ್ತಿದೆ...' : 'Search Token'}</span>
                </button>
              </div>

              {statusError && (
                <div className="mt-4 p-4 bg-rose-950/40 border border-rose-800/80 rounded-xl text-xs text-rose-300 flex items-center gap-3">
                  <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
                  <span>{statusError}</span>
                </div>
              )}

              {/* Searched Complaint Card */}
              {searchedComplaint && (
                <div className="mt-6 bg-slate-950 border border-slate-800 rounded-2xl p-6 space-y-6">
                  {/* Header Bar */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
                    <div>
                      <div className="flex items-center gap-3">
                        <span className="text-2xl font-black font-mono text-teal-300">
                          {searchedComplaint.public_id}
                        </span>
                        {getStatusBadge(searchedComplaint.status, searchedComplaint.is_overdue)}
                        {getPriorityBadge(searchedComplaint.priority)}
                      </div>
                      <p className="text-slate-300 text-xs font-semibold mt-1">
                        {searchedComplaint.org_kn_name} — {searchedComplaint.ward_name}
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="text-[11px] text-slate-500 block">SLA Target Resolution:</span>
                      <span className="font-mono text-xs font-bold text-teal-400">
                        {searchedComplaint.sla_deadline.substring(0, 16)}
                      </span>
                    </div>
                  </div>

                  {/* Complaint Details Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <div className="p-4 bg-slate-900 rounded-xl border border-slate-800 space-y-2">
                      <span className="text-slate-400 font-bold block uppercase text-[10px]">
                        Grievance Matter / Issue Text:
                      </span>
                      <p className="text-slate-200 leading-relaxed font-sans text-sm">
                        "{searchedComplaint.original_text}"
                      </p>
                      <p className="text-slate-400 text-[11px] italic">
                        English: {searchedComplaint.english_text}
                      </p>
                    </div>

                    <div className="p-4 bg-slate-900 rounded-xl border border-slate-800 space-y-2">
                      <span className="text-slate-400 font-bold block uppercase text-[10px]">
                        Assigned Medical Authority:
                      </span>
                      <div className="flex items-center gap-2">
                        <UserCheck className="w-4 h-4 text-teal-400" />
                        <span className="font-bold text-white text-sm">{searchedComplaint.officer_name}</span>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] bg-teal-900/60 text-teal-300 font-mono block w-fit">
                        {searchedComplaint.officer_role}
                      </span>
                      <div className="text-[11px] text-slate-400 pt-1">
                        Channel: <span className="text-white font-mono">{searchedComplaint.channel}</span> · Phone: {searchedComplaint.phone}
                      </div>
                    </div>
                  </div>

                  {/* Photographic Proof of Resolution (if resolved) */}
                  {searchedComplaint.actions.some((a) => a.photo_url) && (
                    <div className="p-4 bg-slate-900 rounded-xl border border-slate-800">
                      <span className="text-xs font-bold text-emerald-400 block mb-2 flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4" /> Photographic Proof of Resolution / Clinical Repair:
                      </span>
                      <div className="flex items-center gap-4">
                        <img
                          src={searchedComplaint.actions.find((a) => a.photo_url)?.photo_url || ''}
                          alt="Resolution Inspection"
                          className="w-32 h-24 object-cover rounded-lg border border-slate-700"
                        />
                        <div className="text-xs text-slate-300 space-y-1">
                          <p className="font-semibold text-white">Clinical Inspection & Calibration Completed</p>
                          <p className="text-slate-400 text-[11px]">
                            GPS Coordinates: {searchedComplaint.actions.find((a) => a.location_gps)?.location_gps || '16.2076, 77.3463'}
                          </p>
                          <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-300">
                            VERIFIED BY DUTY OFFICER
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Citizen Verification & Closure Flow */}
                  <div className="p-5 bg-gradient-to-r from-teal-950/40 to-slate-900 rounded-xl border border-teal-500/30 space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-white text-xs flex items-center gap-2">
                        <UserCheck className="w-4 h-4 text-teal-400" />
                        <span>{lang === 'kn' ? 'ನಾಗರಿಕ ಪರಿಶೀಲನೆ & ರೇಟಿಂಗ್:' : 'Citizen Resolution Verification & Rating:'}</span>
                      </h4>
                      <span className="text-[11px] text-slate-400">Hospital Feedback Mandate</span>
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed">
                      {lang === 'kn'
                        ? 'ಆಸ್ಪತ್ರೆಯಲ್ಲಿ ಸಮಸ್ಯೆ ಸರಿಯಾಗಿ ಪರಿಹಾರವಾಗಿದ್ದರೆ ದೃಢೀಕರಿಸಿ ಮುಕ್ತಾಯಗೊಳಿಸಿ. ಸಮಸ್ಯೆ ಮುಂದುವರೆದಿದ್ದರೆ ಮರುತೆರೆಯಿರಿ (ಜಿಲ್ಲಾ ವೈದ್ಯಾಧಿಕಾರಿಗಳಿಗೆ ವರ್ಗಾವಣೆಯಾಗುತ್ತದೆ).'
                        : 'If your grievance was satisfactorily fixed by the medical officer, please confirm closure. If not, reopen to auto-escalate to District Health Officer.'}
                    </p>

                    <div className="flex flex-wrap items-center gap-3">
                      <button
                        onClick={() => handleCitizenVerification('confirm')}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs flex items-center gap-2 transition cursor-pointer"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>{lang === 'kn' ? 'ಸಮಸ್ಯೆ ಪರಿಹಾರವಾಗಿದೆ (Confirm & Close)' : 'Confirm Resolution & Close'}</span>
                      </button>

                      <button
                        onClick={() => handleCitizenVerification('reopen')}
                        className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-lg text-xs flex items-center gap-2 transition cursor-pointer"
                      >
                        <XCircle className="w-4 h-4" />
                        <span>{lang === 'kn' ? 'ಪರಿಹಾರವಾಗಿಲ್ಲ (Reopen & Escalate)' : 'Issue NOT Fixed (Reopen Case)'}</span>
                      </button>

                      {/* 1-5 Star Rating */}
                      <div className="flex items-center gap-1.5 ml-auto">
                        <span className="text-xs text-slate-400 mr-1">Rate Service:</span>
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            onClick={() => handleRatingSubmit(star)}
                            className="p-1 hover:scale-125 transition cursor-pointer"
                          >
                            <Star
                              className={`w-4 h-4 ${
                                (searchedComplaint.rating || selectedRating) >= star
                                  ? 'text-amber-400 fill-amber-400'
                                  : 'text-slate-600'
                              }`}
                            />
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Cryptographic SHA-256 Audit Trail */}
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-300 flex items-center gap-2">
                        <Lock className="w-3.5 h-3.5 text-teal-400" />
                        <span>SHA-256 Cryptographic Audit Chain for Token {searchedComplaint.public_id}</span>
                      </span>
                      <span className="text-[10px] text-teal-400 font-mono">100% IMMUTABLE LEDGER</span>
                    </div>

                    <div className="space-y-2">
                      {searchedAuditTrail.map((b) => (
                        <div key={b.id} className="p-3 bg-slate-900 rounded-lg border border-slate-800 text-xs font-mono">
                          <div className="flex items-center justify-between text-[11px] mb-1">
                            <span className="text-teal-400 font-bold">
                              Block #{b.id} · {b.action}
                            </span>
                            <span className="text-slate-500">{b.timestamp.substring(0, 19)}</span>
                          </div>
                          <p className="text-slate-300 font-sans text-xs mb-1.5">{b.details}</p>
                          <div className="text-[10px] text-slate-500 truncate">
                            SHA-256: <span className="text-slate-400">{b.hash}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ============================================================= */}
        {/* TAB 5: 👨‍⚕️ DUTY MEDICAL OFFICER QUEUE & CLINICAL ACTIONS */}
        {/* ============================================================= */}
        {activeTab === 'officer' && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
                <div>
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <Stethoscope className="w-6 h-6 text-teal-400" />
                    <span>{lang === 'kn' ? 'ವೈದ್ಯಾಧಿಕಾರಿ ಕರ್ತವ್ಯ ಪೋರ್ಟಲ್' : 'Duty Medical Officer Clinical Queue'}</span>
                  </h2>
                  <p className="text-slate-400 text-xs">
                    {lang === 'kn'
                      ? 'ಆಸ್ಪತ್ರೆ ವಾರ್ಡ್ ದೂರುಗಳ ಪರಿಶೀಲನೆ, ಕ್ರಮ ಕೈಗೊಳ್ಳುವಿಕೆ, ಫೋಟೋ ಸಾಕ್ಷಿ, ಮತ್ತು ಎಸ್‌ಎಲ್‌ಎ ವಿಸ್ತರಣೆ (Snooze)'
                      : 'Clinical grievance triage, action notes, photo upload, SLA snooze extension, and inter-officer reassignment.'}
                  </p>
                </div>

                {/* Officer Profile Switcher */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400 font-bold">Switch Officer:</span>
                  <select
                    value={activeOfficerId}
                    onChange={(e) => setActiveOfficerId(e.target.value)}
                    className="bg-slate-950 border border-slate-700 text-white text-xs rounded-xl px-3 py-2 font-bold focus:ring-2 focus:ring-teal-500"
                  >
                    {officers.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.name} ({o.hospital})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Status Filters */}
              <div className="flex flex-wrap items-center gap-2 mt-5">
                {['ALL', 'PENDING', 'IN_PROGRESS', 'RESOLVED', 'ESCALATED'].map((status) => (
                  <button
                    key={status}
                    onClick={() => setOfficerFilter(status)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                      officerFilter === status
                        ? 'bg-teal-600 text-white shadow-sm'
                        : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>

              {/* Complaints List */}
              <div className="mt-5 space-y-3">
                {officerComplaints
                  .filter((c) => officerFilter === 'ALL' || c.status === officerFilter)
                  .map((c) => (
                    <div
                      key={c.id}
                      className="p-4 bg-slate-950 rounded-xl border border-slate-800 hover:border-slate-700 transition flex flex-col md:flex-row md:items-center justify-between gap-4"
                    >
                      <div className="space-y-1.5 max-w-2xl">
                        <div className="flex items-center gap-2.5">
                          <span className="font-mono font-bold text-teal-300 text-sm">{c.public_id}</span>
                          {getStatusBadge(c.status, c.is_overdue)}
                          {getPriorityBadge(c.priority)}
                          <span className="text-[11px] font-mono text-slate-500">[{c.channel}]</span>
                        </div>
                        <h4 className="text-sm font-bold text-white">{c.category}</h4>
                        <p className="text-xs text-slate-300 line-clamp-2">"{c.original_text}"</p>
                        <div className="flex items-center gap-4 text-[11px] text-slate-400 pt-1">
                          <span>Hospital: <strong className="text-slate-200">{c.org_name}</strong></span>
                          <span>Ward: <strong className="text-slate-200">{c.ward_name}</strong></span>
                          <span>Assigned: <strong className="text-slate-200">{c.officer_name}</strong></span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => {
                            setActiveModalComplaint(c);
                            setActionType('IN_PROGRESS');
                            setActionNotes('');
                          }}
                          className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-lg text-xs transition cursor-pointer flex items-center gap-1.5"
                        >
                          <span>Take Action</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            {/* Officer Action Modal Drawer */}
            {activeModalComplaint && (
              <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div>
                      <h3 className="font-bold text-white text-base">
                        Duty Action: {activeModalComplaint.public_id}
                      </h3>
                      <p className="text-xs text-slate-400">{activeModalComplaint.category}</p>
                    </div>
                    <button
                      onClick={() => setActiveModalComplaint(null)}
                      className="text-slate-400 hover:text-white text-sm"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="space-y-4 text-xs">
                    <div>
                      <label className="font-bold text-slate-300 block mb-1.5">Action Type:</label>
                      <select
                        value={actionType}
                        onChange={(e) => setActionType(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl px-3 py-2 font-bold"
                      >
                        <option value="IN_PROGRESS">Mark as In Progress (ಸ್ಥಳ ಪರಿಶೀಲನೆ ಆರಂಭ)</option>
                        <option value="RESOLVED">Mark as Resolved (ಸಮಸ್ಯೆ ಪರಿಹರಿಸಲಾಗಿದೆ)</option>
                        <option value="SNOOZE">Request SLA Extension (+24h / +48h Snooze)</option>
                        <option value="REASSIGN">Reassign to Another Medical Officer</option>
                        <option value="REJECTED">Mark as Rejected (ದೂರು ತಿರಸ್ಕರಿಸಲಾಗಿದೆ)</option>
                      </select>
                    </div>

                    {actionType === 'SNOOZE' && (
                      <div>
                        <label className="font-bold text-slate-300 block mb-1.5">Extension Hours:</label>
                        <select
                          value={snoozeHours}
                          onChange={(e) => setSnoozeHours(parseInt(e.target.value))}
                          className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl px-3 py-2"
                        >
                          <option value={24}>+24 Hours (Awaiting medical supplies shipment)</option>
                          <option value={48}>+48 Hours (Equipment repair in progress)</option>
                          <option value={72}>+72 Hours (Biomedical engineer inspection)</option>
                        </select>
                      </div>
                    )}

                    {actionType === 'REASSIGN' && (
                      <div>
                        <label className="font-bold text-slate-300 block mb-1.5">Select Medical Officer:</label>
                        <select
                          value={reassignOfficerId}
                          onChange={(e) => setReassignOfficerId(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl px-3 py-2 font-semibold"
                        >
                          {officers.map((o) => (
                            <option key={o.id} value={o.id}>
                              {o.name} — {o.designation} ({o.hospital})
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div>
                      <label className="font-bold text-slate-300 block mb-1.5">
                        Clinical Inspection Notes & Remarks:
                      </label>
                      <textarea
                        rows={3}
                        value={actionNotes}
                        onChange={(e) => setActionNotes(e.target.value)}
                        placeholder="Detail the clinical inspection, parts replaced, or duty notes..."
                        className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl p-3"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                    <button
                      onClick={() => setActiveModalComplaint(null)}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={submitOfficerAction}
                      disabled={actionLoading}
                      className="px-5 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-bold transition cursor-pointer"
                    >
                      {actionLoading ? 'Recording...' : 'Commit Duty Action'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ============================================================= */}
        {/* TAB 6: 📊 HOSPITAL EXECUTIVE DASHBOARD */}
        {/* ============================================================= */}
        {activeTab === 'dashboard' && summary && (
          <div className="space-y-6">
            {/* Summary Metrics Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl">
                <span className="text-slate-400 text-xs font-bold uppercase block mb-1">Total Complaints</span>
                <span className="text-3xl font-black text-white font-mono">{summary.total_complaints}</span>
                <span className="text-[11px] text-teal-400 block mt-1">Across 6 Districts</span>
              </div>

              <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl">
                <span className="text-slate-400 text-xs font-bold uppercase block mb-1">SLA Resolution Rate</span>
                <span className="text-3xl font-black text-emerald-400 font-mono">{summary.sla_compliance_rate}%</span>
                <span className="text-[11px] text-emerald-300 block mt-1">{summary.resolved_count} Successfully Resolved</span>
              </div>

              <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl">
                <span className="text-slate-400 text-xs font-bold uppercase block mb-1">Active Overdue</span>
                <span className="text-3xl font-black text-rose-400 font-mono">{summary.overdue_count}</span>
                <span className="text-[11px] text-rose-300 block mt-1">Escalated to District Health Officer</span>
              </div>

              <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl">
                <span className="text-slate-400 text-xs font-bold uppercase block mb-1">Avg Resolution Time</span>
                <span className="text-3xl font-black text-amber-400 font-mono">{summary.avg_resolution_hours}h</span>
                <span className="text-[11px] text-slate-400 block mt-1">Mandate: &lt; 24h</span>
              </div>
            </div>

            {/* Early Warning AI Cluster Banners */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-amber-400" />
                  <h3 className="font-bold text-white text-base">Early Warning & Cluster Detection Engine</h3>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  AUTOMATED SENTINEL
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {earlyWarnings.map((w) => (
                  <div key={w.id} className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300">
                        {w.severity}
                      </span>
                      <span className="text-[11px] text-slate-500 font-mono">{w.type}</span>
                    </div>
                    <h4 className="font-bold text-white text-xs">{w.title}</h4>
                    <p className="text-slate-400 text-[11px] leading-relaxed">{w.description}</p>
                    <div className="pt-1 text-[11px] text-teal-400 font-semibold">
                      Action: {w.action_recommended}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* District Hospital Performance Scores */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-bold text-white text-base">Kalyana Karnataka Hospital Efficiency Scores</h3>
                  <p className="text-xs text-slate-400">Objective public performance rankings based on resolved grievances</p>
                </div>
                <a
                  href="/api/dashboard/export-csv"
                  download="janadhwani_grievances.csv"
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-lg flex items-center gap-1.5 transition"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Full CSV</span>
                </a>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-sans">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 font-mono">
                      <th className="pb-3">Hospital Name</th>
                      <th className="pb-3">District</th>
                      <th className="pb-3">Total Grievances</th>
                      <th className="pb-3">Resolved</th>
                      <th className="pb-3">Resolution %</th>
                      <th className="pb-3">Performance Grade</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300">
                    {hospitalScores.map((h) => (
                      <tr key={h.org_id} className="hover:bg-slate-800/30">
                        <td className="py-3 font-bold text-white">
                          {h.kannada_name}
                          <span className="block text-[11px] text-slate-500 font-normal">{h.name}</span>
                        </td>
                        <td className="py-3 font-mono">{h.district}</td>
                        <td className="py-3 font-mono">{h.total_complaints}</td>
                        <td className="py-3 font-mono text-emerald-400">{h.resolved_complaints}</td>
                        <td className="py-3 font-mono font-bold text-teal-400">{h.efficiency_score}%</td>
                        <td className="py-3">
                          <span className="px-2.5 py-0.5 rounded-full font-mono font-bold text-xs bg-teal-500/20 text-teal-300 border border-teal-500/30">
                            GRADE {h.grade}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================= */}
        {/* TAB 7: 🌐 PUBLIC TRANSPARENCY PORTAL */}
        {/* ============================================================= */}
        {activeTab === 'transparency' && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
                <div>
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <FileText className="w-6 h-6 text-purple-400" />
                    <span>{lang === 'kn' ? 'ಸಾರ್ವಜನಿಕ ಪಾರದರ್ಶಕತೆ ಪೋರ್ಟಲ್' : 'Public Transparency Ledger'}</span>
                  </h2>
                  <p className="text-slate-400 text-xs">
                    {lang === 'kn'
                      ? 'ನಾಗರಿಕರ ವೈಯಕ್ತಿಕ ವಿವರ ರಕ್ಷಿಸಿ, ಎಲ್ಲಾ ಆಸ್ಪತ್ರೆ ದೂರುಗಳು ಮತ್ತು ವೈದ್ಯಾಧಿಕಾರಿಗಳ ಕ್ರಮಗಳನ್ನು ಮುಕ್ತವಾಗಿ ಪ್ರಕಟಿಸಲಾಗುತ್ತದೆ'
                      : 'Anonymized open government portal. Zero concealment of civic health grievances and audit hashes.'}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400 font-bold">Filter District:</span>
                  <select
                    value={transparencyDistrict}
                    onChange={(e) => setTransparencyDistrict(e.target.value)}
                    className="bg-slate-950 border border-slate-700 text-white text-xs rounded-xl px-3 py-2 font-bold"
                  >
                    <option value="ALL">All 6 Districts</option>
                    <option value="Kalaburagi">Kalaburagi</option>
                    <option value="Raichur">Raichur</option>
                    <option value="Bidar">Bidar</option>
                    <option value="Koppal">Koppal</option>
                    <option value="Yadgir">Yadgir</option>
                    <option value="Ballari">Ballari</option>
                  </select>
                </div>
              </div>

              <div className="mt-5 space-y-3">
                {transparencyComplaints
                  .filter((c) => transparencyDistrict === 'ALL' || c.district === transparencyDistrict)
                  .map((c) => (
                    <div
                      key={c.id}
                      className="p-4 bg-slate-950 rounded-xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4"
                    >
                      <div className="space-y-1.5 max-w-3xl">
                        <div className="flex items-center gap-2.5">
                          <span className="font-mono font-bold text-teal-300 text-sm">{c.public_id}</span>
                          {getStatusBadge(c.status, c.is_overdue)}
                          <span className="text-slate-400 text-xs font-semibold">{c.category}</span>
                        </div>
                        <p className="text-xs text-slate-300 leading-relaxed font-sans">"{c.summary_kn}"</p>
                        <div className="flex items-center gap-4 text-[11px] text-slate-400 pt-1">
                          <span>Hospital: <strong className="text-slate-200">{c.org_name}</strong></span>
                          <span>Ward: <strong className="text-slate-200">{c.ward_name}</strong></span>
                          <span>Assigned Officer: <strong className="text-slate-200">{c.officer_name}</strong></span>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <button
                          onClick={() => {
                            setSearchToken(c.public_id);
                            setActiveTab('status');
                            lookupTokenStatus(c.public_id);
                          }}
                          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-teal-300 rounded-lg text-xs font-mono transition"
                        >
                          Verify Proof →
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}

        {/* ============================================================= */}
        {/* TAB 8: 📋 WARD POSTERS & BEDSIDE QR CODES */}
        {/* ============================================================= */}
        {activeTab === 'admin' && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-5">
                <div>
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <QrCode className="w-6 h-6 text-amber-300" />
                    <span>{lang === 'kn' ? 'ಆಸ್ಪತ್ರೆ ವಾರ್ಡ್ ಭಿತ್ತಿಪತ್ರ & ಕ್ಯೂಆರ್ ಕೋಡ್' : 'Ward Bedside Posters & QR Code'}</span>
                  </h2>
                  <p className="text-slate-400 text-xs">
                    {lang === 'kn'
                      ? 'ಆಸ್ಪತ್ರೆ ವಾರ್ಡ್‌ಗಳಲ್ಲಿ ಅಂಟಿಸಲು ಸಿದ್ಧವಾಗಿರುವ ಕನ್ನಡ & ಇಂಗ್ಲಿಷ್ ಭಿತ್ತಿಪತ್ರ (Printable Poster)'
                      : 'Downloadable/Printable patient bedside poster for Kalaburagi, Raichur, Bidar, Koppal, Yadgir hospitals.'}
                  </p>
                </div>
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-xl text-xs flex items-center gap-2 transition cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Ward Poster</span>
                </button>
              </div>

              {/* Printable Poster Visual Card */}
              <div className="mt-6 max-w-2xl mx-auto bg-white text-slate-900 p-8 rounded-2xl shadow-2xl border-4 border-teal-700 space-y-6">
                <div className="text-center border-b-2 border-teal-700 pb-4">
                  <div className="inline-block px-3 py-1 bg-teal-800 text-white font-mono font-bold text-xs rounded mb-2">
                    GOVERNMENT OF KARNATAKA · HEALTH & FAMILY WELFARE
                  </div>
                  <h3 className="text-2xl font-black text-teal-900">ಜನಧ್ವನಿ · JanaDhwani</h3>
                  <p className="text-xs text-slate-700 font-semibold mt-1">
                    ಸಾರ್ವಜನಿಕ ಆಸ್ಪತ್ರೆ ನಾಗರಿಕ ದೂರು ಪರಿಹಾರ ಸಹಾಯವಾಣಿ · Public Hospital Grievance Desk
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4 text-center items-center">
                  <div className="p-4 bg-teal-50 rounded-xl border border-teal-200">
                    <span className="text-xs font-bold text-teal-900 block mb-1">ಉಚಿತ ದೂರವಾಣಿ ಕರೆ (TOLL-FREE)</span>
                    <span className="text-2xl font-black font-mono text-teal-800 block">1800-425-0026</span>
                    <span className="text-[11px] text-slate-600 block mt-1">
                      ಕನ್ನಡ · English · हिन्दी · తెలుగు · தமிழ்
                    </span>
                  </div>

                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col items-center">
                    {/* Simulated Clean QR Code Pattern */}
                    <div className="w-24 h-24 bg-slate-900 p-2 rounded-lg flex items-center justify-center">
                      <QrCode className="w-20 h-20 text-white" />
                    </div>
                    <span className="text-[10px] font-mono text-slate-600 mt-1">SCAN FOR INSTANT GRIEVANCE</span>
                  </div>
                </div>

                <div className="space-y-2 text-xs text-slate-700">
                  <h4 className="font-bold text-slate-900 text-sm">ಯಾವ ಸಮಸ್ಯೆಗಳಿಗೆ ಕರೆ ಮಾಡಬಹುದು? (Grievance Scope):</h4>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>ಕುಡಿಯುವ ನೀರು, ಸ್ವಚ್ಛತೆ, ಮತ್ತು ಶೌಚಾಲಯ ಸಮಸ್ಯೆ (Water & Toilets)</li>
                    <li>ಔಷಧಿ ಕೊರತೆ ಮತ್ತು ಇಂಜೆಕ್ಷನ್ ಸಿಗದಿರುವುದು (Medicine Shortage)</li>
                    <li>ಕರ್ತವ್ಯ ವೈದ್ಯರು ಅಥವಾ ನರ್ಸ್ ಗೈರುಹಾಜರಿ (Doctor/Staff Absenteeism)</li>
                    <li>ವೀಲ್‌ಚೇರ್, ಸ್ಟ್ರೆಚರ್, ಮತ್ತು ಹಾಸಿಗೆ ಲಭ್ಯತೆ (Wheelchairs & Beds)</li>
                  </ul>
                </div>

                <div className="border-t border-slate-200 pt-3 flex justify-between text-[11px] text-slate-500 font-mono">
                  <span>SLA GUARANTEE: 4h - 24h</span>
                  <span>SHA-256 AUDIT VERIFIED</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ------------------------------------------------------------- */}
      {/* FOOTER */}
      {/* ------------------------------------------------------------- */}
      <footer className="border-t border-slate-800 bg-slate-950 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>
            ಜನಧ್ವನಿ (JanaDhwani) · Kalyana Karnataka Solvathon 2026 Public Grievance Platform.
          </p>
          <p className="font-mono text-[11px] text-teal-400">
            Kalaburagi · Raichur · Bidar · Koppal · Yadgir · Ballari
          </p>
        </div>
      </footer>
      {/* Non-blocking Floating Notification Toast (IFrame Safe) */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 max-w-md w-full px-4 animate-in fade-in slide-in-from-bottom-5 duration-200">
          <div
            className={`p-4 rounded-2xl shadow-2xl border backdrop-blur-md flex items-start gap-3 text-sm ${
              toast.type === 'success'
                ? 'bg-emerald-950/95 border-emerald-500/50 text-emerald-100 shadow-emerald-950/50'
                : toast.type === 'error'
                ? 'bg-rose-950/95 border-rose-500/50 text-rose-100 shadow-rose-950/50'
                : 'bg-slate-900/95 border-teal-500/50 text-slate-100 shadow-slate-950/50'
            }`}
          >
            <div className="shrink-0 mt-0.5">
              {toast.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
              {toast.type === 'error' && <AlertTriangle className="w-5 h-5 text-rose-400" />}
              {toast.type === 'info' && <Bell className="w-5 h-5 text-teal-400" />}
            </div>
            <div className="flex-1 text-xs leading-relaxed font-medium">
              {toast.message}
            </div>
            <button
              onClick={() => setToast(null)}
              className="shrink-0 p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
