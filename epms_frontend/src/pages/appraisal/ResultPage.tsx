import { useParams, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import {
  useGetEmployeeAssessmentQuery,
  useUploadEmployeeSignatureMutation,
  useUploadManagerSignatureMutation,
  useGetScoreBreakdownQuery,
  useCalculateScoreMutation
} from '../../features/appraisal/appraisalApi';
import { useGetFeedbackSummaryQuery } from '../../features/feedback360/feedback360Api';
import { format } from 'date-fns';
import {
  ChevronLeft, Award, User, CheckCircle2, ShieldCheck, MessageSquare,
  Download, Target, Clock, Calculator, Sliders, Loader2
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import SignaturePad from '../../components/appraisal/SignaturePad';
import type { RootState } from '../../app/store';

const panelStyle: React.CSSProperties = {
  background: '#FFFFFF', border: '0.5px solid #E4E6EC', borderRadius: 12, padding: '16px 18px',
};

const ResultPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isHR, isAdmin } = useAuth();

  const { data: appraisal, isLoading } = useGetEmployeeAssessmentQuery(id || '', { skip: !id });
  const { data: breakdown } = useGetScoreBreakdownQuery(id || '', { skip: !id });
  const { data: feedbackSummary } = useGetFeedbackSummaryQuery(
    { targetUserId: appraisal?.employeeId ?? 0, cycleId: appraisal?.cycleId ?? 0 },
    { skip: !appraisal?.employeeId || !appraisal?.cycleId }
  );
  const [calculateScore, { isLoading: isCalculating }] = useCalculateScoreMutation();
  const [uploadEmployeeSignature, { isLoading: isSigningEmployee }] = useUploadEmployeeSignatureMutation();
  const [uploadManagerSignature, { isLoading: isSigningManager }] = useUploadManagerSignatureMutation();
  const accessToken = useSelector((state: RootState) => state.auth.accessToken);
  const [isExporting, setIsExporting] = useState(false);

  const handleExportPdf = async () => {
    if (!appraisal?.employeeId || !appraisal?.cycleId) {
      toast.error('Missing employee or cycle information');
      return;
    }
    setIsExporting(true);
    try {
      const res = await fetch(
        `/api/v1/reports/performance-summary/download?employeeId=${appraisal.employeeId}&cycleId=${appraisal.cycleId}&format=pdf`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'ngrok-skip-browser-warning': 'true',
          },
        }
      );
      if (!res.ok) throw new Error('Download failed');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Performance_Summary_${appraisal.employeeName?.replace(/\s+/g, '_') || 'Report'}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success('PDF downloaded successfully!');
    } catch (err) {
      toast.error('Failed to export PDF');
    } finally {
      setIsExporting(false);
    }
  };

  if (isLoading) return <div className="py-16 text-center" style={{ color: '#9EA3B0', fontSize: 13 }}>Loading…</div>;
  if (!appraisal) return (
    <div style={{ background: '#FCEBEB', border: '0.5px solid #F5C2C2', borderRadius: 12, padding: '16px 18px', fontSize: 13, color: '#791F1F' }}>
      Results not found.
    </div>
  );

  const isEmployee = user?.id === appraisal.employeeId;
  const isManager = user?.id === appraisal.managerId;
  const isPrivileged = isHR || isAdmin;
  const displayScore = breakdown?.finalTotalScore ?? appraisal.finalScore;

  const handleCalculate = async () => {
    try { await calculateScore(id!).unwrap(); toast.success('Scores calculated!'); }
    catch (err: any) { toast.error('Calculation failed.'); }
  };
  const handleEmployeeSign = async (file: File) => {
    try { await uploadEmployeeSignature({ id: id!, file }).unwrap(); toast.success('Sign-off successful!'); }
    catch (err: any) { toast.error('Upload failed.'); }
  };
  const handleManagerSign = async (file: File) => {
    try { await uploadManagerSignature({ id: id!, file }).unwrap(); toast.success('Manager sign-off successful!'); }
    catch (err: any) { toast.error('Upload failed.'); }
  };

  const getScoreBg = (score: number) => {
    if (score >= 90) return '#EAF3DE';
    if (score >= 70) return '#EEF3FD';
    if (score >= 50) return '#FAEEDA';
    return '#FCEBEB';
  };
  const getScoreText = (score: number) => {
    if (score >= 90) return '#27500A';
    if (score >= 70) return '#0C447C';
    if (score >= 50) return '#633806';
    return '#791F1F';
  };

  return (
    <div className="space-y-4 pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(`/appraisal/${id}`)}
            style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '0.5px solid #E4E6EC', borderRadius: 8, background: '#FFFFFF', color: '#5A6070' }}
            className="hover:bg-[#F5F6F8] transition-colors">
            <ChevronLeft size={16} />
          </button>
          <h1 style={{ fontSize: 18, fontWeight: 500, color: '#111827' }}>Performance Report</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          {isPrivileged && (
            <button onClick={handleCalculate} disabled={isCalculating} className="inline-flex items-center gap-2 transition-colors disabled:opacity-50"
              style={{ background: '#EEF3FD', color: '#0C447C', border: '0.5px solid #B5D4F4', borderRadius: 8, padding: '7px 12px', fontSize: 13, fontWeight: 500 }}>
              <Calculator size={13} /> {isCalculating ? 'Calculating…' : 'Recalculate'}
            </button>
          )}
          <button onClick={handleExportPdf} disabled={isExporting} className="inline-flex items-center gap-2 transition-colors disabled:opacity-50"
            style={{ background: '#111827', color: '#FFFFFF', borderRadius: 8, padding: '7px 12px', fontSize: 13, fontWeight: 500, border: 'none', cursor: isExporting ? 'not-allowed' : 'pointer' }}>
            {isExporting ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />} {isExporting ? 'Exporting…' : 'Export PDF'}
          </button>
        </div>
      </div>

      {/* Score banner */}
      <div style={panelStyle}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
          <div className="flex-1">
            <div className="flex items-center gap-2" style={{ marginBottom: 8 }}>
              <Award size={15} style={{ color: '#1A56DB' }} />
              <span style={{ fontSize: 10, fontWeight: 500, color: '#9EA3B0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Official Rating · {appraisal.cycleName}</span>
            </div>
            <p style={{ fontSize: 16, fontWeight: 500, color: '#111827', marginBottom: 4 }}>{appraisal.employeeName}</p>
            <div className="flex flex-wrap gap-4" style={{ marginTop: 6 }}>
              <span style={{ fontSize: 12, color: '#5A6070', display: 'flex', alignItems: 'center', gap: 4 }}><User size={12} style={{ color: '#1A56DB' }} />{appraisal.employeeCode}</span>
              <span style={{ fontSize: 12, color: '#5A6070', display: 'flex', alignItems: 'center', gap: 4 }}><Target size={12} style={{ color: '#1A56DB' }} />{appraisal.positionName || 'N/A'}</span>
            </div>
          </div>
          <div style={{ textAlign: 'center', padding: '16px 24px', background: getScoreBg(Number(displayScore) || 0), borderRadius: 10, border: `0.5px solid ${getScoreText(Number(displayScore) || 0)}30` }}>
            <p style={{ fontSize: 10, fontWeight: 500, color: '#9EA3B0', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>Overall Index</p>
            <p style={{ fontSize: 36, fontWeight: 500, color: getScoreText(Number(displayScore) || 0), lineHeight: 1 }}>
              {displayScore != null ? Number(displayScore).toFixed(1) : '--'}
            </p>
            <div style={{ height: 4, width: 80, background: 'rgba(0,0,0,0.1)', borderRadius: 4, margin: '8px auto 0' }}>
              <div style={{ height: '100%', borderRadius: 4, background: getScoreText(Number(displayScore) || 0), width: `${Number(displayScore) || 0}%` }} />
            </div>
            {(breakdown?.performanceCategoryName || breakdown?.finalGrade) && (
              <p style={{ fontSize: 10, color: getScoreText(Number(displayScore) || 0), marginTop: 6, fontWeight: 500 }}>
                {breakdown.performanceCategoryName || breakdown.finalGrade.replace(/_/g, ' ')}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* HR Approval comment */}
      <div style={panelStyle}>
        <div className="flex items-center gap-2" style={{ marginBottom: 10 }}>
          <ShieldCheck size={15} style={{ color: '#1A56DB' }} />
          <p style={{ fontSize: 14, fontWeight: 500, color: '#111827' }}>Administrative Verification</p>
          <span style={{ fontSize: 11, color: '#9EA3B0' }}>· HR Final Approval</span>
        </div>
        <p style={{ fontSize: 13, color: '#5A6070', lineHeight: 1.6, padding: '10px 12px', background: '#F5F6F8', borderRadius: 8, marginBottom: 10 }}>
          {appraisal.approvalComment || 'The appraisal results have been verified and approved by the HR department.'}
        </p>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <span style={{ fontSize: 11, color: '#27500A', display: 'flex', alignItems: 'center', gap: 4 }}>
            <CheckCircle2 size={12} /> Verified & Sealed
          </span>
          <span style={{ fontSize: 11, color: '#9EA3B0', display: 'flex', alignItems: 'center', gap: 4 }}>
            <Clock size={11} /> {appraisal.hrApprovedAt ? format(new Date(appraisal.hrApprovedAt), 'dd/MM/yyyy') : 'N/A'}
          </span>
        </div>
      </div>

      {/* Score breakdown */}
      <div style={{ background: '#FFFFFF', border: '0.5px solid #E4E6EC', borderRadius: 12, overflow: 'hidden' }}>
        <div className="flex items-center gap-2" style={{ padding: '12px 18px', borderBottom: '0.5px solid #E4E6EC', background: '#FAFBFF' }}>
          <Target size={14} style={{ color: '#1A56DB' }} />
          <p style={{ fontSize: 14, fontWeight: 500, color: '#111827' }}>Weighted Score Breakdown</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left" style={{ minWidth: 480 }}>
            <thead>
              <tr style={{ borderBottom: '0.5px solid #E4E6EC' }}>
                {['Performance Category', 'Raw Score (1-5)', 'Weightage', 'Weighted Score'].map((h, i) => (
                  <th key={h} style={{ padding: '10px 18px', fontSize: 11, fontWeight: 500, color: '#9EA3B0', textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: i > 0 ? 'center' : 'left' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                { label: 'Key Performance Indicators', raw: breakdown?.kpiRawScore, weight: breakdown?.kpiWeight, weighted: breakdown?.kpiWeightedScore },
                { label: 'Manager Evaluation', raw: breakdown?.managerRawScore, weight: breakdown?.managerWeight, weighted: breakdown?.managerWeightedScore },
                { label: 'Self Assessment', raw: breakdown?.selfRawScore, weight: breakdown?.selfWeight, weighted: breakdown?.selfWeightedScore },
                { label: '360° Peer Feedback', raw: breakdown?.feedbackRawScore, weight: breakdown?.feedbackWeight, weighted: breakdown?.feedbackWeightedScore, calibrated: feedbackSummary?.calibratedFinalScore != null },
              ].map((row, idx) => (
                <tr key={idx} style={{ borderBottom: '0.5px solid #F0F2F6' }} className="hover:bg-[#FAFBFF] transition-colors">
                  <td style={{ padding: '10px 18px', fontSize: 13, color: '#111827' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {row.label}
                      {(row as any).calibrated && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 10, fontWeight: 600, color: '#0C447C', background: '#EEF3FD', border: '0.5px solid #BFD4F5', borderRadius: 20, padding: '2px 7px' }}>
                          <Sliders size={9} /> Calibrated by HR
                        </span>
                      )}
                    </span>
                  </td>
                  <td style={{ padding: '10px 18px', textAlign: 'center', fontSize: 12, fontWeight: 500, color: '#5A6070' }}>
                    {row.raw !== undefined ? Number(row.raw).toFixed(2) : '—'}
                  </td>
                  <td style={{ padding: '10px 18px', textAlign: 'center', fontSize: 12, color: '#9EA3B0' }}>
                    {row.weight !== undefined ? `${Number(row.weight).toFixed(0)}%` : '—'}
                  </td>
                  <td style={{ padding: '10px 18px', textAlign: 'center', fontSize: 13, fontWeight: 500, color: '#1A56DB' }}>
                    {row.weighted !== undefined ? Number(row.weighted).toFixed(2) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ background: '#111827' }}>
                <td colSpan={3} style={{ padding: '12px 18px', fontSize: 13, fontWeight: 500, color: '#FFFFFF' }}>Calculated Performance Total</td>
                <td style={{ padding: '12px 18px', textAlign: 'center', fontSize: 18, fontWeight: 500, color: '#FFFFFF' }}>
                  {breakdown?.finalTotalScore !== undefined ? Number(breakdown.finalTotalScore).toFixed(2) : '—'}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Sign-off section */}
      <div style={{ background: '#FFFFFF', border: '0.5px solid #E4E6EC', borderRadius: 12, overflow: 'hidden' }}>
        <div className="flex items-center gap-2" style={{ padding: '12px 18px', borderBottom: '0.5px solid #E4E6EC', background: '#FAFBFF' }}>
          <MessageSquare size={14} style={{ color: '#111827' }} />
          <p style={{ fontSize: 14, fontWeight: 500, color: '#111827' }}>Formal Acknowledgement</p>
          <span style={{ fontSize: 11, color: '#9EA3B0' }}>· Signatures</span>
        </div>
        <div style={{ padding: '16px 18px' }}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Employee Signature */}
            <div>
              <div className="flex items-center justify-between" style={{ marginBottom: 10 }}>
                <div>
                  <p style={{ fontSize: 10, fontWeight: 500, color: '#9EA3B0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Employee Acknowledgement</p>
                  <p style={{ fontSize: 13, fontWeight: 500, color: '#111827', marginTop: 2 }}>{appraisal.employeeName}</p>
                </div>
                {appraisal.employeeSignedAt && (
                  <span style={{ fontSize: 11, fontWeight: 500, background: '#EAF3DE', color: '#27500A', border: '0.5px solid #B8DCA0', borderRadius: 20, padding: '2px 8px', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <CheckCircle2 size={11} /> Signed
                  </span>
                )}
              </div>
              <div>
                {appraisal.employeeSignComment?.startsWith("/uploads/") ? (
                  <div style={{ height: 120, background: "#F5F6F8", border: "0.5px dashed #E0E2E8", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                    <img
                      src={`http://localhost:8000${appraisal.employeeSignComment}`}
                      alt="Employee Signature"
                      style={{ maxHeight: 80, objectFit: "contain" }}
                    />
                  </div>
                ) : isEmployee && !appraisal.employeeSignedAt ? (
                  <SignaturePad
                    onSave={handleEmployeeSign}
                    isSaving={isSigningEmployee}
                    saveLabel="I Acknowledge & Sign"
                  />
                ) : (
                  <div style={{ height: 120, background: "#F5F6F8", border: "0.5px dashed #E0E2E8", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <p style={{ fontSize: 12, color: "#9EA3B0" }}>Awaiting employee signature</p>
                  </div>
                )}
              </div>
              {appraisal.employeeSignedAt && (
                <p style={{ fontSize: 11, color: '#9EA3B0', textAlign: 'center', marginTop: 6 }}>
                  Signed {format(new Date(appraisal.employeeSignedAt), 'dd/MM/yyyy HH:mm')}
                </p>
              )}
            </div>

            {/* Manager Signature */}
            <div>
              <div className="flex items-center justify-between" style={{ marginBottom: 10 }}>
                <div>
                  <p style={{ fontSize: 10, fontWeight: 500, color: '#9EA3B0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Appraiser Sign-off</p>
                  <p style={{ fontSize: 13, fontWeight: 500, color: '#111827', marginTop: 2 }}>{appraisal.managerName || 'Evaluator'}</p>
                </div>
                {appraisal.managerSignedAt && (
                  <span style={{ fontSize: 11, fontWeight: 500, background: '#EAF3DE', color: '#27500A', border: '0.5px solid #B8DCA0', borderRadius: 20, padding: '2px 8px', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <CheckCircle2 size={11} /> Signed
                  </span>
                )}
              </div>
              <div>
                {appraisal.managerSignComment?.startsWith("/uploads/") ? (
                  <div style={{ height: 120, background: "#F5F6F8", border: "0.5px dashed #E0E2E8", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                    <img
                      src={`http://localhost:8000${appraisal.managerSignComment}`}
                      alt="Manager Signature"
                      style={{ maxHeight: 80, objectFit: "contain" }}
                    />
                  </div>
                ) : (isManager || isPrivileged) && !appraisal.managerSignedAt ? (
                  <>
                    {!appraisal.employeeSignedAt ? (
                      <div style={{ background: "#FAEEDA", border: "0.5px solid #F0D4A4", borderRadius: 8, padding: "8px 12px", fontSize: 11, color: "#633806", display: "flex", alignItems: "center", gap: 6 }}>
                        <Target size={12} /> Awaiting employee signature first
                      </div>
                    ) : (
                      <SignaturePad
                        onSave={handleManagerSign}
                        isSaving={isSigningManager}
                        saveLabel="Authorize Final Record"
                      />
                    )}
                  </>
                ) : (
                  <div style={{ height: 120, background: "#F5F6F8", border: "0.5px dashed #E0E2E8", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <p style={{ fontSize: 12, color: "#9EA3B0" }}>Awaiting manager signature</p>
                  </div>
                )}
              </div>
              {appraisal.managerSignedAt && (
                <p style={{ fontSize: 11, color: '#9EA3B0', textAlign: 'center', marginTop: 6 }}>
                  Signed {format(new Date(appraisal.managerSignedAt), 'dd/MM/yyyy HH:mm')}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Disclaimer */}
      <div style={{ background: '#FAEEDA', border: '0.5px solid #F0D4A4', borderRadius: 12, padding: '12px 16px', display: 'flex', alignItems: 'start', gap: 8 }}>
        <ShieldCheck size={14} style={{ color: '#633806', flexShrink: 0, marginTop: 1 }} />
        <p style={{ fontSize: 12, color: '#633806', lineHeight: 1.6 }}>
          By providing your digital signature, you acknowledge that you have reviewed the performance results for this cycle. This document will be permanently stored in your employment records.
        </p>
      </div>
    </div>
  );
};

export default ResultPage;
