interface SkeletonProps {
  className?: string
  variant?: 'text' | 'circular' | 'rectangular' | 'rounded'
  width?: string | number
  height?: string | number
  animation?: 'pulse' | 'wave' | 'none'
}

export const Skeleton = ({
  className = '',
  variant = 'text',
  width,
  height,
  animation = 'pulse',
}: SkeletonProps) => {
  const baseStyles = 'bg-[var(--surface-hover)]'

  const variantStyles = {
    text: 'rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-none',
    rounded: 'rounded-lg',
  }

  const animationStyles = {
    pulse: 'animate-pulse',
    wave: 'skeleton',
    none: '',
  }

  const style = {
    width: typeof width === 'number' ? `${width}px` : width,
    height: typeof height === 'number' ? `${height}px` : height,
  }

  return (
    <div
      className={`${baseStyles} ${variantStyles[variant]} ${animationStyles[animation]} ${className}`}
      style={style}
    />
  )
}

// Pre-built skeleton layouts
export const CardSkeleton = () => (
  <div className="card">
    <div className="flex items-center gap-4 mb-6">
      <Skeleton variant="circular" width={64} height={64} />
      <div className="flex-1">
        <Skeleton width={120} height={24} className="mb-2" />
        <Skeleton width={80} height={16} />
      </div>
    </div>
    <Skeleton width="100%" height={60} className="mb-4" />
    <div className="flex gap-2 mb-6">
      <Skeleton width={60} height={24} />
      <Skeleton width={60} height={24} />
      <Skeleton width={60} height={24} />
    </div>
    <div className="grid grid-cols-2 gap-3 mb-6">
      <Skeleton height={80} variant="rounded" />
      <Skeleton height={80} variant="rounded" />
    </div>
    <Skeleton height={44} variant="rounded" />
  </div>
)

export const ChartSkeleton = () => (
  <div className="card">
    <div className="flex items-center justify-between mb-6">
      <div>
        <Skeleton width={140} height={24} className="mb-2" />
        <Skeleton width={100} height={16} />
      </div>
      <Skeleton width={80} height={32} variant="rounded" />
    </div>
    <Skeleton width="100%" height={256} variant="rounded" />
  </div>
)

export const TradePanelSkeleton = () => (
  <div className="card">
    <Skeleton width={80} height={24} className="mb-6" />
    <Skeleton width="100%" height={40} variant="rounded" className="mb-4" />
    <Skeleton width="100%" height={56} variant="rounded" className="mb-4" />
    <div className="flex gap-2 mb-4">
      <Skeleton width="25%" height={32} variant="rounded" />
      <Skeleton width="25%" height={32} variant="rounded" />
      <Skeleton width="25%" height={32} variant="rounded" />
      <Skeleton width="25%" height={32} variant="rounded" />
    </div>
    <Skeleton width="100%" height={120} variant="rounded" className="mb-4" />
    <Skeleton width="100%" height={48} variant="rounded" />
  </div>
)

export const TweetsSkeleton = () => (
  <div className="card">
    <div className="flex items-center gap-3 mb-6">
      <Skeleton variant="circular" width={40} height={40} />
      <div className="flex-1">
        <Skeleton width={100} height={20} className="mb-1" />
        <Skeleton width={80} height={14} />
      </div>
    </div>
    {[1, 2, 3].map((i) => (
      <div key={i} className="card-elevated mb-3">
        <div className="flex gap-3">
          <Skeleton variant="circular" width={40} height={40} />
          <div className="flex-1">
            <Skeleton width="80%" height={16} className="mb-2" />
            <Skeleton width="60%" height={16} className="mb-2" />
            <Skeleton width="40%" height={16} />
          </div>
        </div>
      </div>
    ))}
  </div>
)

export default Skeleton
