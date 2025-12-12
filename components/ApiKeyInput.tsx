import React, { useState } from 'react';
import { Key, X } from 'lucide-react';

interface Props {
  onSubmit: (key: string) => void;
  onClose?: () => void;
  hasExistingKey: boolean;
}

export const ApiKeyInput: React.FC<Props> = ({ onSubmit, onClose, hasExistingKey }) => {
  const [key, setKey] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!key.trim()) return;
    setLoading(true);
    await onSubmit(key);
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
              {hasExistingKey ? '更换访问密钥' : '设置访问密钥'}
          </h2>
          <p className="text-gray-400 text-center text-sm">
            {hasExistingKey 
                ? '输入新的密钥以替换当前密钥。' 
                : '请输入您的 Google Gemini API 密钥以继续。'}
          </p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="password"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="AIzaSy..."
              className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
              required
            />
          </div>
          <div className="flex gap-3">
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
                disabled={loading}
                className="flex-1 bg-gradient-to-r from-primary to-accent hover:from-primaryHover hover:to-accent text-white font-medium py-3 rounded-lg transition-all transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  '保存设置'
                )}
              </button>
          </div>
        </form>
        <div className="mt-6 text-center">
            <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-xs text-gray-500 hover:text-primary transition-colors">
                获取 Google AI Studio API 密钥
            </a>
        </div>
      </div>
    </div>
  );
};