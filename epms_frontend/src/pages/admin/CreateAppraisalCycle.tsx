import React, { useState } from 'react';
import CycleForm from '../../components/appraisal/CycleForm';
import CreateAppraisalTemplateModal from '../../components/appraisal/CreateAppraisalTemplateModal';
import { Calendar, Plus } from 'lucide-react';

const CreateAppraisalCycle: React.FC = () => {
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);

  return (
    <div className="space-y-4 pb-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0 text-blue-600">
            <Calendar size={20} />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900">Appraisal Cycles & Templates</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Configure quarterly performance review stages, self-appraisals, and post-processes.
            </p>
          </div>
        </div>

        {/* Create Appraisal Template Button matching media_1789919691069.png */}
        <button
          type="button"
          onClick={() => setIsTemplateModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-bold rounded-lg shadow-sm transition-all self-start sm:self-auto"
          style={{ backgroundColor: "#007BFF" }}
        >
          <Plus size={15} strokeWidth={2.5} />
          Create Appraisal Template
        </button>
      </div>

      <CycleForm />

      <CreateAppraisalTemplateModal
        isOpen={isTemplateModalOpen}
        onClose={() => setIsTemplateModalOpen(false)}
        onSuccess={() => window.location.reload()}
      />
    </div>
  );
};

export default CreateAppraisalCycle;
