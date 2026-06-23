import { Heart, Repeat2, MessageCircle, Share2, MoreHorizontal } from 'lucide-react'
import { useState } from 'react'
import { Tweet } from '../types'

interface RecentTweetsProps {
  tweets: Tweet[]
  idolName: string
}

const RecentTweets = ({ tweets, idolName }: RecentTweetsProps) => {
  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)
    if (diffInSeconds < 60) return 'now'
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`
    return `${Math.floor(diffInSeconds / 86400)}d`
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--primary-500)] to-[var(--primary-700)] flex items-center justify-center">
            <span className="text-white font-bold">{idolName[0]}</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-[var(--text-default)]">@{idolName}AI</h3>
              <span className="badge badge-accent text-xs py-0.5 px-1.5">AI</span>
            </div>
            <p className="text-xs text-[var(--text-faint)]">AI-generated updates</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <a 
            href="https://twitter.com" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="btn-secondary text-sm py-2 px-3"
          >
            Follow
          </a>
          <button className="btn-ghost p-2">
            <MoreHorizontal className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {tweets.map((tweet) => (
          <TweetCard key={tweet.id} tweet={tweet} idolName={idolName} formatTimeAgo={formatTimeAgo} />
        ))}
      </div>

      <div className="mt-4 pt-4 border-t border-[var(--border-subtle)] text-center">
        <a 
          href="https://twitter.com" 
          target="_blank" 
          rel="noopener noreferrer" 
          className="text-sm font-medium text-[var(--primary-400)] hover:text-[var(--primary-300)] transition-colors"
        >
          View all posts on X →
        </a>
      </div>
    </div>
  )
}

// Separate component for individual tweet
const TweetCard = ({ tweet, idolName, formatTimeAgo }: { 
  tweet: Tweet
  idolName: string
  formatTimeAgo: (date: string) => string 
}) => {
  const [liked, setLiked] = useState(false)
  const [retweeted, setRetweeted] = useState(false)

  return (
    <div className="card-elevated p-4 hover:border-[var(--border-default)] transition-colors">
      <div className="flex gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--primary-500)] to-[var(--primary-700)] flex-shrink-0" />
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between mb-1">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-[var(--text-default)] text-sm">{idolName}AI</span>
              <span className="text-[var(--text-faint)] text-sm">@{idolName.toLowerCase()}ai</span>
              <span className="text-[var(--text-faint)] text-xs">· {formatTimeAgo(tweet.createdAt)}</span>
            </div>
          </div>

          <p className="text-sm text-[var(--text-muted)] leading-relaxed mb-3">
            {tweet.text}
          </p>

          {tweet.imageUrl && (
            <div className="mb-3 rounded-xl overflow-hidden border border-[var(--border-subtle)]">
              <img src={tweet.imageUrl} alt="" className="w-full h-48 object-cover hover:scale-105 transition-transform duration-500" />
            </div>
          )}

          <div className="flex items-center gap-6 text-[var(--text-faint)]">
            <button className="flex items-center gap-1.5 hover:text-[var(--primary-400)] transition-colors group">
              <div className="p-1.5 rounded-full group-hover:bg-[var(--primary-500)]/10 transition-colors">
                <MessageCircle className="w-4 h-4" />
              </div>
              <span className="text-xs">Reply</span>
            </button>
            
            <button 
              onClick={() => setRetweeted(!retweeted)}
              className={`flex items-center gap-1.5 transition-colors group ${retweeted ? 'text-[var(--success)]' : 'hover:text-[var(--success)]'}`}
            >
              <div className={`p-1.5 rounded-full transition-colors ${retweeted ? 'bg-[var(--success)]/10' : 'group-hover:bg-[var(--success)]/10'}`}>
                <Repeat2 className={`w-4 h-4 ${retweeted ? 'fill-current' : ''}`} />
              </div>
              <span className="text-xs">{tweet.retweets + (retweeted ? 1 : 0)}</span>
            </button>
            
            <button 
              onClick={() => setLiked(!liked)}
              className={`flex items-center gap-1.5 transition-colors group ${liked ? 'text-[var(--error)]' : 'hover:text-[var(--error)]'}`}
            >
              <div className={`p-1.5 rounded-full transition-colors ${liked ? 'bg-[var(--error)]/10' : 'group-hover:bg-[var(--error)]/10'}`}>
                <Heart className={`w-4 h-4 ${liked ? 'fill-current' : ''}`} />
              </div>
              <span className="text-xs">{tweet.likes + (liked ? 1 : 0)}</span>
            </button>
            
            <button className="flex items-center gap-1.5 hover:text-[var(--primary-400)] transition-colors group ml-auto">
              <div className="p-1.5 rounded-full group-hover:bg-[var(--primary-500)]/10 transition-colors">
                <Share2 className="w-4 h-4" />
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default RecentTweets
