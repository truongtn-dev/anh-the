import React from 'react';
import type { ImageAnalysisResult } from '../types';
import { LightbulbIcon } from './icons/LightbulbIcon';
import { CheckIcon } from './icons/CheckIcon';
import { XIcon } from './icons/XIcon';
import { UserCircleIcon } from './icons/UserCircleIcon';

interface ImageAnalysisFeedbackProps {
  result: ImageAnalysisResult | null;
  isLoading: boolean;
}

export const ImageAnalysisFeedback: React.FC<ImageAnalysisFeedbackProps> = ({ result, isLoading }) => {
  if (isLoading) {
    return (
      <div className="mt-4 p-4 bg-slate-100 rounded-lg flex items-center">
        <div className="w-4 h-4 border-2 border-slate-400 border-t-slate-600 rounded-full animate-spin mr-3"></div>
        <p className="text-sm text-slate-600 font-medium">Đang phân tích ảnh của bạn...</p>
      </div>
    );
  }

  if (!result || (!result.feedback && !result.gender)) {
    return null;
  }

  const allGood = result.feedback?.every(item => item.isGood) ?? true;

  return (
    <div className={`mt-4 p-4 rounded-lg ${allGood ? 'bg-green-50' : 'bg-amber-50'}`}>
      <h4 className="flex items-center text-sm font-semibold mb-3">
        <LightbulbIcon className={`w-5 h-5 mr-2 ${allGood ? 'text-green-600' : 'text-amber-600'}`} />
        <span className={`${allGood ? 'text-green-800' : 'text-amber-800'}`}>Phân tích nhanh</span>
      </h4>
      <ul className="space-y-2 text-sm">
        {result.gender && (
            <li className="flex items-start">
                <UserCircleIcon className="w-4 h-4 text-slate-500 mr-2.5 mt-0.5 flex-shrink-0" />
                <span className="text-slate-700">
                    Giới tính phát hiện: <strong>{result.gender}</strong>
                </span>
            </li>
        )}
        {result.feedback?.map((item, index) => (
          <li key={index} className="flex items-start">
            {item.isGood ? (
              <CheckIcon className="w-4 h-4 text-green-500 mr-2.5 mt-0.5 flex-shrink-0" strokeWidth={2.5}/>
            ) : (
              <XIcon className="w-4 h-4 text-amber-500 mr-2.5 mt-0.5 flex-shrink-0" />
            )}
            <span className={item.isGood ? 'text-slate-600' : 'text-slate-700'}>{item.message}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};
