import type { LostItem, LostItemDTO } from './types';

export const toLostItem = (d: LostItemDTO): LostItem => ({
  id: d.id,
  name: d.name,
  location: d.location,
  date: d.date,
  hasImage: d.has_image,
  description: d.description,
});

export const fromLostItem = (
  n: Pick<LostItem, 'name' | 'location' | 'description' | 'hasImage'>,
): Pick<LostItemDTO, 'name' | 'location' | 'has_image' | 'description'> => ({
  name: n.name,
  location: n.location,
  has_image: n.hasImage,
  description: n.description,
});
