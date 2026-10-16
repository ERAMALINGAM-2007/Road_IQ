import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Camera,
  MapPin,
  WarningCircle,
  CheckCircle,
  Clock,
  MagnifyingGlass,
  Copy,
  PaperPlaneTilt,
  NavigationArrow,
  ChatCircleText,
  User,
  Phone,
  Drop,
} from 'phosphor-react';
import {
  fetchCitizenReports,
  fetchCitizenReportByTicket,
  submitCitizenReport,
  type CitizenReportItem,
} from '@/lib/api';
import { useAppStore } from '@/lib/store';

const CATEGORIES = [
  { id: 'pothole', labelEn: 'Pothole', subEn: 'Deep road surface depression', labelTa: 'குழி / பள்ளம்', subTa: 'சாலை தரைமட்ட பள்ளம்', icon: WarningCircle, color: 'var(--sev-critical)' },
  { id: 'crack', labelEn: 'Severe Crack', subEn: 'Longitudinal or transverse fracture', labelTa: 'நெடுஞ்சாலை விரிசல்', subTa: 'நீள அல்லது குறுக்கு விரிசல்', icon: WarningCircle, color: 'var(--sev-high)' },
  { id: 'waterlogging', labelEn: 'Standing Water', subEn: 'Puddle concealing road defect', labelTa: 'தேங்கிய மழைநீர்', subTa: 'பள்ளத்தை மறைக்கும் நீர்', icon: Drop, color: 'var(--accent)' },
  { id: 'debris', labelEn: 'Debris / Hazard', subEn: 'Hazardous road obstruction', labelTa: 'சாலை தடைகள்', subTa: 'விபத்தை ஏற்படுத்தும் தடைகள்', icon: WarningCircle, color: 'var(--warning)' },
];

const SEVERITIES = [
  { id: 'minor', labelEn: 'Minor', subEn: 'Passable with slow speed', labelTa: 'குறைந்த ஆபத்து', subTa: 'மெதுவாக கடக்கலாம்' },
  { id: 'moderate', labelEn: 'Moderate', subEn: 'Causes tire jarring or swerving', labelTa: 'நடுத்தர ஆபத்து', subTa: 'வாகன அதிர்வு அல்லது விலகலை ஏற்படுத்தும்' },
  { id: 'dangerous', labelEn: 'Dangerous', subEn: 'Immediate crash hazard for 2-wheelers', labelTa: 'மிகவும் ஆபத்தானது', subTa: 'இருசக்கர வாகனங்களுக்கு உடனடி விபத்து ஆபத்து' },
];

const STATUS_STEPS = [
  { key: 'received', labelEn: 'Received', subEn: 'Logged into Marga system', labelTa: 'பெறப்பட்டது', subTa: 'மாநகராட்சி அமைப்பில் பதிவு செய்யப்பட்டது' },
  { key: 'under_review', labelEn: 'Triaged', subEn: 'Verified by municipal inspector', labelTa: 'சரிபார்க்கப்பட்டது', subTa: 'ஆய்வாளர் மூலம் உறுதி செய்யப்பட்டது' },
  { key: 'scheduled', labelEn: 'Scheduled', subEn: 'Assigned to road maintenance crew', labelTa: 'திட்டமிடப்பட்டது', subTa: 'பராமரிப்பு குழுவுக்கு ஒதுக்கப்பட்டது' },
  { key: 'resolved', labelEn: 'Resolved', subEn: 'Repair verified & sealed', labelTa: 'சரிசெய்யப்பட்டது', subTa: 'சரிசெய்தல் சரிபார்க்கப்பட்டு மூடப்பட்டது' },
];

export function CitizenPage() {
  const queryClient = useQueryClient();
  const { language } = useAppStore();
  const isTa = language === 'ta';
  const [activeTab, setActiveTab] = useState<'report' | 'track'>('report');

  // Form State
  const [category, setCategory] = useState('pothole');
  const [severity, setSeverity] = useState('moderate');
  const [landmark, setLandmark] = useState('');
  const [description, setDescription] = useState('');
  const [lat, setLat] = useState<number>(11.2742);
  const [lon, setLon] = useState<number>(77.5828);
  const [reporterName, setReporterName] = useState('');
  const [reporterPhone, setReporterPhone] = useState('');
  const [gpsStatus, setGpsStatus] = useState<string>('Perundurai Default (11.2742°N, 77.5828°E)');
  const [submittedTicket, setSubmittedTicket] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Track State
  const [trackQuery, setTrackQuery] = useState('');
  const [searchedTicket, setSearchedTicket] = useState<string | null>(null);

  // Fetch Community Reports
  const { data: reports = [] } = useQuery({
    queryKey: ['citizen-reports'],
    queryFn: fetchCitizenReports,
  });

  // Track ticket query
  const { data: trackedReport, isLoading: isTracking, isError: isTrackError } = useQuery({
    queryKey: ['tracked-report', searchedTicket],
    queryFn: () => (searchedTicket ? fetchCitizenReportByTicket(searchedTicket) : null),
    enabled: !!searchedTicket,
  });

  // Mutation for submitting
  const submitMutation = useMutation({
    mutationFn: submitCitizenReport,
    onSuccess: (newReport) => {
      setSubmittedTicket(newReport.ticket_id);
      queryClient.invalidateQueries({ queryKey: ['citizen-reports'] });
    },
  });

  const handleGetGPS = () => {
    if (!navigator.geolocation) {
      setGpsStatus('Geolocation not supported by browser');
      return;
    }
    setGpsStatus('Acquiring high-accuracy satellite fix...');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude);
        setLon(pos.coords.longitude);
        setGpsStatus(`GPS Locked: ${pos.coords.latitude.toFixed(5)}°N, ${pos.coords.longitude.toFixed(5)}°E`);
      },
      (err) => {
        setGpsStatus(`GPS Notice: ${err.message}. Using Perundurai road coordinates.`);
      },
      { timeout: 8000, enableHighAccuracy: true }
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitMutation.mutate({
      category,
      severity,
      landmark: landmark.trim() || 'Perundurai Township',
      description: description.trim(),
      lat,
      lon,
      reporter_name: reporterName.trim() || 'Anonymous Citizen',
      reporter_phone: reporterPhone.trim(),
    });
  };

  const handleCopyTicket = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSearchTrack = (e: React.FormEvent) => {
    e.preventDefault();
    if (trackQuery.trim()) {
      setSearchedTicket(trackQuery.trim().toUpperCase());
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="border-b border-[var(--rule)] pb-4 flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="survey-plate text-xs text-[var(--ink-muted)]">
              {isTa ? 'குடிமக்கள் குறைதீர்வு மையம் · பெருந்துறை' : 'CITIZEN CIVIC DESK · HIGHWAY INTELLIGENCE'}
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[var(--surface)] border border-[var(--rule)] text-[var(--accent)] font-bold">
              {isTa ? 'தமிழ்' : 'ENGLISH'}
            </span>
          </div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-[var(--ink)] mt-1">
            {isTa ? 'குடிமக்கள் சாலை குறைதீர்வு போர்டல்' : 'Citizen Road Hazard Portal'}
          </h1>
          <p className="text-xs text-[var(--ink-muted)] font-mono mt-0.5">
            {isTa
              ? 'சாலையில் ஆபத்தான பள்ளம் அல்லது விரிசலை கண்டீர்களா? நகராட்சி பொறியாளர்களுக்கு உடனடியாக அறிவியுங்கள்.'
              : 'Spot a road defect? Report it directly to municipal engineers. Every report is audited and tracked.'}
          </p>
        </div>

        {/* Tab Toggle */}
        <div className="flex items-center bg-[var(--paper)] border border-[var(--rule)] p-0.5 rounded text-xs font-mono">
          <button
            onClick={() => setActiveTab('report')}
            className={`px-3 py-1.5 rounded transition-all ${
              activeTab === 'report'
                ? 'bg-[var(--accent)] text-white font-bold shadow-sm'
                : 'text-[var(--ink-muted)] hover:text-[var(--ink)]'
            }`}
          >
            {isTa ? 'குறை கூறு' : 'Report Hazard'}
          </button>
          <button
            onClick={() => setActiveTab('track')}
            className={`px-3 py-1.5 rounded transition-all ${
              activeTab === 'track'
                ? 'bg-[var(--accent)] text-white font-bold shadow-sm'
                : 'text-[var(--ink-muted)] hover:text-[var(--ink)]'
            }`}
          >
            {isTa ? 'நிலை அறி' : 'Track Status'}
          </button>
        </div>
      </div>

      {/* Main Tab Views */}
      {activeTab === 'report' ? (
        <div className="space-y-6">
          {submittedTicket ? (
            /* Success confirmation card */
            <div className="card p-6 bg-gradient-to-br from-[var(--paper)] to-[var(--paper-wash)] border-2 border-[var(--success)] space-y-4">
              <div className="flex items-center gap-3">
                <CheckCircle size={32} weight="fill" className="text-[var(--success)]" />
                <div>
                  <h3 className="font-display text-lg font-bold text-[var(--ink)]">
                    {isTa ? 'புகார் வெற்றிகரமாக பதிவு செய்யப்பட்டது!' : 'Report Successfully Registered!'}
                  </h3>
                  <p className="text-xs text-[var(--ink-muted)] font-mono">
                    {isTa
                      ? 'பெருந்துறை சாலை பராமரிப்பு பிரிவு உங்கள் புகாரைப் பெற்றுள்ளது. விரைவில் நடவடிக்கை எடுக்கப்படும்.'
                      : 'Municipal Road Division has received your hazard report and queued it for verification.'}
                  </p>
                </div>
              </div>

              <div className="p-4 bg-[var(--bg)] border border-[var(--rule)] rounded-md flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="text-[10px] font-mono uppercase text-[var(--ink-muted)]">
                    {isTa ? 'குறிப்பு எண்' : 'Ticket Reference Code'}
                  </div>
                  <div className="text-xl font-mono font-bold text-[var(--accent)] tracking-wider">
                    {submittedTicket}
                  </div>
                </div>
                <button
                  onClick={() => handleCopyTicket(submittedTicket)}
                  className="btn btn-secondary flex items-center justify-center gap-1.5 text-xs py-2 px-3"
                >
                  <Copy size={14} />
                  {copied ? (isTa ? 'நகலெடுக்கப்பட்டது!' : 'Copied!') : (isTa ? 'நகலெடு' : 'Copy Code')}
                </button>
              </div>

              <div className="text-xs font-mono text-[var(--ink-muted)] space-y-1">
                <div className="flex items-center gap-2">
                  <Clock size={14} className="text-[var(--warning)]" />
                  <span>
                    {isTa ? 'சரிபார்க்கப்படும் நேரம்: ' : 'Expected triage window: '}
                    <strong>{isTa ? '24–48 மணி நேரத்திற்குள்' : 'Within 24–48 hours'}</strong>
                  </span>
                </div>
                <p className="italic text-[11px] opacity-80">
                  {isTa
                    ? 'இந்த குறிப்பு எண்ணைப் பயன்படுத்தி "நிலை அறி" பக்கத்தில் உங்கள் புகாரின் முன்னேற்றத்தைக் கண்காணிக்கலாம்.'
                    : 'Use this ticket code under the "Track Status" tab anytime to follow real-time repair progress.'}
                </p>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => {
                    setTrackQuery(submittedTicket);
                    setSearchedTicket(submittedTicket);
                    setActiveTab('track');
                  }}
                  className="btn btn-primary text-xs py-2"
                >
                  {isTa ? 'இந்த புகாரைக் காண்க' : 'Track This Ticket Now'}
                </button>
                <button
                  onClick={() => {
                    setSubmittedTicket(null);
                    setDescription('');
                    setLandmark('');
                  }}
                  className="btn btn-secondary text-xs py-2"
                >
                  {isTa ? 'மற்றொரு புகாரைப் பதிவு செய்' : 'Report Another Hazard'}
                </button>
              </div>
            </div>
          ) : (
            /* Submission Form */
            <form onSubmit={handleSubmit} className="card p-5 space-y-5">
              {/* Category Selector */}
              <div>
                <label className="block text-xs font-mono font-bold text-[var(--ink)] mb-2">
                  {isTa ? '1. குறை வகை' : '1. Hazard Type'} <span className="text-[var(--sev-critical)]">*</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {CATEGORIES.map((cat) => {
                    const Icon = cat.icon;
                    const isSelected = category === cat.id;
                    return (
                      <button
                        type="button"
                        key={cat.id}
                        onClick={() => setCategory(cat.id)}
                        className={`p-3 rounded border text-left transition-all ${
                          isSelected
                            ? 'border-[var(--accent)] bg-[var(--paper-wash)] shadow-sm'
                            : 'border-[var(--rule)] bg-[var(--paper)] hover:border-[var(--ink-muted)]'
                        }`}
                      >
                        <Icon size={20} style={{ color: cat.color }} className="mb-1.5" />
                        <div className="text-xs font-bold text-[var(--ink)]">
                          {isTa ? cat.labelTa : cat.labelEn}
                        </div>
                        <div className="text-[10px] text-[var(--ink-muted)] font-mono mt-0.5 truncate">
                          {isTa ? cat.subTa : cat.subEn}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Severity Selector */}
              <div>
                <label className="block text-xs font-mono font-bold text-[var(--ink)] mb-2">
                  {isTa ? '2. தீவிரத்தன்மை' : '2. Hazard Severity'} <span className="text-[var(--sev-critical)]">*</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {SEVERITIES.map((s) => {
                    const isSelected = severity === s.id;
                    return (
                      <button
                        type="button"
                        key={s.id}
                        onClick={() => setSeverity(s.id)}
                        className={`p-2.5 rounded border text-left transition-all ${
                          isSelected
                            ? 'border-[var(--ink)] bg-[var(--paper-wash)]'
                            : 'border-[var(--rule)] bg-[var(--paper)] hover:border-[var(--ink-muted)]'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-[var(--ink)]">
                            {isTa ? s.labelTa : s.labelEn}
                          </span>
                        </div>
                        <div className="text-[10px] text-[var(--ink-muted)] font-mono mt-1">
                          {isTa ? s.subTa : s.subEn}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Location & GPS */}
              <div className="space-y-3 border-t border-[var(--rule)] pt-4">
                <label className="block text-xs font-mono font-bold text-[var(--ink)]">
                  {isTa ? '3. இடம் மற்றும் அடையாளம்' : '3. Location & Landmark'} <span className="text-[var(--sev-critical)]">*</span>
                </label>

                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="flex-1">
                    <input
                      type="text"
                      required
                      placeholder={
                        isTa
                          ? 'எ.கா. கே.இ.சி வளைவு அருகில், பெருந்துறை - ஈரோடு சாலை'
                          : 'e.g. Near KEC Arch Gate, Chennimalai Road'
                      }
                      value={landmark}
                      onChange={(e) => setLandmark(e.target.value)}
                      className="w-full text-xs font-mono p-2.5 bg-[var(--bg)] border border-[var(--rule)] rounded focus:outline-none focus:border-[var(--ink)]"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleGetGPS}
                    className="btn btn-secondary flex items-center justify-center gap-1.5 text-xs py-2 px-3 whitespace-nowrap"
                  >
                    <NavigationArrow size={14} className="text-[var(--accent)]" />
                    {isTa ? 'ஜி.பி.எஸ் இடம் பெறு' : 'Use Current GPS'}
                  </button>
                </div>

                <div className="flex items-center gap-2 text-[10px] font-mono text-[var(--ink-muted)] bg-[var(--paper)] p-2 rounded border border-[var(--rule)]">
                  <MapPin size={12} className="text-[var(--accent)] shrink-0" />
                  <span className="truncate">{gpsStatus}</span>
                </div>
              </div>

              {/* Description & Photo */}
              <div className="space-y-3 border-t border-[var(--rule)] pt-4">
                <div>
                  <label className="block text-xs font-mono font-bold text-[var(--ink)] mb-1">
                    {isTa ? '4. விளக்கம்' : '4. Description'}
                  </label>
                  <textarea
                    rows={2}
                    placeholder={
                      isTa
                        ? 'பள்ளத்தின் அளவு, ஆழம் அல்லது சுற்றியுள்ள ஆபத்துகளை விளக்கவும்...'
                        : 'Describe size, depth, or nearby hazards (e.g. 1-meter pothole near school turn)...'
                    }
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full text-xs font-mono p-2.5 bg-[var(--bg)] border border-[var(--rule)] rounded focus:outline-none focus:border-[var(--ink)]"
                  />
                </div>

                {/* Photo Simulation */}
                <div className="p-3 border border-dashed border-[var(--rule)] rounded bg-[var(--paper)] flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-xs font-mono text-[var(--ink-muted)]">
                    <Camera size={18} className="text-[var(--accent)]" />
                    <span>{isTa ? 'புகைப்படம் இணைக்கவும் (கேமரா தயார்)' : 'Attach photo (Optional camera capture)'}</span>
                  </div>
                  <span className="text-[10px] font-mono text-[var(--ink-muted)] bg-[var(--bg)] px-2 py-0.5 rounded border border-[var(--rule)]">
                    {isTa ? 'கேமரா தயார்' : 'Camera Ready'}
                  </span>
                </div>
              </div>

              {/* Citizen Contact (Optional) */}
              <div className="border-t border-[var(--rule)] pt-4 space-y-2">
                <label className="block text-xs font-mono font-bold text-[var(--ink)]">
                  {isTa ? '5. எஸ்.எம்.எஸ் புதுப்பிப்புகளுக்கான தொடர்பு எண் (விருப்பத்தேர்வு)' : '5. Contact for SMS updates (Optional)'}
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="flex items-center gap-1.5 bg-[var(--bg)] border border-[var(--rule)] rounded px-2.5">
                    <User size={14} className="text-[var(--ink-muted)]" />
                    <input
                      type="text"
                      placeholder={isTa ? 'உங்கள் பெயர்' : 'Your name'}
                      value={reporterName}
                      onChange={(e) => setReporterName(e.target.value)}
                      className="w-full text-xs font-mono py-2 bg-transparent focus:outline-none"
                    />
                  </div>
                  <div className="flex items-center gap-1.5 bg-[var(--bg)] border border-[var(--rule)] rounded px-2.5">
                    <Phone size={14} className="text-[var(--ink-muted)]" />
                    <input
                      type="tel"
                      placeholder={isTa ? 'கைபேசி எண் (+91)' : 'Mobile number (+91)'}
                      value={reporterPhone}
                      onChange={(e) => setReporterPhone(e.target.value)}
                      className="w-full text-xs font-mono py-2 bg-transparent focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Submit CTA */}
              <div className="border-t border-[var(--rule)] pt-4 flex items-center justify-between">
                <span className="text-[10px] font-mono text-[var(--ink-muted)] italic">
                  {isTa ? 'தமிழ்நாடு நகராட்சி குடிமக்கள் சாசனத்தின் கீழ் பாதுகாக்கப்பட்டது.' : 'Protected under Tamil Nadu Municipal Civic Charter.'}
                </span>
                <button
                  type="submit"
                  disabled={submitMutation.isPending}
                  className="btn btn-primary flex items-center gap-2 text-xs py-2 px-4 shadow-sm font-bold"
                >
                  <PaperPlaneTilt size={14} weight="bold" />
                  {submitMutation.isPending
                    ? (isTa ? 'பதிவு செய்யப்படுகிறது...' : 'Registering Report...')
                    : (isTa ? 'புகாரை சமர்ப்பிக்கவும்' : 'Submit Hazard Report')}
                </button>
              </div>
            </form>
          )}
        </div>
      ) : (
        /* Track Status Tab */
        <div className="space-y-6">
          <form onSubmit={handleSearchTrack} className="card p-4 flex gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder={isTa ? 'குறிப்பு எண்ணை உள்ளிடவும் (எ.கா. MGA-CIT-4192)' : 'Enter Ticket Code (e.g. MGA-CIT-4192)'}
                value={trackQuery}
                onChange={(e) => setTrackQuery(e.target.value)}
                className="w-full text-xs font-mono pl-8 pr-3 py-2 bg-[var(--bg)] border border-[var(--rule)] rounded focus:outline-none focus:border-[var(--ink)]"
              />
              <MagnifyingGlass
                size={14}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--ink-muted)]"
              />
            </div>
            <button type="submit" className="btn btn-primary text-xs py-2 px-4 font-bold">
              {isTa ? 'நிலையை சரிபார்' : 'Track Status'}
            </button>
          </form>

          {isTracking && (
            <div className="card p-8 text-center text-xs font-mono text-[var(--ink-muted)]">
              {isTa ? 'புகார் நிலை தேடப்படுகிறது...' : 'Looking up ticket status...'}
            </div>
          )}

          {isTrackError && (
            <div className="card p-6 text-center text-xs font-mono text-[var(--sev-critical)]">
              {isTa
                ? 'குறிப்பு எண் கிடைக்கவில்லை. தயவுசெய்து எண்ணைச் சரிபார்த்து மீண்டும் முயற்சிக்கவும்.'
                : 'Ticket code not found. Please verify the code and try again.'}
            </div>
          )}

          {trackedReport && (
            <div className="card p-5 space-y-6">
              {/* Ticket Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[var(--rule)] pb-4">
                <div>
                  <span className="text-[10px] font-mono uppercase text-[var(--ink-muted)]">
                    {isTa ? 'சாலை குறை கண்காணிப்பு பதிவு' : 'Hazard Tracking Record'}
                  </span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xl font-mono font-bold text-[var(--accent)]">
                      {trackedReport.ticket_id}
                    </span>
                    <span className="text-xs font-mono px-2 py-0.5 rounded bg-[var(--paper-wash)] border border-[var(--rule)] uppercase font-semibold">
                      {trackedReport.category}
                    </span>
                  </div>
                </div>
                <div className="text-right sm:text-right">
                  <div className="text-xs font-mono font-semibold text-[var(--ink)]">
                    {trackedReport.landmark}
                  </div>
                  <div className="text-[10px] font-mono text-[var(--ink-muted)]">
                    {isTa ? 'பதிவு செய்யப்பட்ட தேதி: ' : 'Reported on '}
                    {new Date(trackedReport.created_at).toLocaleDateString()}
                  </div>
                </div>
              </div>

              {/* Resolution Stepper */}
              <div>
                <div className="text-xs font-mono font-bold text-[var(--ink)] mb-4">
                  {isTa ? 'பராமரிப்பு நிலவரம்' : 'Lifecycle Status'}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {STATUS_STEPS.map((step, idx) => {
                    const currentIdx = STATUS_STEPS.findIndex((s) => s.key === trackedReport.status);
                    const isDone = idx <= currentIdx;
                    const isCurrent = idx === currentIdx;

                    return (
                      <div
                        key={step.key}
                        className={`p-3 rounded border text-left transition-all ${
                          isCurrent
                            ? 'border-[var(--accent)] bg-[var(--accent-tint)] shadow-sm'
                            : isDone
                            ? 'border-[var(--success)] bg-[var(--paper)]'
                            : 'border-[var(--rule)] bg-[var(--bg)] opacity-50'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 mb-1">
                          {isDone ? (
                            <CheckCircle size={14} weight="fill" className="text-[var(--success)]" />
                          ) : (
                            <Clock size={14} className="text-[var(--ink-muted)]" />
                          )}
                          <span className="text-xs font-bold text-[var(--ink)]">
                            {isTa ? step.labelTa : step.labelEn}
                          </span>
                        </div>
                        <div className="text-[9px] font-mono text-[var(--ink-muted)] mt-1 line-clamp-2">
                          {isTa ? step.subTa : step.subEn}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Details */}
              {trackedReport.description && (
                <div className="p-3 bg-[var(--paper)] rounded border border-[var(--rule)] text-xs font-mono text-[var(--ink)]">
                  <div className="text-[10px] text-[var(--ink-muted)] font-bold mb-1">
                    {isTa ? 'குடிமக்கள் குறிப்புரை:' : 'CITIZEN OBSERVATION NOTE:'}
                  </div>
                  "{trackedReport.description}"
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Community Reports Feed */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between border-b border-[var(--rule)] pb-2">
          <div className="flex items-center gap-2">
            <ChatCircleText size={16} className="text-[var(--accent)]" />
            <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-[var(--ink)]">
              {isTa ? 'சமீபத்திய சமூக அறிக்கைகள் · பெருந்துறை பிரிவு' : 'Recent Community Hazard Reports · Perundurai Division'}
            </h2>
          </div>
          <span className="text-[10px] font-mono text-[var(--ink-muted)]">
            {reports.length} {isTa ? 'பதிவுகள்' : 'reports logged'}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {reports.slice(0, 4).map((report: CitizenReportItem) => (
            <div
              key={report.id}
              onClick={() => {
                setTrackQuery(report.ticket_id);
                setSearchedTicket(report.ticket_id);
                setActiveTab('track');
              }}
              className="card p-3 cursor-pointer hover:border-[var(--ink)] transition-all space-y-1.5"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-[var(--accent)]">
                  {report.ticket_id}
                </span>
                <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-[var(--paper-wash)] border border-[var(--rule)]">
                  {report.status.replace(/_/g, ' ')}
                </span>
              </div>
              <div className="text-xs font-semibold text-[var(--ink)] line-clamp-1">
                {report.landmark || 'Perundurai Road'}
              </div>
              <p className="text-[11px] text-[var(--ink-muted)] font-mono line-clamp-2">
                {report.description || 'Hazard reported by commuter.'}
              </p>
              <div className="flex items-center justify-between text-[9px] font-mono text-[var(--ink-muted)] pt-1 border-t border-[var(--rule)]">
                <span>Reporter: {report.reporter_name || 'Anonymous'}</span>
                <span>{new Date(report.created_at).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
