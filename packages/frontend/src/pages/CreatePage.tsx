import { useState, useRef } from 'react'
import { ArrowRight, ArrowLeft, Sparkles, Check, Cpu, Shield, Zap, Loader2, ExternalLink, AlertCircle, Upload, Image, X } from 'lucide-react'
import Header from '../components/Header'
import PureBackground from '../components/PureBackground'
import { useWallet } from '../hooks/useWallet'
import { useCreateIdol } from '../hooks/useCreateIdol'
import { useT } from '../i18n'

const personalityTraits = ['rebellious', 'analytical', 'chaotic', 'strategic', 'cautious', 'aggressive', 'meme-savvy', 'technical']

const CreatePage = () => {
  const [currentStep, setCurrentStep] = useState(1)
  const [formData, setFormData] = useState({
    name: '',
    symbol: '',
    description: '',
    roleType: 'trader',
    personality: [] as string[],
    strategy: 'balanced',
    avatarFile: null as File | null,
    avatarPreview: '' as string,
  })
  const fileInputRef = useRef<HTMLInputElement>(null)
  const t = useT()

  const steps = [
    { id: 1, title: t('create.step1'), description: t('create.step1.desc') },
    { id: 2, title: t('create.step2'), description: t('create.step2.desc') },
    { id: 3, title: t('create.step3'), description: t('create.step3.desc') },
  ]

  const roleTypes = [
    { id: 'trader', label: t('create.role.trader'), desc: t('create.role.trader.desc') },
    { id: 'artist', label: t('create.role.artist'), desc: t('create.role.artist.desc') },
    { id: 'detective', label: t('create.role.detective'), desc: t('create.role.detective.desc') },
    { id: 'influencer', label: t('create.role.influencer'), desc: t('create.role.influencer.desc') },
  ]

  const { isConnected, ethereumAddress } = useWallet()
  const { deploy, isDeploying, txHash, error, deployedToken, reset } = useCreateIdol()

  const togglePersonality = (trait: string) => {
    setFormData(prev => ({
      ...prev,
      personality: prev.personality.includes(trait)
        ? prev.personality.filter(t => t !== trait)
        : [...prev.personality, trait],
    }))
  }

  const handleDeploy = async () => {
    if (!formData.name || !formData.symbol) return

    // Build personality JSON with avatar
    const personalityData: Record<string, unknown> = {
      traits: formData.personality,
      trading_style: formData.strategy,
      description: formData.description,
    }

    // If image uploaded, save to local server → public/idols/{symbol}/avatar.png
    if (formData.avatarFile) {
      const base64 = await fileToBase64(formData.avatarFile)
      personalityData.avatarUrl = `/idols/${formData.symbol.toLowerCase()}/avatar.png`
      // Upload to local server
      try {
        await fetch('http://localhost:3456/api/upload/avatar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ symbol: formData.symbol, imageBase64: base64 }),
        })
        console.log('Avatar saved to public/idols/' + formData.symbol.toLowerCase() + '/avatar.png')
      } catch (e) {
        console.warn('Upload server not running, saving to IndexedDB instead')
        await saveAvatarToDb(formData.symbol.toLowerCase(), base64)
      }
    }

    const personality = JSON.stringify(personalityData)

    // If image was uploaded, save it locally (demo mode)
    // In production: upload to IPFS via Pinata, get CID, store in personality JSON
    if (formData.avatarFile) {
      console.log('Image ready for IPFS upload:', formData.avatarFile.name)
    }

    await deploy({
      name: `${formData.name} Token`,
      symbol: formData.symbol,
      roleType: formData.roleType,
      personality,
    })
  }

  const handleImageUpload = (file: File) => {
    if (!file.type.startsWith('image/')) return
    if (file.size > 10 * 1024 * 1024) return // Max 10MB

    const preview = URL.createObjectURL(file)
    setFormData(prev => ({ ...prev, avatarFile: file, avatarPreview: preview }))
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleImageUpload(file)
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleImageUpload(file)
  }

  const removeImage = () => {
    if (formData.avatarPreview) URL.revokeObjectURL(formData.avatarPreview)
    setFormData(prev => ({ ...prev, avatarFile: null, avatarPreview: '' }))
  }

  // Convert File to base64 data URL
  function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  // Save avatar to IndexedDB (no size limit unlike localStorage)
  function saveAvatarToDb(symbol: string, base64: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open('novaidol-avatars', 1)
      req.onupgradeneeded = () => { req.result.createObjectStore('avatars') }
      req.onsuccess = () => {
        const tx = req.result.transaction('avatars', 'readwrite')
        tx.objectStore('avatars').put(base64, symbol)
        tx.oncomplete = () => resolve()
        tx.onerror = () => reject(tx.error)
      }
      req.onerror = () => reject(req.error)
    })
  }

  const canProceedStep1 = formData.name.length > 0 && formData.symbol.length > 0 && formData.avatarPreview.length > 0
  const canProceedStep2 = formData.personality.length >= 2

  return (
    <div className="min-h-screen relative bg-[#0a0a0a]">
      <PureBackground />
      <Header />

      <main className="pt-24 pb-16 relative z-10">
        <div className="container max-w-4xl">
          <div className="mb-12">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-px bg-white/20" />
              <span className="text-sm text-white/40 uppercase tracking-[0.2em]">{t('create.label.launch')}</span>
            </div>
            <h1 className="text-5xl md:text-6xl font-semibold text-white tracking-tight">{t('create.title')}</h1>
            <p className="text-lg text-white/40 mt-4">{t('create.subtitle')}</p>
          </div>

          {/* Steps indicator */}
          <div className="flex items-center gap-4 mb-12 overflow-x-auto">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center gap-4 shrink-0">
                <div className={`flex items-center gap-3 px-4 py-2 rounded-lg border ${currentStep === step.id ? 'border-white/20 bg-white/5' : currentStep > step.id ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-white/5'}`}>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${currentStep > step.id ? 'bg-emerald-500 text-black' : currentStep === step.id ? 'bg-white text-black' : 'bg-white/10 text-white/40'}`}>
                    {currentStep > step.id ? <Check className="w-4 h-4" /> : step.id}
                  </div>
                  <div>
                    <p className={`text-sm font-medium ${currentStep === step.id ? 'text-white' : 'text-white/40'}`}>{step.title}</p>
                    <p className="text-xs text-white/20">{step.description}</p>
                  </div>
                </div>
                {index < steps.length - 1 && <ArrowRight className="w-4 h-4 text-white/20 shrink-0" />}
              </div>
            ))}
          </div>

          <div className="card">
            {/* Step 1: Configure */}
            {currentStep === 1 && (
              <div className="space-y-6">
                {/* Image Upload */}
                <div>
                  <label className="text-xs text-white/40 uppercase tracking-wider mb-3 block">
                    {t('create.upload.title')}
                  </label>
                  <div
                    onDrop={handleDrop}
                    onDragOver={(e) => e.preventDefault()}
                    onClick={() => fileInputRef.current?.click()}
                    className={`relative border-2 border-dashed rounded-2xl overflow-hidden cursor-pointer transition-all ${
                      formData.avatarPreview
                        ? 'border-emerald-500/30 hover:border-emerald-500/50'
                        : 'border-white/10 hover:border-white/20'
                    }`}
                  >
                    {formData.avatarPreview ? (
                      <div className="relative aspect-[4/5] max-h-[400px]">
                        <img
                          src={formData.avatarPreview}
                          alt="Preview"
                          className="w-full h-full object-cover object-top"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 hover:opacity-100 transition-opacity flex items-end justify-center pb-6">
                          <span className="text-sm text-white/80 bg-black/50 px-4 py-2 rounded-lg backdrop-blur-sm">
                            {t('create.upload.change')}
                          </span>
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); removeImage() }}
                          className="absolute top-3 right-3 p-2 bg-black/60 backdrop-blur-sm rounded-full text-white/60 hover:text-white transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="aspect-[4/5] max-h-[300px] flex flex-col items-center justify-center gap-4 p-8">
                        <div className="w-20 h-20 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                          <Upload className="w-8 h-8 text-white/20" />
                        </div>
                        <div className="text-center">
                          <p className="text-sm text-white/50 mb-1">
                            {t('create.upload.hint')}
                          </p>
                          <p className="text-xs text-white/30">
                            {t('create.upload.formats')}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-lg border border-white/10">
                          <Image className="w-4 h-4 text-white/30" />
                          <span className="text-xs text-white/40">{t('create.upload.identity')}</span>
                        </div>
                      </div>
                    )}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                  </div>
                  <p className="text-[10px] text-white/20 mt-2">
                    {t('create.upload.note')}
                  </p>
                </div>

                {/* Name + Symbol */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="text-xs text-white/40 uppercase tracking-wider mb-2 block">{t('create.name')}</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="e.g. Vivian"
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder:text-white/20 focus:outline-none focus:border-white/20 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-white/40 uppercase tracking-wider mb-2 block">{t('create.symbol')}</label>
                    <input
                      type="text"
                      value={formData.symbol}
                      onChange={(e) => setFormData(prev => ({ ...prev, symbol: e.target.value.toUpperCase() }))}
                      placeholder="e.g. VIVIAN"
                      maxLength={8}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder:text-white/20 focus:outline-none focus:border-white/20 transition-colors font-mono"
                    />
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="text-xs text-white/40 uppercase tracking-wider mb-2 block">{t('create.description')}</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder={t('create.description.placeholder')}
                    rows={3}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder:text-white/20 focus:outline-none focus:border-white/20 transition-colors resize-none"
                  />
                </div>

                {/* Role Type */}
                <div>
                  <label className="text-xs text-white/40 uppercase tracking-wider mb-4 block">{t('create.role')}</label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {roleTypes.map((role) => (
                      <button
                        key={role.id}
                        onClick={() => setFormData(prev => ({ ...prev, roleType: role.id }))}
                        className={`p-3 rounded-lg border text-left transition-all ${formData.roleType === role.id ? 'border-white/20 bg-white/5' : 'border-white/5 hover:border-white/10'}`}
                      >
                        <p className={`font-medium text-sm ${formData.roleType === role.id ? 'text-white' : 'text-white/60'}`}>{role.label}</p>
                        <p className="text-xs text-white/30 mt-1">{role.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Licensing info */}
                <div className="p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-lg">
                  <p className="text-xs text-emerald-400 font-medium mb-2">💡 {t('create.licensing.title')}</p>
                  <p className="text-xs text-white/40 leading-relaxed">
                    {t('create.licensing.desc')}
                  </p>
                </div>
              </div>
            )}

            {/* Step 2: Personality */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div>
                  <label className="text-xs text-white/40 uppercase tracking-wider mb-4 block">{t('create.personality.title')}</label>
                  <div className="flex flex-wrap gap-2">
                    {personalityTraits.map((trait) => (
                      <button
                        key={trait}
                        onClick={() => togglePersonality(trait)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all ${formData.personality.includes(trait) ? 'bg-white text-black border-white' : 'bg-transparent text-white/40 border-white/10 hover:border-white/20 hover:text-white/60'}`}
                      >
                        {trait}
                      </button>
                    ))}
                  </div>
                  {formData.personality.length < 2 && (
                    <p className="text-xs text-white/30 mt-3">{t('create.personality.hint')}</p>
                  )}
                </div>
                <div>
                  <label className="text-xs text-white/40 uppercase tracking-wider mb-4 block">{t('create.strategy.title')}</label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[
                      { id: 'conservative', label: t('create.strategy.conservative'), icon: Shield, desc: t('create.strategy.conservative.desc') },
                      { id: 'balanced', label: t('create.strategy.balanced'), icon: Zap, desc: t('create.strategy.balanced.desc') },
                      { id: 'aggressive', label: t('create.strategy.aggressive'), icon: Cpu, desc: t('create.strategy.aggressive.desc') },
                    ].map((strategy) => (
                      <button
                        key={strategy.id}
                        onClick={() => setFormData(prev => ({ ...prev, strategy: strategy.id }))}
                        className={`p-4 rounded-lg border text-left transition-all ${formData.strategy === strategy.id ? 'border-white/20 bg-white/5' : 'border-white/5 hover:border-white/10'}`}
                      >
                        <strategy.icon className={`w-5 h-5 mb-2 ${formData.strategy === strategy.id ? 'text-white' : 'text-white/30'}`} />
                        <p className={`font-medium text-sm ${formData.strategy === strategy.id ? 'text-white' : 'text-white/60'}`}>{strategy.label}</p>
                        <p className="text-xs text-white/30 mt-1">{strategy.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Deploy */}
            {currentStep === 3 && (
              <div className="text-center py-12">
                {!deployedToken ? (
                  <>
                    <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-6">
                      <Sparkles className="w-8 h-8 text-black" />
                    </div>
                    <h3 className="text-2xl font-semibold text-white mb-2">{t('create.deploy.ready')}</h3>
                    <p className="text-white/40 mb-8 max-w-md mx-auto">
                      <span className="text-white font-medium">{formData.name}</span> {t('create.deploy.desc')}
                    </p>

                    {/* Summary */}
                    <div className="p-6 bg-white/[0.02] border border-white/5 rounded-lg max-w-md mx-auto mb-8 text-left">
                      <div className="space-y-3 text-sm">
                        <div className="flex justify-between">
                          <span className="text-white/40">{t('create.deploy.summary.name')}</span>
                          <span className="text-white font-medium">{formData.name} Token</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-white/40">{t('create.deploy.summary.symbol')}</span>
                          <span className="text-white font-mono">${formData.symbol}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-white/40">{t('create.deploy.summary.role')}</span>
                          <span className="text-white capitalize">{formData.roleType}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-white/40">{t('create.deploy.summary.strategy')}</span>
                          <span className="text-white capitalize">{formData.strategy}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-white/40">{t('create.deploy.summary.traits')}</span>
                          <span className="text-white">{formData.personality.join(', ')}</span>
                        </div>
                        <div className="flex justify-between pt-3 border-t border-white/5">
                          <span className="text-white/40">{t('create.deploy.summary.fee')}</span>
                          <span className="text-white font-mono">0.1 INJ</span>
                        </div>
                      </div>
                    </div>

                    {/* Error */}
                    {error && (
                      <div className="max-w-md mx-auto mb-6 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-start gap-2 text-left">
                        <AlertCircle className="w-4 h-4 text-rose-400 mt-0.5 shrink-0" />
                        <p className="text-sm text-rose-400">{error}</p>
                      </div>
                    )}

                    {/* Deploy button */}
                    {!isConnected ? (
                      <button
                        onClick={() => window.dispatchEvent(new CustomEvent('open-wallet-modal'))}
                        className="inline-flex items-center gap-2 px-8 py-4 bg-white text-black font-medium rounded-lg hover:bg-white/90 transition-colors"
                      >
                        {t('create.deploy.connect')}
                      </button>
                    ) : (
                      <button
                        onClick={handleDeploy}
                        disabled={isDeploying}
                        className="inline-flex items-center gap-2 px-8 py-4 bg-white text-black font-medium rounded-lg hover:bg-white/90 transition-colors disabled:opacity-50"
                      >
                        {isDeploying ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            {t('create.deploy.deploying')}
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4" />
                            {t('create.deploy.btn')}
                          </>
                        )}
                      </button>
                    )}
                  </>
                ) : (
                  /* Success state */
                  <>
                    <div className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6">
                      <Check className="w-8 h-8 text-black" />
                    </div>
                    <h3 className="text-2xl font-semibold text-white mb-2">{t('create.deploy.success')}</h3>
                    <p className="text-white/40 mb-8 max-w-md mx-auto">
                      <span className="text-white font-medium">{formData.name}</span> {t('create.deploy.live')}
                    </p>

                    <div className="p-6 bg-white/[0.02] border border-emerald-500/20 rounded-lg max-w-md mx-auto mb-8 text-left">
                      <div className="space-y-3 text-sm">
                        <div className="flex justify-between">
                          <span className="text-white/40">{t('create.deploy.token.address')}</span>
                          <a
                            href={`https://testnet.blockscout.injective.network/address/${deployedToken}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-emerald-400 font-mono text-xs flex items-center gap-1 hover:underline"
                          >
                            {deployedToken.slice(0, 10)}...{deployedToken.slice(-6)}
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                        {txHash && (
                          <div className="flex justify-between">
                            <span className="text-white/40">{t('create.deploy.transaction')}</span>
                            <a
                              href={`https://testnet.blockscout.injective.network/tx/${txHash}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-emerald-400 font-mono text-xs flex items-center gap-1 hover:underline"
                            >
                              {txHash.slice(0, 10)}...{txHash.slice(-6)}
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-center gap-4">
                      <a
                        href={`/idol/${deployedToken}`}
                        className="inline-flex items-center gap-2 px-6 py-3 bg-white text-black font-medium rounded-lg hover:bg-white/90 transition-colors"
                      >
                        {t('create.deploy.view')}
                      </a>
                      <button
                        onClick={() => { reset(); setCurrentStep(1); setFormData({ name: '', symbol: '', description: '', roleType: 'trader', personality: [], strategy: 'balanced', avatarFile: null, avatarPreview: '' }) }}
                        className="inline-flex items-center gap-2 px-6 py-3 border border-white/10 text-white/60 font-medium rounded-lg hover:border-white/20 hover:text-white transition-colors"
                      >
                        {t('create.deploy.another')}
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Navigation */}
            {currentStep < 3 && (
              <div className="flex items-center justify-between pt-8 mt-8 border-t border-white/5">
                <button
                  onClick={() => setCurrentStep(prev => Math.max(1, prev - 1))}
                  disabled={currentStep === 1}
                  className="flex items-center gap-2 text-white/40 hover:text-white/60 transition-colors disabled:opacity-30"
                >
                  <ArrowLeft className="w-4 h-4" />{t('create.nav.back')}
                </button>
                <button
                  onClick={() => setCurrentStep(prev => Math.min(3, prev + 1))}
                  disabled={(currentStep === 1 && !canProceedStep1) || (currentStep === 2 && !canProceedStep2)}
                  className="flex items-center gap-2 px-6 py-3 bg-white text-black font-medium rounded-lg hover:bg-white/90 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  {t('create.nav.continue')}<ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

export default CreatePage
