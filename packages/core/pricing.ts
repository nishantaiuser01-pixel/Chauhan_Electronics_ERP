import { Product } from './types';

export function resolvePrice(product: Product, tier: 'COUNTER' | 'DEALER' | 'DISTRIBUTOR'): number {
  const counterPrice = product.counter_price ?? 0;
  const dealerPrice = product.dealer_price ?? counterPrice;
  const distributorPrice = product.distributor_price ?? dealerPrice;

  if (tier === 'DISTRIBUTOR') {
    return distributorPrice;
  } else if (tier === 'DEALER') {
    return dealerPrice;
  } else {
    return counterPrice;
  }
}
