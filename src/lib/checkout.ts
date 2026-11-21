import { commerce } from "@/config/product";
import { contentPreview } from "@/lib/media";

/** Real checkout: only when commerce.checkoutEnabled (inventory, fulfillment, compliance confirmed). */
export const checkoutOpen = commerce.checkoutEnabled;

/**
 * Checkout UI reachable: live when open, or as a clearly labelled local preview
 * (NEXT_PUBLIC_CONTENT_PREVIEW=1) that uses sample addresses and takes no payments.
 */
export const checkoutAvailable = checkoutOpen || contentPreview;
export const checkoutIsPreview = !checkoutOpen && contentPreview;
