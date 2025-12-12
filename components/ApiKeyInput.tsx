import React, { useState, useEffect } from 'react';
import { Key, X, Info, Globe } from 'lucide-react';

interface Props {
  onSubmit: (keys: string[], baseUrl?: string) => void;
  onClose?: () => void;
  hasExistingKey: boolean;
}

export const ApiKeyInput: React.FC<Props> = ({ onSubmit, onClose, hasExistingKey }) => {
  const [inputVal, setInputVal] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const storedBaseUrl = localStorage.getItem('gemini_api_base_url');
    if (storedBaseUrl) setBaseUrl(storedBaseUrl);
    
    // Pre-fill keys if they exist in localStorage for editing convenience (optional, but good UX)
    // For security we might skip this, but user asked for convenience. 
    // Let's just handle base url pre-fill.
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const keys = inputVal
      .split('\n')
      .map(k => k.trim())
      .filter(k => k.length > 0);

    if (keys.length === 0) return;
    
    setLoading(true);
    await onSubmit(keys, baseUrl.trim() || undefined);
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-surface border border-white/10 rounded-2xl p-8 shadow-2xl relative">
        {hasExistingKey && onClose && (
            <button 
                onClick={onClose}
                className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors"
            >
                <X size={20} />
            </button>
        )}
        
        <div className="flex flex-col items-center gap-4 mb-6">
          <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center text-primary">
            <Key size={24} />
          </div>
          <h2 className="text-2xl font-bold text-white">
              API 设置
          </h2>
          <p className="text-gray-400 text-center text-sm">
            配置 Gemini API 密钥与中转服务地址。
          </p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <div className="flex justify-between text-xs text-gray-500 mb-2">
                <span>输入 Google Gemini API Key (一行一个)</span>
                <span>{inputVal.split('\n').filter(k=>k.trim()).length} 个密钥</span>
            </div>
            <textarea
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              placeholder={`AIzaSy...\nAIzaSy...`}
              className="w-full h-24 bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-mono text-xs resize-none"
              required
            />
          </div>

          <div>
             <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                <Globe size={12} />
                <span>API Base URL / 中转接口 (可选)</span>
             </div>
             <input
                type="text"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                placeholder="https://generativelanguage.googleapis.com"
                className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-mono text-xs"
             />
             <p className="text-[10px] text-gray-500 mt-1.5 ml-1">
                如果您使用第三方中转服务或反代，请在此填入地址。留空则使用官方默认地址。
             </p>
          </div>
          
          <div className="bg-primary/10 border border-primary/20 rounded p-3 flex gap-2 items-start">
             <Info size={14} className="text-primary mt-0.5 flex-shrink-0" />
             <p className="text-[10px] text-gray-300 leading-tight">
                提示：为了获得最快的生成速度，建议填入多个 Key。系统将自动开启高并发模式。
             </p>
          </div>

          <div className="flex gap-3 mt-4">
             {hasExistingKey && onClose && (
                 <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 bg-surfaceHighlight hover:bg-white/10 text-white font-medium py-3 rounded-lg transition-all"
                 >
                    取消
                 </button>
             )}
             <button
                type="submit"
                disabled={loading || !inputVal.trim()}
                className="flex-1 bg-gradient-to-r from-primary to-accent hover:from-primaryHover hover:to-accent text-white font-medium py-3 rounded-lg transition-all transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  '保存配置'
                )}
              </button>
          </div>
        </form>
      </div>
    </div>
  );
};