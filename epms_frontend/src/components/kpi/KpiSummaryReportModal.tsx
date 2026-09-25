import React, { useState, useEffect, useMemo } from 'react';
import { X, Search, FileText, Loader2, FileSpreadsheet, Check, Square, ChevronRight, ChevronDown, Filter, UserCircle, Target, Calendar, Users } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useGetAllEmployeesQuery, useGetDirectReportsQuery } from '../../features/employee/employeeapi';
import { useGetDepartmentsQuery } from '../../features/org/departmentApi';
import { useGetCyclesQuery } from '../../features/appraisal/appraisalApi';
import { useGetKpiSummaryReportQuery } from '../../services/kpiApi';
import { useAppSelector } from '../../hooks/reduxHooks';

interface KpiSummaryReportModalProps {
  onClose: () => void;
}

// Avatar background color generator
const getAvatarColor = (name: string) => {
  const colors = [
    { bg: '#EEF3FD', text: '#0C447C' },
    { bg: '#EAF3DE', text: '#27500A' },
    { bg: '#FAEEDA', text: '#633806' },
    { bg: '#F1EFE8', text: '#444441' },
    { bg: '#FCEBEB', text: '#791F1F' },
  ];
  const index = name.charCodeAt(0) % colors.length;
  return colors[index];
};

const getScoreBarColor = (score: number) => {
  if (score >= 80) return '#639922';
  if (score >= 65) return '#1A56DB';
  if (score >= 50) return '#BA7517';
  return '#E24B4A';
};

// Collapsible Section Component
const CollapsibleSection: React.FC<{
  title: string;
  icon: React.ReactNode;
  count?: number;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}> = ({ title, icon, count, isOpen, onToggle, children }) => {
  return (
    <div className="rounded-lg overflow-hidden" style={{ border: '0.5px solid #E4E6EC', background: '#FFFFFF' }}>
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-3 py-2.5 transition-colors hover:bg-[#FAFBFF]"
      >
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-xs font-medium" style={{ color: '#111827' }}>{title}</span>
          {count !== undefined && count > 0 && (
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full" style={{ background: '#EEF3FD', color: '#0C447C' }}>
              {count}
            </span>
          )}
        </div>
        {isOpen ? <ChevronDown size={14} style={{ color: '#9EA3B0' }} /> : <ChevronRight size={14} style={{ color: '#9EA3B0' }} />}
      </button>
      {isOpen && (
        <div className="border-t" style={{ borderColor: '#F0F2F6' }}>
          {children}
        </div>
      )}
    </div>
  );
};

import { isKpiEligible } from '../../utils/kpiLevelFilter';

const KpiSummaryReportModal: React.FC<KpiSummaryReportModalProps> = ({ onClose }) => {
  const { user, isAdmin, isHR, activeCycleId } = useAuth();
  const token = useAppSelector((state) => state.auth.accessToken);
  const isAdminOrHr = isAdmin || isHR;

  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | null>(null);
  const [deptFilter, setDeptFilter] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedCycleIds, setSelectedCycleIds] = useState<number[]>([]);

  // Collapsible sections state
  const [isDeptOpen, setIsDeptOpen] = useState(true);
  const [isEmployeeOpen, setIsEmployeeOpen] = useState(true);
  const [isCyclesOpen, setIsCyclesOpen] = useState(true);

  const { data: allEmployees, isLoading: isLoadingAll } = useGetAllEmployeesQuery(undefined, {
    skip: !isAdminOrHr,
  });
  const { data: directReports, isLoading: isLoadingDirect } = useGetDirectReportsQuery(user?.id || 0, {
    skip: isAdminOrHr || !user?.id,
  });
  const { data: departments } = useGetDepartmentsQuery();
  const { data: cyclesResponse, isLoading: isLoadingCycles } = useGetCyclesQuery();

  const employees = useMemo(() => {
    return isAdminOrHr ? (allEmployees || []) : (directReports || []);
  }, [allEmployees, directReports, isAdminOrHr]);

  const isLoadingEmployees = isAdminOrHr ? isLoadingAll : isLoadingDirect;

  const cycles = useMemo(() => {
    return Array.isArray(cyclesResponse) ? cyclesResponse : ((cyclesResponse as any)?.data || []);
  }, [cyclesResponse]);

  const activeCycles = useMemo(() => {
    return cycles.filter((c: any) => (c.cycleId || c.id) === activeCycleId);
  }, [cycles, activeCycleId]);

  const historicalCycles = useMemo(() => {
    return cycles.filter((c: any) => (c.cycleId || c.id) !== activeCycleId);
  }, [cycles, activeCycleId]);

  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) => {
      const matchesDept = !deptFilter || emp.currentDepartmentId === Number(deptFilter);
      const matchesSearch = !searchTerm ||
        emp.staffName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (emp.employeeCode && emp.employeeCode.toLowerCase().includes(searchTerm.toLowerCase()));
      return matchesDept && matchesSearch && isKpiEligible(emp);
    });
  }, [employees, deptFilter, searchTerm]);

  const selectedEmployee = useMemo(() => {
    return employees.find((emp) => emp.id === selectedEmployeeId) || null;
  }, [employees, selectedEmployeeId]);

  const { data: reportDataResponse, isLoading: isLoadingPreview } = useGetKpiSummaryReportQuery(
    { employeeId: selectedEmployeeId || 0, cycleIds: selectedCycleIds },
    { skip: !selectedEmployeeId || selectedCycleIds.length === 0 }
  );

  const reportData = reportDataResponse?.data || null;

  useEffect(() => {
    if (filteredEmployees.length > 0 && !selectedEmployeeId) {
      setSelectedEmployeeId(filteredEmployees[0].id);
    }
  }, [filteredEmployees, selectedEmployeeId]);

  useEffect(() => {
    if (activeCycleId && selectedCycleIds.length === 0 && cycles.length > 0) {
      const activeCycle = cycles.find((c: any) => (c.cycleId || c.id) === activeCycleId);
      if (activeCycle) {
        setSelectedCycleIds([activeCycle.cycleId || activeCycle.id]);
      }
    }
  }, [activeCycleId, cycles, selectedCycleIds]);

  const handleToggleCycle = (cycleId: number) => {
    setSelectedCycleIds((prev) =>
      prev.includes(cycleId) ? prev.filter((id) => id !== cycleId) : [...prev, cycleId]
    );
  };

  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = async (format: 'pdf' | 'xlsx') => {
    if (!selectedEmployeeId || selectedCycleIds.length === 0) return;

    setIsDownloading(true);
    try {
      const cycleIdsParam = selectedCycleIds.join(',');
      const response = await fetch(
        `/api/v1/reports/kpi-summary/download?employeeId=${selectedEmployeeId}&cycleIds=${cycleIdsParam}&format=${format}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'ngrok-skip-browser-warning': 'true',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to download report');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${selectedEmployee?.staffName || 'Employee'}_KPI_Summary_Report.${format === 'pdf' ? 'pdf' : 'xlsx'}`;

      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download error:', error);
      alert('Failed to download report. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  const avatarColors = selectedEmployee ? getAvatarColor(selectedEmployee.staffName) : { bg: '#EEF3FD', text: '#0C447C' };
  const employeeDepartment = selectedEmployee?.currentDepartmentName ||
    departments?.find(d => d.id === selectedEmployee?.currentDepartmentId)?.departmentName ||
    '—';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.4)' }}>
      <div className="bg-white w-full max-w-[1100px] h-[85vh] rounded-xl overflow-hidden flex flex-col" style={{ border: '0.5px solid #E4E6EC' }}>

        {/* Modal Header */}
        <div className="flex justify-between items-center px-6 py-4 shrink-0" style={{ borderBottom: '0.5px solid #E4E6EC', background: '#FFFFFF' }}>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg" style={{ background: '#EEF3FD', color: '#1A56DB' }}>
              <FileText size={16} />
            </div>
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 500, color: '#111827', margin: 0 }}>KPI Summary Report</h2>
              <p style={{ fontSize: 12, color: '#9EA3B0', marginTop: 2 }}>Generate and preview employee KPI performance reports</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex items-center justify-center w-8 h-8 rounded-lg transition-colors"
            style={{ color: '#9EA3B0', background: 'transparent', border: 'none', cursor: 'pointer' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = '#F5F6F8'; e.currentTarget.style.color = '#5A6070'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#9EA3B0'; }}
          >
            <X size={16} />
          </button>
        </div>

        {/* MAIN CONTENT ROW - Sidebar + Preview */}
        <div className="flex flex-1 min-h-0 overflow-hidden">

          {/* LEFT SIDEBAR - Collapsible sections (280px) */}
          <div className="w-72 shrink-0 flex flex-col overflow-y-auto" style={{ borderRight: '0.5px solid #E4E6EC', background: '#F8F9FA' }}>
            <div className="p-4 space-y-3">
              {/* Section 1: Department Filter (HR/Admin only) */}
              {isAdminOrHr && (
                <CollapsibleSection
                  title="Department"
                  icon={<Filter size={14} style={{ color: '#1A56DB' }} />}
                  isOpen={isDeptOpen}
                  onToggle={() => setIsDeptOpen(!isDeptOpen)}
                >
                  <div className="p-3">
                    <select
                      className="w-full px-3 py-2 text-sm rounded-lg transition-colors focus:outline-none"
                      style={{ background: '#FFFFFF', border: '0.5px solid #E4E6EC', color: '#111827' }}
                      value={deptFilter}
                      onChange={(e) => setDeptFilter(e.target.value)}
                    >
                      <option value="">All Departments</option>
                      {departments?.map((dept) => (
                        <option key={dept.id} value={dept.id}>{dept.departmentName}</option>
                      ))}
                    </select>
                  </div>
                </CollapsibleSection>
              )}

              {/* Section 2: Employee Selection */}
              <CollapsibleSection
                title={isAdminOrHr ? 'Employees' : 'Direct Reports'}
                icon={<UserCircle size={14} style={{ color: '#1A56DB' }} />}
                count={filteredEmployees.length}
                isOpen={isEmployeeOpen}
                onToggle={() => setIsEmployeeOpen(!isEmployeeOpen)}
              >
                <div className="p-3 space-y-3">
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#9EA3B0' }} />
                    <input
                      type="text"
                      placeholder="Search by name or code..."
                      className="w-full pl-9 pr-3 py-2 text-sm rounded-lg focus:outline-none"
                      style={{ background: '#FFFFFF', border: '0.5px solid #E4E6EC', color: '#111827' }}
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <div className="border rounded-lg overflow-y-auto max-h-60" style={{ borderColor: '#E4E6EC', background: '#FFFFFF' }}>
                    {isLoadingEmployees ? (
                      <div className="py-10 text-center">
                        <Loader2 size={20} className="mx-auto animate-spin" style={{ color: '#9EA3B0' }} />
                        <p className="text-xs mt-2" style={{ color: '#9EA3B0' }}>Loading employees...</p>
                      </div>
                    ) : filteredEmployees.length === 0 ? (
                      <div className="py-10 text-center">
                        <p className="text-xs" style={{ color: '#9EA3B0' }}>No employees found</p>
                      </div>
                    ) : (
                      <div className="divide-y" style={{ borderColor: '#F0F2F6' }}>
                        {filteredEmployees.map((emp) => {
                          const isSelected = selectedEmployeeId === emp.id;
                          const avatarColor = getAvatarColor(emp.staffName);
                          return (
                            <button
                              key={emp.id}
                              onClick={() => setSelectedEmployeeId(emp.id)}
                              className="w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-[#FAFBFF]"
                              style={{ background: isSelected ? '#EEF3FD' : '#FFFFFF' }}
                            >
                              <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-medium overflow-hidden"
                                style={{ background: avatarColor.bg, color: avatarColor.text }}>
                                {emp.profileImage && emp.profileImage !== 'default.jpg' ? (
                                  <img src={`http://localhost:8000${emp.profileImage}`} alt={emp.staffName}
                                    className="w-full h-full object-cover"
                                    onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                                ) : (
                                  emp.staffName.charAt(0).toUpperCase()
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate" style={{ color: '#111827' }}>{emp.staffName}</p>
                                <p className="text-[11px] truncate" style={{ color: '#9EA3B0' }}>{emp.positionName || '—'}</p>
                              </div>
                              {isSelected && <div className="w-2 h-2 rounded-full shrink-0" style={{ background: '#1A56DB' }} />}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </CollapsibleSection>

              {/* Section 3: Appraisal Cycles */}
              <CollapsibleSection
                title="Appraisal Cycles"
                icon={<Calendar size={14} style={{ color: '#1A56DB' }} />}
                count={selectedCycleIds.length}
                isOpen={isCyclesOpen}
                onToggle={() => setIsCyclesOpen(!isCyclesOpen)}
              >
                <div className="p-3 space-y-3">
                  {isLoadingCycles ? (
                    <div className="text-center py-4">
                      <Loader2 size={16} className="mx-auto animate-spin" style={{ color: '#9EA3B0' }} />
                    </div>
                  ) : cycles.length === 0 ? (
                    <div className="text-center py-4">
                      <p className="text-sm" style={{ color: '#9EA3B0' }}>No cycles available</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {activeCycles.length > 0 && (
                        <div>
                          <p className="text-[9px] font-semibold uppercase tracking-wider mb-2" style={{ color: '#1A56DB' }}>Active Cycle</p>
                          <div className="space-y-1 bg-white rounded-lg border p-1" style={{ borderColor: '#E4E6EC' }}>
                            {activeCycles.map((c: any) => {
                              const cid = c.cycleId || c.id;
                              const isChecked = selectedCycleIds.includes(cid);
                              return (
                                <button
                                  key={cid}
                                  onClick={() => handleToggleCycle(cid)}
                                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded transition-colors hover:bg-[#FAFBFF] text-left"
                                >
                                  {isChecked ? <Check size={14} style={{ color: '#1A56DB' }} /> : <Square size={14} style={{ color: '#D1D5DB' }} />}
                                  <span className="text-sm font-medium" style={{ color: '#111827' }}>{c.cycleName || c.name}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {historicalCycles.length > 0 && (
                        <div>
                          <p className="text-[9px] font-semibold uppercase tracking-wider mb-2" style={{ color: '#9EA3B0' }}>Historical Cycles</p>
                          <div className="space-y-1 max-h-40 overflow-y-auto bg-white rounded-lg border p-1" style={{ borderColor: '#E4E6EC' }}>
                            {historicalCycles.map((c: any) => {
                              const cid = c.cycleId || c.id;
                              const isChecked = selectedCycleIds.includes(cid);
                              return (
                                <button
                                  key={cid}
                                  onClick={() => handleToggleCycle(cid)}
                                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded transition-colors hover:bg-[#FAFBFF] text-left"
                                >
                                  {isChecked ? <Check size={14} style={{ color: '#1A56DB' }} /> : <Square size={14} style={{ color: '#D1D5DB' }} />}
                                  <span className="text-sm" style={{ color: '#5A6070' }}>{c.cycleName || c.name}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </CollapsibleSection>
            </div>

            {/* Selected Cycle Summary Footer */}
            {selectedCycleIds.length > 0 && (
              <div className="p-4 mt-auto" style={{ borderTop: '0.5px solid #E4E6EC', background: '#FFFFFF' }}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-medium uppercase tracking-wider mb-0.5" style={{ color: '#9EA3B0' }}>Selected Cycles</p>
                    <p className="text-sm font-medium" style={{ color: '#111827' }}>{selectedCycleIds.length} cycle{selectedCycleIds.length !== 1 ? 's' : ''}</p>
                  </div>
                  <button
                    onClick={() => setSelectedCycleIds([])}
                    className="text-xs font-medium px-2 py-1 rounded transition-colors hover:bg-[#FCEBEB]"
                    style={{ color: '#791F1F' }}
                  >
                    Clear all
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* RIGHT PREVIEW PANEL - Simplified (No tables, just summary) */}
          <div className="flex-1 flex flex-col bg-white min-w-0 overflow-hidden">
            {!selectedEmployeeId || selectedCycleIds.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4" style={{ background: '#EEF3FD', color: '#1A56DB' }}>
                  <FileText size={24} />
                </div>
                <h3 className="text-base font-medium mb-1" style={{ color: '#111827' }}>Select Employee & Cycles</h3>
                <p className="text-sm max-w-md" style={{ color: '#9EA3B0' }}>
                  Choose an employee and select at least one appraisal cycle from the left sidebar to generate a KPI report preview.
                </p>
              </div>
            ) : isLoadingPreview ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8">
                <Loader2 size={32} className="animate-spin mb-3" style={{ color: '#1A56DB' }} />
                <p className="text-sm font-medium" style={{ color: '#9EA3B0' }}>Loading report preview...</p>
              </div>
            ) : !reportData ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                <p className="text-sm" style={{ color: '#791F1F' }}>Failed to fetch report preview data.</p>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto p-6 space-y-5">

                {/* Employee Header Block */}
                <div className="flex items-center justify-between p-5 rounded-xl" style={{ background: '#F5F6F8', border: '0.5px solid #E4E6EC' }}>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full flex items-center justify-center text-base font-medium overflow-hidden" style={{ background: avatarColors.bg, color: avatarColors.text }}>
                      {selectedEmployee?.profileImage && selectedEmployee.profileImage !== 'default.jpg' ? (
                        <img src={`http://localhost:8000${selectedEmployee.profileImage}`}
                          alt={selectedEmployee.staffName}
                          className="w-full h-full object-cover"
                          onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                      ) : (
                        selectedEmployee?.staffName?.charAt(0)?.toUpperCase()
                      )}
                    </div>
                    <div>
                      <h3 className="text-base font-medium mb-1" style={{ color: '#111827' }}>{reportData.employeeName}</h3>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                        <div className="flex items-center gap-1.5">
                          <Users size={12} style={{ color: '#9EA3B0' }} />
                          <span style={{ color: '#5A6070' }}>{employeeDepartment}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Target size={12} style={{ color: '#9EA3B0' }} />
                          <span style={{ color: '#5A6070' }}>{reportData.positionName || '—'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-medium uppercase tracking-wider" style={{ color: '#9EA3B0' }}>Average Score</p>
                    <p className="text-2xl font-medium" style={{ color: '#111827' }}>{reportData.averageScore}%</p>
                  </div>
                </div>

                {/* Selected Cycles Summary Cards */}
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <p className="text-xs font-medium uppercase tracking-wider" style={{ color: '#9EA3B0' }}>Selected Performance Cycles</p>
                    <p className="text-[11px]" style={{ color: '#9EA3B0' }}>{selectedCycleIds.length} cycle{selectedCycleIds.length !== 1 ? 's' : ''} selected</p>
                  </div>

                  <div className="space-y-3">
                    {reportData.cycles?.map((c: any, idx: number) => {
                      const avgScore = c.kpiScore || 0;
                      return (
                        <div key={`${c.cycleName}-${idx}`} className="border rounded-xl p-4" style={{ borderColor: '#E4E6EC', background: '#FAFBFF' }}>
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium mb-1" style={{ color: '#111827' }}>{c.cycleName}</p>
                              <p className="text-[11px]" style={{ color: '#9EA3B0' }}>{c.cycleStartDate} → {c.cycleEndDate}</p>
                            </div>
                            <div className="flex items-center gap-6">
                              <div className="text-center">
                                <p className="text-[9px] font-medium uppercase tracking-wider" style={{ color: '#9EA3B0' }}>Items</p>
                                <p className="text-sm font-medium" style={{ color: '#111827' }}>{c.achievedItems} / {c.totalItems}</p>
                              </div>
                              <div className="min-w-[100px]">
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-[10px] font-medium" style={{ color: getScoreBarColor(avgScore) }}>{c.kpiScore}%</span>
                                  <span className="text-[10px]" style={{ color: '#9EA3B0' }}>/ 100</span>
                                </div>
                                <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: '#F0F2F6' }}>
                                  <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(avgScore, 100)}%`, background: getScoreBarColor(avgScore) }} />
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Download Action Bar */}
            {selectedEmployeeId && selectedCycleIds.length > 0 && reportData && (
              <div className="flex justify-between items-center px-6 py-4 shrink-0" style={{ borderTop: '0.5px solid #E4E6EC', background: '#FAFBFF' }}>
                <p className="text-[11px] font-medium" style={{ color: '#9EA3B0' }}>
                  * Report will include {selectedCycleIds.length} selected cycle{selectedCycleIds.length !== 1 ? 's' : ''}
                </p>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleDownload('xlsx')}
                    disabled={isDownloading}
                    className="flex items-center justify-center w-10 h-10 rounded-lg transition-colors"
                    style={{ background: '#FFFFFF', border: '0.5px solid #E4E6EC', color: '#5A6070' }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = '#EEF3FD'; e.currentTarget.style.color = '#1A56DB'; e.currentTarget.style.borderColor = '#B5D4F4'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = '#FFFFFF'; e.currentTarget.style.color = '#5A6070'; e.currentTarget.style.borderColor = '#E4E6EC'; }}
                    title="Export to Excel"
                  >
                    {isDownloading ? <Loader2 size={16} className="animate-spin" /> : <FileSpreadsheet size={16} />}
                  </button>
                  <button
                    onClick={() => handleDownload('pdf')}
                    disabled={isDownloading}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                    style={{ background: '#1A56DB', color: '#FFFFFF', border: 'none' }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = '#1648C0'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = '#1A56DB'; }}
                  >
                    {isDownloading ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />}
                    Generate PDF Report
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default KpiSummaryReportModal;