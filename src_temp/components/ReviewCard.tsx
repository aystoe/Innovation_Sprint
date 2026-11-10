import type { Review } from '../types'
import { dateLabel } from '../utils/format'
import { isPhoto } from '../utils/avatar'
export function ReviewCard({ review }: { review: Review }) {
  return <article className="review"><time dateTime={review.date}>{dateLabel(review.date)}</time><strong>{review.name}</strong>{review.text && <p>{review.text}</p>}{review.photos.length > 0 && <div className="review-photos">{review.photos.filter(isPhoto).map((src, i) => <img key={i} src={src} alt={`Photo ${i + 1} shared in this event review`} />)}</div>}</article>
}
