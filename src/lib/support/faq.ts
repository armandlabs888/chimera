/** Help page FAQ copy. Accurate to the product. No pricing promises or dashes. */

export type FaqTabId = 'neighbors' | 'helpers' | 'verification' | 'account'

export type FaqItem = {
  id: string
  tab: FaqTabId
  question: string
  answer: string
}

export const FAQ_TABS: { id: FaqTabId; label: string }[] = [
  { id: 'neighbors', label: 'For neighbors' },
  { id: 'helpers', label: 'For helpers' },
  { id: 'verification', label: 'Verification and safety' },
  { id: 'account', label: 'Account and privacy' },
]

export const FAQ_ITEMS: FaqItem[] = [
  // For neighbors
  {
    id: 'n-post-zip',
    tab: 'neighbors',
    question: 'How do I post a job?',
    answer:
      'Describe what you need, pick a category, and enter your ZIP so nearby helpers can find it. You can add photos and choose when you need help.',
  },
  {
    id: 'n-compare-offers',
    tab: 'neighbors',
    question: 'How do I compare offers?',
    answer:
      'Helpers send priced offers on your job. Open the job to review each offer, then accept the one that fits. You can message a helper before you decide.',
  },
  {
    id: 'n-messaging',
    tab: 'neighbors',
    question: 'How does messaging work?',
    answer:
      'After someone offers (or you invite a helper), you can message in the job thread to align on timing and details. Keep coordination in Bunk so you have a clear record.',
  },
  {
    id: 'n-cancel',
    tab: 'neighbors',
    question: 'Can I cancel a job?',
    answer:
      'Yes. Open your job and choose Cancel job. Use cancel when plans change so helpers are not left waiting.',
  },
  {
    id: 'n-browse-guest',
    tab: 'neighbors',
    question: 'Do I need an account to browse?',
    answer:
      'You can browse open jobs without signing in. Posting a job, messaging, accepting offers, and reviewing require an account.',
  },
  // For helpers
  {
    id: 'h-get-verified',
    tab: 'helpers',
    question: 'What do I need before I can offer?',
    answer:
      'Helpers must Get verified with a one-time home location check before offering on jobs. Your home address is never shown to neighbors or on your profile.',
  },
  {
    id: 'h-rates',
    tab: 'helpers',
    question: 'How do I set my rate?',
    answer:
      'On your helper profile you can choose an hourly rate or a flat rate. Neighbors see that when they review your profile and offers.',
  },
  {
    id: 'h-hours',
    tab: 'helpers',
    question: 'What are working hours?',
    answer:
      'Working hours show when you are typically available. Neighbors see your status from those hours so they know when you are likely free.',
  },
  {
    id: 'h-alerts',
    tab: 'helpers',
    question: 'How do urgent job text alerts work?',
    answer:
      'Text alerts for urgent jobs need verification. Once you are verified and opted in, Bunk can text you about nearby urgent jobs that match.',
  },
  {
    id: 'h-offer-flow',
    tab: 'helpers',
    question: 'How do I offer on a job?',
    answer:
      'Open a job near you, review the details, and send an offer with your price and timing. If the neighbor accepts, you coordinate in the thread.',
  },
  // Verification and safety
  {
    id: 'v-home-check',
    tab: 'verification',
    question: 'What is the home location check?',
    answer:
      'Get verified asks for your home address and a one-time location check while you are there. We use it to confirm you live nearby. Your address is never shown to other users.',
  },
  {
    id: 'v-address-privacy',
    tab: 'verification',
    question: 'Who can see my home address?',
    answer:
      'Your exact address is never displayed to other users and is never sold. It is only used to match you with nearby jobs and to confirm you are at that address.',
  },
  {
    id: 'v-danger',
    tab: 'verification',
    question: 'What if I feel unsafe?',
    answer:
      'If you are in danger, call 911. For non-emergency safety concerns on Bunk, use the contact form on this page and choose Safety concern.',
  },
  {
    id: 'v-payment',
    tab: 'verification',
    question: 'Does Bunk hold my money?',
    answer:
      'No. Bunk is a coordination layer. Neighbors and helpers arrange payment peer to peer after an offer is accepted.',
  },
  {
    id: 'v-reviews',
    tab: 'verification',
    question: 'How do reviews work?',
    answer:
      'After a job is complete, both sides can leave a review. Reputation goes both ways so neighbors and helpers build trust over time.',
  },
  // Account and privacy
  {
    id: 'a-delete',
    tab: 'account',
    question: 'How do I delete my account?',
    answer:
      'Go to Settings, then delete your account. Deletion is permanent and cannot be undone. We send a confirmation email to the address on your account.',
  },
  {
    id: 'a-email',
    tab: 'account',
    question: 'How do I change my email or sign-in?',
    answer:
      'Use the contact form with topic Account or sign in if you need help with sign-in or the email on your account.',
  },
  {
    id: 'a-data',
    tab: 'account',
    question: 'What happens to my data if I delete?',
    answer:
      'Deleting your account removes your profile, verification details, jobs, messages, saved items, alert settings, and photos tied to the account.',
  },
  {
    id: 'a-privacy',
    tab: 'account',
    question: 'Where can I read the privacy policy?',
    answer:
      'Open Privacy from the site footer for how Bunk handles personal information. Terms are linked next to it.',
  },
]
