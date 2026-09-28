import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import {
  useGetPerformanceCategoriesQuery,
  useCreatePerformanceCategoryMutation,
  useUpdatePerformanceCategoryMutation,
  useDeletePerformanceCategoryMutation
} from '../../features/appraisal/performanceCategoryApi';
import {
  useGetScoringParametersQuery,
  useUpdateScoringParametersMutation
} from '../../features/dashboard/dashboardApi';
import type { PerformanceCategory, PerformanceGrade } from '../../types/appraisal';
import {
  Plus, Trash2, Edit2, Layers, Target, BarChart3, X, Check,
  Sliders, UserCheck, User, RefreshCw, Calculator,
  Award, AlertCircle, CheckCircle2, Save
} from 'lucide-react';
import { Can } from '../../components/Can';

const GRADES: PerformanceGrade[] = [
  'OUTSTANDING', 'EXCEEDS_EXPECTATIONS', 'MEETS_EXPECTATIONS', 'NEEDS_IMPROVEMENT', 'UNSATISFACTORY'
];

const inputStyle: React.CSSProperties = {
  background: '#F5F6F8',
  border: '0.5px solid #E0E2E8',
  borderRadius: 8,
  padding: '7px 12px',
  fontSize: 13,
  color: '#111827',
  outline: 'none',
  width: '100%',
  boxSizing: 'border-box',
  fontFamily: 'inherit',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 11,
  fontWeight: 600,
  color: '#64748B',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
  marginBottom: 5,
};

export const PerformanceCategoryManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'PARAMETERS' | 'GRADES'>('PARAMETERS');

  // --- TAB 1: Flexible Evaluation Parameters & Weights ---
  const { data: scoringData, isLoading: isScoringLoading, refetch: refetchScoring } = useGetScoringParametersQuery();
  const [updateScoring, { isLoading: isUpdatingScoring }] = useUpdateScoringParametersMutation();

  const [goalsWeight, setGoalsWeight] = useState<number>(40);
  const [managerWeight, setManagerWeight] = useState<number>(40);
  const [selfWeight, setSelfWeight] = useState<number>(20);
  const [evaluationParams, setEvaluationParams] = useState<any[]>([]);
  const [deletedParamIds, setDeletedParamIds] = useState<string[]>([]);

  // Parameter Modal State
  const [showParamModal, setShowParamModal] = useState(false);
  const [editingParamId, setEditingParamId] = useState<string | null>(null);
  const [paramForm, setParamForm] = useState({
    name: '',
    description: '',
    weight: 20,
    maximumScore: 100,
    isActive: true,
  });

  // Simulator State
  const [simGoalProgress, setSimGoalProgress] = useState<number>(85);
  const [simParamScores, setSimParamScores] = useState<Record<string, number>>({});
  const [simSelfRating, setSimSelfRating] = useState<number>(8.5);

  useEffect(() => {
    if (scoringData?.data) {
      const comp = scoringData.data.componentWeights || {};
      setGoalsWeight(Number(comp.goalsWeight ?? 40));
      setManagerWeight(Number(comp.managerWeight ?? 40));
      setSelfWeight(Number(comp.selfWeight ?? 20));

      const params = scoringData.data.evaluationParameters || [];
      setEvaluationParams(params);

      // Initialize simulator scores
      const initialSim: Record<string, number> = {};
      params.forEach((p: any) => {
        initialSim[p.id] = 85;
      });
      setSimParamScores(initialSim);
    }
  }, [scoringData]);

  const totalCompWeight = Number(goalsWeight) + Number(managerWeight) + Number(selfWeight);
  const totalParamWeight = evaluationParams.reduce((acc, p) => acc + (Number(p.weight) || 0), 0);

  const handleAutoBalanceComponents = () => {
    setGoalsWeight(40);
    setManagerWeight(40);
    setSelfWeight(20);
    toast.info('Balanced component weights to default 40% Goals, 40% Mentor, 20% Self Assessment.');
  };

  const handleNormalizeParams = () => {
    if (evaluationParams.length === 0) return;
    const currentSum = evaluationParams.reduce((acc, p) => acc + (Number(p.weight) || 0), 0);
    if (currentSum <= 0) {
      const equalShare = Math.round(100 / evaluationParams.length);
      setEvaluationParams(evaluationParams.map((p, idx) => ({
        ...p,
        weight: idx === 0 ? 100 - (equalShare * (evaluationParams.length - 1)) : equalShare
      })));
    } else {
      let allocated = 0;
      const normalized = evaluationParams.map((p, idx) => {
        if (idx === evaluationParams.length - 1) {
          return { ...p, weight: Math.max(0, 100 - allocated) };
        }
        const w = Math.round((Number(p.weight) / currentSum) * 100);
        allocated += w;
        return { ...p, weight: w };
      });
      setEvaluationParams(normalized);
    }
    toast.success('Evaluation parameter weights normalized to 100%');
  };

  const handleOpenAddParam = () => {
    setEditingParamId(null);
    setParamForm({
      name: '',
      description: '',
      weight: 20,
      maximumScore: 100,
      isActive: true,
    });
    setShowParamModal(true);
  };

  const handleOpenEditParam = (param: any) => {
    setEditingParamId(param.id);
    setParamForm({
      name: param.name,
      description: param.description || '',
      weight: param.weight || 20,
      maximumScore: param.maximumScore || 100,
      isActive: param.isActive ?? true,
    });
    setShowParamModal(true);
  };

  const handleSaveParam = () => {
    if (!paramForm.name.trim()) {
      toast.warning('Parameter name is required.');
      return;
    }
    if (editingParamId) {
      setEvaluationParams(evaluationParams.map(p =>
        p.id === editingParamId ? { ...p, ...paramForm } : p
      ));
    } else {
      const newParam = {
        id: `temp-${Date.now()}`,
        ...paramForm
      };
      setEvaluationParams([...evaluationParams, newParam]);
      setSimParamScores(prev => ({ ...prev, [newParam.id]: 85 }));
    }
    setShowParamModal(false);
  };

  const handleDeleteParam = (id: string) => {
    if (window.confirm('Delete this evaluation parameter? Interns will no longer be rated on this criteria.')) {
      setEvaluationParams(evaluationParams.filter(p => p.id !== id));
      if (!id.startsWith('temp-')) {
        setDeletedParamIds(prev => [...prev, id]);
      }
    }
  };

  const handleSaveScoringConfig = async () => {
    if (totalCompWeight !== 100) {
      toast.error(`Component weights must total 100% (currently ${totalCompWeight}%).`);
      return;
    }
    if (evaluationParams.length === 0) {
      toast.error('At least one evaluation parameter must be configured.');
      return;
    }

    try {
      const payload = {
        cycleId: scoringData?.data?.cycle?.id || undefined,
        componentWeights: {
          goalsWeight: Number(goalsWeight),
          managerWeight: Number(managerWeight),
          selfWeight: Number(selfWeight),
        },
        evaluationParameters: evaluationParams.map(p => ({
          id: p.id.startsWith('temp-') ? undefined : p.id,
          name: p.name,
          description: p.description,
          weight: Number(p.weight),
          maximumScore: Number(p.maximumScore || 100),
          isActive: p.isActive ?? true,
        })),
        deleteParameterIds: deletedParamIds,
        recalculate: true,
      };

      await updateScoring(payload).unwrap();
      toast.success('Performance assessment parameters & weightages saved successfully!');
      setDeletedParamIds([]);
      refetchScoring();
    } catch (err: any) {
      toast.error(err?.data?.message || 'Failed to save scoring parameters.');
    }
  };

  // Live Score Simulator calculation
  const calculateSimulatedScore = () => {
    const totalW = evaluationParams.reduce((acc, p) => acc + (Number(p.weight) || 0), 0);
    let managerScore = 0;
    if (totalW > 0) {
      evaluationParams.forEach(p => {
        const score = simParamScores[p.id] ?? 85;
        const norm = (score / (p.maximumScore || 100)) * 100;
        managerScore += norm * (p.weight / totalW);
      });
    } else {
      managerScore = 85;
    }

    const selfScore = simSelfRating * 10;
    const gW = goalsWeight / 100;
    const mW = managerWeight / 100;
    const sW = selfWeight / 100;

    const overall = (simGoalProgress * gW) + (managerScore * mW) + (selfScore * sW);
    const clamped = Math.min(100, Math.max(0, Math.round(overall * 10) / 10));

    let grade = 'GOOD';
    let classification = 'Meets Expectations';
    if (clamped >= 90) {
      grade = 'EXCELLENT';
      classification = 'Outstanding Contributor';
    } else if (clamped >= 80) {
      grade = 'VERY_GOOD';
      classification = 'Exceeds Expectations';
    } else if (clamped >= 70) {
      grade = 'GOOD';
      classification = 'Meets Expectations';
    } else if (clamped >= 60) {
      grade = 'SATISFACTORY';
      classification = 'Needs Improvement';
    } else {
      grade = 'NEEDS_IMPROVEMENT';
      classification = 'Unsatisfactory / Review Required';
    }

    return { overall: clamped, managerScore: Math.round(managerScore * 10) / 10, selfScore, grade, classification };
  };

  const simResult = calculateSimulatedScore();

  // --- TAB 2: Grading Scale Bands (Existing) ---
  const { data: catResponse, isLoading: isCatLoading } = useGetPerformanceCategoriesQuery();
  const categories = catResponse?.data || [];
  const [createCategory] = useCreatePerformanceCategoryMutation();
  const [updateCategory] = useUpdatePerformanceCategoryMutation();
  const [deleteCategory] = useDeletePerformanceCategoryMutation();

  const [showCatModal, setShowCatModal] = useState(false);
  const [editingCatId, setEditingCatId] = useState<number | null>(null);
  const [catFormData, setCatFormData] = useState<any>({
    name: '', minScore: 0, maxScore: 100, ratingValue: 3, grade: 'MEETS_EXPECTATIONS', description: ''
  });

  const handleOpenAddCat = () => {
    setEditingCatId(null);
    setCatFormData({ name: '', minScore: 0, maxScore: 100, ratingValue: 3, grade: 'MEETS_EXPECTATIONS', description: '' });
    setShowCatModal(true);
  };
  const handleOpenEditCat = (category: PerformanceCategory) => {
    setEditingCatId(category.id!);
    setCatFormData({ ...category });
    setShowCatModal(true);
  };

  const handleCatSubmit = async () => {
    if (!catFormData.name || catFormData.minScore === undefined || catFormData.maxScore === undefined) {
      toast.warning('Please fill required fields');
      return;
    }
    try {
      const cleaned = {
        ...catFormData,
        minScore: catFormData.minScore === '' ? 0 : Number(catFormData.minScore),
        maxScore: catFormData.maxScore === '' ? 0 : Number(catFormData.maxScore),
        ratingValue: catFormData.ratingValue === '' ? 1 : Number(catFormData.ratingValue)
      };
      if (editingCatId) await updateCategory({ id: editingCatId, category: cleaned }).unwrap();
      else await createCategory(cleaned).unwrap();
      setShowCatModal(false);
      toast.success('Performance category updated successfully');
    } catch {
      toast.error('Failed to save performance category');
    }
  };

  const handleCatDelete = async (id: number) => {
    if (window.confirm('Delete this category? This may affect final appraisal calculations.')) {
      await deleteCategory(id);
      toast.success('Category removed');
    }
  };

  return (
    <div className="space-y-6 pb-12 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 border border-indigo-100">
            <Sliders size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Performance Assessment & Evaluation Parameters</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Empower HR to decide the exact parameters, weightages, and scoring models used to evaluate interns.
            </p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-slate-100/80 p-1 rounded-xl self-start sm:self-auto border border-slate-200">
          <button
            type="button"
            onClick={() => setActiveTab('PARAMETERS')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeTab === 'PARAMETERS'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Target size={14} />
            <span>Parameters & Weights</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('GRADES')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeTab === 'GRADES'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers size={14} />
            <span>Grading Scale Bands</span>
          </button>
        </div>
      </div>

      {/* --- TAB 1 CONTENT: EVALUATION PARAMETERS & WEIGHTAGES --- */}
      {activeTab === 'PARAMETERS' && (
        <div className="space-y-6">
          {/* Active Cycle Badge & Action Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-indigo-50/50 rounded-xl border border-indigo-100">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-bold text-slate-800">
                Active Cycle: {scoringData?.data?.cycle?.name || 'Q3 2026 Intern Performance Evaluation Cycle'}
              </span>
              <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-md bg-white text-indigo-700 border border-indigo-200">
                Flexible Scoring Active
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleAutoBalanceComponents}
                className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg border border-slate-200 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw size={13} />
                <span>Reset to 40/40/20</span>
              </button>
              <button
                type="button"
                onClick={handleSaveScoringConfig}
                disabled={isUpdatingScoring || totalCompWeight !== 100}
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-semibold rounded-lg shadow-sm transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                <Save size={14} />
                <span>{isUpdatingScoring ? 'Saving Configuration…' : 'Save Scoring Model'}</span>
              </button>
            </div>
          </div>

          {/* Section 1: Component Weights (Primary Evaluation Pillars) */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-5">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Target size={18} className="text-indigo-600" />
                  Assessment Component Weight Distribution
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  HR determines how much weight is allocated to deliverables, mentor observations, and self-reflection.
                </p>
              </div>

              {/* Total Balance Badge */}
              <div className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 border ${
                totalCompWeight === 100
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-rose-50 text-rose-700 border-rose-200'
              }`}>
                {totalCompWeight === 100 ? (
                  <>
                    <CheckCircle2 size={14} />
                    <span>Balanced Total: 100%</span>
                  </>
                ) : (
                  <>
                    <AlertCircle size={14} />
                    <span>Current Total: {totalCompWeight}% (Must equal 100%)</span>
                  </>
                )}
              </div>
            </div>

            {/* Component Weight Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Card 1: Goals & Deliverables */}
              <div className="p-4 bg-slate-50/70 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-slate-800 font-semibold text-xs">
                    <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
                      <Target size={15} />
                    </div>
                    <span>Goals & Deliverables</span>
                  </div>
                  <span className="text-sm font-bold text-blue-700">{goalsWeight}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={goalsWeight}
                  onChange={(e) => setGoalsWeight(Number(e.target.value))}
                  className="w-full accent-blue-600 cursor-pointer"
                />
                <p className="text-[11px] text-slate-400">
                  Evaluated from milestone completion percentage, code delivery, and verifiable progress.
                </p>
              </div>

              {/* Card 2: Mentor / Manager Review */}
              <div className="p-4 bg-slate-50/70 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-slate-800 font-semibold text-xs">
                    <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                      <UserCheck size={15} />
                    </div>
                    <span>Mentor / Manager Evaluation</span>
                  </div>
                  <span className="text-sm font-bold text-emerald-700">{managerWeight}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={managerWeight}
                  onChange={(e) => setManagerWeight(Number(e.target.value))}
                  className="w-full accent-emerald-600 cursor-pointer"
                />
                <p className="text-[11px] text-slate-400">
                  Evaluated across the HR-configured parameters below by the assigned technical mentor.
                </p>
              </div>

              {/* Card 3: Intern Self-Assessment */}
              <div className="p-4 bg-slate-50/70 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-slate-800 font-semibold text-xs">
                    <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
                      <User size={15} />
                    </div>
                    <span>Intern Self-Assessment</span>
                  </div>
                  <span className="text-sm font-bold text-amber-700">{selfWeight}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={selfWeight}
                  onChange={(e) => setSelfWeight(Number(e.target.value))}
                  className="w-full accent-amber-600 cursor-pointer"
                />
                <p className="text-[11px] text-slate-400">
                  Intern's self-rating and structured qualitative responses to HR questionnaire.
                </p>
              </div>
            </div>
          </div>

          {/* Section 2: Detailed HR Evaluation Parameters */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Award size={18} className="text-indigo-600" />
                  Evaluation Parameters & Metric Weightages
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Define the technical and professional skills upon which mentors grade interns.
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={handleNormalizeParams}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw size={12} />
                  <span>Normalize to 100%</span>
                </button>
                <button
                  type="button"
                  onClick={handleOpenAddParam}
                  className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus size={14} />
                  <span>Add Parameter</span>
                </button>
              </div>
            </div>

            {/* Parameter Weight Balance Bar */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
              <span className="text-slate-600 font-medium">Total Parameter Weightage:</span>
              <span className={`font-bold px-2 py-0.5 rounded-md ${
                totalParamWeight === 100 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
              }`}>
                {totalParamWeight}% {totalParamWeight === 100 ? '✓ Calibrated' : '(Recommended: 100%)'}
              </span>
            </div>

            {/* Parameters Table */}
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase font-semibold text-[11px] tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Evaluation Parameter</th>
                    <th className="py-3 px-4">Evaluation Scope & Guidelines</th>
                    <th className="py-3 px-4 text-center">Max Score</th>
                    <th className="py-3 px-4 text-center">Weightage</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {isScoringLoading ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">Loading parameters…</td>
                    </tr>
                  ) : evaluationParams.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">
                        No evaluation parameters configured. Click "Add Parameter" to get started.
                      </td>
                    </tr>
                  ) : (
                    evaluationParams.map((param) => (
                      <tr key={param.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3.5 px-4">
                          <span className="font-bold text-slate-900 block">{param.name}</span>
                        </td>
                        <td className="py-3.5 px-4 max-w-xs text-slate-500">
                          <span className="line-clamp-2">{param.description || 'No description provided.'}</span>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className="font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
                            {param.maximumScore || 100}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className="font-bold text-indigo-700 bg-indigo-50 border border-indigo-200/80 px-2.5 py-0.5 rounded-full">
                            {param.weight}%
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-bold ${
                            param.isActive !== false ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-500'
                          }`}>
                            {param.isActive !== false ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenEditParam(param)}
                              className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                              title="Edit parameter"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteParam(param.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                              title="Delete parameter"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 3: Live Score Calculator & Assessment Simulator */}
          <div className="bg-gradient-to-br from-slate-900 to-indigo-950 text-white p-6 rounded-2xl shadow-md space-y-5">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Calculator size={20} className="text-amber-400" />
                <div>
                  <h3 className="text-base font-bold">HR Live Scoring Simulator</h3>
                  <p className="text-xs text-indigo-200">
                    Preview how intern ratings convert into overall scores using your configured parameter weights.
                  </p>
                </div>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-indigo-800/60 border border-indigo-700 text-indigo-200">
                Interactive Formula Validation
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Simulator Inputs (Left) */}
              <div className="lg:col-span-7 space-y-4 text-xs">
                {/* Goal completion slider */}
                <div className="bg-white/10 p-3.5 rounded-xl space-y-2 backdrop-blur-xs">
                  <div className="flex justify-between font-semibold">
                    <span>Simulated Goal Delivery Progress:</span>
                    <span className="text-amber-300 font-bold">{simGoalProgress}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={simGoalProgress}
                    onChange={(e) => setSimGoalProgress(Number(e.target.value))}
                    className="w-full accent-amber-400 cursor-pointer"
                  />
                </div>

                {/* Parameter score sliders */}
                <div className="bg-white/10 p-3.5 rounded-xl space-y-3 backdrop-blur-xs">
                  <span className="font-semibold block text-indigo-200">
                    Simulated Mentor Parameter Ratings (Normalized):
                  </span>
                  <div className="space-y-2.5">
                    {evaluationParams.map((p) => (
                      <div key={p.id} className="flex items-center justify-between gap-3">
                        <span className="truncate max-w-[180px] text-slate-200">{p.name} ({p.weight}%):</span>
                        <div className="flex items-center gap-2 flex-1 max-w-[200px]">
                          <input
                            type="range"
                            min="0"
                            max="100"
                            value={simParamScores[p.id] ?? 85}
                            onChange={(e) => setSimParamScores({ ...simParamScores, [p.id]: Number(e.target.value) })}
                            className="w-full accent-emerald-400 cursor-pointer"
                          />
                          <span className="w-8 text-right font-bold text-emerald-300">{simParamScores[p.id] ?? 85}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Self rating slider */}
                <div className="bg-white/10 p-3.5 rounded-xl space-y-2 backdrop-blur-xs">
                  <div className="flex justify-between font-semibold">
                    <span>Simulated Self-Assessment Rating (1–10 Scale):</span>
                    <span className="text-sky-300 font-bold">{simSelfRating} / 10</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    step="0.5"
                    value={simSelfRating}
                    onChange={(e) => setSimSelfRating(Number(e.target.value))}
                    className="w-full accent-sky-400 cursor-pointer"
                  />
                </div>
              </div>

              {/* Simulator Output (Right) */}
              <div className="lg:col-span-5 bg-white/10 p-5 rounded-xl flex flex-col justify-between space-y-4 border border-white/10">
                <div className="space-y-3">
                  <span className="text-[11px] uppercase tracking-wider text-indigo-300 font-bold block">
                    Calculated Overall Result
                  </span>
                  <div className="flex items-baseline gap-3">
                    <span className="text-4xl font-black text-amber-400">{simResult.overall}%</span>
                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-400/40">
                      {simResult.grade}
                    </span>
                  </div>
                  <div className="text-xs text-indigo-200">
                    Performance Classification: <span className="font-bold text-white">{simResult.classification}</span>
                  </div>
                </div>

                <div className="border-t border-white/10 pt-3 space-y-1.5 text-[11px] text-slate-300">
                  <div className="flex justify-between">
                    <span>Goals ({goalsWeight}%):</span>
                    <span className="font-semibold text-white">{(simGoalProgress * (goalsWeight / 100)).toFixed(1)} pts</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Mentor Criteria ({managerWeight}%):</span>
                    <span className="font-semibold text-white">{(simResult.managerScore * (managerWeight / 100)).toFixed(1)} pts</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Self-Assessment ({selfWeight}%):</span>
                    <span className="font-semibold text-white">{(simResult.selfScore * (selfWeight / 100)).toFixed(1)} pts</span>
                  </div>
                </div>

                <div className="p-2.5 rounded-lg bg-indigo-900/50 border border-indigo-700/50 text-[10.5px] text-indigo-200 leading-relaxed">
                  Formula: <span className="text-white font-mono">(Goals × {goalsWeight}%) + (Mentor × {managerWeight}%) + (Self × {selfWeight}%)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- TAB 2 CONTENT: GRADING SCALE BANDS (Existing Performance Categories) --- */}
      {activeTab === 'GRADES' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900">Performance Grading Bands</h2>
              <p className="text-xs text-slate-500 mt-0.5">Define grading bands and score ranges for final appraisals.</p>
            </div>
            <Can permission="CYCLE_CONFIG_MANAGE">
              <button
                type="button"
                onClick={handleOpenAddCat}
                className="inline-flex items-center gap-2 transition-colors self-start sm:self-auto cursor-pointer"
                style={{ background: '#1A56DB', color: '#FFFFFF', borderRadius: 8, padding: '8px 14px', fontSize: 13, fontWeight: 500, border: 'none' }}
              >
                <Plus size={14} /> Add Category
              </button>
            </Can>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { label: 'Total Categories', value: categories.length, icon: Layers, bg: '#EEF3FD', color: '#1A56DB' },
              { label: 'Score System', value: '0 – 100 Scale', icon: Target, bg: '#EAF3DE', color: '#27500A' },
              { label: 'Rating Range', value: '1 – 5 Values', icon: BarChart3, bg: '#FAEEDA', color: '#633806' },
            ].map(({ label, value, icon: Icon, bg, color }) => (
              <div key={label} style={{ background: '#FFFFFF', border: '0.5px solid #E4E6EC', borderRadius: 12, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: 8, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon size={16} style={{ color }} />
                </div>
                <div>
                  <p style={{ fontSize: 10, fontWeight: 500, color: '#9EA3B0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</p>
                  <p style={{ fontSize: 16, fontWeight: 500, color: '#111827' }}>{value}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Table */}
          <div style={{ background: '#FFFFFF', border: '0.5px solid #E4E6EC', borderRadius: 12, overflow: 'hidden' }}>
            <div className="overflow-x-auto">
              <table className="w-full text-left" style={{ minWidth: 560 }}>
                <thead>
                  <tr style={{ borderBottom: '0.5px solid #E4E6EC' }}>
                    {['Grade Name', 'Score Range', 'Rating', 'System Enum', ''].map((h, i) => (
                      <th key={h + i} style={{ padding: '10px 18px', fontSize: 11, fontWeight: 500, color: '#9EA3B0', textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: i === 4 ? 'right' : 'left' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {isCatLoading ? (
                    <tr><td colSpan={5} style={{ padding: '32px 18px', textAlign: 'center', fontSize: 13, color: '#9EA3B0' }}>Loading…</td></tr>
                  ) : categories.length === 0 ? (
                    <tr><td colSpan={5} style={{ padding: '32px 18px', textAlign: 'center', fontSize: 13, color: '#9EA3B0' }}>No performance categories defined.</td></tr>
                  ) : categories.map((cat, idx) => (
                    <tr key={cat.id} style={{ borderBottom: idx < categories.length - 1 ? '0.5px solid #F0F2F6' : 'none' }} className="hover:bg-[#FAFBFF] transition-colors">
                      <td style={{ padding: '11px 18px' }}>
                        <p style={{ fontSize: 13, fontWeight: 500, color: '#111827' }}>{cat.name}</p>
                        <p style={{ fontSize: 11, color: '#9EA3B0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 200 }}>{cat.description}</p>
                      </td>
                      <td style={{ padding: '11px 18px' }}>
                        <span style={{ fontSize: 12, fontWeight: 500, background: '#EEF3FD', color: '#0C447C', border: '0.5px solid #B5D4F4', borderRadius: 6, padding: '2px 8px' }}>
                          {cat.minScore} – {cat.maxScore}
                        </span>
                      </td>
                      <td style={{ padding: '11px 18px' }}>
                        <div className="flex items-center gap-1">
                          {[...Array(5)].map((_, i) => (
                            <div key={i} style={{ width: 5, height: 14, borderRadius: 3, background: i < cat.ratingValue ? '#1A56DB' : '#E4E6EC' }} />
                          ))}
                          <span style={{ marginLeft: 6, fontSize: 12, fontWeight: 500, color: '#111827' }}>{cat.ratingValue}</span>
                        </div>
                      </td>
                      <td style={{ padding: '11px 18px' }}>
                        <span style={{ fontSize: 10, fontWeight: 500, color: '#444441', background: '#F1EFE8', border: '0.5px solid #DDDBD2', borderRadius: 6, padding: '2px 8px' }}>
                          {cat.grade}
                        </span>
                      </td>
                      <td style={{ padding: '11px 18px', textAlign: 'right' }}>
                        <Can permission="CYCLE_CONFIG_MANAGE">
                          <div className="flex justify-end items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleOpenEditCat(cat)}
                              title="Edit"
                              style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9EA3B0', borderRadius: 6 }}
                              className="hover:bg-[#EEF3FD] hover:text-[#1A56DB] transition-colors cursor-pointer"
                            >
                              <Edit2 size={13} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleCatDelete(cat.id!)}
                              title="Delete"
                              style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9EA3B0', borderRadius: 6 }}
                              className="hover:bg-[#FCEBEB] hover:text-[#791F1F] transition-colors cursor-pointer"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </Can>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Parameter Edit/Create Modal */}
      {showParamModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(17,24,39,0.5)' }}>
          <div onClick={() => setShowParamModal(false)} className="absolute inset-0" />
          <div className="relative bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden flex flex-col z-10">
            <div className="flex items-center justify-between p-4.5 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-800">
                  {editingParamId ? 'Edit Evaluation Parameter' : 'New Evaluation Parameter'}
                </h3>
                <p className="text-xs text-slate-400">Configure parameter metric, guideline, and score weight.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowParamModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto max-h-[70vh]">
              <div>
                <label style={labelStyle}>Parameter Name <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  style={inputStyle}
                  placeholder="e.g. Code Quality & Automated Testing"
                  value={paramForm.name}
                  onChange={(e) => setParamForm({ ...paramForm, name: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label style={labelStyle}>Weightage (%) <span className="text-rose-500">*</span></label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    style={inputStyle}
                    value={paramForm.weight}
                    onChange={(e) => setParamForm({ ...paramForm, weight: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Maximum Score</label>
                  <input
                    type="number"
                    min="1"
                    style={inputStyle}
                    value={paramForm.maximumScore}
                    onChange={(e) => setParamForm({ ...paramForm, maximumScore: Number(e.target.value) })}
                  />
                </div>
              </div>

              <div>
                <label style={labelStyle}>Evaluation Guidelines & Description</label>
                <textarea
                  rows={3}
                  style={{ ...inputStyle, resize: 'none' }}
                  placeholder="Describe expectations (e.g. clean code principles, test coverage, PR review engagement)..."
                  value={paramForm.description}
                  onChange={(e) => setParamForm({ ...paramForm, description: e.target.value })}
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="paramActive"
                  checked={paramForm.isActive}
                  onChange={(e) => setParamForm({ ...paramForm, isActive: e.target.checked })}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor="paramActive" className="text-xs font-medium text-slate-700 cursor-pointer">
                  Active (Include in evaluation scoring calculation)
                </label>
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 flex gap-2 justify-end bg-slate-50/50">
              <button
                type="button"
                onClick={() => setShowParamModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveParam}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white transition-colors flex items-center gap-1.5 shadow-sm"
              >
                <Check size={14} />
                <span>{editingParamId ? 'Update Parameter' : 'Add Parameter'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Grade Category Modal */}
      {showCatModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(17,24,39,0.5)' }}>
          <div onClick={() => setShowCatModal(false)} className="absolute inset-0" />
          <div style={{ position: 'relative', background: '#FFFFFF', border: '0.5px solid #E4E6EC', borderRadius: 12, width: '100%', maxWidth: 520, maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div className="flex items-center justify-between" style={{ padding: '14px 18px', borderBottom: '0.5px solid #E4E6EC' }}>
              <div>
                <p style={{ fontSize: 14, fontWeight: 500, color: '#111827' }}>{editingCatId ? 'Edit Category' : 'New Category'}</p>
                <p style={{ fontSize: 12, color: '#9EA3B0' }}>Configure how scores translate to performance grades.</p>
              </div>
              <button onClick={() => setShowCatModal(false)} style={{ color: '#9EA3B0' }} className="hover:text-[#111827] transition-colors cursor-pointer">
                <X size={16} />
              </button>
            </div>
            <div style={{ padding: '16px 18px', overflowY: 'auto' }} className="space-y-4">
              <div>
                <label style={labelStyle}>Display Name</label>
                <input type="text" style={inputStyle} placeholder="e.g. Outstanding Performance"
                  value={catFormData.name} onChange={e => setCatFormData({ ...catFormData, name: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label style={labelStyle}>Min Score (0-100)</label>
                  <input type="number" min="0" style={{ ...inputStyle, textAlign: 'right' }} value={catFormData.minScore === '' ? '' : catFormData.minScore}
                    onKeyDown={e => { if (e.key === '-') e.preventDefault(); }}
                    onChange={e => {
                      const val = e.target.value;
                      setCatFormData({ ...catFormData, minScore: val === '' ? '' : Math.max(0, Number(val)) });
                    }} />
                </div>
                <div>
                  <label style={labelStyle}>Max Score (0-100)</label>
                  <input type="number" min="0" style={{ ...inputStyle, textAlign: 'right' }} value={catFormData.maxScore === '' ? '' : catFormData.maxScore}
                    onKeyDown={e => { if (e.key === '-') e.preventDefault(); }}
                    onChange={e => {
                      const val = e.target.value;
                      setCatFormData({ ...catFormData, maxScore: val === '' ? '' : Math.max(0, Number(val)) });
                    }} />
                </div>
                <div>
                  <label style={labelStyle}>Rating Value (1-5)</label>
                  <input type="number" min="1" max="5" style={{ ...inputStyle, textAlign: 'right' }} value={catFormData.ratingValue === '' ? '' : catFormData.ratingValue}
                    onKeyDown={e => { if (e.key === '-') e.preventDefault(); }}
                    onChange={e => {
                      const val = e.target.value;
                      setCatFormData({ ...catFormData, ratingValue: val === '' ? '' : Math.max(0, Number(val)) });
                    }} />
                </div>
                <div>
                  <label style={labelStyle}>System Grade</label>
                  <select style={inputStyle} value={catFormData.grade}
                    onChange={e => setCatFormData({ ...catFormData, grade: e.target.value as PerformanceGrade })}>
                    {GRADES.map(pg => <option key={pg} value={pg}>{pg}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label style={labelStyle}>Description</label>
                <textarea rows={3} style={{ ...inputStyle, resize: 'none', height: 72 }}
                  placeholder="Describe the characteristics of this performance level…"
                  value={catFormData.description} onChange={e => setCatFormData({ ...catFormData, description: e.target.value })} />
              </div>
            </div>
            <div className="flex gap-2" style={{ padding: '14px 18px', borderTop: '0.5px solid #E4E6EC' }}>
              <button onClick={() => setShowCatModal(false)} className="flex-1 transition-colors cursor-pointer"
                style={{ background: '#F5F6F8', color: '#5A6070', border: '0.5px solid #E0E2E8', borderRadius: 8, padding: '8px', fontSize: 13, fontWeight: 500 }}>
                Cancel
              </button>
              <button onClick={handleCatSubmit} className="flex-[2] inline-flex items-center justify-center gap-2 transition-colors cursor-pointer"
                style={{ background: '#1A56DB', color: '#FFFFFF', border: 'none', borderRadius: 8, padding: '8px', fontSize: 13, fontWeight: 500 }}>
                <Check size={13} /> {editingCatId ? 'Update Category' : 'Create Category'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PerformanceCategoryManagement;
