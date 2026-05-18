import type { LostItem, LostItemDTO } from './types';

export const toLostItem = (d: LostItemDTO): LostItem => ({
  id: d.id,
  name: d.name,
  location: d.location,
  date: d.date,
  imageUrl: d.image_url,
  description: d.description,
});

export const fromLostItem = (
  n: Pick<LostItem, 'name' | 'location' | 'description' | 'imageUrl'>,
): Pick<LostItemDTO, 'name' | 'location' | 'image_url' | 'description'> => ({
  name: n.name,
  location: n.location,
  image_url: n.imageUrl,
  description: n.description,
});
