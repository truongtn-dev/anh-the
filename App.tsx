import React, { useState, useMemo, useEffect } from 'react';
import { Header } from './components/Header';
import { PhotoUploader } from './components/PhotoUploader';
import { OptionSelector } from './components/OptionSelector';
import { ResultView } from './components/ResultView';
import { Loader } from './components/Loader';
import { BACKGROUNDS, OUTFITS, GENDERS, HAIRSTYLES, ASPECT_RATIOS, RETOUCH_OPTIONS, COUNTRY_TEMPLATES, DOCUMENT_TYPES, LIGHTING_OPTIONS } from './constants';
import type { Background, Outfit, GenderOption, Hairstyle, AspectRatio, RetouchOption, CountryTemplate, ImageAnalysisResult, DocumentType, LightingOption } from './types';
import { generateIdPhoto, analyzeImage } from './services/geminiService';
import { ImageAnalysisFeedback } from './components/ImageAnalysisFeedback';
import { GlobeIcon } from './components/icons/GlobeIcon';
import { CollapsibleSection } from './components/CollapsibleSection';

export default function App() {
  const [uploadedImage, setUploadedImage] = useState<File | null>(null);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  // Controls State
  const [selectedCountryTemplate, setSelectedCountryTemplate] = useState<CountryTemplate>(COUNTRY_TEMPLATES[0]);
  const [selectedBackground, setSelectedBackground] = useState<Background>(BACKGROUNDS[0]);
  const [selectedGender, setSelectedGender] = useState<GenderOption>(GENDERS[0]);
  const [selectedDocumentType, setSelectedDocumentType] = useState<DocumentType>(DOCUMENT_TYPES[0]);
  const [selectedLighting, setSelectedLighting] = useState<LightingOption>(LIGHTING_OPTIONS[0]);
  const [selectedAspectRatio, setSelectedAspectRatio] = useState<AspectRatio>(ASPECT_RATIOS[0]);
  const [selectedRetouch, setSelectedRetouch] = useState<RetouchOption>(RETOUCH_OPTIONS[1]);
  const [customPrompt, setCustomPrompt] = useState<string>('');
  const [customBackgroundColor, setCustomBackgroundColor] = useState<string>('#4a90e2');


  // Image Analysis State
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analysisResult, setAnalysisResult] = useState<ImageAnalysisResult | null>(null);
  
  // Memoized values for dynamic options and previews
  const filteredOutfits = useMemo(() => {
    const genderFiltered = OUTFITS.filter(outfit => outfit.gender === selectedGender.name);
    
    if (selectedDocumentType.id === 'all') {
      return genderFiltered.map(o => ({ ...o, isRecommended: false }));
    }

    const recommended = genderFiltered
      .filter(o => o.documentTypes?.includes(selectedDocumentType.id))
      .map(o => ({ ...o, isRecommended: true }));
    
    const others = genderFiltered
      .filter(o => !o.documentTypes?.includes(selectedDocumentType.id))
      .map(o => ({ ...o, isRecommended: false }));
      
    return [...recommended, ...others];
  }, [selectedGender, selectedDocumentType]);
  
  const filteredHairstyles = useMemo(() => HAIRSTYLES.filter(style => !style.gender || style.gender === selectedGender.name), [selectedGender]);
  
  const [selectedOutfit, setSelectedOutfit] = useState<Outfit>(filteredOutfits[0]);
  const [selectedHairstyle, setSelectedHairstyle] = useState<Hairstyle>(filteredHairstyles[0]);
  
  const uploadedImagePreview = useMemo(() => {
    if (!uploadedImage) return null;
    return URL.createObjectURL(uploadedImage);
  }, [uploadedImage]);

  // Effect for Country Template Selection
  useEffect(() => {
    if (selectedCountryTemplate.id === 'custom') return;

    const templateBg = BACKGROUNDS.find(b => b.id === selectedCountryTemplate.backgroundId);
    const templateAr = ASPECT_RATIOS.find(a => a.id === selectedCountryTemplate.aspectRatioId);

    if (templateBg) setSelectedBackground(templateBg);
    if (templateAr) setSelectedAspectRatio(templateAr);

  }, [selectedCountryTemplate]);

  // Effect for Gender Change
  useEffect(() => {
    const isCurrentOutfitValid = filteredOutfits.some(o => o.id === selectedOutfit.id);
    if (!isCurrentOutfitValid && filteredOutfits.length > 0) {
      setSelectedOutfit(filteredOutfits[0]);
    }
    const isCurrentHairstyleValid = filteredHairstyles.some(h => h.id === selectedHairstyle.id);
    if (!isCurrentHairstyleValid && filteredHairstyles.length > 0) {
      setSelectedHairstyle(filteredHairstyles.find(h => h.id === 'none') || filteredHairstyles[0]);
    }
  }, [selectedGender, selectedOutfit.id, selectedHairstyle.id, filteredOutfits, filteredHairstyles]);

  // Effect for Image Upload and Analysis
  useEffect(() => {
    if (!uploadedImage) {
        setAnalysisResult(null);
        return;
    }
    const performAnalysis = async () => {
        setIsAnalyzing(true);
        setAnalysisResult(null);
        try {
            const result = await analyzeImage(uploadedImage);
            setAnalysisResult(result);
            if (result.gender) {
                const detectedGender = GENDERS.find(g => g.name === result.gender);
                if (detectedGender) {
                    setSelectedGender(detectedGender);
                }
            }
        } catch (e) {
            console.error("Image analysis failed:", e);
            // Optionally set some error state here
        } finally {
            setIsAnalyzing(false);
        }
    };
    performAnalysis();
  }, [uploadedImage]);


  const handleGenerateClick = async () => {
    if (!uploadedImage) {
      setError('Vui lòng tải ảnh lên trước.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setGeneratedImage(null);

    const backgroundColor = selectedBackground.id === 'custom-color' 
        ? customBackgroundColor 
        : selectedBackground.name;

    try {
      const result = await generateIdPhoto(
        uploadedImage,
        backgroundColor,
        selectedOutfit.name,
        selectedGender.name,
        selectedHairstyle.name,
        selectedAspectRatio.name,
        selectedRetouch.name,
        selectedLighting.name,
        customPrompt
      );
      if (result.image) {
        setGeneratedImage(result.image);
      } else {
        setError(result.text || 'Không thể tạo ảnh. Yêu cầu của bạn có thể đã bị AI từ chối.');
      }
    } catch (e: unknown) {
      console.error(e);
      setError(e instanceof Error ? e.message : 'Đã xảy ra lỗi không mong muốn.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setUploadedImage(null);
    setGeneratedImage(null);
    setError(null);
    setIsLoading(false);
    setAnalysisResult(null);
    setIsAnalyzing(false);
    setSelectedCountryTemplate(COUNTRY_TEMPLATES[0]);
    setSelectedBackground(BACKGROUNDS[0]);
    setSelectedGender(GENDERS[0]);
    setSelectedDocumentType(DOCUMENT_TYPES[0]);
    setSelectedLighting(LIGHTING_OPTIONS[0]);
    const defaultFemaleOutfit = OUTFITS.find(o => o.gender === 'Nữ');
    if (defaultFemaleOutfit) setSelectedOutfit(defaultFemaleOutfit);
    setSelectedHairstyle(HAIRSTYLES[0]);
    setSelectedAspectRatio(ASPECT_RATIOS[0]);
    setSelectedRetouch(RETOUCH_OPTIONS[1]);
    setCustomPrompt('');
  };

  const isGenerateDisabled = !uploadedImage || isLoading || isAnalyzing;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <Header />
      <main className="container mx-auto px-4 py-8 sm:py-12">
        <div className="max-w-7xl mx-auto bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="p-6 sm:p-10">
            <div className="text-center mb-8 sm:mb-10">
                <h2 className="text-3xl sm:text-4xl font-bold text-slate-800">Ảnh Thẻ Chuyên Nghiệp Trong Vài Giây</h2>
                <p className="mt-3 text-base sm:text-lg text-slate-500 max-w-2xl mx-auto">Sử dụng AI để tạo ảnh thẻ đáp ứng mọi tiêu chuẩn chỉ với vài cú nhấp chuột.</p>
            </div>
            
            <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-start">
              {/* Left Column: Controls */}
              <div className="space-y-10">
                <div id="step1">
                  <h3 className="text-xl font-semibold text-slate-900 mb-2 flex items-center">
                    <span className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-600 text-white font-bold mr-4 text-base">1</span>
                    Tải ảnh chân dung
                  </h3>
                  <p className="text-slate-500 mb-4 ml-12">Để có kết quả tốt nhất, hãy sử dụng ảnh chụp chính diện, đủ sáng.</p>
                  <div className="ml-12">
                    <PhotoUploader onImageUpload={setUploadedImage} previewUrl={uploadedImagePreview} />
                    {(isAnalyzing || analysisResult) && (
                        <ImageAnalysisFeedback result={analysisResult} isLoading={isAnalyzing} />
                    )}
                  </div>
                </div>
                
                <div id="step2">
                  <h3 className="text-xl font-semibold text-slate-900 mb-2 flex items-center">
                    <span className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-600 text-white font-bold mr-4 text-base">2</span>
                    Tùy chỉnh thông minh
                  </h3>
                   <p className="text-slate-500 mb-4 ml-12">Chọn mẫu có sẵn hoặc tùy chỉnh theo ý muốn của bạn.</p>
                  <div className="space-y-4 ml-12">
                     <OptionSelector<CountryTemplate>
                      label="Mẫu theo quốc gia"
                      options={COUNTRY_TEMPLATES}
                      selectedOption={selectedCountryTemplate}
                      onSelect={setSelectedCountryTemplate}
                      renderOption={(option) => (
                        <div className="flex items-center">
                          <GlobeIcon className="w-5 h-5 mr-3 text-slate-500" />
                          <span className="text-sm font-medium">{option.name}</span>
                        </div>
                      )}
                    />

                    <CollapsibleSection title="Thiết lập ảnh" defaultOpen={true}>
                      <div>
                        <OptionSelector<Background>
                          label="Màu nền"
                          options={BACKGROUNDS}
                          selectedOption={selectedBackground}
                          onSelect={setSelectedBackground}
                          disabled={selectedCountryTemplate.id !== 'custom'}
                          renderOption={(option) => (
                            <div className="flex items-center">
                              {option.id === 'custom-color' ? (
                                <div className="w-6 h-6 rounded-full border border-slate-300 mr-3" style={{ backgroundColor: customBackgroundColor }}></div>
                              ) : (
                                <div className={`w-6 h-6 rounded-full border border-slate-300 ${option.tailwindColor} mr-3`}></div>
                              )}
                              <span className="text-sm font-medium">{option.name}</span>
                            </div>
                          )}
                        />
                        {selectedBackground.id === 'custom-color' && selectedCountryTemplate.id === 'custom' && (
                          <div className="mt-3 flex items-center gap-3">
                              <label htmlFor="custom-bg-color" className="text-sm font-medium text-slate-700">Màu tùy chọn:</label>
                              <div className="relative w-8 h-8 rounded-md border border-slate-300 overflow-hidden shadow-inner">
                                  <div className="absolute inset-0" style={{ backgroundColor: customBackgroundColor }}></div>
                                  <input
                                  type="color"
                                  id="custom-bg-color"
                                  value={customBackgroundColor}
                                  onChange={(e) => setCustomBackgroundColor(e.target.value)}
                                  className="absolute inset-0 w-full h-full cursor-pointer opacity-0"
                                  aria-label="Chọn màu nền tùy chỉnh"
                                  />
                              </div>
                              <span className="font-mono text-sm bg-slate-100 text-slate-600 px-2 py-1 rounded-md">{customBackgroundColor.toUpperCase()}</span>
                          </div>
                        )}
                      </div>
                      <OptionSelector<AspectRatio>
                        label="Tỷ lệ ảnh"
                        options={ASPECT_RATIOS}
                        selectedOption={selectedAspectRatio}
                        onSelect={setSelectedAspectRatio}
                        disabled={selectedCountryTemplate.id !== 'custom'}
                        renderOption={(option) => <span className="text-sm font-medium">{option.name}</span>}
                      />
                    </CollapsibleSection>
                    
                    <CollapsibleSection title="Tùy chỉnh ngoại hình" defaultOpen={true}>
                        <OptionSelector<GenderOption>
                          label="Giới tính"
                          options={GENDERS}
                          selectedOption={selectedGender}
                          onSelect={setSelectedGender}
                          renderOption={(option) => <span className="text-sm font-medium">{option.name}</span>}
                        />
                        <OptionSelector<DocumentType>
                          label="Loại giấy tờ (để gợi ý trang phục)"
                          options={DOCUMENT_TYPES}
                          selectedOption={selectedDocumentType}
                          onSelect={setSelectedDocumentType}
                          renderOption={(option) => <span className="text-sm font-medium">{option.name}</span>}
                        />
                        <OptionSelector<Outfit>
                          label="Trang phục"
                          options={filteredOutfits}
                          selectedOption={selectedOutfit}
                          onSelect={setSelectedOutfit}
                          renderOption={(option) => (
                            <div className="flex items-center">
                              <img src={option.previewUrl} alt={option.name} className="w-8 h-8 rounded-md object-cover mr-3" />
                              <div className='flex-grow'>
                                <span className="text-sm font-medium">{option.name}</span>
                              </div>
                              {option.isRecommended && <span className="ml-2 text-xs bg-green-100 text-green-800 font-semibold px-2 py-0.5 rounded-full">Gợi ý</span>}
                            </div>
                          )}
                        />
                        <OptionSelector<Hairstyle>
                          label="Kiểu tóc"
                          options={filteredHairstyles}
                          selectedOption={selectedHairstyle}
                          onSelect={setSelectedHairstyle}
                          renderOption={(option) => (
                            <div className="flex items-center">
                              <img src={option.previewUrl} alt={option.name} className="w-8 h-8 rounded-md object-cover mr-3" />
                              <span className="text-sm font-medium">{option.name}</span>
                            </div>
                          )}
                        />
                    </CollapsibleSection>
                    
                    <CollapsibleSection title="Chỉnh sửa nâng cao" defaultOpen={false}>
                      <OptionSelector<LightingOption>
                          label="Chỉnh sửa ánh sáng"
                          options={LIGHTING_OPTIONS}
                          selectedOption={selectedLighting}
                          onSelect={setSelectedLighting}
                          renderOption={(option) => (
                             <div>
                                <span className="text-sm font-medium">{option.name}</span>
                                {option.id === 'on' && <p className="text-xs text-slate-500 mt-1 pr-5">Tự động cân bằng ánh sáng, xóa bóng gắt trên mặt.</p>}
                            </div>
                          )}
                      />
                      <OptionSelector<RetouchOption>
                          label="Chỉnh sửa da"
                          options={RETOUCH_OPTIONS}
                          selectedOption={selectedRetouch}
                          onSelect={setSelectedRetouch}
                          renderOption={(option) => (
                            <div>
                                <span className="text-sm font-medium">{option.name}</span>
                                <p className="text-xs text-slate-500 mt-1 pr-5">{option.description}</p>
                            </div>
                          )}
                      />
                    </CollapsibleSection>
                  </div>
                </div>

              </div>

              {/* Right Column: Output */}
              <div className="sticky top-8">
                 <div className="bg-slate-100 rounded-xl p-4">
                     <h3 className="text-xl font-semibold text-slate-900 mb-4 text-center">
                       {generatedImage ? 'So sánh kết quả' : isLoading ? 'AI đang sáng tạo...' : 'Xem trước kết quả'}
                    </h3>
                    <div className="aspect-[3/4] relative">
                      {isLoading && <Loader />}
                      {!isLoading && generatedImage && uploadedImagePreview && (
                        <ResultView originalImageUrl={uploadedImagePreview} generatedImageUrl={generatedImage} onReset={handleReset} />
                      )}
                      {!isLoading && !generatedImage && (
                        <div className="flex flex-col items-center justify-center h-full border-2 border-dashed border-slate-300 rounded-lg bg-white p-4">
                           <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <p className="mt-4 text-base font-semibold text-slate-500">Kết quả của bạn sẽ xuất hiện ở đây</p>
                            <p className="mt-1 text-sm text-slate-400">Hoàn tất các bước để bắt đầu tạo ảnh.</p>
                        </div>
                      )}
                    </div>
                 </div>
                 <div className="mt-6">
                    <label htmlFor="custom-prompt" className="block text-sm font-medium text-slate-700 mb-2">Yêu cầu thêm (tùy chọn)</label>
                    <textarea
                        id="custom-prompt"
                        value={customPrompt}
                        onChange={(e) => setCustomPrompt(e.target.value)}
                        placeholder="Ví dụ: làm cho tóc gọn gàng hơn, xóa kính..."
                        className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-500 transition-all duration-200 bg-white"
                        rows={2}
                    />
                 </div>
                 <div className="mt-4">
                    <button
                        onClick={handleGenerateClick}
                        disabled={isGenerateDisabled}
                        className="w-full bg-blue-600 text-white font-bold py-4 px-4 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-blue-300 disabled:cursor-not-allowed flex items-center justify-center text-lg shadow-lg shadow-blue-500/30"
                      >
                        {isLoading ? 'Đang xử lý...' : 'Tạo ảnh ngay'}
                      </button>
                    {error && (
                      <div className="mt-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg text-sm" role="alert">
                        <p className="font-bold">Đã xảy ra lỗi</p>
                        <p>{error}</p>
                      </div>
                    )}
                 </div>
              </div>
            </div>
          </div>
        </div>
        <footer className="text-center mt-10 text-slate-500 text-sm">
          <p>Cung cấp bởi Google Gemini. Ảnh được xử lý bằng AI và có thể không phải lúc nào cũng hoàn hảo.</p>
        </footer>
      </main>
    </div>
  );
}
