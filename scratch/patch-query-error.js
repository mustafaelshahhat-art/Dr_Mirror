import fs from 'fs';
import path from 'path';

const files = [
  "features/addresses/AddressBookPage.tsx",
  "features/admin/AdminInquiriesPage.tsx",
  "features/admin/AdminOrderDetailPage.tsx",
  "features/admin/AdminOrdersListPage.tsx",
  "features/admin/AdminReturnDetailPage.tsx",
  "features/admin/AdminReturnsListPage.tsx",
  "features/admin/AdminUsersPage.tsx",
  "features/admin/audit/AuditLogPage.tsx",
  "features/admin/catalog/AdminCategoriesPage.tsx",
  "features/admin/catalog/AdminPaymentMethodsPage.tsx",
  "features/admin/catalog/AdminProductEditPage.tsx",
  "features/admin/catalog/AdminProductsListPage.tsx",
  "features/admin/shipping/AdminShippingFeesPage.tsx",
  "features/catalog/CatalogPage.tsx",
  "features/catalog/ProductDetailPage.tsx",
  "features/orders/OrderDetailPage.tsx",
  "features/orders/OrdersListPage.tsx",
  "features/orders/ReturnsListPage.tsx"
];

const srcDir = 'D:/projects/Dr_Mirror/frontend/src';

for (const relPath of files) {
  const filePath = path.join(srcDir, relPath);
  if (!fs.existsSync(filePath)) {
    console.log(`File not found: ${filePath}`);
    continue;
  }

  let content = fs.readFileSync(filePath, 'utf8');
  
  // Find all `<QueryErrorState ... />` blocks and patch them
  // We can use a regex to match the component and its body up to the closing tag or just find instances.
  // Since QueryErrorState is formatted with newlines or inline, let's find the tag `<QueryErrorState` and its matching `/>`
  const regex = /<QueryErrorState([\s\S]*?)\/>/g;
  let matches = 0;
  
  const patched = content.replace(regex, (match, body) => {
    // If it already has an error prop, skip
    if (body.includes('error=')) {
      return match;
    }

    // Determine the query variable from the onRetry handler: e.g., onRetry={() => void query.refetch()} or onRetry={() => query.refetch()}
    const onRetryMatch = body.match(/onRetry=\{[^}]*?(\w+)\.refetch/);
    if (!onRetryMatch) {
      console.log(`Warning: Could not determine query variable in ${relPath} for: ${match}`);
      return match;
    }

    const queryVar = onRetryMatch[1];
    matches++;
    
    // Insert error={queryVar.error} before the closing tag, maintaining formatting
    // Let's check if the match ends with a newline before `/>`
    if (body.endsWith('\n') || body.endsWith('\r\n') || body.match(/\s+$/)) {
      return `<QueryErrorState${body}error={${queryVar}.error}\n        />`;
    } else {
      // Find the indentation or just append
      return `<QueryErrorState${body}\n          error={${queryVar}.error}\n        />`;
    }
  });

  if (matches > 0) {
    fs.writeFileSync(filePath, patched, 'utf8');
    console.log(`Patched ${relPath} (${matches} call sites)`);
  } else {
    console.log(`Skipped ${relPath} (already patched or no matches)`);
  }
}
