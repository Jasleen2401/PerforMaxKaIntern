import React from "react";
import { Link } from "react-router-dom";
import { Target, Users, CheckSquare, MessageSquare } from "lucide-react";

export const ManagerModule = () => {
  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Target className="text-blue-600" size={28} />
            Tech & QA Manager Workbench
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Goal setting, measurable KPIs, code & evidence reviews, team evaluations, and 1-on-1 syncs.
          </p>
        </div>
        <span className="bg-blue-50 text-blue-700 font-bold text-xs uppercase px-3 py-1 rounded-full border border-blue-200">
          Manager Scope
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <Link to="/kpi/team" className="p-5 bg-white rounded-2xl border border-slate-200 hover:border-blue-300 shadow-xs hover:shadow-md transition-all group">
          <Users className="text-blue-600 mb-3" size={24} />
          <h3 className="font-semibold text-slate-900 group-hover:text-blue-600">Team Performance & Roster</h3>
          <p className="text-xs text-slate-500 mt-1">Monitor direct reports, check progress bars, and view team KPIs.</p>
        </Link>

        <Link to="/kpi/manage" className="p-5 bg-white rounded-2xl border border-slate-200 hover:border-blue-300 shadow-xs hover:shadow-md transition-all group">
          <CheckSquare className="text-blue-600 mb-3" size={24} />
          <h3 className="font-semibold text-slate-900 group-hover:text-blue-600">Goal & KRA Management</h3>
          <p className="text-xs text-slate-500 mt-1">Assign weighted goals and measurable targets to team members.</p>
        </Link>

        <Link to="/meetings" className="p-5 bg-white rounded-2xl border border-slate-200 hover:border-blue-300 shadow-xs hover:shadow-md transition-all group">
          <MessageSquare className="text-blue-600 mb-3" size={24} />
          <h3 className="font-semibold text-slate-900 group-hover:text-blue-600">1-on-1 Sync Meetings</h3>
          <p className="text-xs text-slate-500 mt-1">Document 1-on-1 check-ins, talking points, and action items.</p>
        </Link>
      </div>
    </div>
  );
};

export default ManagerModule;
