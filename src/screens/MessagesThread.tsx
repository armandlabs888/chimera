'use client'

/**
 * Conversation UI lives in the messages drawer. This re-export keeps older
 * imports compiling; routed `/messages` pages redirect into the drawer.
 */
export { MessagesChatPanel as MessagesThread } from '@/components/messages/MessagesChatPanel'
