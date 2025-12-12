import React, { useState, useEffect } from 'react';
import { initGemini, validateApiKey, planStoryboard, generateShotImage, editShotImage } from './services/geminiService';
import { ApiKeyInput } from './components/ApiKeyInput';
import { LeftSidebar } from './components/LeftSidebar';
import { RightSidebar } from './components/RightSidebar';
import { ShotCard } from './components/ShotCard';
import { EditShotModal } from './components/EditShotModal';
import { Asset, Shot, AspectRatio, GridSize, QualityLevel } from './types';
import { Layout, Download, Grid, Settings, Key, Menu } from 'lucide-react';

const App: React.FC = () => {
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [assets, setAssets] = useState<Asset[]>([]);
  
  // State
  const [shots, setShots] = useState<Shot[]>([]);
  const [prompt, setPrompt] = useState('');
  const [gridSize, setGridSize] = useState<GridSize>(2); 
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('16:9');
  const [quality, setQuality] = useState<QualityLevel>('standard');
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [editingShot, setEditingShot] = useState<Shot | null>(null);
  const [selectedShotId, setSelectedShotId] = useState<string | null>(null);

  // Initialize API from localStorage if available
  useEffect(() => {
    const storedKey = localStorage.getItem('gemini_api_key');
    if (storedKey) {
      handleApiKeySubmit(storedKey, true); // initial load
    } else {
      setShowKeyModal(true);
    }
  }, []);

  const handleApiKeySubmit = async (key: string, isInitial = false) => {
    const isValid = await validateApiKey(key);
    if (isValid) {
      setApiKey(key);
      localStorage.setItem('gemini_api_key', key);
      initGemini(key);
      setShowKeyModal(false);
    } else {
      alert('API 密钥无效');
      // If it's not initial load (user trying to change key), don't wipe existing valid key unless necessary
      // But here we enforce valid key.
      if (isInitial || !apiKey) {
        localStorage.removeItem('gemini_api_key');
      }
    }
  };

  const handleChangeKey = () => {
      setShowKeyModal(true);
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setIsGenerating(true);
    setSelectedShotId(null);

    try {
      setShots([]); 

      const totalShots = gridSize * gridSize;
      const placeholderShots: Shot[] = Array.from({ length: totalShots }).map(() => ({
        id: crypto.randomUUID(),
        description: "规划分镜中...",
        isGenerating: true,
        aspectRatio,
        shotType: 'Planning'
      }));
      setShots(placeholderShots);

      const plannedShotsData = await planStoryboard(prompt, gridSize, assets);

      const plannedShots: Shot[] = plannedShotsData.map((s, idx) => ({
        ...s,
        id: placeholderShots[idx]?.id || crypto.randomUUID(),
        aspectRatio
      }));
      setShots(plannedShots);

      // Select the first shot by default once planned
      if (plannedShots.length > 0) {
        setSelectedShotId(plannedShots[0].id);
      }

      const updatedShots = [...plannedShots];
      await Promise.all(
        plannedShots.map(async (shot, index) => {
          try {
            const imageUrl = await generateShotImage(shot, assets, quality, false);
            updatedShots[index] = { ...shot, imageUrl, isGenerating: false };
            setShots([...updatedShots]);
          } catch (error) {
            console.error(`Error generating shot ${index}:`, error);
            updatedShots[index] = { ...shot, isGenerating: false, error: "生成失败" };
            setShots([...updatedShots]);
          }
        })
      );

    } catch (error) {
      console.error("Storyboard generation failed", error);
      alert("生成分镜失败，请重试。");
      setShots([]);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRegenerateShot = async (id: string) => {
    const shotIndex = shots.findIndex(s => s.id === id);
    if (shotIndex === -1) return;

    const shot = shots[shotIndex];
    const newShots = [...shots];
    newShots[shotIndex] = { ...shot, isGenerating: true, error: undefined };
    setShots(newShots);

    try {
      // Pass isRegeneration = true to force variety
      const imageUrl = await generateShotImage(shot, assets, quality, true);
      newShots[shotIndex] = { ...shot, imageUrl, isGenerating: false };
      setShots([...newShots]);
    } catch (e) {
      newShots[shotIndex] = { ...shot, isGenerating: false, error: "重试失败" };
      setShots([...newShots]);
    }
  };

  const handleApplyEdit = async (shotId: string, instruction: string) => {
    const shotIndex = shots.findIndex(s => s.id === shotId);
    if (shotIndex === -1) return;

    const shot = shots[shotIndex];
    if (!shot.imageUrl) return;

    const newShots = [...shots];
    newShots[shotIndex] = { ...shot, isGenerating: true };
    setShots(newShots);

    try {
      const editedUrl = await editShotImage(shot.imageUrl, instruction);
      newShots[shotIndex] = { ...shot, imageUrl: editedUrl, isGenerating: false };
      setShots([...newShots]);
    } catch (e) {
        console.error(e);
        newShots[shotIndex] = { ...shot, isGenerating: false, error: "编辑失败" };
        setShots([...newShots]);
    }
  };

  const handleDeleteShot = (id: string) => {
    setShots(shots.filter(s => s.id !== id));
    if (selectedShotId === id) setSelectedShotId(null);
  };

  const selectedShot = shots.find(s => s.id === selectedShotId) || null;

  return (
    <div className="flex h-screen bg-background text-white overflow-hidden font-sans">
      <LeftSidebar 
        prompt={prompt}
        setPrompt={setPrompt}
        onGenerate={handleGenerate}
        isGenerating={isGenerating}
        gridSize={gridSize}
        setGridSize={setGridSize}
        aspectRatio={aspectRatio}
        setAspectRatio={setAspectRatio}
        quality={quality}
        setQuality={setQuality}
        assets={assets}
        onAddAsset={(a) => setAssets([...assets, a])}
      />

      <div className="flex-1 flex flex-col h-full overflow-hidden bg-black/50 relative">
        {/* Canvas Header */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-white/5 bg-[#09090b]">
           <div className="flex items-center gap-2">
               <h2 className="text-lg font-bold text-white">画布</h2>
               <span className="text-sm text-gray-500">{shots.length} 个镜头</span>
           </div>
           
           <div className="flex items-center gap-4">
               {/* Improved API Key Button */}
               <button 
                  onClick={handleChangeKey}
                  className="flex items-center gap-2 bg-white/5 hover:bg-primary/20 hover:text-primary px-3 py-1.5 rounded-lg text-xs text-gray-300 transition-all border border-white/5"
                  title="更换 API Key"
               >
                   <Key size={14} />
                   <span>API 设置</span>
               </button>

               <div className="h-4 w-[1px] bg-white/10"></div>

               <button className="p-2 text-gray-400 hover:text-white rounded hover:bg-white/5">
                   <Grid size={18} />
               </button>
               <button className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/5 rounded-lg text-xs text-gray-300 transition-colors">
                   <Download size={14} />
                   <span>下载</span>
               </button>
           </div>
        </div>

        {/* Canvas Grid */}
        <main className="flex-1 overflow-y-auto p-8 relative">
           {/* Grid Background Effect */}
            <div className="absolute inset-0 bg-[radial-gradient(#1f1f22_1px,transparent_1px)] [background-size:20px_20px] opacity-20 pointer-events-none"></div>

            {shots.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-600 gap-4 opacity-50">
                    <Layout size={64} strokeWidth={1} />
                    <p className="font-light text-sm">画布为空，请在左侧生成分镜</p>
                </div>
            ) : (
                <div 
                    className="grid gap-6 w-full max-w-6xl mx-auto transition-all"
                    style={{
                        gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))`,
                    }}
                >
                    {shots.map((shot) => (
                        <ShotCard 
                            key={shot.id} 
                            shot={shot} 
                            isSelected={selectedShotId === shot.id}
                            onClick={() => setSelectedShotId(shot.id)}
                            onRegenerate={(e) => {
                                e.stopPropagation();
                                handleRegenerateShot(shot.id);
                            }}
                        />
                    ))}
                </div>
            )}
        </main>
      </div>

      <RightSidebar 
        shot={selectedShot}
        onClose={() => setSelectedShotId(null)}
        onRegenerate={handleRegenerateShot}
        onEdit={setEditingShot}
      />

      <EditShotModal 
        shot={editingShot} 
        onClose={() => setEditingShot(null)}
        onApplyEdit={handleApplyEdit}
      />
      
      {showKeyModal && (
        <ApiKeyInput 
            onSubmit={(k) => handleApiKeySubmit(k)} 
            hasExistingKey={!!apiKey}
            onClose={apiKey ? () => setShowKeyModal(false) : undefined}
        />
      )}
    </div>
  );
};

export default App;