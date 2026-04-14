/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { GoogleGenAI } from "@google/genai";
import { Upload, Image as ImageIcon, Loader2, Sparkles, CheckCircle2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const apiKey = import.meta.env.VITE_GEMINI_API_KEY?.trim();
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

interface ImageState {
  file: File | null;
  preview: string | null;
  base64: string | null;
}

export function AIInteriorDesigner() {
  const [roomImage, setRoomImage] = useState<ImageState>({ file: null, preview: null, base64: null });
  const [wallpaperImage, setWallpaperImage] = useState<ImageState>({ file: null, preview: null, base64: null });
  const [curtainImage, setCurtainImage] = useState<ImageState>({ file: null, preview: null, base64: null });
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRefs = {
    room: useRef<HTMLInputElement>(null),
    wallpaper: useRef<HTMLInputElement>(null),
    curtain: useRef<HTMLInputElement>(null),
  };

  const resizeImage = (file: File, maxWidth: number = 1024, maxHeight: number = 1024): Promise<{ base64: string, preview: string }> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > maxWidth) {
              height *= maxWidth / width;
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width *= maxHeight / height;
              height = maxHeight;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          
          const base64 = canvas.toDataURL('image/jpeg', 0.8).split(',')[1];
          const preview = canvas.toDataURL('image/jpeg', 0.8);
          resolve({ base64, preview });
        };
        img.onerror = reject;
        img.src = e.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, type: 'room' | 'wallpaper' | 'curtain') => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const { base64, preview } = await resizeImage(file);
      const state = { file, preview, base64 };

      if (type === 'room') setRoomImage(state);
      else if (type === 'wallpaper') setWallpaperImage(state);
      else if (type === 'curtain') setCurtainImage(state);
    } catch (err) {
      console.error("Error resizing image:", err);
      setError("Failed to process image. Please try another one.");
    }
  };

  const handleGenerate = async () => {
    if (!apiKey || !ai) {
      setError('Gemini API key is missing. Add VITE_GEMINI_API_KEY to your local .env file and restart the dev server.');
      return;
    }

    if (!roomImage.base64 || !wallpaperImage.base64 || !curtainImage.base64) {
      setError("Please upload all three images (Room, Wallpaper, and Curtain).");
      return;
    }

    setIsGenerating(true);
    setError(null);
    setResultImage(null);

    try {
      const prompt = `You are an expert interior designer. I will provide you with three image files:
1. room_image.png: A photograph of a room for interior design.
2. wallpaper_fabric.png: A seamless texture or pattern intended for the walls.
3. curtain_fabric.png: A fabric texture or pattern intended for the window curtains.

Your task is to digitally apply the provided wallpaper_fabric.png to all visible wall surfaces within the room_image.png, and apply the curtain_fabric.png to all window curtains in the room_image.png.

Crucial requirements for the final output:
* Ultra-Realism: The final image must be ultra-realistic, as if a professional interior designer has physically applied these materials in the real world.
* Structural Integrity: Do not alter the room's fundamental structure, furniture placement, or overall layout. The room must remain recognizable as the original room_image.png.
* Seamless Application: Ensure the wallpaper is applied perfectly to every visible wall surface, including corners, edges, and any small visible sections (e.g., behind furniture, at the far left/right edges of the room).
* Realistic Draping and Folds: For the curtains, accurately simulate natural fabric draping, folds, and how curtains realistically hang and interact with the window frame.
* Lighting and Shadows Preservation: Meticulously preserve all existing lighting conditions, natural light sources, and shadows from the original room_image.png. The newly applied wallpaper and curtain fabrics must realistically interact with these light and shadow conditions. Do not introduce new light sources or alter existing ones.
* Texture and Materiality: The applied fabrics must convey a realistic sense of texture and material, showing how light interacts with their surfaces (e.g., subtle sheens, fabric weave).
* No Over-Editing: The changes should be confined strictly to the wallpaper and curtains. Avoid any changes to furniture, flooring, decor, or structural elements.

The output should be a single, high-resolution, ultra-realistic image of the redesigned room.`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [
            { text: prompt },
            { inlineData: { data: roomImage.base64, mimeType: 'image/jpeg' } },
            { inlineData: { data: wallpaperImage.base64, mimeType: 'image/jpeg' } },
            { inlineData: { data: curtainImage.base64, mimeType: 'image/jpeg' } },
          ],
        },
      });

      let generatedBase64 = "";
      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          generatedBase64 = part.inlineData.data || "";
          break;
        }
      }

      if (generatedBase64) {
        setResultImage(`data:image/png;base64,${generatedBase64}`);
      } else {
        throw new Error("No image was generated. Please try again.");
      }
    } catch (err: unknown) {
      console.error(err);

      const message = err instanceof Error ? err.message : 'An error occurred during generation.';

      if (message.includes('API key not valid') || message.includes('API_KEY_INVALID')) {
        setError('Your Gemini API key is invalid. Update VITE_GEMINI_API_KEY in .env with a valid Gemini API Studio key, then restart the app.');
      } else {
        setError(message);
      }
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f2ed] text-[#1a1a1a] font-serif">
      {/* Header */}
      <header className="border-b border-[#1a1a1a]/10 py-8 px-6 md:px-12 flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h1 className="text-4xl md:text-5xl font-light tracking-tight text-[#1a1a1a]">
            AI Interior <span className="italic">Designer</span>
          </h1>
          <p className="text-sm uppercase tracking-widest mt-2 opacity-60">Professional Room Redesign</p>
        </div>
        <div className="flex gap-4">
          <button 
            onClick={() => {
              setRoomImage({ file: null, preview: null, base64: null });
              setWallpaperImage({ file: null, preview: null, base64: null });
              setCurtainImage({ file: null, preview: null, base64: null });
              setResultImage(null);
              setError(null);
            }}
            className="px-6 py-2 border border-[#1a1a1a]/20 rounded-full text-sm uppercase tracking-widest hover:bg-[#1a1a1a] hover:text-white transition-colors"
          >
            Reset
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          
          {/* Upload Section */}
          <div className="lg:col-span-5 space-y-8">
            <section>
              <h2 className="text-xl font-medium mb-4 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full border border-[#1a1a1a] flex items-center justify-center text-xs">01</span>
                Upload Room Photo
              </h2>
              <UploadCard 
                label="Room Image" 
                image={roomImage} 
                onClick={() => fileInputRefs.room.current?.click()} 
                onFileChange={(e) => handleFileChange(e, 'room')}
                inputRef={fileInputRefs.room}
              />
            </section>

            <div className="grid grid-cols-2 gap-4">
              <section>
                <h2 className="text-xl font-medium mb-4 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full border border-[#1a1a1a] flex items-center justify-center text-xs">02</span>
                  Wallpaper
                </h2>
                <UploadCard 
                  label="Wallpaper Fabric" 
                  image={wallpaperImage} 
                  onClick={() => fileInputRefs.wallpaper.current?.click()} 
                  onFileChange={(e) => handleFileChange(e, 'wallpaper')}
                  inputRef={fileInputRefs.wallpaper}
                  compact
                />
              </section>
              <section>
                <h2 className="text-xl font-medium mb-4 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full border border-[#1a1a1a] flex items-center justify-center text-xs">03</span>
                  Curtains
                </h2>
                <UploadCard 
                  label="Curtain Fabric" 
                  image={curtainImage} 
                  onClick={() => fileInputRefs.curtain.current?.click()} 
                  onFileChange={(e) => handleFileChange(e, 'curtain')}
                  inputRef={fileInputRefs.curtain}
                  compact
                />
              </section>
            </div>

            <button
              onClick={handleGenerate}
              disabled={isGenerating || !roomImage.base64 || !wallpaperImage.base64 || !curtainImage.base64}
              className={`w-full py-4 rounded-xl flex items-center justify-center gap-3 text-lg font-medium transition-all ${
                isGenerating 
                  ? 'bg-[#1a1a1a]/10 text-[#1a1a1a]/40 cursor-not-allowed' 
                  : 'bg-[#1a1a1a] text-white hover:shadow-2xl hover:-translate-y-1 active:translate-y-0'
              }`}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="animate-spin" />
                  Redesigning Room...
                </>
              ) : (
                <>
                  <Sparkles size={20} />
                  Redesign Room
                </>
              )}
            </button>

            {error && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 text-red-700 text-sm"
              >
                <AlertCircle className="shrink-0 mt-0.5" size={16} />
                <p>{error}</p>
              </motion.div>
            )}
          </div>

          {/* Result Section */}
          <div className="lg:col-span-7">
            <div className="sticky top-8">
              <h2 className="text-xl font-medium mb-4 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full border border-[#1a1a1a] flex items-center justify-center text-xs">04</span>
                Redesigned Output
              </h2>
              
              <div className="relative aspect-[4/3] bg-white rounded-2xl border border-[#1a1a1a]/10 overflow-hidden shadow-sm flex items-center justify-center">
                <AnimatePresence mode="wait">
                  {resultImage ? (
                    <motion.img
                      key="result"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      src={resultImage}
                      alt="Redesigned Room"
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : isGenerating ? (
                    <motion.div 
                      key="loading"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex flex-col items-center gap-6 text-[#1a1a1a]/40 text-center px-12"
                    >
                      <Loader2 className="animate-spin w-12 h-12" />
                      <div className="space-y-2">
                        <p className="text-sm uppercase tracking-widest animate-pulse font-medium text-[#1a1a1a]">Designing your space...</p>
                        <p className="text-xs italic opacity-60">This typically takes 30-60 seconds. We're applying textures and adjusting lighting for a realistic finish.</p>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div 
                      key="placeholder"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex flex-col items-center gap-4 text-[#1a1a1a]/20 text-center px-8"
                    >
                      <ImageIcon size={64} strokeWidth={1} />
                      <p className="max-w-xs">Upload your room and materials to see the transformation here.</p>
                    </motion.div>
                  )}
                </AnimatePresence>

                {resultImage && (
                  <div className="absolute bottom-4 right-4 flex gap-2">
                    <a 
                      href={resultImage} 
                      download="redesigned-room.png"
                      className="px-4 py-2 bg-white/90 backdrop-blur-sm border border-[#1a1a1a]/10 rounded-full text-xs uppercase tracking-widest hover:bg-white transition-all shadow-lg"
                    >
                      Download
                    </a>
                  </div>
                )}
              </div>

              {resultImage && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-6 p-6 bg-white rounded-2xl border border-[#1a1a1a]/5 flex items-center gap-4"
                >
                  <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center text-green-600">
                    <CheckCircle2 />
                  </div>
                  <div>
                    <h3 className="font-medium">Redesign Complete</h3>
                    <p className="text-sm text-[#1a1a1a]/60">Your room has been updated with the selected materials while preserving its original character.</p>
                  </div>
                </motion.div>
              )}
            </div>
          </div>

        </div>
      </main>

      <footer className="mt-24 border-t border-[#1a1a1a]/10 py-12 px-6 text-center text-[#1a1a1a]/40 text-xs uppercase tracking-[0.2em]">
        &copy; 2026 AI Interior Designer &bull; Powered by Gemini
      </footer>
    </div>
  );
}

function UploadCard({ label, image, onClick, onFileChange, inputRef, compact = false }: { 
  label: string, 
  image: ImageState, 
  onClick: () => void, 
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void,
  inputRef: React.RefObject<HTMLInputElement>,
  compact?: boolean
}) {
  return (
    <div 
      onClick={onClick}
      className={`relative group cursor-pointer overflow-hidden rounded-2xl border border-dashed border-[#1a1a1a]/20 bg-white hover:border-[#1a1a1a]/40 transition-all ${compact ? 'aspect-square' : 'aspect-[16/9]'}`}
    >
      <input 
        type="file" 
        ref={inputRef} 
        onChange={onFileChange} 
        className="hidden" 
        accept="image/*"
      />
      
      {image.preview ? (
        <img 
          src={image.preview} 
          alt={label} 
          className="w-full h-full object-cover transition-transform group-hover:scale-105" 
          referrerPolicy="no-referrer"
        />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-[#1a1a1a]/40 group-hover:text-[#1a1a1a]/60">
          <Upload size={compact ? 24 : 32} strokeWidth={1.5} />
          <span className="text-[10px] uppercase tracking-widest font-medium">{label}</span>
        </div>
      )}

      {image.preview && (
        <div className="absolute inset-0 bg-[#1a1a1a]/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <span className="px-4 py-2 bg-white rounded-full text-[10px] uppercase tracking-widest font-medium shadow-xl">Change</span>
        </div>
      )}
    </div>
  );
}
