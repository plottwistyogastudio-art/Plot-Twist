// Referral programme. Change the numbers here.
export const REFERRAL_DISCOUNT_PCT = 10;       // new member: % off their first purchase
export const REFERRAL_FRIENDS_PER_REWARD = 2;  // every 2 new members who pay, the referrer earns a reward
export const REFERRAL_REWARD_CLASSES = 1;      // free classes per reward
export const REFERRAL_REWARD_VALID_DAYS = 30;  // how long the reward class is valid
// Can the 10% be combined with the First Plot opening deal? (true = yes)
export const REFERRAL_ON_FIRST_PLOT = false;

// Price after the referral discount, rounded DOWN to the nearest IDR 1.000 (so the friend always gets at least the %).
export function referralPrice(price: number) {
  return Math.floor((price * (100 - REFERRAL_DISCOUNT_PCT)) / 100 / 1000) * 1000;
}

export const REFERRAL_STORAGE_KEY = "pt_ref";
export const normaliseCode = (s: string) => s.trim().toUpperCase().replace(/\s+/g, "");
