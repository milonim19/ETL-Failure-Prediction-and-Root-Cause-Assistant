import React from 'react';
import { Upload, FileText, ArrowRight } from 'lucide-react';

const UploadCard: React.FC = () => {
  return (
    <div className="card-base">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-zinc-100 rounded-lg">
          <Upload className="w-5 h-5 text-zinc-600" />
        </div>
        <h2 className="text-lg font-semibold">Upload ETL Logs</h2>
      </div>
      
      <div className="group relative border-2 border-dashed border-zinc-200 rounded-xl p-8 transition-colors hover:border-zinc-400 hover:bg-zinc-50/50 cursor-pointer">
        <input 
          type="file" 
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
        />
        <div className="text-center">
          <FileText className="w-10 h-10 text-zinc-300 mx-auto mb-3 group-hover:text-zinc-400 transition-colors" />
          <p className="text-sm font-medium text-zinc-900">Click or drag logs here</p>
          <p className="text-xs text-zinc-500 mt-1">Supports JSON, CSV, or LOG files</p>
        </div>
      </div>

      <button className="btn-primary w-full mt-6 flex items-center justify-center gap-2">
        Start Analysis
        <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );
};

export default UploadCard;
