
import React, { useState, useRef, useEffect } from 'react';
import { 
  DesignParams, 
  PlacementType, 
  AnalysisResult,
  ExportOption,
  HistoryItem
} from './types';
import { processDesign } from './services/imageProcessor';
import { generateDXF } from './services/dxfGenerator';
import { generateSVG } from './services/svgGenerator';
import { generatePDF } from './services/pdfGenerator';
import { analyzeDesignWithAI } from './services/geminiService';

enum AppStep {
  WELCOME = 1,
  UPLOAD = 2,
  PARAMS = 3,
  RESULT_DETAILS = 4,
  VISUAL_PREFERENCE = 5,
  EXPORT_CHOICE = 6,
  HISTORY = 7
}

const downloadFile = (content: string, extension: string) => {
  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `led_design_${Date.now()}.${extension}`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

// --- Professional App Icon Component ---
const AppIcon = ({ className = "w-40 h-40" }: { className?: string }) => (
  <div className={`relative ${className} group`}>
    <div className="absolute inset-0 bg-red-600 rounded-[2rem] blur-2xl opacity-20 group-hover:opacity-40 transition-opacity duration-500"></div>
    <div className="relative w-full h-full bg-black border-4 border-red-600 rounded-[2.5rem] flex items-center justify-center overflow-hidden shadow-2xl">
      <div className="absolute inset-0 bg-gradient-to-br from-red-600/20 to-transparent"></div>
      <div className="flex flex-col items-center justify-center z-10">
        <div className="flex gap-1 mb-1">
          <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
          <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse [animation-delay:200ms]"></div>
          <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse [animation-delay:400ms]"></div>
        </div>
        <span className="text-white font-black text-4xl font-cairo tracking-tighter leading-none">LED</span>
        <div className="h-0.5 w-12 bg-red-600 mt-1"></div>
        <span className="text-red-500 font-bold text-[10px] tracking-[0.3em] mt-1">PIXEL</span>
      </div>
      <div className="absolute top-0 right-0 w-16 h-16 border-t-2 border-r-2 border-red-600/30 rounded-tr-[2rem]"></div>
      <div className="absolute bottom-0 left-0 w-16 h-16 border-b-2 border-l-2 border-red-600/30 rounded-bl-[2rem]"></div>
    </div>
  </div>
);

// --- Sub-View Components ---

const WelcomeView = ({ onStart, onHistory }: { onStart: () => void, onHistory: () => void }) => (
  <div className="flex flex-col items-center justify-center min-h-screen animate-fade-in text-center px-6">
    <div className="mb-10 relative">
      <AppIcon />
      <div className="absolute -bottom-2 -right-2 bg-red-600 text-white text-xs px-3 py-1.5 rounded-full font-black shadow-lg">PRO V3.1</div>
    </div>
    <h1 className="text-6xl font-black mb-6 font-cairo tracking-tight text-white">LED CAD DESIGNER</h1>
    <p className="text-gray-400 max-w-lg mb-12 text-xl font-medium leading-relaxed">
      المنصة الاحترافية المتكاملة لتحويل الرسوميات إلى مسارات هندسية دقيقة متوافقة مع جميع ماكينات الـ CNC والـ Laser.
    </p>
    
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-3xl">
      <button 
        onClick={onStart}
        className="btn-red text-white py-8 px-10 rounded-3xl font-black text-2xl flex flex-col items-center gap-2 shadow-2xl active:scale-95 transition-all"
      >
        <span>دخول التطبيق</span>
        <span className="text-[11px] opacity-70 font-normal tracking-widest uppercase">Start Application</span>
      </button>
      <button 
        onClick={onHistory}
        className="bg-white/5 hover:bg-white/10 text-white py-8 px-10 rounded-3xl font-bold transition-all flex flex-col items-center gap-2 border border-white/10 active:scale-95"
      >
        <span>سجل العمليات</span>
        <span className="text-[11px] opacity-50 font-normal tracking-widest uppercase">History</span>
      </button>
      <button className="bg-white text-black hover:bg-gray-200 py-8 px-10 rounded-3xl font-black transition-all flex flex-col items-center gap-2 shadow-xl active:scale-95">
        <span>ترقية للبرو</span>
        <span className="text-[11px] opacity-70 font-normal tracking-widest font-cairo uppercase">Buy Pro</span>
      </button>
    </div>
  </div>
);

const UploadView = ({ onFileChange, onBack }: { onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void, onBack: () => void }) => (
  <div className="max-w-4xl mx-auto min-h-screen flex flex-col justify-center py-12 px-6 animate-fade-in text-center">
    <h2 className="text-4xl font-black mb-4 font-cairo text-white">اختيار التصميم</h2>
    <p className="text-gray-500 mb-10 text-lg">يرجى رفع ملف الصورة المراد تحليله وتوزيع الإضاءة عليه</p>
    <label className="group relative block w-full aspect-video rounded-[40px] border-4 border-dashed border-white/10 hover:border-red-600/60 transition-all cursor-pointer bg-white/5 overflow-hidden flex flex-col items-center justify-center gap-8 shadow-2xl">
      <div className="w-32 h-32 bg-white/5 rounded-full flex items-center justify-center group-hover:scale-110 group-hover:bg-red-600/10 transition-all">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
      </div>
      <div className="space-y-2">
        <p className="text-2xl font-black text-white">اختر ملف الصورة أو اسحبها هنا</p>
        <p className="text-gray-500 text-sm font-bold">يدعم الصيغ PNG, JPG بدقة عالية</p>
      </div>
      <input type="file" className="hidden" accept="image/*" onChange={onFileChange} />
    </label>
    <button onClick={onBack} className="mt-12 text-gray-500 hover:text-white font-bold transition-colors">العودة للشاشة الرئيسية</button>
  </div>
);

const ParamsView = ({ params, onInputChange, onProcess, onBackToUpload, image }: { 
  params: DesignParams, 
  onInputChange: (key: keyof DesignParams, value: string) => void, 
  onProcess: () => void, 
  onBackToUpload: () => void,
  image: string | null
}) => (
  <div className="max-w-5xl mx-auto py-16 px-6 animate-fade-in">
    <div className="flex flex-col lg:flex-row gap-16 items-start">
      <div className="w-full lg:w-1/2 space-y-10">
        <div className="text-right border-r-8 border-red-600 pr-6 py-2">
          <h2 className="text-4xl font-black mb-2 font-cairo text-white">البيانات الفنية</h2>
          <p className="text-gray-500 text-lg">أدخل أبعاد المنتج النهائي ومواصفات ليد المستخدم</p>
        </div>
        
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-3">
            <label className="block text-sm font-black text-gray-400 mr-2 uppercase tracking-widest">العرض الكلي (سم)</label>
            <input 
              type="number" 
              value={params.canvasWidthCm || ''} 
              onChange={e => onInputChange('canvasWidthCm', e.target.value)} 
              className="w-full bg-white/5 border border-white/10 rounded-3xl p-6 text-white text-center font-black focus:border-red-600 focus:ring-4 focus:ring-red-600/20 outline-none transition-all text-2xl shadow-inner" 
            />
          </div>
          <div className="space-y-3">
            <label className="block text-sm font-black text-gray-400 mr-2 uppercase tracking-widest">الارتفاع الكلي (سم)</label>
            <input 
              type="number" 
              value={params.canvasHeightCm || ''} 
              onChange={e => onInputChange('canvasHeightCm', e.target.value)} 
              className="w-full bg-white/5 border border-white/10 rounded-3xl p-6 text-white text-center font-black focus:border-red-600 focus:ring-4 focus:ring-red-600/20 outline-none transition-all text-2xl shadow-inner" 
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-3">
            <label className="block text-sm font-black text-gray-400 mr-2 uppercase tracking-widest">تباعد الليدات (ملم)</label>
            <input 
              type="number" 
              value={params.ledSpacingMm || ''} 
              onChange={e => onInputChange('ledSpacingMm', e.target.value)} 
              className="w-full bg-white/5 border border-white/10 rounded-3xl p-6 text-white text-center font-black focus:border-red-600 focus:ring-4 focus:ring-red-600/20 outline-none transition-all text-2xl shadow-inner" 
            />
          </div>
          <div className="space-y-3">
            <label className="block text-sm font-black text-gray-400 mr-2 uppercase tracking-widest">قطر ثقب الليدة (ملم)</label>
            <input 
              type="number" 
              value={params.ledDiameterMm || ''} 
              onChange={e => onInputChange('ledDiameterMm', e.target.value)} 
              className="w-full bg-white/5 border border-white/10 rounded-3xl p-6 text-white text-center font-black focus:border-red-600 focus:ring-4 focus:ring-red-600/20 outline-none transition-all text-2xl shadow-inner" 
            />
          </div>
        </div>

        <div className="space-y-3">
          <label className="block text-sm font-black text-gray-400 mr-2 uppercase tracking-widest">خوارزمية توزيع الليدات</label>
          <select 
            value={params.placement} 
            onChange={e => onInputChange('placement', e.target.value)} 
            className="w-full bg-white/5 border border-white/10 rounded-3xl p-6 text-white text-right font-black outline-none focus:border-red-600 appearance-none transition-all cursor-pointer"
          >
            <option value={PlacementType.OUTLINE}>توزيع على الحدود الخارجية (Outline)</option>
            <option value={PlacementType.CENTER_LINE}>توزيع في منتصف الكتلة (Skeleton)</option>
            <option value={PlacementType.SKELETON}>تعبئة شبكية كاملة (Full Fill)</option>
          </select>
        </div>

        <button onClick={onProcess} className="w-full py-8 bg-red-600 hover:bg-red-500 text-white font-black text-3xl rounded-[32px] transition-all shadow-2xl active:scale-95">
          تأكيد وتحليل الناتج
        </button>
      </div>

      <div className="w-full lg:w-1/2">
        <div className="bg-white/5 rounded-[40px] p-8 border border-white/10 shadow-2xl relative group overflow-hidden">
          <div className="absolute top-4 right-4 bg-white/10 backdrop-blur-md px-4 py-2 rounded-full text-[10px] font-bold text-white z-10 border border-white/10 uppercase">Original Preview</div>
          {image && <img src={image} className="w-full rounded-[24px] grayscale brightness-75 group-hover:grayscale-0 group-hover:brightness-100 transition-all duration-500" />}
        </div>
        <button onClick={onBackToUpload} className="mt-6 w-full text-gray-500 hover:text-red-500 transition-colors text-sm font-bold flex items-center justify-center gap-2">
          <span>تغيير ملف التصميم الحالي</span>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>
    </div>
  </div>
);

const ResultView = ({ 
  isProcessing, 
  isAiAnalyzing, 
  result, 
  aiReview, 
  params, 
  onPreference, 
  onBackToParams, 
  canvasRef 
}: {
  isProcessing: boolean,
  isAiAnalyzing: boolean,
  result: AnalysisResult | null,
  aiReview: string,
  params: DesignParams,
  onPreference: () => void,
  onBackToParams: () => void,
  canvasRef: React.RefObject<HTMLCanvasElement | null>
}) => (
  <div className="max-w-6xl mx-auto py-12 px-6 animate-fade-in">
    <div className="flex flex-col lg:flex-row-reverse gap-10">
      <div className="lg:w-2/3 space-y-8">
        <div className="bg-[#050505] rounded-[48px] shadow-2xl border border-white/10 overflow-hidden blueprint-grid relative">
          <div className="absolute top-6 right-6 flex gap-3 z-10">
            <span className="bg-red-600 text-white px-5 py-2 rounded-full text-xs font-black shadow-lg">معاينة هندسية</span>
            <span className="bg-white/10 backdrop-blur-md text-white px-5 py-2 rounded-full text-xs font-black border border-white/10 uppercase tracking-widest">{params.canvasWidthCm}x{params.canvasHeightCm} CM</span>
          </div>
          <div className="flex items-center justify-center p-12 min-h-[550px]">
            {isProcessing ? (
              <div className="text-center space-y-6">
                <div className="w-24 h-24 border-8 border-red-600 border-t-transparent rounded-full animate-spin mx-auto shadow-[0_0_50px_rgba(225,29,72,0.3)]"></div>
                <p className="text-red-500 font-black text-2xl tracking-tighter">جاري المعالجة الرقمية العميقة...</p>
              </div>
            ) : (
              <canvas ref={canvasRef} className="rounded-2xl shadow-[0_0_120px_rgba(225,29,72,0.2)] border border-white/5" />
            )}
          </div>
        </div>

        <div className="bg-white/5 p-10 rounded-[40px] border border-white/10 text-right shadow-2xl">
          <h3 className="font-black text-red-500 mb-6 flex flex-row-reverse items-center gap-3 text-2xl font-cairo">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
            </svg>
            التقرير الفني للذكاء الاصطناعي
          </h3>
          {isAiAnalyzing ? (
            <div className="flex flex-row-reverse items-center gap-4 text-gray-500 py-4">
              <div className="flex space-x-2">
                <div className="h-3 w-3 bg-red-600 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                <div className="h-3 w-3 bg-red-600 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                <div className="h-3 w-3 bg-red-600 rounded-full animate-bounce"></div>
              </div>
              <span className="text-lg font-medium">الذكاء الاصطناعي يحلل التوزيع الآن...</span>
            </div>
          ) : (
            <p className="text-gray-300 leading-relaxed whitespace-pre-line text-lg font-medium">
              {aiReview || 'تم الانتهاء من فحص الشكل هندسياً. التصميم جاهز للتصدير.'}
            </p>
          )}
        </div>
      </div>

      <div className="lg:w-1/3 space-y-8">
        <div className="bg-white/5 p-10 rounded-[40px] border border-white/10 text-right shadow-2xl sticky top-24">
          <h2 className="text-3xl font-black mb-8 font-cairo text-white">تفاصيل المخرج</h2>
          <div className="space-y-6">
            <div className="bg-black/60 p-8 rounded-[32px] border border-white/5 shadow-inner">
              <p className="text-gray-500 font-bold mb-2 uppercase text-xs tracking-widest">إجمالي نقاط الإضاءة</p>
              <div className="flex flex-row-reverse items-center justify-between">
                <span className="text-5xl font-black text-red-600 font-cairo">{result?.ledCount || 0}</span>
                <span className="text-white/30 text-xs font-bold uppercase">Pixels</span>
              </div>
            </div>
            
            <div className="space-y-4 px-2">
              <div className="flex flex-row-reverse justify-between items-center text-lg border-b border-white/5 pb-4">
                <span className="text-gray-400 font-bold">طول المسار الهندسي:</span>
                <span className="text-white font-black">{((result?.ledCount || 0) * params.ledSpacingMm / 10).toFixed(1)} سم</span>
              </div>
              <div className="flex flex-row-reverse justify-between items-center text-lg border-b border-white/5 pb-4">
                <span className="text-gray-400 font-bold">المقاس المحسوب:</span>
                <span className="text-white font-black">{params.canvasWidthCm}x{params.canvasHeightCm} سم</span>
              </div>
            </div>
          </div>

          <button 
            onClick={onPreference}
            className="w-full mt-12 py-7 bg-white text-black hover:bg-gray-200 font-black text-xl rounded-[28px] transition-all shadow-xl flex items-center justify-center gap-4 active:scale-95"
          >
            الاستمرار لتحديد المظهر
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </button>
          <button onClick={onBackToParams} className="w-full mt-6 text-gray-500 hover:text-white transition-colors text-sm font-black uppercase tracking-widest">تعديل البيانات الفنية</button>
        </div>
      </div>
    </div>
  </div>
);

const VisualView = ({ params, onSetOption, onExportStep, canvasRef }: {
  params: DesignParams,
  onSetOption: (opt: ExportOption) => void,
  onExportStep: () => void,
  canvasRef: React.RefObject<HTMLCanvasElement | null>
}) => (
  <div className="max-w-4xl mx-auto py-20 px-6 animate-fade-in text-center">
    <h2 className="text-4xl font-black mb-4 font-cairo text-white">تخصيص العرض</h2>
    <p className="text-gray-500 mb-12 text-lg">اختر العناصر التي ترغب في تضمينها داخل ملف المخرجات النهائي</p>
    
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
      {[
        { id: ExportOption.BOTH, label: 'اللمبات مع الحدود', sub: 'توزيع كامل للمسار والثقوب' },
        { id: ExportOption.LEDS_ONLY, label: 'اللمبات فقط', sub: 'ثقوب الليد فقط بدون الحدود' },
        { id: ExportOption.PATH_ONLY, label: 'الحدود فقط', sub: 'مسار القص CNC بدون الليدات' }
      ].map(opt => (
        <button 
          key={opt.id}
          onClick={() => onSetOption(opt.id)}
          className={`p-10 rounded-[40px] border-4 transition-all flex flex-col items-center gap-4 shadow-2xl relative overflow-hidden group ${params.exportOption === opt.id ? 'bg-red-600 border-red-400 text-white scale-105' : 'bg-white/5 border-white/5 text-gray-400 hover:border-white/20'}`}
        >
          {params.exportOption === opt.id && <div className="absolute top-0 left-0 w-full h-1 bg-white"></div>}
          <span className="font-black text-2xl font-cairo">{opt.label}</span>
          <span className={`text-[11px] font-bold uppercase tracking-widest ${params.exportOption === opt.id ? 'text-red-100' : 'text-gray-600'}`}>{opt.sub}</span>
        </button>
      ))}
    </div>

    <div className="bg-[#050505] rounded-[40px] border border-white/10 p-10 mb-12 shadow-inner inline-block mx-auto blueprint-grid">
      <canvas ref={canvasRef} className="rounded-xl shadow-2xl border border-white/5" />
    </div>

    <div className="flex gap-6 justify-center">
      <button 
        onClick={onExportStep}
        className="btn-red text-white py-6 px-16 rounded-[28px] font-black text-2xl shadow-2xl active:scale-95 flex items-center gap-4"
      >
        الانتقال للتصدير النهائي
        <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M17 8l4 4m0 0l-4 4m4-4H3" />
        </svg>
      </button>
    </div>
  </div>
);

const ExportChoiceView = ({ result, params, onBackToVisual, onStartNew }: {
  result: AnalysisResult | null,
  params: DesignParams,
  onBackToVisual: () => void,
  onStartNew: () => void
}) => (
  <div className="max-w-5xl mx-auto py-20 px-6 animate-fade-in text-center">
    <h2 className="text-5xl font-black mb-6 font-cairo text-white">نوع المخرجات</h2>
    <p className="text-gray-500 mb-16 text-xl">اختر صيغة الملف المناسبة لبرنامج التشغيل أو التصميم الخاص بك</p>
    
    <div className="grid grid-cols-1 md:grid-cols-3 gap-10 mb-20">
      <button 
        onClick={() => result && generatePDF(result.contours, result.ledPoints, params, result.pixelToMm)}
        className="bg-white text-black hover:bg-gray-100 p-12 rounded-[48px] flex flex-col items-center gap-6 transition-all shadow-[0_30px_60px_rgba(255,255,255,0.1)] group active:scale-95"
      >
        <div className="w-24 h-24 bg-red-600 rounded-[28px] flex items-center justify-center group-hover:rotate-6 transition-transform shadow-xl">
          <span className="font-black text-3xl text-white">PDF</span>
        </div>
        <div className="space-y-1">
          <span className="font-black text-2xl block font-cairo uppercase">Adobe Illustrator</span>
          <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Professional Vector Format</span>
        </div>
      </button>

      <button 
        onClick={() => result && downloadFile(generateSVG(result.contours, result.ledPoints, params, result.pixelToMm), 'svg')}
        className="bg-red-600 hover:bg-red-500 text-white p-12 rounded-[48px] flex flex-col items-center gap-6 transition-all shadow-[0_30px_60px_rgba(225,29,72,0.3)] group active:scale-95"
      >
        <div className="w-24 h-24 bg-white rounded-[28px] flex items-center justify-center group-hover:-rotate-6 transition-transform shadow-xl">
          <span className="font-black text-3xl text-black">SVG</span>
        </div>
        <div className="space-y-1">
          <span className="font-black text-2xl block font-cairo uppercase">CorelDraw / Web</span>
          <span className="text-[10px] text-red-100 font-bold uppercase tracking-widest">Scalable Vector Graphics</span>
        </div>
      </button>

      <button 
        onClick={() => result && downloadFile(generateDXF(result.contours, result.ledPoints, params, result.pixelToMm), 'dxf')}
        className="bg-white/5 hover:bg-white/10 text-white p-12 rounded-[48px] flex flex-col items-center gap-6 border border-white/10 transition-all group active:scale-95 shadow-2xl"
      >
        <div className="w-24 h-24 bg-white/10 rounded-[28px] flex items-center justify-center group-hover:scale-110 transition-transform">
          <span className="font-black text-3xl">DXF</span>
        </div>
        <div className="space-y-1">
          <span className="font-black text-2xl block font-cairo uppercase">AutoCAD / CNC</span>
          <span className="text-[10px] text-gray-600 font-bold uppercase tracking-widest">Industry Standard CAD</span>
        </div>
      </button>
    </div>

    <div className="p-10 bg-white/5 rounded-[40px] border border-white/5 max-w-2xl mx-auto shadow-2xl">
      <h3 className="font-black text-red-600 mb-4 text-xl font-cairo">توصيات الإنتاج</h3>
      <p className="text-gray-400 font-medium leading-relaxed">
        يرجى فتح الملف في برنامج التصميم المفضل لديك والتأكد من مطابقة أبعاد الـ Artboard مع المقاسات المحددة في التطبيق ({params.canvasWidthCm}x{params.canvasHeightCm} سم) قبل البدء في عملية الإنتاج.
      </p>
    </div>

    <button onClick={onStartNew} className="mt-16 bg-white/5 hover:bg-white/10 text-white px-10 py-5 rounded-full font-black text-sm transition-all border border-white/5 active:scale-95">العودة للواجهة الرئيسية وإنشاء تصميم جديد</button>
  </div>
);

const HistoryView = ({ history, onLoad, onBack }: { 
  history: HistoryItem[], 
  onLoad: (item: HistoryItem) => void, 
  onBack: () => void 
}) => (
  <div className="max-w-5xl mx-auto py-20 px-6 animate-fade-in">
    <div className="flex flex-row-reverse justify-between items-center mb-12">
      <h2 className="text-4xl font-black font-cairo text-white border-r-8 border-red-600 pr-6">سجل العمليات السابقة</h2>
      <button onClick={onBack} className="text-gray-400 hover:text-white font-bold transition-colors">العودة</button>
    </div>

    {history.length === 0 ? (
      <div className="text-center py-20 bg-white/5 rounded-[40px] border border-white/10">
        <p className="text-gray-500 text-xl">لا توجد عمليات مسجلة حالياً</p>
      </div>
    ) : (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {history.sort((a,b) => b.timestamp - a.timestamp).map(item => (
          <div 
            key={item.id} 
            className="bg-white/5 border border-white/10 rounded-[32px] overflow-hidden group hover:border-red-600/50 transition-all cursor-pointer flex flex-col"
            onClick={() => onLoad(item)}
          >
            <div className="aspect-video bg-black overflow-hidden relative">
              <img src={item.imagePreview} className="w-full h-full object-cover opacity-50 group-hover:opacity-100 transition-opacity" />
              <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent"></div>
              <div className="absolute bottom-4 right-4 text-right">
                <p className="text-white font-black text-lg">{item.params.canvasWidthCm}x{item.params.canvasHeightCm} سم</p>
                <p className="text-red-500 text-xs font-bold">{new Date(item.timestamp).toLocaleDateString('ar-EG')}</p>
              </div>
            </div>
            <div className="p-6 flex flex-row-reverse justify-between items-center bg-white/5">
              <div className="text-right">
                <span className="text-gray-400 text-[10px] font-bold block uppercase">LED Count</span>
                <span className="text-white font-black text-xl">{item.result.ledCount}</span>
              </div>
              <button className="bg-red-600 text-white px-4 py-2 rounded-xl text-xs font-black shadow-lg">تحميل</button>
            </div>
          </div>
        ))}
      </div>
    )}
  </div>
);

// --- Main App Component ---

const App: React.FC = () => {
  const [step, setStep] = useState<AppStep>(AppStep.WELCOME);
  const [image, setImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isAiAnalyzing, setIsAiAnalyzing] = useState(false);
  const [params, setParams] = useState<DesignParams>({
    canvasWidthCm: 100,
    canvasHeightCm: 50,
    ledDiameterMm: 8,
    ledSpacingMm: 15,
    placement: PlacementType.OUTLINE,
    threshold: 128,
    exportOption: ExportOption.BOTH
  });
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [aiReview, setAiReview] = useState<string>('');
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem('led_cad_history');
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load history", e);
      }
    }
  }, []);

  const saveToHistory = (res: AnalysisResult, p: DesignParams, img: string) => {
    const newItem: HistoryItem = {
      id: Date.now().toString(),
      timestamp: Date.now(),
      params: { ...p },
      result: { ...res },
      imagePreview: img
    };
    const updated = [newItem, ...history].slice(0, 12); 
    setHistory(updated);
    localStorage.setItem('led_cad_history', JSON.stringify(updated));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setImage(reader.result as string);
        setStep(AppStep.PARAMS);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleProcess = async () => {
    if (!image) return;
    setIsProcessing(true);
    setStep(AppStep.RESULT_DETAILS);
    
    try {
      const analysis = await processDesign(image, params);
      setResult(analysis);
      setIsProcessing(false);
      saveToHistory(analysis, params, image);

      setIsAiAnalyzing(true);
      analyzeDesignWithAI(image, params).then((aiFeedback) => {
        setAiReview(aiFeedback || '');
        setIsAiAnalyzing(false);
      }).catch(err => {
        console.error(err);
        setAiReview('عذراً، فشل التحليل الذكي.');
        setIsAiAnalyzing(false);
      });
    } catch (err) {
      alert("خطأ في المعالجة: " + err);
      setIsProcessing(false);
      setStep(AppStep.PARAMS);
    }
  };

  const handleInputChange = (key: keyof DesignParams, value: string) => {
    if (key === 'placement') {
      setParams(prev => ({ ...prev, placement: value as PlacementType }));
      return;
    }
    const numValue = value === '' ? 0 : Number(value);
    setParams(prev => ({ ...prev, [key]: numValue }));
  };

  const handleLoadHistoryItem = (item: HistoryItem) => {
    setImage(item.imagePreview);
    setParams({ ...item.params });
    setResult({ ...item.result });
    setAiReview('تم تحميل التقرير من السجل.');
    setStep(AppStep.RESULT_DETAILS);
  };

  useEffect(() => {
    if ((step === AppStep.RESULT_DETAILS || step === AppStep.VISUAL_PREFERENCE) && result && canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (!ctx) return;
      const canvas = canvasRef.current;
      const containerWidth = Math.min(window.innerWidth - 40, 800);
      canvas.width = containerWidth;
      canvas.height = canvas.width * (params.canvasHeightCm / params.canvasWidthCm);
      
      ctx.fillStyle = '#050505';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      const scale = Math.min(canvas.width / result.processedWidth, canvas.height / result.processedHeight);
      ctx.save();
      ctx.translate((canvas.width - result.processedWidth * scale) / 2, (canvas.height - result.processedHeight * scale) / 2);
      ctx.scale(scale, scale);
      
      if (params.exportOption !== ExportOption.LEDS_ONLY) {
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5 / scale;
        result.contours.forEach(c => {
          ctx.beginPath();
          c.points.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
          ctx.closePath();
          ctx.stroke();
        });
      }
      
      if (params.exportOption !== ExportOption.PATH_ONLY) {
        const r = (params.ledDiameterMm / 2) / result.pixelToMm;
        ctx.fillStyle = '#e11d48';
        result.ledPoints.forEach(p => {
          ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2); ctx.fill();
        });
      }
      ctx.restore();
    }
  }, [step, result, params.exportOption, params.ledDiameterMm, params.canvasHeightCm, params.canvasWidthCm]);

  return (
    <div className="min-h-screen bg-black text-white font-tajawal selection:bg-red-600 selection:text-white">
      {/* Dynamic Header */}
      {step !== AppStep.WELCOME && (
        <nav className="px-10 py-6 border-b border-white/5 flex flex-row-reverse justify-between items-center glass-card sticky top-0 z-50">
          <div className="flex flex-row-reverse items-center gap-5">
            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center border-2 border-red-600 shadow-lg">
              <span className="text-black font-black text-lg font-cairo tracking-tighter">LED</span>
            </div>
            <h1 className="font-black text-2xl font-cairo tracking-tight">LED CAD PRO</h1>
          </div>
          <div className="hidden md:flex flex-row-reverse items-center gap-4">
            {[1,2,3,4,5,6].map(i => (
              <div key={i} className={`h-1.5 w-12 rounded-full transition-all duration-500 ${step >= i ? 'bg-red-600 shadow-[0_0_15px_rgba(225,29,72,0.8)]' : 'bg-white/10'}`}></div>
            ))}
          </div>
          <button onClick={() => setStep(AppStep.WELCOME)} className="text-sm font-black text-red-600 hover:text-red-500 bg-red-600/5 px-6 py-3 rounded-full border border-red-600/20 transition-all">إلغاء العملية</button>
        </nav>
      )}

      {/* Main Content Area */}
      <div className="container mx-auto">
        {step === AppStep.WELCOME && <WelcomeView onStart={() => setStep(AppStep.UPLOAD)} onHistory={() => setStep(AppStep.HISTORY)} />}
        {step === AppStep.UPLOAD && <UploadView onFileChange={handleFileChange} onBack={() => setStep(AppStep.WELCOME)} />}
        {step === AppStep.PARAMS && <ParamsView params={params} onInputChange={handleInputChange} onProcess={handleProcess} onBackToUpload={() => setStep(AppStep.UPLOAD)} image={image} />}
        {step === AppStep.RESULT_DETAILS && <ResultView isProcessing={isProcessing} isAiAnalyzing={isAiAnalyzing} result={result} aiReview={aiReview} params={params} onPreference={() => setStep(AppStep.VISUAL_PREFERENCE)} onBackToParams={() => setStep(AppStep.PARAMS)} canvasRef={canvasRef} />}
        {step === AppStep.VISUAL_PREFERENCE && <VisualView params={params} onSetOption={(opt) => setParams(p => ({ ...p, exportOption: opt }))} onExportStep={() => setStep(AppStep.EXPORT_CHOICE)} canvasRef={canvasRef} />}
        {step === AppStep.EXPORT_CHOICE && <ExportChoiceView result={result} params={params} onBackToVisual={() => setStep(AppStep.VISUAL_PREFERENCE)} onStartNew={() => setStep(AppStep.WELCOME)} />}
        {step === AppStep.HISTORY && <HistoryView history={history} onLoad={handleLoadHistoryItem} onBack={() => setStep(AppStep.WELCOME)} />}
      </div>

      {/* Modern Footer */}
      <footer className="mt-24 pb-12 text-center">
        <div className="max-w-3xl mx-auto border-t border-white/10 pt-12 px-6">
          <div className="flex justify-center items-center mb-10">
            <div className="text-center">
              <span className="text-[10px] font-black text-red-600 block uppercase tracking-widest mb-1">Developer</span>
              <p className="text-white font-black text-2xl font-cairo">Maher AlOmessi</p>
            </div>
          </div>
          
          <div className="flex justify-center gap-8 mb-4 text-[9px] font-black uppercase tracking-[0.3em] text-white/30">
            <span>Precision</span>
            <span>Efficiency</span>
            <span>Intelligence</span>
          </div>
          <p className="text-[10px] font-medium tracking-widest uppercase text-white/20">
            © 2025 LED CAD DESIGNER PROFESSIONAL - VERSION 3.1 PRO SERIES
          </p>
        </div>
      </footer>
    </div>
  );
};

export default App;
