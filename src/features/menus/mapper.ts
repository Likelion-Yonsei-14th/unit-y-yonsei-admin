import type { Menu, MenuDTO } from './types';

/** 백엔드 MenuResponse → Menu 모델. description/imageUrl 은 null 방어. */
export const toMenu = (d: MenuDTO): Menu => ({
  id: d.id,
  boothId: d.boothId,
  name: d.name,
  description: d.description ?? '',
  price: d.price,
  imageUrl: d.imageUrl ?? null,
  isSoldOut: d.isSoldOut ?? false,
  displayOrder: d.displayOrder,
});
