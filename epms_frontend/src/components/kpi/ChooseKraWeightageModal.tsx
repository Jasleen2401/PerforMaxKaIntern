import React, { useState, useEffect } from "react";
import { X, Search, AlertCircle, CheckCircle2, Trash2 } from "lucide-react";
import { toast } from "react-toastify";

export interface KraItem {
  id: string;
  title: string;
  description?: string;
  weightage?: number;
}

interface ChooseKraWeightageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  employeeId: string | number;
  employeeName?: string;
}

const DEFAULT_KRAS: KraItem[] = [
  { id: "kra-1", title: "Campus Recruitment", description: "Drive university hiring drives and intern intake pipeline." },
  { id: "kra-2", title: "Employee Hiring Experience", description: "Streamline onboarding satisfaction and candidate response times." },
  { id: "kra-3", title: "Candidate interviewing", description: "Conduct technical and behavioral candidate assessments with scorecards." },
  { id: "kra-4", title: "Candidate screening and selection", description: "Review resumes, conduct background checks, and shortlist candidates." },
  { id: "kra-5", title: "Recruitment budgeting and cost reduction", description: "Optimize hiring channels and reduce agency spend." },
  { id: "kra-6", title: "Employee wellness", description: "Implement wellness initiatives and health engagement programs." },
  { id: "kra-7", title: "Software Architecture", description: "Design modular, scalable, and secure microservices and database schemas." },
  { id: "kra-8", title: "Code Quality & Automated Testing", description: "Maintain unit test coverage, code review standards, and CI/CD pipelines." },
  { id: "kra-9", title: "Continuous Improvement & Innovation", description: "Lead technical refactoring, performance tuning, and developer tooling." },
  { id: "kra-10", title: "Customer Satisfaction & SLAs", description: "Achieve high platform uptime and resolve critical client defects promptly." },
];

export const ChooseKraWeightageModal: React.FC<ChooseKraWeightageModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  employeeId,
  employeeName,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [availableKras, setAvailableKras] = useState<KraItem[]>(DEFAULT_KRAS);
  // Default selected matching screenshot: Candidate interviewing (35%), Candidate screening (35%), Recruitment budgeting (30%)
  const [selectedKras, setSelectedKras] = useState<KraItem[]>([
    { id: "kra-5", title: "Recruitment budgeting and cost reduction", weightage: 30 },
    { id: "kra-4", title: "Candidate screening and selection", weightage: 35 },
    { id: "kra-3", title: "Candidate interviewing", weightage: 35 },
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch KRA library if available from backend
  useEffect(() => {
    if (isOpen) {
      const token = localStorage.getItem("accessToken") || "";
      fetch("/api/goals/kra-library/", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
        .then((res) => res.json())
        .then((data) => {
          if (data?.data && Array.isArray(data.data) && data.data.length > 0) {
            setAvailableKras(data.data);
          }
        })
        .catch(() => {
          // Use default fallback KRAs
        });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const filteredKras = availableKras.filter((k) =>
    k.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const isSelected = (id: string) => selectedKras.some((k) => k.id === id);

  const toggleSelectKra = (kra: KraItem) => {
    if (isSelected(kra.id)) {
      setSelectedKras(selectedKras.filter((k) => k.id !== kra.id));
    } else {
      // Auto-assign leftover or default 20%
      const currentTotal = selectedKras.reduce((acc, cur) => acc + (cur.weightage || 0), 0);
      const remaining = Math.max(100 - currentTotal, 10);
      setSelectedKras([...selectedKras, { ...kra, weightage: remaining }]);
    }
  };

  const updateWeightage = (id: string, weight: number) => {
    setSelectedKras(
      selectedKras.map((k) => (k.id === id ? { ...k, weightage: Math.max(0, Math.min(100, weight)) } : k))
    );
  };

  const removeSelectedKra = (id: string) => {
    setSelectedKras(selectedKras.filter((k) => k.id !== id));
  };

  const totalWeightage = selectedKras.reduce((sum, item) => sum + (Number(item.weightage) || 0), 0);
  const isValidTotal = totalWeightage === 100;

  const handleSave = async () => {
    if (!isValidTotal) {
      toast.error(`Total weightage must be exactly 100%. Currently it is ${totalWeightage}%.`);
      return;
    }

    try {
      setIsSubmitting(true);
      const token = localStorage.getItem("accessToken") || "";
      const response = await fetch("/api/goals/assign-kras/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({
          employee_id: employeeId,
          kras: selectedKras.map((k) => ({
            kra_id: k.id,
            title: k.title,
            weightage: k.weightage,
          })),
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Failed to assign KRAs");
      }

      toast.success(data.message || "KRAs and weightages assigned successfully!");
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Could not save KRA assignments.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(15, 23, 42, 0.5)", backdropFilter: "blur(3px)" }}
    >
      <div
        className="w-full max-w-5xl bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[90vh]"
        style={{ animation: "fadeIn 0.2s ease-out" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div>
            <h2 className="text-xl font-bold text-slate-800">Choose KRA & Weightage</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Select Key Result Areas and distribute weightage to equal exactly 100% {employeeName ? `for ${employeeName}` : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Dual Panel Body matching media_1789919618446.png */}
        <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-12">
          {/* Left Panel: Choose KRA List */}
          <div className="lg:col-span-6 border-r border-slate-200 flex flex-col bg-white">
            {/* Search and Header Bar */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between gap-3 bg-slate-50/30">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <input
                  type="checkbox"
                  checked={selectedKras.length === availableKras.length && availableKras.length > 0}
                  onChange={(e) => {
                    if (e.target.checked) {
                      const share = Math.floor(100 / availableKras.length);
                      setSelectedKras(availableKras.map((k) => ({ ...k, weightage: share })));
                    } else {
                      setSelectedKras([]);
                    }
                  }}
                  className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                />
                <span>Choose KRA</span>
              </div>
              <div className="relative w-48">
                <Search size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search KRA..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg outline-none focus:border-blue-500 transition-all"
                />
              </div>
            </div>

            {/* KRA List Items */}
            <div className="flex-1 overflow-y-auto p-3 space-y-1 divide-y divide-slate-100">
              {filteredKras.map((kra) => {
                const checked = isSelected(kra.id);
                return (
                  <label
                    key={kra.id}
                    className="flex items-start gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer select-none"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleSelectKra(kra)}
                      className="mt-0.5 w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-slate-800 leading-snug">{kra.title}</div>
                      {kra.description && (
                        <div className="text-xs text-slate-400 mt-0.5 line-clamp-1">{kra.description}</div>
                      )}
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Right Floating Card: Selected KRA & Weightage */}
          <div className="lg:col-span-6 flex flex-col bg-slate-50/50 p-5">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex-1 flex flex-col overflow-hidden">
              {/* Card Table Header */}
              <div className="px-5 py-3.5 bg-slate-100/70 border-b border-slate-200 flex items-center justify-between text-xs font-bold text-slate-600 uppercase tracking-wider">
                <span>KRA</span>
                <span className="pr-10">Weightage</span>
              </div>

              {/* Rows matching media_1789919618446.png */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {selectedKras.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-400">
                    <AlertCircle size={32} className="mb-2 opacity-50" />
                    <p className="text-sm font-medium">No KRAs selected</p>
                    <p className="text-xs mt-1 text-slate-400">Check items on the left to allocate weights.</p>
                  </div>
                ) : (
                  selectedKras.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between gap-4 p-3 bg-white border border-slate-200 rounded-xl hover:border-slate-300 transition-all shadow-xs"
                    >
                      <span className="text-sm font-medium text-slate-800 flex-1 leading-snug">{item.title}</span>
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 focus-within:border-blue-500 focus-within:bg-white transition-all">
                          <input
                            type="number"
                            min={0}
                            max={100}
                            value={item.weightage ?? 0}
                            onChange={(e) => updateWeightage(item.id, Number(e.target.value))}
                            className="w-12 text-center text-sm font-semibold text-slate-800 bg-transparent outline-none"
                          />
                          <span className="text-xs text-slate-400 font-bold ml-0.5">%</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeSelectedKra(item.id)}
                          className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Remove KRA"
                        >
                          <X size={18} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Total Weightage Status Bar */}
              <div className="p-4 border-t border-slate-100 bg-slate-50/80 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {isValidTotal ? (
                    <div className="flex items-center gap-1.5 text-emerald-700 text-xs font-semibold bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
                      <CheckCircle2 size={14} className="text-emerald-600" />
                      Total Weightage: 100%
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-amber-700 text-xs font-semibold bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full">
                      <AlertCircle size={14} className="text-amber-600" />
                      Total Weightage: {totalWeightage}% (Requires 100%)
                    </div>
                  )}
                </div>
                <div className="text-xs text-slate-400 font-medium">
                  {selectedKras.length} KRA{selectedKras.length === 1 ? "" : "s"} selected
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-white flex items-center justify-between">
          <div className="text-xs text-slate-500">
            {isValidTotal
              ? "Weights properly balanced and ready to save."
              : "Adjust percentage values until the total equals 100%."}
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={!isValidTotal || isSubmitting}
              className="px-6 py-2 text-white text-sm font-semibold rounded-xl shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: isValidTotal ? "#4338CA" : "#94A3B8" }}
            >
              {isSubmitting ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChooseKraWeightageModal;
