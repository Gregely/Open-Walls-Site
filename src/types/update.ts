export type Update = {
  id: string;
  title: string;
  slug: string;
  subtitle: string;
  label: string;
  date: string;
  imageUrl: string;
  body: string;
  ctaLabel: string;
  ctaUrl: string;
  published: boolean;
  pinned: boolean;
  displayOrder: number;
  createdAt?: string;
  updatedAt?: string;
};
