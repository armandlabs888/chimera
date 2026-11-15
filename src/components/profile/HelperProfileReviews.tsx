'use client'

import { Star } from 'lucide-react'
import { EmptyState } from '@/components/ui'
import { relativeTime } from '@/lib/matching'
import type { Person, Review } from '@/types'

export function HelperProfileReviews({
  reviews,
  getPerson,
}: {
  reviews: Review[]
  getPerson: (id: string) => Person | undefined
}) {
  return (
    <section className="mt-10" data-testid="helper-profile-reviews">
      <h2 className="font-display text-[22px] font-bold text-[#071330]">Reviews</h2>
      {reviews.length ? (
        <ul className="mt-4 space-y-3">
          {reviews.map((review) => {
            const from = getPerson(review.fromId)
            return (
              <li
                key={review.id}
                className="border-0 border-t border-[#E3E8EF] bg-transparent px-0 py-4 first:border-t-0 first:pt-0"
              >
                <div className="flex items-center gap-2 text-[14px]">
                  <Star className="h-4 w-4 fill-[#071330] text-[#071330]" aria-hidden />
                  <span className="font-semibold text-[#071330]">{review.rating}/5</span>
                  <span className="text-[#4A5568]">from {from?.name ?? 'Neighbor'}</span>
                  <span className="ml-auto text-[12px] text-[#4A5568]">
                    {relativeTime(review.createdAt)}
                  </span>
                </div>
                {review.comment?.trim() ? (
                  <p className="mt-2 text-[14px] leading-[1.5] text-[#4A5568]">{review.comment}</p>
                ) : null}
              </li>
            )
          })}
        </ul>
      ) : (
        <div className="mt-4">
          <EmptyState
            title="No reviews yet"
            body="Completed jobs will show neighbor feedback here."
          />
        </div>
      )}
    </section>
  )
}
