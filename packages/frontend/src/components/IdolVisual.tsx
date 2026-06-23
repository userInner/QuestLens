import { useState, useEffect } from 'react'
import { Sparkles, Eye, MessageCircle, Share2, Maximize2 } from 'lucide-react'

// AI-generated avatar URLs - using high-quality abstract/digital art
const idolImages = {
  vivian: {
    avatar: 'https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?w=600&h=600&fit=crop',
    banner: 'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=1200&h=400&fit=crop',
    gallery: [
      'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&h=400&fit=crop',
      'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=400&h=400&fit=crop',
      'https://images.unsplash.com/photo-1614850523459-c2f4c699c52e?w=400&h=400&fit=crop',
    ]
  }
}

const IdolVisual = () => {
  const [isHovered, setIsHovered] = useState(false)
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [currentGalleryIndex, setCurrentGalleryIndex] = useState(0)
  const [isFullScreen, setIsFullScreen] = useState(false)

  // Auto-rotate gallery
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentGalleryIndex(prev => (prev + 1) % idolImages.vivian.gallery.length)
    }, 5000)
    return () => clearInterval(interval)
  }, [])

  return (
    <>
      {/* Main Visual Card */}
      <div 
        className="card overflow-hidden relative group"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Banner Image */}
        <div className="relative h-32 overflow-hidden">
          <img 
            src={idolImages.vivian.banner}
            alt="Banner"
            className={`w-full h-full object-cover transition-transform duration-700 ${isHovered ? 'scale-110' : 'scale-100'}`}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg-card)] via-transparent to-transparent" />
          
          {/* Live Badge */}
          <div className="absolute top-3 right-3 flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--error)]/20 backdrop-blur-sm border border-[var(--error)]/30">
            <span className="w-2 h-2 rounded-full bg-[var(--error)] animate-pulse" />
            <span className="text-xs font-semibold text-[var(--error)]">LIVE</span>
          </div>
        </div>

        {/* Avatar - Overlapping */}
        <div className="relative px-6 -mt-12 mb-4">
          <div className="relative inline-block">
            {/* Glow ring */}
            <div className={`absolute -inset-1 rounded-2xl bg-gradient-to-r from-[var(--primary-500)] via-[var(--primary-400)] to-[var(--primary-600)] blur transition-opacity duration-500 ${isHovered ? 'opacity-100' : 'opacity-60'}`} />
            
            <div className="relative w-24 h-24 rounded-2xl overflow-hidden border-4 border-[var(--bg-card)] shadow-xl">
              <img 
                src={idolImages.vivian.avatar}
                alt="Vivian"
                className={`w-full h-full object-cover transition-transform duration-500 ${isHovered ? 'scale-110' : 'scale-100'}`}
              />
              
              {/* Hover overlay */}
              <div className={`absolute inset-0 bg-[var(--primary-500)]/20 flex items-center justify-center transition-opacity duration-300 ${isHovered ? 'opacity-100' : 'opacity-0'}`}>
                <Eye className="w-8 h-8 text-white" />
              </div>
            </div>

            {/* Status indicator */}
            <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-[var(--bg-card)] rounded-full flex items-center justify-center">
              <div className="w-4 h-4 bg-[var(--success)] rounded-full animate-pulse" />
            </div>
          </div>
        </div>

        {/* Info */}
        <div className="px-6 pb-6">
          <div className="flex items-start justify-between mb-2">
            <div>
              <h2 className="text-2xl font-bold text-[var(--text-default)] flex items-center gap-2">
                Vivian
                <Sparkles className="w-5 h-5 text-[var(--primary-400)] animate-pulse" />
              </h2>
              <p className="font-mono text-sm text-[var(--primary-400)]">$VIVIAN</p>
            </div>
            <div className="flex gap-2">
              <button className="btn-ghost p-2 hover:scale-110 transition-transform">
                <MessageCircle className="w-5 h-5" />
              </button>
              <button className="btn-ghost p-2 hover:scale-110 transition-transform">
                <Share2 className="w-5 h-5" />
              </button>
              <button 
                className="btn-ghost p-2 hover:scale-110 transition-transform"
                onClick={() => setIsFullScreen(true)}
              >
                <Maximize2 className="w-5 h-5" />
              </button>
            </div>
          </div>

          <p className="text-sm text-[var(--text-muted)] mb-4">
            A rebellious AI trader with a taste for chaos and profits
          </p>

          {/* Gallery Preview */}
          <div className="space-y-2">
            <p className="text-xs text-[var(--text-faint)] uppercase tracking-wider">AI Generated Moments</p>
            <div className="flex gap-2">
              {idolImages.vivian.gallery.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedImage(img)}
                  className={`relative w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                    idx === currentGalleryIndex ? 'border-[var(--primary-500)] scale-105' : 'border-transparent opacity-70 hover:opacity-100'
                  }`}
                >
                  <img src={img} alt={`Moment ${idx + 1}`} className="w-full h-full object-cover" />
                  {idx === currentGalleryIndex && (
                    <div className="absolute inset-0 bg-[var(--primary-500)]/20" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Image Modal */}
      {selectedImage && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative max-w-2xl max-h-[80vh] m-4 animate-scale-in">
            <img src={selectedImage} alt="Selected" className="w-full h-full object-contain rounded-xl" />
            <button 
              className="absolute top-4 right-4 btn-secondary"
              onClick={() => setSelectedImage(null)}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Full Screen Mode */}
      {isFullScreen && (
        <div className="fixed inset-0 z-50 bg-[var(--bg-base)] animate-fade-in">
          <div className="h-full flex">
            {/* Main Image */}
            <div className="flex-1 relative">
              <img 
                src={idolImages.vivian.gallery[currentGalleryIndex]}
                alt="Full view"
                className="w-full h-full object-contain"
              />
              <button 
                className="absolute top-6 right-6 btn-secondary"
                onClick={() => setIsFullScreen(false)}
              >
                Exit Fullscreen
              </button>
            </div>
            
            {/* Sidebar */}
            <div className="w-80 border-l border-[var(--border-subtle)] p-6 overflow-y-auto">
              <h3 className="text-xl font-bold text-[var(--text-default)] mb-4">AI Gallery</h3>
              <div className="space-y-3">
                {idolImages.vivian.gallery.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentGalleryIndex(idx)}
                    className={`w-full aspect-video rounded-lg overflow-hidden border-2 transition-all ${
                      idx === currentGalleryIndex ? 'border-[var(--primary-500)]' : 'border-transparent'
                    }`}
                  >
                    <img src={img} alt={`Gallery ${idx}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default IdolVisual
