export const queryKeys = {
  cart: () => ['cart'] as const,
  catalog: {
    root: () => ['catalog'] as const,
    categories: () => ['catalog', 'categories'] as const,
    list: (filters: unknown) => ['catalog', 'products', filters] as const,
    detail: (slug: string) => ['catalog', 'product', slug] as const,
  },
  orders: {
    listRoot: () => ['orders', 'mine'] as const,
    list: (page: number, pageSize: number) => ['orders', 'mine', { page, pageSize }] as const,
    detail: (orderNumber: string) => ['orders', 'mine', orderNumber] as const,
    returns: (orderNumber: string) => ['orders', 'mine', orderNumber, 'returns'] as const,
    allReturns: (page: number, pageSize: number) =>
      ['orders', 'mine', 'all-returns', { page, pageSize }] as const,
  },
  paymentMethods: () => ['payment-methods'] as const,
  shipping: {
    governorates: () => ['shipping', 'governorates'] as const,
  },
  appConfig: () => ['app-config'] as const,
  admin: {
    orders: {
      listRoot: () => ['admin', 'orders', 'list'] as const,
      list: (status: unknown, page: number, pageSize: number) =>
        ['admin', 'orders', 'list', { status, page, pageSize }] as const,
      detail: (orderNumber: string) => ['admin', 'orders', 'detail', orderNumber] as const,
      returns: (orderNumber: string) => ['admin', 'orders', 'detail', orderNumber, 'returns'] as const,
      returnsList: (params: unknown) => ['admin', 'orders', 'returns', params] as const,
      return: (returnId: string) => ['admin', 'orders', 'returns', 'detail', returnId] as const,
      stats: () => ['admin', 'orders', 'stats'] as const,
      recent: () => ['admin', 'orders', 'recent'] as const,
    },
    users: {
      root: () => ['admin', 'users'] as const,
      list: (q?: string, page?: number) => ['admin', 'users', { q, page }] as const,
    },
    inquiries: {
      root: () => ['admin', 'inquiries'] as const,
      list: (status: unknown, page: number) => ['admin', 'inquiries', { status, page }] as const,
    },
    catalog: {
      categories: () => ['admin', 'categories'] as const,
      productsRoot: () => ['admin', 'products'] as const,
      products: (params: unknown) => ['admin', 'products', params] as const,
      product: (id: string) => ['admin', 'products', 'detail', id] as const,
      paymentMethods: () => ['admin', 'payment-methods'] as const,
    },
    shipping: {
      governorates: () => ['admin', 'shipping', 'governorates'] as const,
    },
    whatsapp: {
      status: () => ['admin', 'whatsapp', 'status'] as const,
      attempts: (page: number, limit: number) => ['admin', 'whatsapp', 'attempts', { page, limit }] as const,
      qr: () => ['admin', 'whatsapp', 'qr'] as const,
    },
  },
  account: {
    notificationPreferences: () => ['account', 'notification-preferences'] as const,
  },
  inquiries: {
    list: () => ['inquiries', 'list'] as const,
  },
  addresses: {
    list: () => ['addresses'] as const,
  },
} as const;
