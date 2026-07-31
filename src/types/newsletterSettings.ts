export type NewsletterSettings = {
  heading: string;
  subheading: string;
  successMessage: string;
  alreadySubscribedMessage: string;
  failureMessage: string;
  buttonText: string;
  disclaimer: string;
};

export const DEFAULT_NEWSLETTER_SETTINGS: NewsletterSettings = {
  heading: 'Stay Updated',
  subheading:
    'Hear about exhibitions, artist opportunities, workshops and community events.',
  successMessage:
    "You're subscribed! We'll let you know when there's something worth sharing.",
  alreadySubscribedMessage: 'You are already subscribed.',
  failureMessage: 'Something went wrong. Please try again.',
  buttonText: 'Subscribe',
  disclaimer: 'No spam. Unsubscribe anytime.',
};
