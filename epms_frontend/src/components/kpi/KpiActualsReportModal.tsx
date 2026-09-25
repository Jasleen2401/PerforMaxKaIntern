import React, { useState, useEffect, useMemo } from 'react';
import { X, Search, FileText, Loader2, FileSpreadsheet, AlertCircle, Calendar, Users, Filter, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useGetDepartmentsQuery } from '../../features/org/departmentApi';
import { useGetCyclesQuery } from '../../features/appraisal/appraisalApi';
import { useGetKpiActualsCompletionReportQuery } from '../../services/kpiApi';
import { useAppSelector } from '../../hooks/reduxHooks';

interface KpiActualsReportModalProps {
  onClose: () => void;
}

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

const KpiActualsReportModal: React.FC<KpiActualsReportModalProps> = ({ onClose }) => {
  const { user, isAdmin, isHR, activeCycleId } = useAuth();
  const token = useAppSelector((state) => state.auth.accessToken);
  const isAdminOrHr = isAdmin || isHR;

  const [selectedCycleId, setSelectedCycleId] = useState<number | null>(null);
  const [deptFilter, setDeptFilter] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [thresholdDays, setThresholdDays] = useState<number>(30);

  const { data: departments } = useGetDepartmentsQuery();
  const { data: cyclesResponse, isLoading: isLoadingCycles } = useGetCyclesQuery();

  const cycles = useMemo(() => {
    return Array.isArray(cyclesResponse) ? cyclesResponse : ((cyclesResponse as any)?.data || []);
  }, [cyclesResponse]);

  useEffect(() => {
    if (activeCycleId && !selectedCycleId) {
      setSelectedCycleId(activeCycleId);
    }
  }, [activeCycleId, selectedCycleId]);

  const { data: reportDataResponse, isLoading: isLoadingPreview } = useGetKpiActualsCompletionReportQuery(
    {
      cycleId: selectedCycleId || 0,
      managerId: isAdminOrHr ? undefined : user?.id,
      departmentId: deptFilter ? Number(deptFilter) : undefined,
      thresholdDays,
    },
    { skip: !selectedCycleId }
  );

  const reportData = reportDataResponse?.data || null;

  const filteredRows = useMemo(() => {
    if (!reportData?.employeeRows) return [];
    return reportData.employeeRows.filter((row) => {
      const nameMatch = row.employeeName.toLowerCase().includes(searchTerm.toLowerCase());
      const positionMatch = row.positionName.toLowerCase().includes(searchTerm.toLowerCase());
      return nameMatch || positionMatch;
    });
  }, [reportData, searchTerm]);

  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = async (format: 'pdf' | 'xlsx') => {
    if (!selectedCycleId) return;

    setIsDownloading(true);
    try {
      let downloadUrl = `/api/v1/reports/kpi-actuals-completion/download?cycleId=${selectedCycleId}&thresholdDays=${thresholdDays}&format=${format}`;
      if (!isAdminOrHr && user?.id) {
        downloadUrl += `&managerId=${user.id}`;
      } else if (deptFilter) {
        downloadUrl += `&departmentId=${deptFilter}`;
      }

      const response = await fetch(downloadUrl, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'ngrok-skip-browser-warning': 'true',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to download report');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `KPI_Actuals_Completion_Report.${format === 'pdf' ? 'pdf' : 'xlsx'}`;

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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'OVERDUE':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold" style={{ background: '#FCEBEB', color: '#EF4444' }}>
            <AlertTriangle size={12} /> Overdue
          </span>
        );
      case 'UP TO DATE':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold" style={{ background: '#E6F4EA', color: '#10B981' }}>
            <CheckCircle size={12} /> Up to Date
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold" style={{ background: '#F3F4F6', color: '#6B7280' }}>
            <Clock size={12} /> No Goal Set
          </span>
        );
    }
  };

  const formatDays = (days: number) => {
    if (days === -1) return '—';
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    return `${days} days ago`;
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.4)' }}>
      <div className="bg-white w-full max-w-[1150px] h-[85vh] rounded-xl overflow-hidden flex flex-col" style={{ border: '0.5px solid #E4E6EC' }}>
        
        {/* Modal Header */}
        <div className="flex justify-between items-center px-6 py-4 shrink-0" style={{ borderBottom: '0.5px solid #E4E6EC', background: '#FFFFFF' }}>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg" style={{ background: '#FCEBEB', color: '#EF4444' }}>
              <AlertCircle size={16} />
            </div>
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 500, color: '#111827', margin: 0 }}>KPI Actuals Completion Rate Report</h2>
              <p style={{ fontSize: 12, color: '#9EA3B0', marginTop: 2 }}>Monitor and identify employees with overdue KPI actual values</p>
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

        {/* Layout Body */}
        <div className="flex flex-1 min-h-0 overflow-hidden">
          
          {/* Sidebar */}
          <div className="w-72 shrink-0 flex flex-col overflow-y-auto p-4 space-y-4" style={{ borderRight: '0.5px solid #E4E6EC', background: '#F8F9FA' }}>
            
            {/* Cycle Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold" style={{ color: '#5A6070' }}>Appraisal Cycle</label>
              <div className="relative">
                <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#9EA3B0' }} />
                <select
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-lg focus:outline-none"
                  style={{ background: '#FFFFFF', border: '0.5px solid #E4E6EC', color: '#111827' }}
                  value={selectedCycleId || ''}
                  onChange={(e) => setSelectedCycleId(Number(e.target.value) || null)}
                >
                  <option value="" disabled>Select Cycle</option>
                  {cycles.map((c: any) => (
                    <option key={c.cycleId || c.id} value={c.cycleId || c.id}>
                      {c.cycleName || c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Department Filter for Admin/HR */}
            {isAdminOrHr && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold" style={{ color: '#5A6070' }}>Department</label>
                <div className="relative">
                  <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#9EA3B0' }} />
                  <select
                    className="w-full pl-9 pr-3 py-2 text-sm rounded-lg focus:outline-none"
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
              </div>
            )}

            {/* Threshold Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold" style={{ color: '#5A6070' }}>Threshold (Days)</label>
              <input
                type="number"
                min="1"
                max="365"
                className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none"
                style={{ background: '#FFFFFF', border: '0.5px solid #E4E6EC', color: '#111827' }}
                value={thresholdDays}
                onChange={(e) => setThresholdDays(Math.max(1, Number(e.target.value) || 30))}
              />
              <span className="text-[10px]" style={{ color: '#9EA3B0' }}>Flag employees whose last progress update exceeds this.</span>
            </div>

            {/* Search Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold" style={{ color: '#5A6070' }}>Search Employees</label>
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#9EA3B0' }} />
                <input
                  type="text"
                  placeholder="Search name or position..."
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-lg focus:outline-none"
                  style={{ background: '#FFFFFF', border: '0.5px solid #E4E6EC', color: '#111827' }}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

          </div>

          {/* Right Panel */}
          <div className="flex-1 flex flex-col bg-white min-w-0 overflow-hidden">
            {!selectedCycleId ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4" style={{ background: '#FCEBEB', color: '#EF4444' }}>
                  <AlertCircle size={24} />
                </div>
                <h3 className="text-base font-medium mb-1" style={{ color: '#111827' }}>Select Cycle to Preview</h3>
                <p className="text-sm max-w-md" style={{ color: '#9EA3B0' }}>
                  Choose an appraisal cycle from the left sidebar to load and preview the KPI actuals completion status.
                </p>
              </div>
            ) : isLoadingPreview ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8">
                <Loader2 size={32} className="animate-spin mb-3" style={{ color: '#EF4444' }} />
                <p className="text-sm font-medium" style={{ color: '#9EA3B0' }}>Generating report preview...</p>
              </div>
            ) : !reportData ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                <p className="text-sm font-medium" style={{ color: '#EF4444' }}>Failed to retrieve preview data.</p>
              </div>
            ) : (
              <div className="flex-1 flex flex-col min-h-0">
                {/* Summary Row */}
                <div className="grid grid-cols-5 gap-4 p-5 border-b shrink-0" style={{ borderColor: '#E4E6EC', background: '#FAFBFF' }}>
                  
                  <div className="bg-white p-3 rounded-lg border text-center" style={{ borderColor: '#E4E6EC' }}>
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Total Employees</p>
                    <p className="text-xl font-bold mt-1" style={{ color: '#111827' }}>{reportData.totalEmployees}</p>
                  </div>

                  <div className="bg-white p-3 rounded-lg border text-center" style={{ borderColor: '#E4E6EC' }}>
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Overdue</p>
                    <p className="text-xl font-bold mt-1" style={{ color: '#EF4444' }}>{reportData.overdueEmployeeCount}</p>
                  </div>

                  <div className="bg-white p-3 rounded-lg border text-center" style={{ borderColor: '#E4E6EC' }}>
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Up to Date</p>
                    <p className="text-xl font-bold mt-1" style={{ color: '#10B981' }}>{reportData.upToDateEmployeeCount}</p>
                  </div>

                  <div className="bg-white p-3 rounded-lg border text-center" style={{ borderColor: '#E4E6EC' }}>
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">No Goal Set</p>
                    <p className="text-xl font-bold mt-1" style={{ color: '#6B7280' }}>{reportData.noGoalEmployeeCount}</p>
                  </div>

                  <div className="bg-white p-3 rounded-lg border text-center" style={{ borderColor: '#E4E6EC' }}>
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Overdue Rate</p>
                    <p className="text-xl font-bold mt-1" style={{ color: '#EF4444' }}>{reportData.overdueRate}%</p>
                  </div>

                </div>

                {/* Table Container */}
                <div className="flex-1 overflow-auto">
                  {filteredRows.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center p-8 text-center text-gray-400 text-sm">
                      No matching records found.
                    </div>
                  ) : (
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="sticky top-0 z-10" style={{ background: '#FAFBFF', borderBottom: '1px solid #E4E6EC' }}>
                          <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Employee</th>
                          <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Department</th>
                          <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">Total KPIs</th>
                          <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">Overdue KPIs</th>
                          <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">Last Updated</th>
                          <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {filteredRows.map((row) => {
                          const avatar = getAvatarColor(row.employeeName);
                          return (
                            <tr key={row.employeeId} className="hover:bg-gray-50 transition-colors">
                              <td className="px-6 py-3.5 flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 overflow-hidden" style={{ background: avatar.bg, color: avatar.text }}>
                                  {(row as any).profileImage && (row as any).profileImage !== 'default.jpg' ? (
                                    <img src={`http://localhost:8000${(row as any).profileImage}`} alt={row.employeeName}
                                      className="w-full h-full object-cover"
                                      onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                                  ) : (
                                    row.employeeName.charAt(0).toUpperCase()
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <p className="text-sm font-semibold text-gray-900 truncate">{row.employeeName}</p>
                                  <p className="text-xs text-gray-400 truncate">{row.positionName}</p>
                                </div>
                              </td>
                              <td className="px-6 py-3.5 text-sm text-gray-600">{row.departmentName}</td>
                              <td className="px-6 py-3.5 text-sm text-gray-600 text-center">{row.totalKpiItems}</td>
                              <td className="px-6 py-3.5 text-sm text-center">
                                {row.overdueItemCount > 0 ? (
                                  <span className="inline-block px-2 py-0.5 rounded text-xs font-bold bg-red-50 text-red-500">
                                    {row.overdueItemCount}
                                  </span>
                                ) : (
                                  <span className="text-gray-400">—</span>
                                )}
                              </td>
                              <td className="px-6 py-3.5 text-sm text-gray-600 text-center">
                                {formatDays(row.daysSinceLastUpdate)}
                              </td>
                              <td className="px-6 py-3.5 text-center shrink-0">
                                {getStatusBadge(row.status)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>

                {/* Footer Actions */}
                <div className="flex justify-between items-center px-6 py-4 shrink-0 border-t" style={{ borderColor: '#E4E6EC', background: '#FAFBFF' }}>
                  <p className="text-xs text-gray-400">
                    * Report will flag any items without an actual value or stale by {thresholdDays}+ days.
                  </p>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleDownload('xlsx')}
                      disabled={isDownloading}
                      className="flex items-center justify-center w-10 h-10 rounded-lg transition-colors border"
                      style={{ background: '#FFFFFF', borderColor: '#E4E6EC', color: '#5A6070' }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = '#FEECEC'; e.currentTarget.style.color = '#EF4444'; e.currentTarget.style.borderColor = '#FCA5A5'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = '#FFFFFF'; e.currentTarget.style.color = '#5A6070'; e.currentTarget.style.borderColor = '#E4E6EC'; }}
                      title="Export to Excel"
                    >
                      {isDownloading ? <Loader2 size={16} className="animate-spin" /> : <FileSpreadsheet size={16} />}
                    </button>
                    <button
                      onClick={() => handleDownload('pdf')}
                      disabled={isDownloading}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                      style={{ background: '#EF4444', color: '#FFFFFF', border: 'none' }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = '#DC2626'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = '#EF4444'; }}
                    >
                      {isDownloading ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />}
                      Generate PDF Report
                    </button>
                  </div>
                </div>

              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
};

export default KpiActualsReportModal;
