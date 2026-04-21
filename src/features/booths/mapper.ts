import type {
  BoothImage, BoothImageDTO,
  BoothMenuItem, BoothMenuItemDTO,
  BoothProfile, BoothProfileDTO,
} from './types';

export const toBoothImage = (d: BoothImageDTO): BoothImage => ({
  id: d.id,
  url: d.url,
  isMain: d.is_main,
});

export const toBoothMenuItem = (d: BoothMenuItemDTO): BoothMenuItem => ({
  id: d.id,
  order: d.order,
  name: d.name,
  description: d.description,
  price: d.price,
  image: d.image,
  soldOut: d.sold_out,
});

export const toBoothProfile = (d: BoothProfileDTO): BoothProfile => ({
  id: d.id,
  name: d.name,
  organizationName: d.organization_name,
  description: d.description,
  signatureMenu: d.signature_menu,
  operatingHours: d.operating_hours,
  reservationEnabled: d.reservation_enabled,
  orderNotice: d.order_notice,
  thumbnails: d.thumbnails.map(toBoothImage),
  menuItems: d.menu_items.map(toBoothMenuItem),
});
