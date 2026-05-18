import { describe, expect, it } from 'vitest';

import { queryKeys } from './query-keys';

describe('queryKeys', () => {
  it('preserves current storefront key shapes', () => {
    const filters = { q: 'scrub' };

    expect(queryKeys.cart()).toEqual(['cart']);
    expect(queryKeys.catalog.root()).toEqual(['catalog']);
    expect(queryKeys.catalog.categories()).toEqual(['catalog', 'categories']);
    expect(queryKeys.catalog.list(filters)).toEqual(['catalog', 'products', filters]);
    expect(queryKeys.catalog.detail('classic')).toEqual(['catalog', 'product', 'classic']);
    expect(queryKeys.orders.listRoot()).toEqual(['orders', 'mine']);
    expect(queryKeys.orders.list(2, 20)).toEqual(['orders', 'mine', { page: 2, pageSize: 20 }]);
    expect(queryKeys.orders.detail('DM-1')).toEqual(['orders', 'mine', 'DM-1']);
    expect(queryKeys.paymentMethods()).toEqual(['payment-methods']);
    expect(queryKeys.appConfig()).toEqual(['app-config']);
    expect(queryKeys.addresses.list()).toEqual(['addresses']);
  });

  it('preserves current admin key shapes', () => {
    const productParams = { q: 'coat' };

    expect(queryKeys.admin.orders.listRoot()).toEqual(['admin', 'orders', 'list']);
    expect(queryKeys.admin.orders.list('Pending', 1, 25)).toEqual(['admin', 'orders', 'list', { status: 'Pending', page: 1, pageSize: 25 }]);
    expect(queryKeys.admin.orders.detail('DM-2')).toEqual(['admin', 'orders', 'detail', 'DM-2']);
    expect(queryKeys.admin.orders.stats()).toEqual(['admin', 'orders', 'stats']);
    expect(queryKeys.admin.orders.recent()).toEqual(['admin', 'orders', 'recent']);
    expect(queryKeys.admin.users.root()).toEqual(['admin', 'users']);
    expect(queryKeys.admin.users.list('ali', 3)).toEqual(['admin', 'users', { q: 'ali', page: 3 }]);
    expect(queryKeys.admin.inquiries.root()).toEqual(['admin', 'inquiries']);
    expect(queryKeys.admin.inquiries.list('Open', 4)).toEqual(['admin', 'inquiries', { status: 'Open', page: 4 }]);
    expect(queryKeys.admin.catalog.categories()).toEqual(['admin', 'categories']);
    expect(queryKeys.admin.catalog.productsRoot()).toEqual(['admin', 'products']);
    expect(queryKeys.admin.catalog.products(productParams)).toEqual(['admin', 'products', productParams]);
    expect(queryKeys.admin.catalog.product('p1')).toEqual(['admin', 'products', 'detail', 'p1']);
    expect(queryKeys.admin.catalog.paymentMethods()).toEqual(['admin', 'payment-methods']);
  });
});
