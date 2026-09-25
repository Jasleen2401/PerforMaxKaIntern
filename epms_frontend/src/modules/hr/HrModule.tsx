import React from "react";
import { Link } from "react-router-dom";
import { Calendar, Layers, CheckCircle2, TrendingDown, Award } from "lucide-react";

export const HrModule = () => {
  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Calendar className="text-emerald-600" size={28} />
            HR Partner Operations Hub
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Performance review cycles, 1–10 criteria weights calibration, approval workflows, and PIP monitoring.
          </p>
        </div>
        <span className="bg-emerald-50 text-emerald-700 font-bold text-xs uppercase px-3 py-1 rounded-full border border-emerald-200">
          HR Partner Scope
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <Link to="/appraisal" className="p-5 bg-white rounded-2xl border border-slate-200 hover:border-emerald-300 shadow-xs hover:shadow-md transition-all group">
          <CheckCircle2 className="text-emerald-600 mb-3" size={24} />
          <h3 className="font-semibold text-slate-900 group-hover:text-emerald-600">Appraisal Review & Publishing</h3>
          <p className="text-xs text-slate-500 mt-1">Approve manager scores and publish finalized ratings to interns.</p>
        </Link>

        <Link to="/performance-categories" className="p-5 bg-white rounded-2xl border border-slate-200 hover:border-emerald-300 shadow-xs hover:shadow-md transition-all group">
          <Layers className="text-emerald-600 mb-3" size={24} />
          <h3 className="font-semibold text-slate-900 group-hover:text-emerald-600">1–10 Evaluation Criteria</h3>
          <p className="text-xs text-slate-500 mt-1">Configure weighted competency rating definitions (100% total weightage).</p>
        </Link>

        <Link to="/pip" className="p-5 bg-white rounded-2xl border border-slate-200 hover:border-emerald-300 shadow-xs hover:shadow-md transition-all group">
          <TrendingDown className="text-emerald-600 mb-3" size={24} />
          <h3 className="font-semibold text-slate-900 group-hover:text-emerald-600">PIP Recovery Tracking</h3>
          <p className="text-xs text-slate-500 mt-1">Track Performance Improvement Plans and milestone check-ins.</p>
        </Link>
      </div>
    </div>
  );
};

export default HrModule;
