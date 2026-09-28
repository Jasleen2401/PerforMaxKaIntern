import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useCreateCycleMutation } from '../../features/appraisal/appraisalApi';
import { useGetFinancialYearsQuery } from '../../features/appraisal/financialYearApi';
import { CustomDateInput } from '../../components/common/CustomDateInput';
import {
  Calendar, ChevronLeft, Target, UserCheck, User, CheckCircle2, AlertCircle
} from 'lucide-react';
import { subDays, isBefore, format, addMonths, addYears } from 'date-fns';

const inputStyle: React.CSSProperties = {
  background: '#F5F6F8', border: '0.5px solid #E0E2E8', borderRadius: 8,
  padding: '7px 12px', fontSize: 13, color: '#111827', outline: 'none', width: '100%', boxSizing: 'border-box',
  fontFamily: 'inherit',
};

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 11, fontWeight: 500, color: '#9EA3B0',
  textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 5,
};

const panelStyle: React.CSSProperties = {
  background: '#FFFFFF', border: '0.5px solid #E4E6EC', borderRadius: 12, padding: '16px 18px',
};

const AppraisalCycleCreate: React.FC = () => {
  const navigate = useNavigate();
  const [createCycle, { isLoading }] = useCreateCycleMutation();
  const { data: financialYears = [] } = useGetFinancialYearsQuery();

  const [creationMode, setCreationMode] = useState<'MANUAL' | 'FINANCIAL_YEAR'>('FINANCIAL_YEAR');
  const [manualFrequency, setManualFrequency] = useState<'ANNUAL' | 'SEMI_ANNUAL'>('ANNUAL');
  const [frequency, setFrequency] = useState<'ANNUAL' | 'SEMI_ANNUAL' | 'QUARTERLY'>('ANNUAL');
  const [period, setPeriod] = useState<string>('FULL');

  const [formData, setFormData] = useState({
    cycleName: '2024 Annual Performance Review',
    startDate: '', endDate: '',
    selfAssessmentDeadline: '', managerEvaluationDeadline: '', finalizationDeadline: '',
    evaluationPeriod: 'Q1-Q4 2024',
    status: 'PLANNING', isActive: false,
    kpiWeight: 40, managerWeight: 40, feedbackWeight: 0, selfWeight: 20,
    financialYearId: ''
  });

  React.useEffect(() => {
    if (!formData.financialYearId && financialYears.length > 0) {
      const currentYear = financialYears.find(y => y.isCurrent);
      if (currentYear?.id != null) setFormData(prev => ({ ...prev, financialYearId: currentYear.id.toString() }));
    }
  }, [financialYears, formData.financialYearId]);

  React.useEffect(() => {
    if (creationMode === 'FINANCIAL_YEAR' && formData.financialYearId && financialYears.length > 0) {
      const selectedYear = financialYears.find(y => y.id?.toString() === formData.financialYearId);
      if (selectedYear) {
        const fyStart = new Date(selectedYear.startDate);
        const fyEnd = new Date(selectedYear.endDate);
        let newStart = new Date(fyStart);
        let newEnd = new Date(fyEnd);
        if (frequency === 'SEMI_ANNUAL') {
          if (period === 'H1') newEnd = subDays(addMonths(fyStart, 6), 1);
          else newStart = addMonths(fyStart, 6);
        } else if (frequency === 'QUARTERLY') {
          if (period === 'Q1') newEnd = subDays(addMonths(fyStart, 3), 1);
          else if (period === 'Q2') { newStart = addMonths(fyStart, 3); newEnd = subDays(addMonths(fyStart, 6), 1); }
          else if (period === 'Q3') { newStart = addMonths(fyStart, 6); newEnd = subDays(addMonths(fyStart, 9), 1); }
          else if (period === 'Q4') newStart = addMonths(fyStart, 9);
        }
        const finalization = subDays(newEnd, 5);
        const manager = subDays(finalization, 5);
        const self = subDays(manager, 10);
        setFormData(prev => ({
          ...prev,
          startDate: format(newStart, 'yyyy-MM-dd'),
          endDate: format(newEnd, 'yyyy-MM-dd'),
          finalizationDeadline: format(finalization, 'yyyy-MM-dd'),
          managerEvaluationDeadline: format(manager, 'yyyy-MM-dd'),
          selfAssessmentDeadline: format(self, 'yyyy-MM-dd'),
          evaluationPeriod: `${selectedYear.title} - ${period === 'FULL' ? 'Annual' : period}`
        }));
      }
    }
  }, [creationMode, formData.financialYearId, frequency, period, financialYears]);

  const totalWeight = Number(formData.kpiWeight) + Number(formData.managerWeight) +
    Number(formData.feedbackWeight) + Number(formData.selfWeight);

  const calculateManualEndDate = (startDateValue: string, cycleLength: 'ANNUAL' | 'SEMI_ANNUAL') => {
    const start = new Date(startDateValue);
    const end = cycleLength === 'ANNUAL'
      ? subDays(addYears(start, 1), 1)
      : subDays(addMonths(start, 6), 1);

    return format(end, 'yyyy-MM-dd');
  };

  const applyDefaultDeadlines = (data: typeof formData) => {
    if (!data.startDate || !data.endDate) return data;

    const start = new Date(data.startDate);
    const end = new Date(data.endDate);

    if (isBefore(start, end) || start.getTime() === end.getTime()) {
      const finalization = subDays(end, 5);
      const manager = subDays(finalization, 5);
      const self = subDays(manager, 10);

      return {
        ...data,
        finalizationDeadline: format(finalization, 'yyyy-MM-dd'),
        managerEvaluationDeadline: format(manager, 'yyyy-MM-dd'),
        selfAssessmentDeadline: format(self, 'yyyy-MM-dd'),
      };
    }

    return data;
  };

  const handleManualFrequencyChange = (value: 'ANNUAL' | 'SEMI_ANNUAL') => {
    setManualFrequency(value);
    setFormData(prev => {
      if (creationMode !== 'MANUAL' || !prev.startDate) return prev;

      return applyDefaultDeadlines({
        ...prev,
        endDate: calculateManualEndDate(prev.startDate, value),
        evaluationPeriod: value === 'ANNUAL' ? 'Annual Review' : 'Semi-Annual Review',
      });
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (totalWeight !== 100) { toast.warning('Total weights must sum to 100%'); return; }
    if (creationMode === 'FINANCIAL_YEAR' && !formData.financialYearId) { toast.warning('Please select a Financial Year.'); return; }
    if (!formData.startDate || !formData.endDate) { toast.warning('Please set both Start Date and End Date.'); return; }
    if (new Date(formData.endDate) < new Date(formData.startDate)) { toast.warning('End Date cannot be before Start Date'); return; }
    try {
      const requestData = { ...formData, financialYearId: (creationMode === 'FINANCIAL_YEAR' && formData.financialYearId) ? Number(formData.financialYearId) : undefined };
      await createCycle(requestData).unwrap();
      toast.success('Appraisal Cycle created!');
      navigate('/appraisal', { state: { activeTab: 'forms', expandedCycle: formData.cycleName } });
    } catch (err: any) {
      toast.error('Error: Failed to create cycle.');
    }
  };

  const handleDateChange = (field: string, value: string) => {
    let updatedData = { ...formData, [field]: value };

    if (creationMode === 'MANUAL' && field === 'startDate' && value) {
      updatedData = {
        ...updatedData,
        endDate: calculateManualEndDate(value, manualFrequency),
      };
    }

    setFormData(applyDefaultDeadlines(updatedData));
  };

  const WeightRow = ({ label, icon: Icon, field, color }: { label: string; icon: React.ElementType; field: keyof typeof formData; color: string }) => (
    <div style={{ marginBottom: 16 }}>
      <div className="flex items-center justify-between" style={{ marginBottom: 6 }}>
        <label style={{ fontSize: 13, color: '#5A6070', display: 'flex', alignItems: 'center', gap: 6 }}>
          <Icon size={13} style={{ color }} /> {label}
        </label>
        <span style={{ fontSize: 13, fontWeight: 500, color: '#111827' }}>{formData[field]}%</span>
      </div>
      <input type="range" min="0" max="100" step="5" value={Number(formData[field])}
        onChange={e => setFormData({ ...formData, [field]: Number(e.target.value) })}
        style={{ width: '100%', accentColor: '#1A56DB' }} />
      <div style={{ height: 3, background: '#F0F2F6', borderRadius: 4, marginTop: 4 }}>
        <div style={{ height: '100%', borderRadius: 4, background: '#1A56DB', width: `${formData[field]}%` }} />
      </div>
    </div>
  );

  return (
    <div className="space-y-4 pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)}
            style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '0.5px solid #E4E6EC', borderRadius: 8, background: '#FFFFFF', color: '#5A6070' }}
            className="hover:bg-[#F5F6F8] transition-colors">
            <ChevronLeft size={16} />
          </button>
          <div>
            <h1 style={{ fontSize: 18, fontWeight: 500, color: '#111827' }}>Configure New Cycle</h1>
            <p style={{ fontSize: 12, color: '#9EA3B0', marginTop: 1 }}>Set evaluation periods, deadlines, and scoring weights.</p>
          </div>
        </div>
        <button onClick={handleSubmit} disabled={isLoading || totalWeight !== 100}
          className="inline-flex items-center gap-2 transition-colors disabled:opacity-50 self-start sm:self-auto"
          style={{ background: '#1A56DB', color: '#FFFFFF', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 500, border: 'none' }}>
          <CheckCircle2 size={14} /> {isLoading ? 'Creating…' : 'Initialize Cycle'}
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Left: General Info + Deadlines */}
          <div className="space-y-4">
            {/* General info */}
            <div style={panelStyle}>
              <div className="flex items-center gap-2" style={{ marginBottom: 16 }}>
                <Calendar size={15} style={{ color: '#1A56DB' }} />
                <p style={{ fontSize: 14, fontWeight: 500, color: '#111827' }}>General Info</p>
              </div>
              {/* Creation mode */}
              <div className="flex gap-4" style={{ marginBottom: 16, paddingBottom: 16, borderBottom: '0.5px solid #F0F2F6' }}>
                {(['MANUAL', 'FINANCIAL_YEAR'] as const).map(mode => (
                  <label key={mode} className="flex items-center gap-2 cursor-pointer" style={{ fontSize: 13, color: '#5A6070' }}>
                    <input type="radio" name="mode" value={mode} checked={creationMode === mode} onChange={() => setCreationMode(mode)}
                      style={{ accentColor: '#1A56DB' }} />
                    {mode === 'MANUAL' ? 'Manual Dates' : 'Financial Year Based'}
                  </label>
                ))}
              </div>

              <div className="space-y-4">
                <div>
                  <label style={labelStyle}>Cycle Name</label>
                  <input type="text" style={inputStyle} placeholder="e.g. 2024 Year-End Review"
                    value={formData.cycleName} onChange={e => setFormData({ ...formData, cycleName: e.target.value })} required />
                </div>

                {creationMode === 'FINANCIAL_YEAR' && (
                  <div style={{ background: '#F5F6F8', border: '0.5px solid #E0E2E8', borderRadius: 8, padding: '12px' }}>
                    <div style={{ marginBottom: 12 }}>
                      <label style={labelStyle}>Financial Year</label>
                      <select style={inputStyle} value={formData.financialYearId}
                        onChange={e => setFormData({ ...formData, financialYearId: e.target.value })} required>
                        <option value="" disabled>Select Financial Year</option>
                        {financialYears.map(year => (
                          <option key={year.id} value={year.id}>{year.title} {year.isCurrent ? '(Current)' : ''}</option>
                        ))}
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label style={labelStyle}>Frequency</label>
                        <select style={inputStyle} value={frequency}
                          onChange={e => { setFrequency(e.target.value as any); setPeriod(e.target.value === 'ANNUAL' ? 'FULL' : e.target.value === 'SEMI_ANNUAL' ? 'H1' : 'Q1'); }}>
                          <option value="ANNUAL">Annual</option>
                          <option value="SEMI_ANNUAL">Semi-Annual</option>
                          <option value="QUARTERLY">Quarterly</option>
                        </select>
                      </div>
                      <div>
                        <label style={labelStyle}>Period</label>
                        <select style={inputStyle} value={period} onChange={e => setPeriod(e.target.value)} disabled={frequency === 'ANNUAL'}>
                          {frequency === 'ANNUAL' && <option value="FULL">Full Year</option>}
                          {frequency === 'SEMI_ANNUAL' && (<><option value="H1">First Half (H1)</option><option value="H2">Second Half (H2)</option></>)}
                          {frequency === 'QUARTERLY' && (<><option value="Q1">Q1</option><option value="Q2">Q2</option><option value="Q3">Q3</option><option value="Q4">Q4</option></>)}
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {creationMode === 'MANUAL' && (
                  <div style={{ background: '#F5F6F8', border: '0.5px solid #E0E2E8', borderRadius: 8, padding: '12px' }}>
                    <label style={labelStyle}>Cycle Length</label>
                    <div className="flex gap-4">
                      {([
                        { value: 'ANNUAL', label: 'Annual' },
                        { value: 'SEMI_ANNUAL', label: 'Semi-Annual' },
                      ] as const).map(option => (
                        <label key={option.value} className="flex items-center gap-2 cursor-pointer" style={{ fontSize: 13, color: '#5A6070' }}>
                          <input
                            type="radio"
                            name="manualFrequency"
                            value={option.value}
                            checked={manualFrequency === option.value}
                            onChange={() => handleManualFrequencyChange(option.value)}
                            style={{ accentColor: '#1A56DB' }}
                          />
                          {option.label}
                        </label>
                      ))}
                    </div>
                    <p style={{ fontSize: 11, color: '#9EA3B0', marginTop: 8 }}>
                      End date will be suggested from the start date. You can still change it manually.
                    </p>
                  </div>
                )}

                <div>
                  <label style={labelStyle}>Evaluation Period Title</label>
                  <input type="text" style={inputStyle} placeholder="e.g. FY 2024 / Q4 2024"
                    value={formData.evaluationPeriod} onChange={e => setFormData({ ...formData, evaluationPeriod: e.target.value })} required />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label style={labelStyle}>Start Date</label>
                    <CustomDateInput style={inputStyle} value={formData.startDate}
                      onChange={val => handleDateChange('startDate', val)}
                      disabled={creationMode === 'FINANCIAL_YEAR'} required />
                  </div>
                  <div>
                    <label style={labelStyle}>End Date</label>
                    <CustomDateInput style={inputStyle} value={formData.endDate} min={formData.startDate}
                      onChange={val => handleDateChange('endDate', val)}
                      disabled={creationMode === 'FINANCIAL_YEAR'} required />
                  </div>
                </div>
              </div>
            </div>

            {/* Deadlines */}
            <div style={panelStyle}>
              <div className="flex items-center gap-2" style={{ marginBottom: 16 }}>
                <AlertCircle size={15} style={{ color: '#633806' }} />
                <p style={{ fontSize: 14, fontWeight: 500, color: '#111827' }}>Deadlines</p>
              </div>
              <div className="space-y-4">
                {[
                  { label: 'Self Assessment Deadline', field: 'selfAssessmentDeadline' as const },
                  { label: 'Manager Evaluation Deadline', field: 'managerEvaluationDeadline' as const },
                  { label: 'Finalization Deadline', field: 'finalizationDeadline' as const },
                ].map(({ label, field }) => (
                  <div key={field}>
                    <label style={labelStyle}>{label}</label>
                    <CustomDateInput style={inputStyle} value={(formData as any)[field]}
                      min={formData.startDate} max={formData.endDate}
                      onChange={val => setFormData({ ...formData, [field]: val })} required />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right: Scoring Weights */}
          <div style={panelStyle}>
            <div className="flex items-center justify-between" style={{ marginBottom: 16 }}>
              <div className="flex items-center gap-2">
                <Target size={15} style={{ color: '#27500A' }} />
                <p style={{ fontSize: 14, fontWeight: 500, color: '#111827' }}>Scoring Weights</p>
              </div>
              <span style={{ fontSize: 11, fontWeight: 500, background: totalWeight === 100 ? '#EAF3DE' : '#FCEBEB', color: totalWeight === 100 ? '#27500A' : '#791F1F', border: `0.5px solid ${totalWeight === 100 ? '#B8DCA0' : '#F5C2C2'}`, borderRadius: 20, padding: '2px 8px' }}>
                Total: {totalWeight}%
              </span>
            </div>
            <p style={{ fontSize: 12, color: '#9EA3B0', marginBottom: 20 }}>
              Define how much each component contributes to the final performance score.
            </p>
            <WeightRow label="Goals & Deliverables" icon={Target} field="kpiWeight" color="#1A56DB" />
            <WeightRow label="Manager / Mentor Review" icon={UserCheck} field="managerWeight" color="#27500A" />
            <WeightRow label="Self Assessment" icon={User} field="selfWeight" color="#633806" />
            {totalWeight !== 100 && (
              <div style={{ background: '#FCEBEB', border: '0.5px solid #F5C2C2', borderRadius: 8, padding: '10px 12px', display: 'flex', alignItems: 'start', gap: 8, marginTop: 16 }}>
                <AlertCircle size={14} style={{ color: '#791F1F', flexShrink: 0, marginTop: 1 }} />
                <p style={{ fontSize: 12, color: '#791F1F' }}>
                  Weights must total 100%. Current total: {totalWeight}%.
                </p>
              </div>
            )}
          </div>
        </div>
      </form>
    </div>
  );
};

export default AppraisalCycleCreate;
